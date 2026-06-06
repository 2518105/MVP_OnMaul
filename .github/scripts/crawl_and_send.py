"""
옥천군 청산면 공지사항 크롤링 후 Render 백엔드로 전송.
GitHub Actions에서 실행되며 Render 서버 IP 차단 문제를 우회합니다.
"""
import os
import sys
import time
import random
import json
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

BASE_URL = "https://www.oc.go.kr/www/selectBbsNttList.do?bbsNo=91&key=796"
DETAIL_URL_PREFIX = "https://www.oc.go.kr/www/selectBbsNttView.do?bbsNo=91&key=796&nttNo="

API_URL = os.environ.get("API_URL", "https://onmaeul.onrender.com")
CRAWL_SECRET = os.environ.get("CRAWL_SECRET", "")

FETCH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.oc.go.kr/",
}


def fetch_page(url: str) -> bytes:
    time.sleep(random.uniform(1, 2))
    response = httpx.get(url, headers=FETCH_HEADERS, timeout=15, follow_redirects=True)
    response.raise_for_status()
    return response.content


def parse_notices(html: bytes) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table")
    if not table:
        print("테이블을 찾을 수 없습니다")
        return []

    notices = []
    rows = table.find_all("tr")
    for row in rows[1:]:
        try:
            cells = row.find_all("td")
            if len(cells) < 5:
                continue

            external_id = cells[0].text.strip().replace(",", "")
            lines = [l.strip() for l in cells[1].text.split("\n") if l.strip() and l.strip() != "새글"]
            title = lines[0] if lines else ""
            date_str = cells[3].text.strip()
            view_count_str = cells[4].text.strip().replace(",", "")

            link_tag = cells[1].find("a")
            if link_tag and link_tag.get("href"):
                href = link_tag["href"]
                source_url = "https://www.oc.go.kr/www/" + href.lstrip("./")
            else:
                source_url = f"{DETAIL_URL_PREFIX}{external_id}"

            try:
                published_at = datetime.strptime(date_str, "%Y-%m-%d").isoformat()
            except Exception:
                published_at = None

            try:
                view_count = int(view_count_str)
            except Exception:
                view_count = 0

            notices.append({
                "external_id": external_id,
                "title": title,
                "published_at": published_at,
                "view_count": view_count,
                "source_url": source_url,
            })
        except Exception as e:
            print(f"행 파싱 실패: {e}")
            continue

    return notices


def send_to_backend(notices: list[dict]) -> dict:
    url = f"{API_URL}/api/admin/crawl-ingest"
    headers = {
        "Content-Type": "application/json",
        "X-Crawl-Secret": CRAWL_SECRET,
    }
    response = httpx.post(url, json=notices, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()


def main():
    if not CRAWL_SECRET:
        print("오류: CRAWL_SECRET 환경변수가 설정되지 않았습니다")
        sys.exit(1)

    print(f"크롤링 시작: {BASE_URL}")
    html = fetch_page(BASE_URL)
    notices = parse_notices(html)
    print(f"크롤링 완료: {len(notices)}건")

    if not notices:
        print("수집된 공지가 없습니다")
        sys.exit(0)

    print(f"백엔드 전송 중: {API_URL}")
    result = send_to_backend(notices)
    print(f"전송 완료: {json.dumps(result, ensure_ascii=False)}")


if __name__ == "__main__":
    main()
