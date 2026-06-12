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
                                                    # Tor SOCKS5 프록시 사용 (SSL 검증 비활성화로 EOF 오류 우회)
                                                    transport = httpx.HTTPTransport(proxy="socks5://127.0.0.1:9050")
                                                    with httpx.Client(mounts={"all://": transport}, verify=False) as client:
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

    # Tor 사용 중 모든 재시도 실패 시 직접 연결로 폴백
    if USE_TOR:
                print("Tor 연결 실패 - 직접 연결로 재시도합니다.")
                for attempt in range(1, retries + 1):
                                try:
                                                    response = httpx.get(url, **kwargs)
                                                    response.raise_for_status()
                                                    print("직접 연결 성공")
                                                    return response.content
except Exception as exc:
                last_exc = exc
                print(f"직접 연결 실패 (시도 {attempt}/{retries}): {exc}")
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
        for row in rows:
                    cols = row.find_all("td")
                    if len(cols) < 4:
                                    continue
                                try:
                                                num_text = cols[0].get_text(strip=True)
                                                if not num_text.isdigit():
                                                                    continue
                                                                title_tag = cols[1].find("a")
                                                if not title_tag:
                                                                    continue
                                                                title = title_tag.get_text(strip=True)
                                                href = title_tag.get("href", "")
                                                ntt_no = ""
                                                if "nttNo=" in href:
                                                                    ntt_no = href.split("nttNo=")[-1].split("&")[0]
                                                                date_str = cols[3].get_text(strip=True) if len(cols) > 3 else ""
                                                notices.append({
                                                    "num": int(num_text),
                                                    "title": title,
                                                    "ntt_no": ntt_no,
                                                    "date": date_str,
                                                    "url": DETAIL_URL_PREFIX + ntt_no if ntt_no else "",
                                                })
except Exception as e:
            print(f"행 파싱 오류: {e}")
            continue
    return notices


def send_to_api(notices: list[dict]) -> None:
        if not notices:
                    print("전송할 공지사항 없음")
                    return

        endpoint = f"{API_URL}/api/notices/sync"
        headers = {
            "Content-Type": "application/json",
            "X-Crawl-Secret": CRAWL_SECRET,
        }
        payload = {"notices": notices}

    try:
                resp = httpx.post(endpoint, json=payload, headers=headers, timeout=30)
                resp.raise_for_status()
                print(f"전송 성공: {resp.status_code} - {resp.text[:200]}")
except Exception as e:
            print(f"API 전송 실패: {e}")
            raise


def main() -> None:
        print(f"크롤링 시작: {BASE_URL}")
        html = fetch_page(BASE_URL)
        notices = parse_notices(html)
        print(f"파싱된 공지사항: {len(notices)}건")
        if not notices:
                    print("공지사항을 찾지 못했습니다. 종료합니다.")
                    sys.exit(1)
                for n in notices[:3]:
                            print(f"  [{n['num']}] {n['title']} ({n['date']})")
                        send_to_api(notices)
    print("완료")


if __name__ == "__main__":
        main()
