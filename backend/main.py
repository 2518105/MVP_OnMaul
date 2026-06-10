from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
import os

from app.database import engine
from app.models.models import Base
from app.routers import auth, posts, bus, admin, events, hanmadi, users
from app.seed import seed
from app.database import SessionLocal

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[WARNING] DB 테이블 생성 실패 (이미 존재하거나 연결 오류): {e}")

app = FastAPI(
    title="온마을 API",
    description="옥천군 청산면 이주민 커뮤니티 앱 API",
    version="0.1.0",
)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(bus.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(hanmadi.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    try:
        # kakao_id 컬럼이 없는 기존 DB 자동 마이그레이션
        with engine.connect() as conn:
            for stmt in [
                "ALTER TABLE users ADD COLUMN kakao_id VARCHAR(50)",
                "ALTER TABLE users ADD COLUMN village_name VARCHAR(100)",
                "ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE notices ADD COLUMN external_id VARCHAR(200)",
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_notices_external_id ON notices(external_id)",
                "ALTER TABLE notices ADD COLUMN published_at DATETIME",
                "ALTER TABLE notices ADD COLUMN view_count INTEGER DEFAULT 0",
                "ALTER TABLE notices ADD COLUMN source_url VARCHAR(500)",
                "ALTER TABLE notices ADD COLUMN is_external BOOLEAN DEFAULT FALSE",
                "ALTER TABLE bus_routes ADD COLUMN badge VARCHAR(20)",
                "ALTER TABLE bus_routes ADD COLUMN origin VARCHAR(100)",
                "ALTER TABLE bus_routes ADD COLUMN destination VARCHAR(100)",
                "ALTER TABLE bus_routes ADD COLUMN is_bidirectional BOOLEAN DEFAULT TRUE",
                "ALTER TABLE bus_routes ADD COLUMN trips_per_day INTEGER",
                "ALTER TABLE bus_route_stops ADD COLUMN stop_code VARCHAR(20)",
            ]:
                try:
                    conn.execute(text(stmt))
                    conn.commit()
                except Exception:
                    conn.rollback()
    except Exception as e:
        print(f"[WARNING] 마이그레이션 실패: {e}")

    try:
        db = SessionLocal()
        try:
            seed(db)
        finally:
            db.close()
    except Exception as e:
        print(f"[WARNING] Seed 실패: {e}")

    # 공지 크롤링은 GitHub Actions에서 수행 (Render IP 차단 방지)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "온마을", "version": "1.1.0"}
