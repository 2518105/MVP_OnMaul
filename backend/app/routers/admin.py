from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    Notice, MeetingMinutes, CalendarEvent,
    NoticeCategory, ScheduleType, User
)
from app.auth import get_current_user, require_user, require_admin
from app.crawlers.external_notices import ExternalNoticeCrawler

router = APIRouter(prefix="/admin", tags=["행정"])


# ---------- Schemas ----------

class NoticeOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    author_nickname: str
    is_pinned: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NoticeCreate(BaseModel):
    title: str
    content: str
    category: NoticeCategory
    is_pinned: bool = False


class MeetingOut(BaseModel):
    id: int
    title: str
    content: str
    meeting_date: datetime
    author_nickname: str
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingCreate(BaseModel):
    title: str
    content: str
    meeting_date: datetime


class EventOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    event_date: datetime
    event_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: datetime
    event_type: ScheduleType

# 외부 공지(크롤링) 업서트용 스키마
class ExternalNoticeUpsert(BaseModel):
    external_id: str  # 외부 게시판의 고유 ID
    title: str
    published_at: Optional[datetime] = None
    view_count: int = 0
    source_url: str  # 원본 공지 URL
    content: str
    category: NoticeCategory
    is_external: bool = True


# ---------- Public External Notices API ----------

class ExternalNoticeListOut(BaseModel):
    id: int
    title: str
    published_at: Optional[datetime] = None
    view_count: int
    source_url: str
    external_id: str

    class Config:
        from_attributes = True


# ---------- Notices ----------

@router.get("/notices", response_model=List[NoticeOut], summary="공지사항 목록")
def list_notices(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Notice)
    if category:
        q = q.filter(Notice.category == category)
    notices = q.order_by(Notice.is_pinned.desc(), Notice.created_at.desc()).all()
    return [
        NoticeOut(
            id=n.id, title=n.title, content=n.content,
            category=n.category.value, author_nickname=n.author.nickname,
            is_pinned=n.is_pinned, created_at=n.created_at,
        )
        for n in notices
    ]


