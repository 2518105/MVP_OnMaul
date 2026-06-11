import os
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List

KST = timezone(timedelta(hours=9))

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload, selectinload

from app.auth import get_current_user, require_user
from app.database import get_db
from app.models.models import User, DailyAnswer, AnswerReaction, HanMadiQuestion
from app.supabase_client import upload_file

router = APIRouter(prefix="/hanmadi", tags=["한마디"])


def get_question_for_date(questions: list, target_date: date) -> HanMadiQuestion:
    if not questions:
        return None
    days_since_epoch = (target_date - date(2024, 1, 1)).days
    idx = days_since_epoch % len(questions)
    return questions[idx]


def get_today_question(db) -> HanMadiQuestion:
    questions = db.query(HanMadiQuestion).filter(HanMadiQuestion.is_active == True).order_by(HanMadiQuestion.order_index).all()
    return get_question_for_date(questions, datetime.now(KST).date())


# ---------- Schemas ----------

class AnswerOut(BaseModel):
    id: int
    question_id: int
    author_nickname: str
    author_type: str
    author_photo: Optional[str] = None
    content: Optional[str]
    media_url: Optional[str]
    created_at: datetime
    like_count: int
    comment_count: int
    is_liked: bool = False
    is_mine: bool = False

    class Config:
        from_attributes = True


class TodayOut(BaseModel):
    question_id: int
    question_text: str
    answer_type: str
    answers: List[AnswerOut]


class MyAnswerItem(BaseModel):
    id: int
    content: Optional[str]
    media_url: Optional[str]
    created_at: datetime
    like_count: int


class MyAnswerGroup(BaseModel):
    question_id: int
    question_text: str
    answers: List[MyAnswerItem]


class WeeklyQuestionItem(BaseModel):
    date: str
    weekday: str
    question_id: int
    question_text: str
    answer_count: int
    is_today: bool


