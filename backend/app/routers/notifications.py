import os

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import PushSubscription, DailyAnswer, User
from app.auth import require_user
from app.services.hanmadi import get_today_question
from app.services.push import NOTIFICATION_TEMPLATES, send_push_to_users, send_push_to_all

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _check_notify_secret(x_notify_secret: str):
    """GitHub Actions cron 등 서버-투-서버 호출 인증 (JWT 불필요)."""
    notify_secret = os.environ.get("NOTIFY_SECRET")
    if not notify_secret or x_notify_secret != notify_secret:
        raise HTTPException(status_code=401, detail="인증 실패")


# ---------- Schemas ----------

class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: PushKeys


class PushUnsubscribeIn(BaseModel):
    endpoint: str


class VapidPublicKeyOut(BaseModel):
    publicKey: str


# ---------- 구독 관리 ----------

@router.get("/vapid-public-key", response_model=VapidPublicKeyOut, summary="VAPID 공개키 조회")
def get_vapid_public_key():
    public_key = os.environ.get("VAPID_PUBLIC_KEY")
    if not public_key:
        raise HTTPException(status_code=500, detail="VAPID 키가 설정되지 않았습니다")
    return VapidPublicKeyOut(publicKey=public_key)


@router.post("/subscribe", summary="푸시 구독 등록")
async def subscribe(
    subscription: PushSubscriptionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),  # 로그인 안 했으면 자동으로 401 에러
):
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == subscription.endpoint
    ).first()
    if existing:
        if existing.user_id != current_user.id:
            # 기기를 공유하거나 다른 계정으로 재로그인한 경우: 구독의 소유자를 갱신
            existing.user_id = current_user.id
            existing.p256dh = subscription.keys.p256dh
            existing.auth = subscription.keys.auth
            db.commit()
            return {"status": "updated"}
        return {"status": "already_subscribed"}

    new_sub = PushSubscription(
        user_id=current_user.id,   # ← auth.py가 검증해준 진짜 로그인 사용자 ID
        endpoint=subscription.endpoint,
        p256dh=subscription.keys.p256dh,
        auth=subscription.keys.auth,
    )
    db.add(new_sub)
    db.commit()
    return {"status": "subscribed"}


@router.delete("/subscribe", summary="푸시 구독 해제")
async def unsubscribe(
    req: PushUnsubscribeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == req.endpoint,
        PushSubscription.user_id == current_user.id,
    ).delete()
    db.commit()
    return {"status": "unsubscribed"}


# ---------- 발송 트리거 (서버-투-서버, GitHub Actions cron 전용) ----------

@router.post("/remind-daily-answer", summary="오늘의 한마디 미작성자에게 리마인드 발송")
def remind_daily_answer(
    x_notify_secret: str = Header(None),
    db: Session = Depends(get_db),
):
    """
    오늘(KST)의 한마디 질문에 아직 답변하지 않은 구독자에게 리마인드 푸시를 보낸다.
    X-Notify-Secret 헤더로 인증한다 (JWT 불필요, GitHub Actions cron이 호출).
    이미 답변한 사용자는 자동으로 대상에서 빠지므로 하루 여러 번 호출해도 중복 발송되지 않는다.
    """
    _check_notify_secret(x_notify_secret)

    question = get_today_question(db)
    if not question:
        return {"status": "no_question", "target_count": 0, "sent_count": 0}

    answered_user_ids = {
        row[0] for row in
        db.query(DailyAnswer.user_id).filter(DailyAnswer.question_index == question.id).distinct().all()
    }

    subscriber_user_ids = {
        row[0] for row in db.query(PushSubscription.user_id).distinct().all()
    }

    target_user_ids = list(subscriber_user_ids - answered_user_ids)

    sent_count = send_push_to_users(db, target_user_ids, **NOTIFICATION_TEMPLATES["daily_reminder"])

    return {
        "status": "success",
        "target_count": len(target_user_ids),
        "sent_count": sent_count,
    }


@router.post("/notify-all", summary="전체 구독자에게 알림 발송 (주간 공지/메달 리마인드 등)")
def notify_all(
    template: str = Query(..., description="NOTIFICATION_TEMPLATES에 등록된 키 (예: weekly_notice, weekly_medal)"),
    x_notify_secret: str = Header(None),
    db: Session = Depends(get_db),
):
    """
    전체 구독자에게 미리 정의된 문구(NOTIFICATION_TEMPLATES)로 푸시를 보낸다.
    X-Notify-Secret 헤더로 인증한다 (GitHub Actions cron 전용).
    """
    _check_notify_secret(x_notify_secret)

    if template not in NOTIFICATION_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"알 수 없는 템플릿입니다: {template}")

    sent_count = send_push_to_all(db, **NOTIFICATION_TEMPLATES[template])

    return {"status": "success", "sent_count": sent_count}
