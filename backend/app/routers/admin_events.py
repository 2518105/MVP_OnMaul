from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import get_current_user, require_user
from app.models.models import User
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
