import json
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import EventLog, User
from app.auth import get_current_user

router = APIRouter(prefix="/events", tags=["이벤트로그"])


class EventRequest(BaseModel):
    event_key: str
    properties: Optional[dict] = None


@router.post("", summary="이벤트 로깅")
def log_event(
    req: EventRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    user_type = "비로그인"
    user_id = None
    if current_user:
        user_type = current_user.user_type.value
        user_id = current_user.id

    log = EventLog(
        event_key=req.event_key,
        user_id=user_id,
        user_type=user_type,
        properties=json.dumps(req.properties, ensure_ascii=False) if req.properties else None,
    )
    db.add(log)
    db.commit()
    return {"ok": True}
