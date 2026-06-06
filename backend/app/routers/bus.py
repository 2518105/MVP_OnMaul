from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import BusStop, BusSchedule, BusVote, BusRoute, BusRouteStop, User
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


@router.get("/routes", summary="노선 목록")
def get_routes(db: Session = Depends(get_db)):
    routes = db.query(BusRoute).order_by(BusRoute.number).all()
    result = []
    for r in routes:
        trips_label = f"1일 {r.trips_per_day}회" if r.trips_per_day else ""
        result.append({
            "id": r.number,
            "badge": r.badge,
            "tripsPerDay": trips_label,
            "origin": r.origin or "",
            "destination": r.destination or "",
            "isBidirectional": r.is_bidirectional if r.is_bidirectional is not None else True,
        })
    return result


@router.get("/routes/{number}", summary="노선 상세")
def get_route_detail(number: str, db: Session = Depends(get_db)):
    import json as _json

    r = db.query(BusRoute).filter(BusRoute.number == number).first()
    if not r:
        raise HTTPException(status_code=404, detail="노선을 찾을 수 없습니다")

    # bus_route_stops 에서 down/up 정류장 조회
    stops_rows = (
        db.query(BusRouteStop)
        .filter(BusRouteStop.route_number == number)
        .order_by(BusRouteStop.direction, BusRouteStop.stop_order)
        .all()
    )

    def build_direction(direction: str):
        rows = [s for s in stops_rows if s.direction == direction]
        if not rows:
            return {"label": "", "stops": []}
        label = rows[0].direction_label or ""
        stops_out = []
        for s in rows:
            times = _json.loads(s.times) if s.times else []
            stops_out.append({
                "name": s.stop_name,
                "times": times,
                "note": s.note,
                "stop_code": s.stop_code,
            })
        return {"label": label, "stops": stops_out}

    trips_label = f"1일 {r.trips_per_day}회" if r.trips_per_day else ""
    return {
        "id": r.number,
        "badge": r.badge,
        "tripsPerDay": trips_label,
        "origin": r.origin or "",
        "destination": r.destination or "",
        "isBidirectional": r.is_bidirectional if r.is_bidirectional is not None else True,
        "down": build_direction("down"),
        "up": build_direction("up"),
    }
