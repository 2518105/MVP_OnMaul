from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import BusStop, BusSchedule, BusVote, User
from app.auth import get_current_user, require_user

router = APIRouter(prefix="/bus", tags=["버스"])


class StopOut(BaseModel):
    id: int
    name: str
    code: Optional[str]
    is_main: bool

    class Config:
        from_attributes = True


class ScheduleOut(BaseModel):
    id: int
    route_name: str
    route_number: str
    departure_time: str
    direction: Optional[str]
    color: str
    vote_yes: int = 0
    vote_no: int = 0
    can_vote: bool = False
    my_vote: Optional[bool] = None  # True=O, False=X, None=미투표

    class Config:
        from_attributes = True


class StopDetail(StopOut):
    schedules: List[ScheduleOut] = []


class VoteRequest(BaseModel):
    is_correct: bool  # True=O, False=X


@router.get("/stops", response_model=List[StopOut], summary="정류장 목록")
def list_stops(db: Session = Depends(get_db)):
    stops = db.query(BusStop).order_by(BusStop.is_main.desc(), BusStop.name).all()
    return stops


@router.get("/stops/{stop_id}", response_model=StopDetail, summary="정류장 상세 + 시간표")
def get_stop(
    stop_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    stop = db.query(BusStop).filter(BusStop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="정류장을 찾을 수 없습니다")

    now = datetime.now()
    today_str = now.strftime("%H:%M")
    schedules_out = []

    for sch in sorted(stop.schedules, key=lambda s: s.departure_time):
        dep = sch.departure_time  # "HH:MM"
        dep_dt = datetime.strptime(f"{now.date()} {dep}", "%Y-%m-%d %H:%M")
        diff = abs((now - dep_dt).total_seconds())
        can_vote = diff <= 1200  # ±20분

        votes = sch.votes
        vote_yes = sum(1 for v in votes if v.is_correct)
        vote_no = sum(1 for v in votes if not v.is_correct)

        my_vote = None
        if current_user:
            my = next((v for v in votes if v.user_id == current_user.id), None)
            if my:
                my_vote = my.is_correct

        schedules_out.append(ScheduleOut(
            id=sch.id,
            route_name=sch.route_name,
            route_number=sch.route_number,
            departure_time=sch.departure_time,
            direction=sch.direction,
            color=sch.color,
            vote_yes=vote_yes,
            vote_no=vote_no,
            can_vote=can_vote,
            my_vote=my_vote,
        ))

    return StopDetail(
        id=stop.id,
        name=stop.name,
        code=stop.code,
        is_main=stop.is_main,
        schedules=schedules_out,
    )


@router.post("/schedules/{schedule_id}/vote", summary="O/X 투표")
def vote(
    schedule_id: int,
    req: VoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    sch = db.query(BusSchedule).filter(BusSchedule.id == schedule_id).first()
    if not sch:
        raise HTTPException(status_code=404, detail="시간표를 찾을 수 없습니다")

    now = datetime.now()
    dep_dt = datetime.strptime(f"{now.date()} {sch.departure_time}", "%Y-%m-%d %H:%M")
    if abs((now - dep_dt).total_seconds()) > 1200:
        raise HTTPException(status_code=400, detail="투표 가능 시간(±20분)이 아닙니다")

    existing = db.query(BusVote).filter(
        BusVote.schedule_id == schedule_id,
        BusVote.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 투표했습니다")

    vote = BusVote(schedule_id=schedule_id, user_id=current_user.id, is_correct=req.is_correct)
    db.add(vote)
    db.commit()

    votes = db.query(BusVote).filter(BusVote.schedule_id == schedule_id).all()
    return {
        "vote_yes": sum(1 for v in votes if v.is_correct),
        "vote_no": sum(1 for v in votes if not v.is_correct),
    }


@router.get("/routes", summary="노선 목록 (정적)")
def get_routes():
    return [
        {"number": "541", "name": "청산-옥천 급행", "color": "#2E75B6",
         "stops": ["청산주차장", "청산면사무소", "청성농협", "옥천버스터미널"],
         "duration": "약 40분", "daily_count": 4},
        {"number": "503", "name": "청산-옥천 (동이면 경유)", "color": "#5BA4CF",
         "stops": ["청산주차장", "청성농협", "동이면", "옥천버스터미널"],
         "duration": "약 60분", "daily_count": 3},
        {"number": "610", "name": "청산-보은", "color": "#70AD47",
         "stops": ["청산주차장", "청산면사무소", "보은터미널"],
         "duration": "약 50분", "daily_count": 5},
        {"number": "607", "name": "대전-옥천 (비래동)", "color": "#ED7D31",
         "stops": ["비래동", "옥천버스터미널"],
         "duration": "약 40분", "daily_count": None},
    ]
