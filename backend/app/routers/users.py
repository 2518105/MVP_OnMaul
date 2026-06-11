from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from sqlalchemy import func, distinct
from app.database import get_db
from app.models.models import User, UserType, Post, PostLike, DailyAnswer, AnswerReaction, UserSavedEvent, Comment, EventLog
from app.auth import require_user, hash_password, verify_password

router = APIRouter(prefix="/users", tags=["사용자"])


class UserProfile(BaseModel):
    id: int
    nickname: str
    user_type: str
    photo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PostSummary(BaseModel):
    id: int
    title: str
    category: str
    like_count: int
    view_count: int
    comment_count: int
    created_at: datetime


class AnswerSummary(BaseModel):
    id: int
    question_id: int
    content: Optional[str]
    media_url: Optional[str]
    like_count: int
    created_at: datetime


class NicknameUpdateRequest(BaseModel):
    nickname: str


class ProfileUpdateRequest(BaseModel):
    nickname: str
    user_type: str


class PasswordUpdateRequest(BaseModel):
    current_password: str
    new_password: str


class PhotoUpdateRequest(BaseModel):
    photo_url: str


class OnboardingRequest(BaseModel):
    nickname: str
    resident_type: str  # "이주민" | "주민"
    village_name: str


@router.get("/check-nickname", summary="닉네임 중복 확인")
def check_nickname(nickname: str, db: Session = Depends(get_db)):
    trimmed = nickname.strip()
    if len(trimmed) < 2:
        return {"available": False, "reason": "닉네임은 2자 이상이어야 합니다"}
    exists = db.query(User).filter(User.nickname == trimmed).first() is not None
    return {"available": not exists}


