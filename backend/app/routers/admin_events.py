from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_user
from app.database import get_db
from app.models.models import User, UserSavedEvent
from app.supabase_client import get_supabase

router = APIRouter(prefix="/admin-events", tags=["admin_events"])


class AdminEventOut(BaseModel):
    id: int
    event_date: str
    event_time: str
    title: str
    place: Optional[str] = None
    attendees: Optional[int] = None
    department: Optional[str] = None
    created_at: str


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


@router.get("", response_model=List[AdminEventOut], summary="행정 일정 목록")
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
    return result.data


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
