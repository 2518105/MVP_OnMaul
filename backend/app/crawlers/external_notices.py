import httpx
import logging
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict
from sqlalchemy.orm import Session

from app.models.models import Notice, NoticeCategory
from app.database import SessionLocal

logger = logging.getLogger(__name__)


BASE_URL = "https://www.oc.go.kr/www/selectBbsNttList.do?bbsNo=91&key=796"
DETAIL_URL = "https://www.oc.go.kr/www/selectBbsNttView.do?bbsNo=91&key=796&nttNo="


class ExternalNoticeCrawler:
    """옥천군 청산면 공지사항 크롤러"""
    
    @staticmethod
    def fetch_notices(page: int = 1) -> List[Dict]:
        """
        공지사항 페이지에서 게시물 목록 크롤링
        
        Returns:
            [
                {
                    'external_id': '1814',
                    'title': '2026년 건축물...',
                    'published_at': datetime(2026, 6, 1),
                    'view_count': 2,
                    'source_url': 'https://www.oc.go.kr/...'
                },
                ...
            ]
        """
        try:
            # 페이지 가져오기
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = httpx.get(BASE_URL, headers=headers, timeout=10)
            response.raise_for_status()
            
            # HTML 파싱
            soup = BeautifulSoup(response.content, 'html.parser')
            
            notices = []
            
            # 게시물 테이블 찾기 (tbody > tr)
            table = soup.find('table')
            if not table:
                print("테이블을 찾을 수 없습니다")
                return notices
            
            rows = table.find_all('tr')
            
            for row in rows[1:]:  # 첫 번째 행(헤더) 제외
                try:
                    cells = row.find_all('td')
                    if len(cells) < 5:
                        continue
                    
                    # 각 셀에서 데이터 추출
                    external_id = cells[0].text.strip().replace(',', '')
                    lines = [l.strip() for l in cells[1].text.split('\n') if l.strip() and l.strip() != '새글']
                    title = lines[0] if lines else ""
                    # cells[2] = 부서 (청산면)
                    date_str = cells[3].text.strip()
                    view_count_str = cells[4].text.strip().replace(',', '')

                    # 제목 셀의 링크에서 실제 nttNo 추출
                    link_tag = cells[1].find('a')
                    if link_tag and link_tag.get('href'):
                        href = link_tag['href']
                        source_url = "https://www.oc.go.kr/www/" + href.lstrip('./')
                    else:
                        source_url = f"{DETAIL_URL}{external_id}"

                    # 날짜 파싱 (YYYY-MM-DD 형식)
                    try:
                        published_at = datetime.strptime(date_str, '%Y-%m-%d')
                    except ValueError as e:
                        logger.warning("날짜 파싱 실패 (id=%s, raw=%r): %s", external_id, date_str, e)
                        published_at = None

                    # 조회수 파싱
                    try:
                        view_count = int(view_count_str)
                    except ValueError as e:
                        logger.warning("조회수 파싱 실패 (id=%s, raw=%r): %s", external_id, view_count_str, e)
                        view_count = 0
                    
                    notices.append({
                        'external_id': external_id,
                        'title': title,
                        'published_at': published_at,
                        'view_count': view_count,
                        'source_url': source_url,
                    })
                except Exception as e:
                    logger.error("행 파싱 실패: %s", e, exc_info=True)
                    continue

            return notices

        except Exception as e:
            logger.error("크롤링 실패: %s", e, exc_info=True)
            return []
    
    @staticmethod
    def upsert_to_db(notices: List[Dict], user_id: int):
        """
        크롤링한 공지를 DB에 업서트
        
        Args:
            notices: fetch_notices()의 반환값
            user_id: 크롤러를 실행한 관리자 ID
        """
        db = SessionLocal()
        
        try:
            for notice_data in notices:
                # external_id로 기존 공지 찾기
                existing = db.query(Notice).filter(
                    Notice.external_id == notice_data['external_id']
                ).first()
                
                if existing:
                    # 기존 레코드 갱신 (날짜, 조회수, 제목 등)
                    existing.title = notice_data['title']
                    existing.published_at = notice_data['published_at']
                    existing.view_count = notice_data['view_count']
                    existing.source_url = notice_data['source_url']
                    existing.is_external = True
                    print(f"업데이트: {notice_data['external_id']}")
                else:
                    # 새 공지 생성
                    new_notice = Notice(
                        title=notice_data['title'],
                        content=f"원본: {notice_data['source_url']}",  # 임시 내용
                        category=NoticeCategory.town_office,  # 기본값
                        published_at=notice_data['published_at'],
                        view_count=notice_data['view_count'],
                        source_url=notice_data['source_url'],
                        external_id=notice_data['external_id'],
                        is_external=True,
                        author_id=user_id,
                    )
                    db.add(new_notice)
                    print(f"생성: {notice_data['external_id']}")
            
            db.commit()
            print(f"✓ {len(notices)}건 업서트 완료")
            
        except Exception as e:
            db.rollback()
            logger.error("DB 업서트 실패: %s", e, exc_info=True)
            raise
        finally:
            db.close()


# 테스트용 함수
if __name__ == "__main__":
    crawler = ExternalNoticeCrawler()
    notices = crawler.fetch_notices()
    print(f"크롤링된 공지: {len(notices)}건")
    for n in notices[:3]:
        print(f"  - {n['external_id']}: {n['title']} ({n['published_at']})")