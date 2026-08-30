import io
import re
import logging
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List, Dict, Optional

import httpx
from bs4 import BeautifulSoup

from app.supabase_client import get_supabase

logger = logging.getLogger(__name__)


LIST_URL = "https://www.oc.go.kr/www/selectBbsNttList.do?bbsNo=37&key=233"
DETAIL_URL = "https://www.oc.go.kr/www/selectBbsNttView.do?bbsNo=37&key=233&nttNo="
DOWNLOAD_URL = "https://www.oc.go.kr/www/downloadBbsFile.do?atchmnflNo="

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://www.oc.go.kr/",
}

TITLE_RE = re.compile(r"주(?:요|간)행사계획")
DATE_TOKEN_RE = re.compile(r"^(\d{1,2})\.\s*(\d{1,2})\.\s*\(.+\)$")

# hwpx(section0.xml)는 OWPML 스키마의 hp: 네임스페이스를 사용한다.
HWPML_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
_T = f"{{{HWPML_NS}}}t"
_TC = f"{{{HWPML_NS}}}tc"
_TR = f"{{{HWPML_NS}}}tr"
_TBL = f"{{{HWPML_NS}}}tbl"


class WeeklyEventCrawler:
    """옥천군 청산면 주간행사계획(hwpx 첨부) 크롤러 → Supabase admin_events 테이블"""

    @staticmethod
    def find_latest_post(client: Optional[httpx.Client] = None) -> Optional[Dict]:
        """게시물 목록에서 가장 최근 '주요행사계획' 글의 nttNo와 제목을 찾는다."""
        owns_client = client is None
        client = client or httpx.Client(headers=HEADERS, timeout=20, verify=False)
        try:
            resp = client.get(LIST_URL)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.content, "html.parser")
            table = soup.find("table")
            if not table:
                logger.warning("주간행사 목록 테이블을 찾을 수 없습니다")
                return None

            for row in table.find_all("tr")[1:]:
                cells = row.find_all("td")
                if len(cells) < 2:
                    continue
                lines = [l.strip() for l in cells[1].text.split("\n") if l.strip() and l.strip() != "새글"]
                title = lines[0] if lines else ""
                if not TITLE_RE.search(title):
                    continue

                link_tag = cells[1].find("a")
                href = link_tag.get("href") if link_tag else None
                ntt_no_match = re.search(r"nttNo=(\d+)", href or "")
                if not ntt_no_match:
                    continue

                return {"ntt_no": ntt_no_match.group(1), "title": title}

            logger.warning("주요행사계획 게시물을 목록에서 찾지 못했습니다")
            return None
        finally:
            if owns_client:
                client.close()

    @staticmethod
    def find_attachment_id(ntt_no: str, client: Optional[httpx.Client] = None) -> Optional[str]:
        """상세 페이지에서 hwpx 첨부파일 ID(atchmnflNo)를 찾는다."""
        owns_client = client is None
        client = client or httpx.Client(headers=HEADERS, timeout=20, verify=False)
        try:
            resp = client.get(f"{DETAIL_URL}{ntt_no}")
            resp.raise_for_status()
            soup = BeautifulSoup(resp.content, "html.parser")
            for a in soup.find_all("a", href=True):
                m = re.search(r"downloadBbsFile\.do\?atchmnflNo=(\d+)", a["href"])
                if m:
                    return m.group(1)
            return None
        finally:
            if owns_client:
                client.close()

    @staticmethod
    def download_hwpx(atchmnfl_no: str, client: Optional[httpx.Client] = None) -> bytes:
        owns_client = client is None
        client = client or httpx.Client(headers=HEADERS, timeout=30, verify=False)
        try:
            resp = client.get(f"{DOWNLOAD_URL}{atchmnfl_no}")
            resp.raise_for_status()
            return resp.content
        finally:
            if owns_client:
                client.close()

    @staticmethod
    def _cell_text(tc) -> str:
        return "".join(t.text or "" for t in tc.iter(_T)).strip()

    @classmethod
    def parse_hwpx_table(cls, hwpx_bytes: bytes) -> List[Dict]:
        """
        hwpx(zip) 내부 Contents/section0.xml의 실제 표(hp:tbl/hp:tr/hp:tc)를 파싱해
        admin_events 테이블 스키마(event_date, event_time, title, place, attendees,
        department)에 맞는 딕셔너리 목록을 만든다.

        주의: Preview/PrvText.txt는 미리보기용이라 ~2000바이트로 잘려서 주 후반부
        (수~일) 데이터가 누락될 수 있으므로 사용하지 않는다. 표는 날짜 셀이
        rowspan으로 병합되어 있어(하루 여러 행사 = 여러 행, 첫 행만 6칸/날짜 있음,
        나머지는 5칸) 행별 셀 개수로 날짜 반복 여부를 판단한다.

        행 예시:
            ['일자', '시간', '행 사 명', '장 소', '인원', '관련부서']   <- 헤더, 스킵
            ['8. 31.(월)', '10:30', '게이트볼대회', '게이트볼장', '200', '주민복지과']
            ['13:30', '지역사회보장협의체 회의', '통합복지센터', '30', '복지정책과']
        """
        with zipfile.ZipFile(io.BytesIO(hwpx_bytes)) as z:
            xml_bytes = z.read("Contents/section0.xml")
        root = ET.fromstring(xml_bytes)

        full_text = "".join(t.text or "" for t in root.iter(_T))
        year_match = re.search(r"(\d{4})\.\s*\d{1,2}\.\s*\d{1,2}\.\s*~", full_text)
        year = year_match.group(1) if year_match else str(datetime.now().year)

        tbl = root.find(f".//{_TBL}")
        if tbl is None:
            logger.warning("주간행사 표를 찾을 수 없습니다")
            return []

        events: List[Dict] = []
        current_date: Optional[datetime] = None

        for tr in tbl.iter(_TR):
            cells = [cls._cell_text(tc) for tc in tr.findall(_TC)]
            if not cells or cells[0] == "일자":
                continue  # 헤더 행

            if len(cells) >= 6:
                date_str, time_str, title, place, attendees_str, dept = cells[:6]
                m = DATE_TOKEN_RE.match(date_str)
                if m:
                    month, day = m.groups()
                    try:
                        current_date = datetime(int(year), int(month), int(day))
                    except ValueError:
                        logger.warning("날짜 파싱 실패: %s", date_str)
                        current_date = None
                else:
                    logger.warning("날짜 형식 불일치: %r", date_str)
            elif len(cells) == 5:
                time_str, title, place, attendees_str, dept = cells
            else:
                continue

            if not title.strip() or current_date is None:
                continue  # 행사 없는 요일(빈 행) 등

            time_nums = re.findall(r"\d+", time_str)
            event_time = f"{int(time_nums[0]):02d}:{int(time_nums[1]):02d}" if len(time_nums) >= 2 else "00:00"

            try:
                attendees = int(re.sub(r"[^\d]", "", attendees_str)) if attendees_str.strip() else None
            except ValueError:
                attendees = None

            events.append({
                "event_date": current_date.strftime("%Y-%m-%d"),
                "event_time": event_time,
                "title": title,
                "place": place or None,
                "attendees": attendees,
                "department": dept or None,
            })

        return events

    @classmethod
    def fetch_events(cls) -> List[Dict]:
        """목록 → 상세 → 첨부파일 다운로드 → 파싱까지 한 번에 수행한다."""
        with httpx.Client(headers=HEADERS, timeout=30, verify=False) as client:
            post = cls.find_latest_post(client)
            if not post:
                return []

            atchmnfl_no = cls.find_attachment_id(post["ntt_no"], client)
            if not atchmnfl_no:
                logger.warning("첨부파일을 찾지 못했습니다 (ntt_no=%s)", post["ntt_no"])
                return []

            hwpx_bytes = cls.download_hwpx(atchmnfl_no, client)

        try:
            return cls.parse_hwpx_table(hwpx_bytes)
        except Exception:
            logger.error("hwpx 파싱 실패 (ntt_no=%s)", post["ntt_no"], exc_info=True)
            return []

    @staticmethod
    def upsert_to_db(events: List[Dict]) -> Dict[str, int]:
        """
        Supabase admin_events 테이블에 반영한다.

        이 테이블엔 외부 게시글과 매칭할 고유키가 없으므로, 이번에 크롤링한
        날짜 범위(주 전체)에 해당하는 기존 행을 모두 지우고 새로 넣는
        "그 주 전체 교체" 방식을 쓴다. 옥천군이 문서를 정정 게시해도 항상
        최신 내용으로 동기화된다.
        """
        if not events:
            return {"deleted": 0, "inserted": 0}

        dates = [e["event_date"] for e in events]
        start, end = min(dates), max(dates)

        sb = get_supabase()
        deleted = sb.table("admin_events").delete().gte("event_date", start).lte("event_date", end).execute()
        sb.table("admin_events").insert(events).execute()

        return {"deleted": len(deleted.data or []), "inserted": len(events)}


if __name__ == "__main__":
    events = WeeklyEventCrawler.fetch_events()
    print(f"파싱된 행사: {len(events)}건")
    for e in events[:10]:
        print(f"  - {e['event_date']} {e['event_time']} {e['title']} @ {e['place']} ({e['attendees']}명) [{e['department']}]")
