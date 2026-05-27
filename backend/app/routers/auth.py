from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, UserType
from app.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["인증"])


class RegisterRequest(BaseModel):
    username: str
    nickname: str
    password: str
    user_type: UserType = UserType.immigrant


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: str
    nickname: str
    user_id: int


@router.post("/register", response_model=TokenResponse, summary="회원가입")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다")
    user = User(
        username=req.username,
        nickname=req.nickname,
        hashed_password=hash_password(req.password),
        user_type=req.user_type,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user_type=user.user_type.value,
        nickname=user.nickname,
        user_id=user.id,
    )


@router.post("/login", response_model=TokenResponse, summary="로그인")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다")
    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user_type=user.user_type.value,
        nickname=user.nickname,
        user_id=user.id,
    )
