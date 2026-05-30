from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import User, UserType, Post, DailyAnswer, AnswerReaction
from app.auth import require_user, hash_password, verify_password

router = APIRouter(prefix="/users", tags=["사용자"])


class UserProfile(BaseModel):
    id: int
    nickname: str
    user_type: str
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


class PasswordUpdateRequest(BaseModel):
    current_password: str
    new_password: str


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
    if not village:
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
