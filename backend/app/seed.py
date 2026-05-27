"""
최초 실행 시 버스 시간표 데이터와 관리자 계정을 생성합니다.
"""
import json
from pathlib import Path
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal
from app.models.models import Base, User, UserType, BusStop, BusSchedule
from app.auth import hash_password


def init_db():
    Base.metadata.create_all(bind=engine)


def seed(db: Session):
    # 관리자 계정
    if not db.query(User).filter(User.username == "admin").first():
        admin = User(
            username="admin",
            nickname="온마을 관리자",
            hashed_password=hash_password("onmaul2026!"),
            user_type=UserType.admin,
        )
        db.add(admin)
        db.commit()
        print("[OK] 관리자 계정 생성 (admin / onmaul2026!)")

    # 버스 시간표
    if db.query(BusStop).count() == 0:
        data_path = Path(__file__).parent.parent / "data" / "bus_schedules.json"
        with open(data_path, encoding="utf-8") as f:
            data = json.load(f)

        for stop_data in data["stops"]:
            stop = BusStop(
                name=stop_data["name"],
                code=stop_data["code"],
                is_main=stop_data["is_main"],
                latitude=stop_data.get("latitude"),
                longitude=stop_data.get("longitude"),
            )
            db.add(stop)
            db.flush()

            for sch_data in stop_data["schedules"]:
                for time in sch_data["times"]:
                    sch = BusSchedule(
                        stop_id=stop.id,
                        route_name=sch_data["route_name"],
                        route_number=sch_data["route_number"],
                        departure_time=time,
                        direction=sch_data["direction"],
                        color=sch_data["color"],
                    )
                    db.add(sch)

        db.commit()
        print("[OK] 버스 시간표 데이터 로드 완료")


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
