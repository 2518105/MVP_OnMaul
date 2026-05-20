from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine
from app.models.models import Base
from app.routers import auth, posts, bus, admin, events, hanmadi
from app.seed import seed
from app.database import SessionLocal

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="온마을 API",
    description="옥천군 청산면 이주민 커뮤니티 앱 API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "온마을"}
