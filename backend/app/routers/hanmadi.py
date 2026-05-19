import os
import uuid
import time
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
import aiofiles
from datetime import datetime

from app.database import get_db
from app.models.models import DailyAnswer, AnswerReaction, User
from app.auth import get_current_user, require_user

router = APIRouter(prefix="/hanmadi", tags=["한마디"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

QUESTIONS = [
    # text 전용 (0-14)
    {"text": "오늘 청산면 날씨는 어때요?",                          "type": "text"},
    {"text": "청산면에서 가장 좋아하는 계절은?",                     "type": "text"},
    {"text": "청산면 살면서 제일 좋은 점은?",                        "type": "text"},
    {"text": "청산면에서 불편한 점이 있다면?",                       "type": "text"},
    {"text": "청산면에 새로 생겼으면 하는 시설은?",                  "type": "text"},
    {"text": "청산면에 이사 온 지 얼마나 됐어요?",                   "type": "text"},
    {"text": "요즘 가장 자주 가는 곳은 어디예요?",                   "type": "text"},
    {"text": "청산면에서 새로 시작하고 싶은 일이 있나요?",           "type": "text"},
    {"text": "일하면서 가장 보람 있는 순간은?",                      "type": "text"},
    {"text": "청산면에 새로 이사 온 분께 한마디 해준다면?",          "type": "text"},
    {"text": "청산면을 방문한 관광객에게 꼭 추천하고 싶은 것은?",   "type": "text"},
    {"text": "오늘 이웃과 나눈 이야기가 있나요?",                    "type": "text"},
    {"text": "요즘 즐겨 듣는 노래는?",                              "type": "text"},
    {"text": "쉬는 날 청산면에서 뭐 하세요?",                       "type": "text"},
    {"text": "오늘 청산면 이웃에게 전하고 싶은 말은?",              "type": "text"},
    # media 전용 (15-22)
    {"text": "오늘 청산면에서 찍은 사진 한 장 올려주세요!",         "type": "media"},
    {"text": "요즘 청산면에서 제일 예쁜 곳 찍어주세요",             "type": "media"},
    {"text": "오늘 밥상 사진 올려주세요",                           "type": "media"},
    {"text": "내가 좋아하는 청산면 풍경은?",                        "type": "media"},
    {"text": "요즘 농사 현장 사진 올려주세요",                      "type": "media"},
    {"text": "청산면 숨은 명소 사진 올려주세요",                    "type": "media"},
    {"text": "오늘 수확한 것 자랑해주세요!",                        "type": "media"},
    {"text": "청산면 봄/여름/가을/겨울 사진 한 장",                 "type": "media"},
    # both 가능 (23-29)
    {"text": "청산면에서 제일 맛있는 집은 어디예요?",               "type": "both"},
    {"text": "요즘 밥상에 자주 오르는 제철 재료는?",                "type": "both"},
    {"text": "직접 키우거나 만드는 음식이 있나요?",                 "type": "both"},
    {"text": "청산면 하면 떠오르는 것은?",                          "type": "both"},
    {"text": "청산면에 생겼으면 하는 음식점은?",                    "type": "both"},
    {"text": "청산면에서 꼭 가봐야 할 곳은?",                       "type": "both"},
    {"text": "오늘 어떤 일을 하셨나요?",                            "type": "both"},
]


def today_index() -> int:
    return int(time.time() / 86400) % 30


# ---------- Schemas ----------

class AnswerOut(BaseModel):
    id: int
    author_nickname: str
    author_type: str
    question_index: int
    content: Optional[str]
    media_url: Optional[str]
    created_at: datetime
    like_count: int
    comment_count: int
    is_liked: bool = False

    class Config:
        from_attributes = True


class TodayOut(BaseModel):
    question_index: int
    question_text: str
    answer_type: str
    answers: List[AnswerOut]


class CommentReq(BaseModel):
    content: str


# ---------- Helpers ----------

def _answer_out(answer: DailyAnswer, current_user: Optional[User]) -> AnswerOut:
    likes = [r for r in answer.reactions if r.type == "like"]
    comments = [r for r in answer.reactions if r.type == "comment"]
    is_liked = current_user is not None and any(r.user_id == current_user.id for r in likes)
    return AnswerOut(
        id=answer.id,
        author_nickname=answer.user.nickname,
        author_type=answer.user.user_type.value,
        question_index=answer.question_index,
        content=answer.content,
        media_url=answer.media_url,
        created_at=answer.created_at,
        like_count=len(likes),
        comment_count=len(comments),
        is_liked=is_liked,
    )


# ---------- Endpoints ----------

@router.get("/today", response_model=TodayOut, summary="오늘의 질문 + 최근 답변 3개")
def get_today(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    idx = today_index()
    q = QUESTIONS[idx]
    answers = (
        db.query(DailyAnswer)
        .options(joinedload(DailyAnswer.user), joinedload(DailyAnswer.reactions))
        .filter(DailyAnswer.question_index == idx)
        .order_by(DailyAnswer.created_at.desc())
        .limit(3)
        .all()
    )
    return TodayOut(
        question_index=idx,
        question_text=q["text"],
        answer_type=q["type"],
        answers=[_answer_out(a, current_user) for a in answers],
    )


@router.get("/answers", response_model=List[AnswerOut], summary="특정 질문의 전체 답변")
def list_answers(
    question_index: int = Query(...),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    answers = (
        db.query(DailyAnswer)
        .options(joinedload(DailyAnswer.user), joinedload(DailyAnswer.reactions))
        .filter(DailyAnswer.question_index == question_index)
        .order_by(DailyAnswer.created_at.desc())
        .offset(skip).limit(limit)
        .all()
    )
    return [_answer_out(a, current_user) for a in answers]


@router.post("/answers", response_model=AnswerOut, summary="답변 등록")
async def create_answer(
    question_index: int = Form(...),
    content: Optional[str] = Form(None),
    media: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    media_url = None
    if media and media.filename:
        ext = os.path.splitext(media.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        path = os.path.join(UPLOAD_DIR, filename)
        async with aiofiles.open(path, "wb") as f:
            await f.write(await media.read())
        media_url = f"/uploads/{filename}"

    answer = DailyAnswer(
        user_id=current_user.id,
        question_index=question_index,
        content=content or None,
        media_url=media_url,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    answer = (
        db.query(DailyAnswer)
        .options(joinedload(DailyAnswer.user), joinedload(DailyAnswer.reactions))
        .filter(DailyAnswer.id == answer.id)
        .first()
    )
    return _answer_out(answer, current_user)


@router.post("/answers/{answer_id}/like", summary="좋아요 토글")
def toggle_like(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    answer = db.query(DailyAnswer).filter(DailyAnswer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="답변을 찾을 수 없습니다")
    existing = db.query(AnswerReaction).filter(
        AnswerReaction.answer_id == answer_id,
        AnswerReaction.user_id == current_user.id,
        AnswerReaction.type == "like",
    ).first()
    if existing:
        db.delete(existing)
        liked = False
    else:
        db.add(AnswerReaction(answer_id=answer_id, user_id=current_user.id, type="like"))
        answer.help_count += 1
        liked = True
        # 마일스톤 알림 hook (향후 확장)
        # milestones = {1, 5, 10, 30}
        # if answer.help_count in milestones: notify(answer.user_id, answer.help_count)
    db.commit()
    like_count = db.query(AnswerReaction).filter(
        AnswerReaction.answer_id == answer_id,
        AnswerReaction.type == "like",
    ).count()
    return {"liked": liked, "like_count": like_count}


@router.post("/answers/{answer_id}/comments", summary="댓글 달기")
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
    return {
        "id": reaction.id,
        "author_nickname": current_user.nickname,
        "content": reaction.content,
        "created_at": reaction.created_at.isoformat(),
    }
