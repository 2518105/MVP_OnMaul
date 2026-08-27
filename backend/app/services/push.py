import json
import logging
import os
from typing import Iterable

from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

from app.models.models import PushSubscription

logger = logging.getLogger(__name__)

# 발송 문구는 이 딕셔너리에서만 관리한다.
# 시각/횟수를 바꾸고 싶으면 .github/workflows/daily-reminder.yml의 cron만 수정하면 되고,
# 문구를 바꾸고 싶으면 여기 값만 수정하면 된다 (호출부 로직은 건드릴 필요 없음).
NOTIFICATION_TEMPLATES = {
    "daily_reminder": {
        "title": "오늘의 한마디 아직이에요 👋",
        "body": "오늘 있었던 이야기를 한마디 남겨보세요!",
        "url": "/hanmadi",
    },
}


def _vapid_claims() -> dict:
    email = os.environ.get("VAPID_CLAIMS_EMAIL", "admin@example.com")
    return {"sub": f"mailto:{email}"}


def send_push_to_subscription(db: Session, sub: PushSubscription, title: str, body: str = "", url: str = "/") -> bool:
    """단일 구독에 푸시를 보낸다. 만료/무효 구독(404, 410)은 자동 삭제한다."""
    payload = json.dumps({"title": title, "body": body, "url": url})
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=payload,
            vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
            vapid_claims=_vapid_claims(),
        )
        return True
    except WebPushException as e:
        status_code = e.response.status_code if e.response is not None else None
        if status_code in (404, 410):
            db.query(PushSubscription).filter(PushSubscription.id == sub.id).delete()
            db.commit()
            logger.info(f"만료된 구독 삭제: id={sub.id}")
        else:
            logger.warning(f"푸시 발송 실패 (id={sub.id}): {e}")
        return False
    except Exception as e:
        logger.warning(f"푸시 발송 중 오류 (id={sub.id}): {e}")
        return False


def send_push_to_user(db: Session, user_id: int, title: str, body: str = "", url: str = "/") -> int:
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    return sum(1 for sub in subs if send_push_to_subscription(db, sub, title, body, url))


def send_push_to_users(db: Session, user_ids: Iterable[int], title: str, body: str = "", url: str = "/") -> int:
    user_ids = list(user_ids)
    if not user_ids:
        return 0
    subs = db.query(PushSubscription).filter(PushSubscription.user_id.in_(user_ids)).all()
    return sum(1 for sub in subs if send_push_to_subscription(db, sub, title, body, url))


def send_push_to_all(db: Session, title: str, body: str = "", url: str = "/") -> int:
    """전체 구독자에게 발송 (현재 미사용, 추후 다른 알림 시나리오용)."""
    subs = db.query(PushSubscription).all()
    return sum(1 for sub in subs if send_push_to_subscription(db, sub, title, body, url))
