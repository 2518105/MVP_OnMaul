"""
버스 정류장 번호(stop_code) 추출 및 DB 업데이트 스크립트

HTML 파일에서 정류장 번호를 파싱해 bus_route_stops.stop_code 컬럼에 저장.

HTML 파일 종류별 구조:
  A) 503, 521, 541: tbody id="out-tbody" / id="in-tbody"
  B) 531:           단방향, tbody id="tbody"
  C) 501, 511:      .tbl-card.out/.tbl-card.in 로 방향 구분,
                    번호는 <small> 태그 또는 <span class="stop-num">
  D) 600번대:       단일 tbody, going-row/return-row 클래스로 방향 구분

번호 형식:
  - <span class="gnum">30025</span>
  - <span class="stop-num">30025</span>
  - <small style="...">62160</small>
  - <small style="...">(기점·30025)</small>  → 30025 추출
  - <small style="...">(회차·31025)</small>  → 31025 추출

실행: venv/Scripts/python.exe update_stop_codes.py
"""

import os
import sys
import re

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from bs4 import BeautifulSoup

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("[ERROR] DATABASE_URL 환경변수가 없습니다.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

HTML_DIRS = [
    r"c:\Users\user\OneDrive\바탕 화면\소셜벤처창업\청산면 버스 정리 최종\500",
    r"c:\Users\user\OneDrive\바탕 화면\소셜벤처창업\청산면 버스 정리 최종\600",
]


def get_html_files():
    files = []
    for d in HTML_DIRS:
        if not os.path.isdir(d):
            print(f"[WARN] 디렉토리 없음: {d}")
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith(".html"):
                m = re.match(r"(\d+)번", f)
                if m:
                    files.append((m.group(1), os.path.join(d, f)))
    return files


def extract_code_from_cell(name_cell):
    """
    name_cell(td BeautifulSoup element)에서 정류장 이름과 번호를 분리 반환.

    지원 패턴:
    1. <span class="gnum">번호</span>
    2. <span class="stop-num">번호</span>
    3. <small style="...">번호</small>  (plain number)
    4. <small style="...">(기점·번호)</small>
    5. <small style="...">(회차·번호)</small>
    """
    # span.gnum / span.stop-num
    span = name_cell.find("span", class_=["gnum", "stop-num"])
    if span:
        code = span.get_text(strip=True)
        span.decompose()
        name = name_cell.get_text(strip=True)
        return name, code

    # <small> 태그
    small = name_cell.find("small")
    if small:
        small_text = small.get_text(strip=True)
        # "(기점·30025)" 또는 "(회차·31025)" 패턴
        m = re.search(r'[\(（][^)）]*?[\·・](\d{4,6})[\)）]', small_text)
        if m:
            code = m.group(1)
        else:
            # 순수 숫자 패턴
            m2 = re.search(r'(\d{4,6})', small_text)
            code = m2.group(1) if m2 else None
        small.decompose()
        name = name_cell.get_text(strip=True)
        return name, code

    # 번호 없음
    name = name_cell.get_text(strip=True)
    return name, None


def parse_rows(rows, direction):
    """tr 목록에서 (direction, stop_order, stop_name, stop_code) 추출"""
    results = []
    stop_order = 0
    for row in rows:
        # dir-row (방향 구분 행) 무시
        if "dir-row" in (row.get("class") or []):
            continue
        cells = row.find_all("td")
        if len(cells) < 2:
            continue
        # 정류장명 칸: cells[1]
        name_cell = cells[1]
        stop_name, stop_code = extract_code_from_cell(name_cell)
        if not stop_name:
            continue
        stop_order += 1
        results.append({
            "direction": direction,
            "stop_order": stop_order,
            "stop_name": stop_name,
            "stop_code": stop_code,
        })
    return results


def parse_html_type_a(soup):
    """503, 521, 541 — tbody id=out-tbody / ret-tbody (또는 in-tbody)"""
    results = []
    for direction, tbody_ids in [("down", ["out-tbody"]), ("up", ["ret-tbody", "in-tbody"])]:
        for tbody_id in tbody_ids:
            tbody = soup.find("tbody", id=tbody_id)
            if tbody:
                results.extend(parse_rows(tbody.find_all("tr"), direction))
                break
    return results


def parse_html_type_b_oneway(soup):
    """531 — 단방향, tbody id=tbody"""
    results = []
    tbody = soup.find("tbody", id="tbody")
    if tbody:
        results.extend(parse_rows(tbody.find_all("tr"), "down"))
    return results


def parse_html_type_c(soup):
    """501, 511 — .tbl-card.out / .tbl-card.in"""
    results = []
    # out 방향
    out_card = soup.find(class_="tbl-card out") or soup.find(class_="out")
    if out_card:
        tbody = out_card.find("tbody")
        if tbody:
            results.extend(parse_rows(tbody.find_all("tr"), "down"))
    # in 방향
    in_cards = soup.find_all(class_="tbl-card in") or soup.find_all(class_=lambda c: c and "tbl-card" in c and "in" in c)
    # 여러 .tbl-card.in 이 있을 수 있으므로 합산
    for in_card in in_cards:
        tbody = in_card.find("tbody")
        if tbody:
            results.extend(parse_rows(tbody.find_all("tr"), "up"))
    return results


def parse_html_type_d(soup):
    """
    600번대 순환 노선 — 단일 tbody (id=tbody),
    going-row 클래스 → down, return-row/returning-row 클래스 → up.
    terminus 첫 번째 행은 going(down) 으로 처리.
    """
    results = []
    tbody = soup.find("tbody", id="tbody")
    if not tbody:
        # id 없는 tbody 하나인 경우
        tbody = soup.find("tbody")
    if not tbody:
        return results

    rows = tbody.find_all("tr")

    # 현재 방향 추적
    current_dir = "down"
    down_order = 0
    up_order = 0

    for row in rows:
        classes = row.get("class") or []

        # 방향 전환 행 (dir-row)
        if "dir-row" in classes:
            # "복귀" 또는 "return" 텍스트 있으면 up으로 전환
            text = row.get_text()
            if any(kw in text for kw in ["복귀", "return", "귀환", "↩", "← "]):
                current_dir = "up"
            continue

        # return-row / returning-row 는 up
        if any(c in classes for c in ["return-row", "returning-row", "ret-row"]):
            current_dir = "up"

        # going-row 는 down
        if "going-row" in classes:
            current_dir = "down"

        cells = row.find_all("td")
        if len(cells) < 2:
            continue

        name_cell = cells[1]
        stop_name, stop_code = extract_code_from_cell(name_cell)
        if not stop_name:
            continue

        if current_dir == "down":
            down_order += 1
            results.append({
                "direction": "down",
                "stop_order": down_order,
                "stop_name": stop_name,
                "stop_code": stop_code,
            })
        else:
            up_order += 1
            results.append({
                "direction": "up",
                "stop_order": up_order,
                "stop_name": stop_name,
                "stop_code": stop_code,
            })

    return results


def detect_html_type(route_number, soup):
    """HTML 타입 자동 감지"""
    # A: out-tbody / in-tbody
    if soup.find("tbody", id="out-tbody"):
        return "A"
    # B or D: id=tbody
    tbody = soup.find("tbody", id="tbody")
    if tbody:
        rows = tbody.find_all("tr")
        # D: going-row 또는 dir-row 있으면 순환 노선
        for r in rows:
            classes = r.get("class") or []
            if "going-row" in classes or "dir-row" in classes:
                return "D"
        # B: 단방향
        return "B"
    # C: .tbl-card.out
    if soup.find(class_=lambda c: c and "tbl-card" in c and "out" in c):
        return "C"
    # fallback: 단일 tbody 순환
    return "D_noId"


def parse_html(route_number, filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    soup = BeautifulSoup(html, "html.parser")
    html_type = detect_html_type(route_number, soup)

    if html_type == "A":
        return parse_html_type_a(soup), html_type
    elif html_type == "B":
        return parse_html_type_b_oneway(soup), html_type
    elif html_type == "C":
        return parse_html_type_c(soup), html_type
    elif html_type in ("D", "D_noId"):
        return parse_html_type_d(soup), html_type
    else:
        return [], "unknown"


def update_db(route_number, parsed_stops):
    updated = 0
    skipped = 0

    with engine.begin() as conn:
        for s in parsed_stops:
            result = conn.execute(
                text("""
                    UPDATE bus_route_stops
                    SET stop_name = :stop_name,
                        stop_code = :stop_code
                    WHERE route_number = :route_number
                      AND direction    = :direction
                      AND stop_order   = :stop_order
                """),
                {
                    "route_number": route_number,
                    "direction": s["direction"],
                    "stop_order": s["stop_order"],
                    "stop_name": s["stop_name"],
                    "stop_code": s["stop_code"],
                }
            )
            if result.rowcount > 0:
                updated += result.rowcount
            else:
                skipped += 1

    return updated, skipped


def main():
    html_files = get_html_files()
    if not html_files:
        print("[ERROR] HTML 파일을 찾을 수 없습니다.")
        sys.exit(1)

    print(f"[INFO] HTML 파일 {len(html_files)}개 발견\n")

    total_updated = 0
    total_skipped = 0

    for route_number, filepath in html_files:
        print(f"[{route_number}번] {os.path.basename(filepath)}")
        parsed, html_type = parse_html(route_number, filepath)

        if not parsed:
            print(f"  타입={html_type} | 파싱 결과 없음 - HTML 구조 재확인 필요")
            continue

        down_cnt = sum(1 for s in parsed if s["direction"] == "down")
        up_cnt   = sum(1 for s in parsed if s["direction"] == "up")
        print(f"  타입={html_type} | down {down_cnt}개, up {up_cnt}개 파싱 완료")

        # 샘플 3개 출력
        for s in parsed[:3]:
            code_str = f" [{s['stop_code']}]" if s['stop_code'] else " [번호없음]"
            print(f"     {s['direction']} #{s['stop_order']:2d}  {s['stop_name']}{code_str}")

        updated, skipped = update_db(route_number, parsed)
        total_updated += updated
        total_skipped += skipped
        print(f"  → DB 업데이트: {updated}건, 매칭 없음(skip): {skipped}건")

    print(f"\n[완료] 총 업데이트: {total_updated}건, 총 skip: {total_skipped}건")


if __name__ == "__main__":
    main()
