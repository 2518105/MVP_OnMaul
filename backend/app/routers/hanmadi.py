import os
import uuid
import time
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

router = APIRouter(prefix="/hanmadi", tags=["한마디"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
    content: Optional[str]
    media_url: Optional[str]
    created_at: datetime
    like_count: int
    comment_count: int
    is_liked: bool = False


class TodayOut(BaseModel):
    question: QuestionOut
    answers: List[AnswerOut]


class CommentReq(BaseModel):
    content: str


# ---------- Helpers ----------

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


# ---------- Endpoints ----------

@router.get("/today", response_model=TodayOut, summary="오늘의 질문 + 최근 답변 3개")
def get_today(
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
    )


@router.get("/answers", response_model=List[AnswerOut], summary="특정 질문의 전체 답변")
def list_answers(
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


@router.post("/answers", response_model=AnswerOut, summary="답변 등록")
async def create_answer(
    question_id: int = Form(...),
    content: Optional[str] = Form(None),
    media: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    sb = get_supabase()

    media_url = None
    if media and media.filename:
        ext = os.path.splitext(media.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        path = os.path.join(UPLOAD_DIR, filename)
        async with aiofiles.open(path, "wb") as f:
            await f.write(await media.read())
        media_url = f"/uploads/{filename}"

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


@router.post("/answers/{answer_id}/like", summary="좋아요 토글")
def toggle_like(
    answer_id: int,
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


@router.post("/answers/{answer_id}/comments", summary="댓글 달기")
def add_comment(
    answer_id: int,
    req: CommentReq,
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
