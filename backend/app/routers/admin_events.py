# curl 테스트:
#   전체 목록: curl https://onmaeul.onrender.com/api/admin-events
#   날짜 범위: curl "https://onmaeul.onrender.com/api/admin-events?start=2026-01-01&end=2026-12-31"

import os
from typing import Optional, List

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_user, require_admin
from app.database import get_db
from app.models.models import User, UserSavedEvent
from app.supabase_client import get_supabase
from app.crawlers.weekly_events import WeeklyEventCrawler

router = APIRouter(prefix="/admin-events", tags=["admin_events"])


class AdminEventOut(BaseModel):
    id: int
    event_date: str
    event_time: Optional[str] = None
    title: str
    place: Optional[str] = None
    attendees: Optional[int] = None
    department: Optional[str] = None
    created_at: Optional[str] = None


class AdminEventIn(BaseModel):
    event_date: str
    event_time: str
    title: str
    place: Optional[str] = None
    attendees: Optional[int] = None
    department: Optional[str] = None


class SaveEventRequest(BaseModel):
    title: str
    event_date: str
    event_time: Optional[str] = None
    place: Optional[str] = None
    department: Optional[str] = None


@router.get("", summary="행정 일정 목록")
def list_admin_events(
    start: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    sb = get_supabase()
    q = sb.table("admin_events").select("*").order("event_date").order("event_time")
    if start:
        q = q.gte("event_date", start)
    if end:
        q = q.lte("event_date", end)
    result = q.execute()
    rows = result.data or []
    print(f"[admin-events] 조회 결과: {len(rows)}건 (start={start}, end={end})")
    return [
        {
            "id": r.get("id"),
            "event_date": str(r["event_date"]) if r.get("event_date") else "",
            "event_time": str(r["event_time"]) if r.get("event_time") else None,
            "title": r.get("title", ""),
            "place": r.get("place"),
            "attendees": r.get("attendees"),
            "department": r.get("department"),
            "created_at": str(r["created_at"]) if r.get("created_at") else None,
        }
        for r in rows
    ]


@router.post("", response_model=AdminEventOut, summary="행정 일정 등록 (관리자)")
def create_admin_event(
    body: AdminEventIn,
    current_user: User = Depends(require_user),
):
    if current_user.user_type.value != "관리자":
        raise HTTPException(status_code=403, detail="관리자만 등록할 수 있습니다")
    sb = get_supabase()
    result = sb.table("admin_events").insert(body.dict()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="이벤트 생성 실패")
    return result.data[0]


@router.delete("/{event_id}", summary="행정 일정 삭제 (관리자)")
def delete_admin_event(
    event_id: int,
    current_user: User = Depends(require_user),
):
    if current_user.user_type.value != "관리자":
        raise HTTPException(status_code=403, detail="관리자만 삭제할 수 있습니다")
    sb = get_supabase()
    sb.table("admin_events").delete().eq("id", event_id).execute()
    return {"ok": True}


@router.post("/{event_id}/save", summary="행정 일정 내 일정에 저장")
def save_admin_event(
    event_id: int,
    body: SaveEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    existing = db.query(UserSavedEvent).filter(
        UserSavedEvent.user_id == current_user.id,
        UserSavedEvent.admin_event_id == event_id,
    ).first()
    if existing:
        return {"ok": True, "saved": True}
    saved = UserSavedEvent(
        user_id=current_user.id,
        admin_event_id=event_id,
        title=body.title,
        event_date=body.event_date,
        event_time=body.event_time,
        place=body.place,
        department=body.department,
    )
    db.add(saved)
    db.commit()
    return {"ok": True, "saved": True}


@router.delete("/{event_id}/save", summary="행정 일정 내 일정에서 제거")
def unsave_admin_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    db.query(UserSavedEvent).filter(
        UserSavedEvent.user_id == current_user.id,
        UserSavedEvent.admin_event_id == event_id,
    ).delete()
    db.commit()
    return {"ok": True, "saved": False}


@router.get("/saved-ids", summary="내가 저장한 행정 일정 ID 목록")
def get_saved_event_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
) -> List[int]:
    rows = db.query(UserSavedEvent.admin_event_id).filter(
        UserSavedEvent.user_id == current_user.id
    ).all()
    return [r[0] for r in rows]


# ---------- 옥천군 주간행사계획 크롤링 ----------

class CrawlEventItem(BaseModel):
    event_date: str  # YYYY-MM-DD
    event_time: str  # HH:MM
    title: str
    place: Optional[str] = None
    attendees: Optional[int] = None
    department: Optional[str] = None


@router.post("/trigger-crawl", summary="옥천군 주간행사 크롤링 트리거 (관리자, 수동 테스트용)")
def trigger_crawl(current_user: User = Depends(require_admin)):
    """
    옥천군 주간행사계획(hwpx 첨부) 게시물을 크롤링해 admin_events에 반영합니다.
    (관리자만 실행 가능. Render 서버 IP가 차단될 수 있어 GitHub Actions의
    crawl-ingest 경로가 정식 경로이며, 이 엔드포인트는 로컬/수동 테스트용입니다.)
    """
    try:
        events = WeeklyEventCrawler.fetch_events()
        result = WeeklyEventCrawler.upsert_to_db(events)
        return {"status": "success", "count": len(events), **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"크롤링 실패: {str(e)}")


@router.post("/crawl-ingest", summary="GitHub Actions 주간행사 크롤링 데이터 수신")
def crawl_ingest(
    items: List[CrawlEventItem],
    x_crawl_secret: Optional[str] = Header(None),
):
    """
    GitHub Actions에서 크롤링/파싱한 주간행사를 수신해 admin_events에 반영합니다.
    X-Crawl-Secret 헤더로 인증합니다 (공지사항 크롤링과 동일한 시크릿 재사용).
    수신한 이벤트들의 날짜 범위(그 주 전체)에 해당하는 기존 행을 지우고 새로
    넣는 방식이라, 옥천군이 문서를 정정 게시해도 항상 최신 내용으로 맞춰집니다.
    """
    crawl_secret = os.environ.get("CRAWL_SECRET")
    if not crawl_secret or x_crawl_secret != crawl_secret:
        raise HTTPException(status_code=401, detail="인증 실패")

    events = [item.dict() for item in items]
    result = WeeklyEventCrawler.upsert_to_db(events)
    return {"status": "success", "total": len(events), **result}
