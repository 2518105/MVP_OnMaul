"""
최초 실행 시 버스 시간표 데이터와 관리자 계정을 생성합니다.
"""
import json
from pathlib import Path
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal
from app.models.models import Base, User, UserType, BusStop, BusSchedule, BusRoute, HanMadiQuestion
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

    # 버스 노선
    if db.query(BusRoute).count() == 0:
        import json as _json
        routes = [
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
        for i, r in enumerate(routes):
            db.add(BusRoute(
                number=r["number"], name=r["name"], color=r["color"],
                stops=_json.dumps(r["stops"], ensure_ascii=False),
                duration=r["duration"], daily_count=r["daily_count"],
            ))
        db.commit()
        print("[OK] 버스 노선 데이터 로드 완료")

    # 한마디 질문
    if db.query(HanMadiQuestion).count() == 0:
        questions = [
            ("오늘 청산면 날씨는 어때요?", "text"),
            ("청산면에서 가장 좋아하는 계절은?", "text"),
            ("청산면 살면서 제일 좋은 점은?", "text"),
            ("청산면에서 불편한 점이 있다면?", "text"),
            ("청산면에 새로 생겼으면 하는 시설은?", "text"),
            ("청산면에 이사 온 지 얼마나 됐어요?", "text"),
            ("요즘 가장 자주 가는 곳은 어디예요?", "text"),
            ("청산면에서 새로 시작하고 싶은 일이 있나요?", "text"),
            ("일하면서 가장 보람 있는 순간은?", "text"),
            ("청산면에 새로 이사 온 분께 한마디 해준다면?", "text"),
            ("청산면을 방문한 관광객에게 꼭 추천하고 싶은 것은?", "text"),
            ("오늘 이웃과 나눈 이야기가 있나요?", "text"),
            ("요즘 즐겨 듣는 노래는?", "text"),
            ("쉬는 날 청산면에서 뭐 하세요?", "text"),
            ("오늘 청산면 이웃에게 전하고 싶은 말은?", "text"),
            ("오늘 청산면에서 찍은 사진 한 장 올려주세요!", "media"),
            ("요즘 청산면에서 제일 예쁜 곳 찍어주세요", "media"),
            ("오늘 밥상 사진 올려주세요", "media"),
            ("내가 좋아하는 청산면 풍경은?", "media"),
            ("요즘 농사 현장 사진 올려주세요", "media"),
            ("청산면 숨은 명소 사진 올려주세요", "media"),
            ("오늘 수확한 것 자랑해주세요!", "media"),
            ("청산면 봄/여름/가을/겨울 사진 한 장", "media"),
            ("청산면에서 제일 맛있는 집은 어디예요?", "both"),
            ("요즘 밥상에 자주 오르는 제철 재료는?", "both"),
            ("직접 키우거나 만드는 음식이 있나요?", "both"),
            ("청산면 하면 떠오르는 것은?", "both"),
            ("청산면에 생겼으면 하는 음식점은?", "both"),
            ("청산면에서 꼭 가봐야 할 곳은?", "both"),
            ("오늘 어떤 일을 하셨나요?", "both"),
        ]
        for i, (text, qtype) in enumerate(questions):
            db.add(HanMadiQuestion(text=text, answer_type=qtype, order_index=i))
        db.commit()
        print("[OK] 한마디 질문 데이터 로드 완료")


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
