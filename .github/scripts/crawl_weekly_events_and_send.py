"""
옥천군 청산면 주간행사계획(hwpx 첨부) 크롤링 후 Render 백엔드로 전송.
GitHub Actions에서 실행되며 Render 서버 IP 차단 문제를 우회합니다.

파이프라인:
  1. 목록 페이지(bbsNo=37&key=233)에서 최신 "주요행사계획" 게시물 탐색
  2. 상세 페이지에서 첨부(hwpx) 파일 ID 탐색
  3. hwpx 다운로드 (zip 형식)
  4. Contents/section0.xml의 표(hp:tbl/hp:tr/hp:tc)를 파싱해 개별 행사 추출
     (Preview/PrvText.txt는 ~2000바이트로 잘려 주 후반부가 누락되므로 사용하지 않음)
  5. 파싱 결과를 Render 백엔드로 전송
"""
import os
import re
import io
import sys
import time
import random
import json
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime

import requests
from bs4 import BeautifulSoup

LIST_URL = "https://www.oc.go.kr/www/selectBbsNttList.do?bbsNo=37&key=233"
DETAIL_URL_PREFIX = "https://www.oc.go.kr/www/selectBbsNttView.do?bbsNo=37&key=233&nttNo="
DOWNLOAD_URL_PREFIX = "https://www.oc.go.kr/www/downloadBbsFile.do?atchmnflNo="

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

TITLE_RE = re.compile(r"주(?:요|간)행사계획")
DATE_TOKEN_RE = re.compile(r"^(\d{1,2})\.\s*(\d{1,2})\.\s*\(.+\)$")

HWPML_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
_T = f"{{{HWPML_NS}}}t"
_TC = f"{{{HWPML_NS}}}tc"
_TR = f"{{{HWPML_NS}}}tr"
_TBL = f"{{{HWPML_NS}}}tbl"


def fetch(url: str, retries: int = 3) -> bytes:
    time.sleep(random.uniform(1, 2))
    proxies = {"http": "socks5h://127.0.0.1:9050", "https": "socks5h://127.0.0.1:9050"} if USE_TOR else None
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            response = requests.get(
                url, headers=FETCH_HEADERS, timeout=60, proxies=proxies,
                verify=False, allow_redirects=True,
            )
            response.raise_for_status()
            return response.content
        except Exception as exc:
            last_exc = exc
            print(f"요청 실패 (시도 {attempt}/{retries}): {exc}")
            if attempt < retries:
                time.sleep(random.uniform(5, 10))
    raise RuntimeError(f"최대 재시도 횟수 초과: {last_exc}") from last_exc


def find_latest_post(html: bytes):
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table")
    if not table:
        print("주간행사 목록 테이블을 찾을 수 없습니다")
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
        m = re.search(r"nttNo=(\d+)", href or "")
        if not m:
            continue
        return {"ntt_no": m.group(1), "title": title}

    print("주요행사계획 게시물을 목록에서 찾지 못했습니다")
    return None


def find_attachment_id(html: bytes):
    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        m = re.search(r"downloadBbsFile\.do\?atchmnflNo=(\d+)", a["href"])
        if m:
            return m.group(1)
    return None


def cell_text(tc) -> str:
    return "".join(t.text or "" for t in tc.iter(_T)).strip()


def parse_hwpx_table(hwpx_bytes: bytes) -> list[dict]:
    with zipfile.ZipFile(io.BytesIO(hwpx_bytes)) as z:
        xml_bytes = z.read("Contents/section0.xml")
    root = ET.fromstring(xml_bytes)

    full_text = "".join(t.text or "" for t in root.iter(_T))
    year_match = re.search(r"(\d{4})\.\s*\d{1,2}\.\s*\d{1,2}\.\s*~", full_text)
    year = year_match.group(1) if year_match else str(datetime.now().year)

    tbl = root.find(f".//{_TBL}")
    if tbl is None:
        print("주간행사 표를 찾을 수 없습니다")
        return []

    events = []
    current_date = None

    for tr in tbl.iter(_TR):
        cells = [cell_text(tc) for tc in tr.findall(_TC)]
        if not cells or cells[0] == "일자":
            continue

        if len(cells) >= 6:
            date_str, time_str, title, place, attendees_str, dept = cells[:6]
            m = DATE_TOKEN_RE.match(date_str)
            if m:
                month, day = m.groups()
                try:
                    current_date = datetime(int(year), int(month), int(day))
                except ValueError:
                    print(f"날짜 파싱 실패: {date_str}")
                    current_date = None
            else:
                print(f"날짜 형식 불일치: {date_str!r}")
        elif len(cells) == 5:
            time_str, title, place, attendees_str, dept = cells
        else:
            continue

        if not title.strip() or current_date is None:
            continue

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


def wake_up_server():
    print("서버 예열 중...")
    try:
        requests.get(f"{API_URL}/api/health", timeout=90, allow_redirects=True)
        print("서버 응답 확인")
    except Exception:
        pass
    time.sleep(2)


def send_to_backend(events: list[dict]) -> dict:
    url = f"{API_URL}/api/admin-events/crawl-ingest"
    headers = {"Content-Type": "application/json", "X-Crawl-Secret": CRAWL_SECRET}
    response = requests.post(url, json=events, headers=headers, timeout=90)
    response.raise_for_status()
    return response.json()


def main():
    if not CRAWL_SECRET:
        print("오류: CRAWL_SECRET 환경변수가 설정되지 않았습니다")
        sys.exit(1)

    print(f"목록 조회: {LIST_URL}")
    try:
        list_html = fetch(LIST_URL)
    except RuntimeError as e:
        print(f"경고: 목록 조회 실패 — 사이트 접근 불가 ({e})")
        print("워크플로우는 정상 종료합니다 (데이터 없음)")
        sys.exit(0)

    post = find_latest_post(list_html)
    if not post:
        sys.exit(0)

    print(f"최신 게시물: {post['title']} (nttNo={post['ntt_no']})")
    detail_html = fetch(f"{DETAIL_URL_PREFIX}{post['ntt_no']}")
    atchmnfl_no = find_attachment_id(detail_html)
    if not atchmnfl_no:
        print("첨부파일을 찾지 못했습니다")
        sys.exit(0)

    hwpx_bytes = fetch(f"{DOWNLOAD_URL_PREFIX}{atchmnfl_no}")
    events = parse_hwpx_table(hwpx_bytes)
    print(f"파싱 완료: {len(events)}건")

    if not events:
        print("수집된 행사가 없습니다")
        sys.exit(0)

    wake_up_server()
    print(f"백엔드 전송 중: {API_URL}")
    result = send_to_backend(events)
    print(f"전송 완료: {json.dumps(result, ensure_ascii=False)}")


if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    main()
