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
USE_TOR = os.environ.get("USE_TOR", "") == "1"

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


def fetch_page(url: str, retries: int = 3) -> bytes:
    time.sleep(random.uniform(1, 2))
    kwargs = dict(headers=FETCH_HEADERS, timeout=45, follow_redirects=True)
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            if USE_TOR:
                with httpx.Client(proxy="socks5://127.0.0.1:9050") as client:
                    response = client.get(url, **kwargs)
            else:
                response = httpx.get(url, **kwargs)
            response.raise_for_status()
            return response.content
        except Exception as exc:
            last_exc = exc
            print(f"요청 실패 (시도 {attempt}/{retries}): {exc}")
            if attempt < retries:
                time.sleep(random.uniform(5, 10))
    raise RuntimeError(f"최대 재시도 횟수 초과: {last_exc}") from last_exc


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


def wake_up_server() -> None:
    print("서버 예열 중...")
    try:
        httpx.get(f"{API_URL}/api/health", timeout=90, follow_redirects=True)
        print("서버 응답 확인")
    except Exception:
        pass
    time.sleep(2)


def send_to_backend(notices: list[dict]) -> dict:
    url = f"{API_URL}/api/admin/crawl-ingest"
    headers = {
        "Content-Type": "application/json",
        "X-Crawl-Secret": CRAWL_SECRET,
    }
    response = httpx.post(url, json=notices, headers=headers, timeout=90)
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

    wake_up_server()
    print(f"백엔드 전송 중: {API_URL}")
    result = send_to_backend(notices)
    print(f"전송 완료: {json.dumps(result, ensure_ascii=False)}")


if __name__ == "__main__":
    main()