class CommentReq(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: int
    author_nickname: str
    author_photo: Optional[str] = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnswerUpdateReq(BaseModel):
    content: Optional[str] = None


# ---------- Helpers ----------

def _build_answer_out(answer: DailyAnswer, current_user: Optional[User]) -> AnswerOut:
    likes = [r for r in answer.reactions if r.type == "like"]
    comments = [r for r in answer.reactions if r.type == "comment"]
    is_liked = current_user is not None and any(r.user_id == current_user.id for r in likes)
    is_mine = current_user is not None and answer.user_id == current_user.id
    return AnswerOut(
        id=answer.id,
        question_id=answer.question_index,
        author_nickname=answer.user.nickname,
        author_type=answer.user.user_type.value,
        author_photo=answer.user.photo_url,
        content=answer.content,
        media_url=answer.media_url,
        created_at=answer.created_at,
        like_count=len(likes),
        comment_count=len(comments),
        is_liked=is_liked,
        is_mine=is_mine,
    )


# ---------- Endpoints ----------

@router.get("/my-answers", response_model=List[MyAnswerGroup], summary="내 답변 목록 (질문별 그룹)")
def get_my_answers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    from collections import defaultdict
    answers = (
        db.query(DailyAnswer)
        .options(selectinload(DailyAnswer.reactions))
        .filter(DailyAnswer.user_id == current_user.id)
        .order_by(DailyAnswer.created_at.desc())
        .all()
    )

    groups: dict = defaultdict(list)
    for a in answers:
        groups[a.question_index].append(a)

    result = []
    for question_id, ans_list in groups.items():
        q = db.query(HanMadiQuestion).filter(HanMadiQuestion.id == question_id).first()
        if not q:
            continue
        result.append(MyAnswerGroup(
            question_id=question_id,
            question_text=q.text,
            answers=[
                MyAnswerItem(
                    id=a.id,
                    content=a.content,
                    media_url=a.media_url,
                    created_at=a.created_at,
                    like_count=len([r for r in a.reactions if r.type == "like"]),
                )
                for a in ans_list
            ],
        ))
    return result


@router.get("/weekly", response_model=List[WeeklyQuestionItem], summary="이번 주 질문 목록")
def get_weekly(db: Session = Depends(get_db)):
    questions = db.query(HanMadiQuestion).filter(HanMadiQuestion.is_active == True).order_by(HanMadiQuestion.order_index).all()
    if not questions:
        return []

    today_kst = datetime.now(KST).date()
    monday = today_kst - timedelta(days=today_kst.weekday())
    weekday_names = ["월", "화", "수", "목", "금", "토", "일"]

    result = []
    for i in range(7):
        d = monday + timedelta(days=i)
        q = get_question_for_date(questions, d)
        answer_count = db.query(DailyAnswer).filter(DailyAnswer.question_index == q.id).count()
        result.append(WeeklyQuestionItem(
            date=d.isoformat(),
            weekday=weekday_names[i],
            question_id=q.id,
            question_text=q.text,
            answer_count=answer_count,
            is_today=(d == today_kst),
        ))
    return result


@router.get("/today", response_model=TodayOut, summary="오늘의 질문 + 최근 답변 3개")
def get_today(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    q = get_today_question(db)
    if not q:
        raise HTTPException(status_code=404, detail="질문이 없습니다")

    answers = (
        db.query(DailyAnswer)
        .options(selectinload(DailyAnswer.reactions), selectinload(DailyAnswer.user))
        .filter(DailyAnswer.question_index == q.id)
        .order_by(DailyAnswer.created_at.desc())
        .limit(3)
        .all()
    )

    return TodayOut(
        question_id=q.id,
        question_text=q.text,
        answer_type=q.answer_type,
        answers=[_build_answer_out(a, current_user) for a in answers],
    )


@router.get("/answers", response_model=List[AnswerOut], summary="특정 질문의 전체 답변")
def list_answers(
    question_id: int = Query(...),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    answers = (
        db.query(DailyAnswer)
        .options(joinedload(DailyAnswer.reactions), joinedload(DailyAnswer.user))
        .filter(DailyAnswer.question_index == question_id)
        .order_by(DailyAnswer.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_build_answer_out(a, current_user) for a in answers]


@router.post("/answers", response_model=AnswerOut, summary="답변 등록")
async def create_answer(
    question_id: int = Form(...),
    content: Optional[str] = Form(None),
    media: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    media_url = None
    if media and media.filename:
        media_url = await upload_file(media)

    answer = DailyAnswer(
        user_id=current_user.id,
        question_index=question_id,
        content=content or None,
        media_url=media_url,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)

    return AnswerOut(
        id=answer.id,
        question_id=answer.question_index,
        author_nickname=current_user.nickname,
        author_type=current_user.user_type.value,
        author_photo=current_user.photo_url,
        content=answer.content,
        media_url=answer.media_url,
        created_at=answer.created_at,
        like_count=0,
        comment_count=0,
        is_liked=False,
    )


@router.patch("/answers/{answer_id}", response_model=AnswerOut, summary="답변 수정")
def update_answer(
    answer_id: int,
    req: AnswerUpdateReq,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    answer = db.query(DailyAnswer).options(
        joinedload(DailyAnswer.reactions), joinedload(DailyAnswer.user)
    ).filter(DailyAnswer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="답변을 찾을 수 없습니다")
    if answer.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    if req.content is not None:
        answer.content = req.content
    db.commit()
    answer = db.query(DailyAnswer).options(
        joinedload(DailyAnswer.reactions), joinedload(DailyAnswer.user)
    ).filter(DailyAnswer.id == answer_id).first()
    return _build_answer_out(answer, current_user)


@router.delete("/answers/{answer_id}", summary="답변 삭제")
def delete_answer(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    answer = db.query(DailyAnswer).filter(DailyAnswer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="답변을 찾을 수 없습니다")
    if answer.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    db.delete(answer)
    db.commit()
    return {"ok": True}


@router.post("/answers/{answer_id}/like", summary="좋아요 토글")
def toggle_like(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    answer = db.query(DailyAnswer).filter(DailyAnswer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="답변을 찾을 수 없습니다")

    existing = (
        db.query(AnswerReaction)
        .filter(
            AnswerReaction.answer_id == answer_id,
            AnswerReaction.user_id == current_user.id,
            AnswerReaction.type == "like",
        )
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        db.add(AnswerReaction(
            answer_id=answer_id,
            user_id=current_user.id,
            type="like",
        ))
        db.commit()
        liked = True

    like_count = (
        db.query(AnswerReaction)
        .filter(AnswerReaction.answer_id == answer_id, AnswerReaction.type == "like")
        .count()
    )

    return {"liked": liked, "like_count": like_count}


@router.get("/answers/{answer_id}/comments", response_model=List[CommentOut], summary="댓글 목록")
def get_comments(
    answer_id: int,
    db: Session = Depends(get_db),
):
    comments = (
        db.query(AnswerReaction)
        .options(joinedload(AnswerReaction.user))
        .filter(AnswerReaction.answer_id == answer_id, AnswerReaction.type == "comment")
        .order_by(AnswerReaction.created_at.asc())
        .all()
    )
    return [
        CommentOut(
            id=c.id,
            author_nickname=c.user.nickname,
            author_photo=c.user.photo_url,
            content=c.content,
            created_at=c.created_at,
        )
        for c in comments
    ]


@router.post("/answers/{answer_id}/comments", response_model=CommentOut, summary="댓글 달기")
def add_comment(
    answer_id: int,
    req: CommentReq,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    answer = db.query(DailyAnswer).filter(DailyAnswer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="답변을 찾을 수 없습니다")

    reaction = AnswerReaction(
        answer_id=answer_id,
        user_id=current_user.id,
        type="comment",
        content=req.content,
    )
    db.add(reaction)
    db.commit()
    db.refresh(reaction)

    return CommentOut(
        id=reaction.id,
        author_nickname=current_user.nickname,
        author_photo=current_user.photo_url,
        content=reaction.content,
        created_at=reaction.created_at,
    )