@router.get("/notices/{notice_id}", response_model=NoticeOut, summary="공지사항 상세")
def get_notice(notice_id: int, db: Session = Depends(get_db)):
    n = db.query(Notice).filter(Notice.id == notice_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다")
    return NoticeOut(
        id=n.id, title=n.title, content=n.content,
        category=n.category.value, author_nickname=n.author.nickname,
        is_pinned=n.is_pinned, created_at=n.created_at,
    )


@router.post("/notices", response_model=NoticeOut, summary="공지사항 작성 (관리자)")
def create_notice(
    req: NoticeCreate,
    db: Session = Depends(get_db),
    
):
    notice = Notice(
        title=req.title, content=req.content,
        category=req.category, is_pinned=req.is_pinned,
        author_id=current_user.id,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return NoticeOut(
        id=notice.id, title=notice.title, content=notice.content,
        category=notice.category.value, author_nickname=current_user.nickname,
        is_pinned=notice.is_pinned, created_at=notice.created_at,
    )


# ---------- Meeting Minutes ----------

@router.get("/meetings", response_model=List[MeetingOut], summary="회의록 목록")
def list_meetings(db: Session = Depends(get_db)):
    meetings = db.query(MeetingMinutes).order_by(MeetingMinutes.meeting_date.desc()).all()
    return [
        MeetingOut(
            id=m.id, title=m.title, content=m.content,
            meeting_date=m.meeting_date, author_nickname=m.author.nickname,
            created_at=m.created_at,
        )
        for m in meetings
    ]


@router.get("/meetings/{meeting_id}", response_model=MeetingOut, summary="회의록 상세")
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    m = db.query(MeetingMinutes).filter(MeetingMinutes.id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="회의록을 찾을 수 없습니다")
    return MeetingOut(
        id=m.id, title=m.title, content=m.content,
        meeting_date=m.meeting_date, author_nickname=m.author.nickname,
        created_at=m.created_at,
    )


@router.post("/meetings", response_model=MeetingOut, summary="회의록 작성 (관리자)")
def create_meeting(
    req: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    m = MeetingMinutes(
        title=req.title, content=req.content,
        meeting_date=req.meeting_date, author_id=current_user.id,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return MeetingOut(
        id=m.id, title=m.title, content=m.content,
        meeting_date=m.meeting_date, author_nickname=current_user.nickname,
        created_at=m.created_at,
    )


# ---------- Calendar ----------

@router.get("/calendar", response_model=List[EventOut], summary="캘린더 일정 목록")
def list_events(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(CalendarEvent)
    if year and month:
        from sqlalchemy import extract
        q = q.filter(
            extract("year", CalendarEvent.event_date) == year,
            extract("month", CalendarEvent.event_date) == month,
        )
    events = q.order_by(CalendarEvent.event_date).all()
    return [
        EventOut(
            id=e.id, title=e.title, description=e.description,
            event_date=e.event_date, event_type=e.event_type.value,
            created_at=e.created_at,
        )
        for e in events
    ]


@router.post("/calendar", response_model=EventOut, summary="일정 등록 (관리자)")
def create_event(
    req: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    event = CalendarEvent(
        title=req.title, description=req.description,
        event_date=req.event_date, event_type=req.event_type,
        author_id=current_user.id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventOut(
        id=event.id, title=event.title, description=event.description,
        event_date=event.event_date, event_type=event.event_type.value,
        created_at=event.created_at,
    )
# ---------- External Notices (크롤링된 공지) ----------

@router.post("/external-notices/upsert", response_model=NoticeOut, summary="외부 공지 업서트")
def upsert_external_notice(
    req: ExternalNoticeUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    외부에서 크롤링한 공지를 업서트합니다.
    - external_id가 있으면 기존 레코드를 갱신
    - external_id가 없으면 새로 생성
    """
    # external_id로 기존 공지 찾기
    existing = db.query(Notice).filter(Notice.external_id == req.external_id).first()
    
    if existing:
        # 기존 레코드 갱신
        existing.title = req.title
        existing.content = req.content
        existing.category = req.category
        existing.published_at = req.published_at
        existing.view_count = req.view_count
        existing.source_url = req.source_url
        existing.is_external = req.is_external
        notice = existing
    else:
        # 새 레코드 생성
        notice = Notice(
            title=req.title,
            content=req.content,
            category=req.category,
            published_at=req.published_at,
            view_count=req.view_count,
            source_url=req.source_url,
            external_id=req.external_id,
            is_external=req.is_external,
            author_id=current_user.id,  # 크롤러 실행 관리자를 저자로 설정
        )
        db.add(notice)
    
    db.commit()
    db.refresh(notice)
    
    return NoticeOut(
        id=notice.id,
        title=notice.title,
        content=notice.content,
        category=notice.category.value,
        author_nickname=notice.author.nickname,
        is_pinned=notice.is_pinned,
        created_at=notice.created_at,
    )

@router.post("/trigger-crawl", summary="외부 공지 크롤링 트리거")
def trigger_crawl(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    옥천군 청산면 공지사항을 크롤링해 DB에 업서트합니다.
    (관리자만 실행 가능)
    """
    try:
        # 크롤러 실행
        crawler = ExternalNoticeCrawler()
        notices = crawler.fetch_notices()
        
        # DB에 업서트
        crawler.upsert_to_db(notices, current_user.id)
        
        return {
            "status": "success",
            "message": f"{len(notices)}건의 공지가 수집되었습니다",
            "count": len(notices),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"크롤링 실패: {str(e)}")

# ---------- Public External Notices API ----------

@router.get("/external-notices", response_model=List[ExternalNoticeListOut], summary="외부 공지 목록 (공개)")
def list_external_notices(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    크롤링된 외부 공지 목록 (최신순)
    - 페이지네이션: page, limit
    - 응답: 최신 공지부터 표시
    """
    # 페이지 계산
    offset = (page - 1) * limit
    
    # 외부 공지만 조회 (is_external=True)
    notices = db.query(Notice).filter(
        Notice.is_external == True
    ).order_by(
        Notice.published_at.desc()  # 최신순
    ).offset(offset).limit(limit).all()
    
    return [
        ExternalNoticeListOut(
            id=n.id,
            title=n.title,
            published_at=n.published_at,
            view_count=n.view_count,
            source_url=n.source_url,
            external_id=n.external_id,
        )
        for n in notices
    ]