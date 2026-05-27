import os
import uuid
import time
<<<<<<< HEAD
from datetime import date, datetime
from typing import Optional, List

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel

from app.auth import get_current_user, require_user
from app.models.models import User
from app.supabase_client import get_supabase
from sqlalchemy.orm import Session
from app.database import get_db
=======
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
import aiofiles
from datetime import datetime

from app.database import get_db
from app.models.models import DailyAnswer, AnswerReaction, User
from app.auth import get_current_user, require_user
>>>>>>> origin/seoyeon

router = APIRouter(prefix="/hanmadi", tags=["한마디"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

<<<<<<< HEAD

# ---------- Schemas ----------

class QuestionOut(BaseModel):
    id: int
    text: str
    answer_type: str


class AnswerOut(BaseModel):
    id: int
    question_id: int
    author_nickname: str
    author_type: str
=======
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
>>>>>>> origin/seoyeon
    content: Optional[str]
    media_url: Optional[str]
    created_at: datetime
    like_count: int
    comment_count: int
    is_liked: bool = False

<<<<<<< HEAD

class TodayOut(BaseModel):
    question: QuestionOut
=======
    class Config:
        from_attributes = True


class TodayOut(BaseModel):
    question_index: int
    question_text: str
    answer_type: str
>>>>>>> origin/seoyeon
    answers: List[AnswerOut]


class CommentReq(BaseModel):
    content: str


# ---------- Helpers ----------

<<<<<<< HEAD
def _today_question_id(sb) -> tuple[int, str, str]:
    """오늘 날짜의 질문 id, text, answer_type 을 반환."""
    today_str = date.today().isoformat()

    # 1) 관리자 수동 배정이 있으면 우선 사용
    sched = (
        sb.table("daily_question_schedule")
        .select("question_id, daily_questions(id, text, answer_type)")
        .eq("scheduled_date", today_str)
        .limit(1)
        .execute()
    )
    if sched.data:
        q = sched.data[0]["daily_questions"]
        return q["id"], q["text"], q["answer_type"]

    # 2) sort_order 순서 기준 날짜 인덱스 자동 계산
    all_q = (
        sb.table("daily_questions")
        .select("id, text, answer_type")
        .eq("is_active", True)
        .order("sort_order")
        .execute()
    )
    if not all_q.data:
        raise HTTPException(status_code=500, detail="질문 데이터가 없습니다")
    idx = int(time.time() / 86400) % len(all_q.data)
    q = all_q.data[idx]
    return q["id"], q["text"], q["answer_type"]


def _build_answers(rows: list, current_user: Optional[User]) -> List[AnswerOut]:
    out = []
    for row in rows:
        reactions = row.get("answer_reactions") or []
        likes = [r for r in reactions if r["type"] == "like"]
        comments = [r for r in reactions if r["type"] == "comment"]
        is_liked = (
            current_user is not None
            and any(r["user_id"] == current_user.id for r in likes)
        )
        out.append(AnswerOut(
            id=row["id"],
            question_id=row["question_id"],
            author_nickname=row["author_nickname"],
            author_type=row["author_type"],
            content=row.get("content"),
            media_url=row.get("media_url"),
            created_at=row["created_at"],
            like_count=len(likes),
            comment_count=len(comments),
            is_liked=is_liked,
        ))
    return out
=======
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
>>>>>>> origin/seoyeon


# ---------- Endpoints ----------

@router.get("/today", response_model=TodayOut, summary="오늘의 질문 + 최근 답변 3개")
def get_today(
<<<<<<< HEAD
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sb = get_supabase()
    qid, qtext, qtype = _today_question_id(sb)

    rows = (
        sb.table("daily_answers")
        .select("*, answer_reactions(*)")
        .eq("question_id", qid)
        .order("created_at", desc=True)
        .limit(3)
        .execute()
    ).data

    return TodayOut(
        question=QuestionOut(id=qid, text=qtext, answer_type=qtype),
        answers=_build_answers(rows, current_user),
=======
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
>>>>>>> origin/seoyeon
    )


@router.get("/answers", response_model=List[AnswerOut], summary="특정 질문의 전체 답변")
def list_answers(
<<<<<<< HEAD
    question_id: int = Query(...),
    skip: int = 0,
    limit: int = 20,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sb = get_supabase()
    rows = (
        sb.table("daily_answers")
        .select("*, answer_reactions(*)")
        .eq("question_id", question_id)
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    ).data
    return _build_answers(rows, current_user)
=======
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
>>>>>>> origin/seoyeon


@router.post("/answers", response_model=AnswerOut, summary="답변 등록")
async def create_answer(
<<<<<<< HEAD
    question_id: int = Form(...),
    content: Optional[str] = Form(None),
    media: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    sb = get_supabase()

=======
    question_index: int = Form(...),
    content: Optional[str] = Form(None),
    media: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
>>>>>>> origin/seoyeon
    media_url = None
    if media and media.filename:
        ext = os.path.splitext(media.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        path = os.path.join(UPLOAD_DIR, filename)
        async with aiofiles.open(path, "wb") as f:
            await f.write(await media.read())
        media_url = f"/uploads/{filename}"

<<<<<<< HEAD
    # 질문 존재 여부 확인
    q_resp = (
        sb.table("daily_questions")
        .select("id, text, answer_type")
        .eq("id", question_id)
        .limit(1)
        .execute()
    )
    if not q_resp.data:
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다")

    inserted = (
        sb.table("daily_answers")
        .insert({
            "question_id": question_id,
            "user_id": current_user.id,
            "author_nickname": current_user.nickname,
            "author_type": current_user.user_type.value,
            "content": content or None,
            "media_url": media_url,
        })
        .execute()
    ).data[0]

    # 반응 없이 바로 반환 (방금 생성했으므로 반응 0개)
    return AnswerOut(
        id=inserted["id"],
        question_id=inserted["question_id"],
        author_nickname=inserted["author_nickname"],
        author_type=inserted["author_type"],
        content=inserted.get("content"),
        media_url=inserted.get("media_url"),
        created_at=inserted["created_at"],
        like_count=0,
        comment_count=0,
        is_liked=False,
    )
=======
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
>>>>>>> origin/seoyeon


@router.post("/answers/{answer_id}/like", summary="좋아요 토글")
def toggle_like(
    answer_id: int,
<<<<<<< HEAD
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    sb = get_supabase()

    answer = (
        sb.table("daily_answers").select("id, help_count").eq("id", answer_id).limit(1).execute()
    ).data
    if not answer:
        raise HTTPException(status_code=404, detail="답변을 찾을 수 없습니다")

    existing = (
        sb.table("answer_reactions")
        .select("id")
        .eq("answer_id", answer_id)
        .eq("user_id", current_user.id)
        .eq("type", "like")
        .limit(1)
        .execute()
    ).data

    if existing:
        sb.table("answer_reactions").delete().eq("id", existing[0]["id"]).execute()
        liked = False
    else:
        sb.table("answer_reactions").insert({
            "answer_id": answer_id,
            "user_id": current_user.id,
            "type": "like",
        }).execute()
        liked = True

    like_count = (
        sb.table("answer_reactions")
        .select("id", count="exact")
        .eq("answer_id", answer_id)
        .eq("type", "like")
        .execute()
    ).count

    return {"liked": liked, "like_count": like_count or 0}
=======
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
>>>>>>> origin/seoyeon


@router.post("/answers/{answer_id}/comments", summary="댓글 달기")
def add_comment(
    answer_id: int,
    req: CommentReq,
<<<<<<< HEAD
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    sb = get_supabase()

    answer = (
        sb.table("daily_answers").select("id").eq("id", answer_id).limit(1).execute()
    ).data
    if not answer:
        raise HTTPException(status_code=404, detail="답변을 찾을 수 없습니다")

    reaction = (
        sb.table("answer_reactions")
        .insert({
            "answer_id": answer_id,
            "user_id": current_user.id,
            "type": "comment",
            "content": req.content,
        })
        .execute()
    ).data[0]

    return {
        "id": reaction["id"],
        "author_nickname": current_user.nickname,
        "content": reaction["content"],
        "created_at": reaction["created_at"],
    }


@router.get("/questions", response_model=List[QuestionOut], summary="전체 질문 목록")
def list_questions(db: Session = Depends(get_db)):
    sb = get_supabase()
    rows = (
        sb.table("daily_questions")
        .select("id, text, answer_type")
        .eq("is_active", True)
        .order("sort_order")
        .execute()
    ).data
    return [QuestionOut(**r) for r in rows]
=======
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
>>>>>>> origin/seoyeon
