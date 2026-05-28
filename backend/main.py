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

Base.metadata.create_all(bind=engine)

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
    # kakao_id 컬럼이 없는 기존 DB 자동 마이그레이션
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN kakao_id VARCHAR(50)"))
            conn.commit()
        except Exception:
            pass  # 컬럼이 이미 존재하면 무시

    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "온마을"}