@router.patch("/me/onboarding", summary="온보딩 정보 저장")
def complete_onboarding(
    req: OnboardingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    nickname = req.nickname.strip()
    if len(nickname) < 2:
        raise HTTPException(status_code=400, detail="닉네임은 2자 이상 입력해주세요")

    duplicate = db.query(User).filter(
        User.nickname == nickname,
        User.id != current_user.id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다")

    try:
        user_type = UserType(req.resident_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="올바른 주민 유형을 선택해주세요")

    village = req.village_name.strip()
    if req.resident_type == "주민" and not village:
        raise HTTPException(status_code=400, detail="마을 이름을 입력해주세요")

    current_user.nickname = nickname
    current_user.user_type = user_type
    current_user.village_name = village
    current_user.onboarding_completed = True
    db.commit()
    db.refresh(current_user)

    return {
        "nickname": current_user.nickname,
        "user_type": current_user.user_type.value,
        "village_name": current_user.village_name,
        "onboarding_completed": True,
    }


@router.get("/me", response_model=UserProfile, summary="내 프로필")
def get_my_profile(current_user: User = Depends(require_user)):
    return UserProfile(
        id=current_user.id,
        nickname=current_user.nickname,
        user_type=current_user.user_type.value,
        photo_url=current_user.photo_url,
        created_at=current_user.created_at,
    )


@router.patch("/me/profile", response_model=UserProfile, summary="프로필 수정 (닉네임 + 주민유형)")
def update_profile(
    req: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    nickname = req.nickname.strip()
    if len(nickname) < 2:
        raise HTTPException(status_code=400, detail="닉네임은 2자 이상 입력해주세요")
    duplicate = db.query(User).filter(User.nickname == nickname, User.id != current_user.id).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다")
    try:
        user_type = UserType(req.user_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="올바른 주민 유형을 선택해주세요")
    current_user.nickname = nickname
    current_user.user_type = user_type
    db.commit()
    db.refresh(current_user)
    return UserProfile(
        id=current_user.id,
        nickname=current_user.nickname,
        user_type=current_user.user_type.value,
        photo_url=current_user.photo_url,
        created_at=current_user.created_at,
    )


@router.patch("/me/nickname", response_model=UserProfile, summary="닉네임 수정")
def update_nickname(
    req: NicknameUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    if not req.nickname.strip():
        raise HTTPException(status_code=400, detail="닉네임을 입력해주세요")
    current_user.nickname = req.nickname.strip()
    db.commit()
    db.refresh(current_user)
    return UserProfile(
        id=current_user.id,
        nickname=current_user.nickname,
        user_type=current_user.user_type.value,
        created_at=current_user.created_at,
    )


@router.patch("/me/photo", summary="프로필 사진 URL 업데이트")
def update_photo(
    req: PhotoUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    current_user.photo_url = req.photo_url or None
    db.commit()
    return {"photo_url": current_user.photo_url}


@router.post("/me/photo/upload", summary="프로필 사진 파일 업로드 (Base64)")
async def upload_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    import base64
    content = await file.read()
    mime_type = file.content_type or "image/jpeg"
    encoded = base64.b64encode(content).decode("utf-8")
    data_url = f"data:{mime_type};base64,{encoded}"
    current_user.photo_url = data_url
    db.commit()
    return {"photo_url": data_url}


@router.patch("/me/password", summary="비밀번호 변경")
def update_password(
    req: PasswordUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    if current_user.hashed_password and not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 틀렸습니다")
    current_user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"message": "비밀번호가 변경됐습니다"}


@router.get("/me/posts", response_model=List[PostSummary], summary="내가 쓴 게시글")
def get_my_posts(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    posts = (
        db.query(Post)
        .options(joinedload(Post.comments))
        .filter(Post.author_id == current_user.id)
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        PostSummary(
            id=p.id,
            title=p.title,
            category=p.category,
            like_count=p.like_count,
            view_count=p.view_count,
            comment_count=len(p.comments),
            created_at=p.created_at,
        )
        for p in posts
    ]


@router.get("/me/liked-posts", response_model=List[PostSummary], summary="좋아요 한 게시글")
def get_liked_posts(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    liked = (
        db.query(Post)
        .join(PostLike, PostLike.post_id == Post.id)
        .options(joinedload(Post.comments))
        .filter(PostLike.user_id == current_user.id)
        .order_by(PostLike.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        PostSummary(
            id=p.id,
            title=p.title,
            category=p.category,
            like_count=p.like_count,
            view_count=p.view_count,
            comment_count=len(p.comments),
            created_at=p.created_at,
        )
        for p in liked
    ]


@router.get("/me/answers", response_model=List[AnswerSummary], summary="내 한마디 답변")
def get_my_answers(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    answers = (
        db.query(DailyAnswer)
        .options(joinedload(DailyAnswer.reactions))
        .filter(DailyAnswer.user_id == current_user.id)
        .order_by(DailyAnswer.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        AnswerSummary(
            id=a.id,
            question_id=a.question_index,
            content=a.content,
            media_url=a.media_url,
            like_count=len([r for r in a.reactions if r.type == "like"]),
            created_at=a.created_at,
        )
        for a in answers
    ]


class SavedEventOut(BaseModel):
    id: int
    admin_event_id: int
    title: str
    event_date: str
    event_time: Optional[str]
    place: Optional[str]
    department: Optional[str]


@router.get("/me/saved-events", response_model=List[SavedEventOut], summary="내가 저장한 일정")
def get_saved_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    rows = db.query(UserSavedEvent).filter(
        UserSavedEvent.user_id == current_user.id
    ).order_by(UserSavedEvent.event_date).all()
    return [
        SavedEventOut(
            id=r.id,
            admin_event_id=r.admin_event_id,
            title=r.title,
            event_date=r.event_date,
            event_time=r.event_time,
            place=r.place,
            department=r.department,
        )
        for r in rows
    ]


class MedalOut(BaseModel):
    key: str
    name: str
    sprite_key: str
    level: Optional[str]  # null | "bronze" | "silver" | "gold"
    count: int
    thresholds: List[int]


class MedalsResponse(BaseModel):
    medals: List[MedalOut]
    is_mvp: bool


def _get_level(count: int, thresholds: List[int]) -> Optional[str]:
    if count >= thresholds[2]:
        return "gold"
    if count >= thresholds[1]:
        return "silver"
    if count >= thresholds[0]:
        return "bronze"
    return None


@router.get("/me/medals", response_model=MedalsResponse, summary="나의 마을 메달")
def get_my_medals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    uid = current_user.id

    attendance = db.query(func.count(distinct(func.date(EventLog.created_at)))).filter(
        EventLog.user_id == uid,
        EventLog.event_key == "daily_visit",
    ).scalar() or 0

    comment_count = db.query(func.count(Comment.id)).filter(
        Comment.author_id == uid
    ).scalar() or 0

    info_post_count = db.query(func.count(Post.id)).filter(
        Post.author_id == uid,
        Post.category == "동네 정보",
    ).scalar() or 0

    photo_post_count = db.query(func.count(Post.id)).filter(
        Post.author_id == uid,
        Post.image_url.isnot(None),
    ).scalar() or 0

    question_count = db.query(func.count(Post.id)).filter(
        Post.author_id == uid,
        Post.category == "질문",
    ).scalar() or 0

    share_count = db.query(func.count(Post.id)).filter(
        Post.author_id == uid,
        Post.category == "나눔·거래",
    ).scalar() or 0

    hanmadi_count = db.query(func.count(DailyAnswer.id)).filter(
        DailyAnswer.user_id == uid
    ).scalar() or 0

    MEDALS = [
        {"key": "탐구왕",    "name": "청산 탐구왕",         "sprite_key": "탐구왕",    "count": question_count,   "thresholds": [3, 5, 10]},
        {"key": "이야기보따리","name": "청산 이야기 보따리",   "sprite_key": "이야기보따리","count": hanmadi_count,    "thresholds": [3, 5, 10]},
        {"key": "순간포착장인","name": "청산 순간포착 장인",   "sprite_key": "순간포착장인","count": photo_post_count, "thresholds": [3, 5, 10]},
        {"key": "박사",      "name": "청산 박사",           "sprite_key": "박사",      "count": info_post_count,  "thresholds": [3, 5, 10]},
        {"key": "사랑꾼",    "name": "청산 사랑꾼",         "sprite_key": "사랑꾼",    "count": attendance,       "thresholds": [5, 10, 15]},
        {"key": "말벗",      "name": "청산 말벗",           "sprite_key": "말벗",      "count": comment_count,    "thresholds": [3, 7, 15]},
        {"key": "나눔꾼",    "name": "청산 나눔꾼",         "sprite_key": "나눔꾼",    "count": share_count,      "thresholds": [3, 5, 10]},
    ]

    result = []
    gold_count = 0
    for m in MEDALS:
        level = _get_level(m["count"], m["thresholds"])
        if level == "gold":
            gold_count += 1
        result.append(MedalOut(
            key=m["key"],
            name=m["name"],
            sprite_key=m["sprite_key"],
            level=level,
            count=m["count"],
            thresholds=m["thresholds"],
        ))

    return MedalsResponse(medals=result, is_mvp=(gold_count == 7))


@router.delete("/me", summary="회원 탈퇴")
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    import os
    from app.models.models import (
        Post, Comment, PostLike, BusVote,
        DailyAnswer, AnswerReaction, Notice,
        CalendarEvent, MeetingMinutes, EventLog,
    )
    uid = current_user.id

    # 삭제할 파일 URL 수집 (DB 삭제 전에 먼저 모아둠)
    file_urls = []
    posts = db.query(Post).filter(Post.author_id == uid).all()
    for post in posts:
        if post.image_url:
            file_urls.append(post.image_url)
    answers = db.query(DailyAnswer).filter(DailyAnswer.user_id == uid).all()
    for ans in answers:
        if ans.media_url:
            file_urls.append(ans.media_url)

    # 내가 쓴 게시글의 댓글·좋아요 (다른 사람 것 포함) 먼저 삭제
    for post in posts:
        db.query(Comment).filter(Comment.post_id == post.id).delete()
        db.query(PostLike).filter(PostLike.post_id == post.id).delete()
        db.delete(post)

    # 내가 단 댓글
    db.query(Comment).filter(Comment.author_id == uid).delete()
    # 내가 누른 좋아요
    db.query(PostLike).filter(PostLike.user_id == uid).delete()
    # 버스 투표
    db.query(BusVote).filter(BusVote.user_id == uid).delete()
    # 한마디 반응 (다른 사람 답변에 단 것)
    db.query(AnswerReaction).filter(AnswerReaction.user_id == uid).delete()
    # 내 한마디 답변 + 그 반응
    for ans in answers:
        db.query(AnswerReaction).filter(AnswerReaction.answer_id == ans.id).delete()
        db.delete(ans)
    # 공지·일정·회의록
    db.query(Notice).filter(Notice.author_id == uid).delete()
    db.query(CalendarEvent).filter(CalendarEvent.author_id == uid).delete()
    db.query(MeetingMinutes).filter(MeetingMinutes.author_id == uid).delete()
    # 이벤트 로그
    db.query(EventLog).filter(EventLog.user_id == uid).delete()

    db.delete(current_user)
    db.commit()

    # DB 커밋 후 Supabase Storage 파일 삭제
    if file_urls:
        try:
            from app.supabase_client import get_supabase, STORAGE_BUCKET
            supabase = get_supabase()
            # URL에서 파일명만 추출 (https://.../uploads/filename → filename)
            filenames = [url.rsplit("/", 1)[-1].split("?")[0] for url in file_urls]
            supabase.storage.from_(STORAGE_BUCKET).remove(filenames)
        except Exception:
            pass

    return {"ok": True}
