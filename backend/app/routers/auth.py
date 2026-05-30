import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, UserType
from app.auth import create_access_token, hash_password, verify_password

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "")
KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET", "")

router = APIRouter(prefix="/auth", tags=["인증"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: str
    nickname: Optional[str] = None
    user_id: int
    is_new_user: bool = False
    onboarding_completed: bool = False


class RegisterRequest(BaseModel):
    username: str
    nickname: str
    password: str
    user_type: str = "이주민"


class LoginRequest(BaseModel):
    username: str
    password: str


class KakaoLoginRequest(BaseModel):
    code: str
    redirect_uri: str


@router.post("/register", response_model=TokenResponse, summary="이메일 회원가입")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다")
    try:
        user_type = UserType(req.user_type)
    except ValueError:
        user_type = UserType.immigrant
    user = User(
        username=req.username,
        nickname=req.nickname,
        hashed_password=hash_password(req.password),
        user_type=user_type,
        onboarding_completed=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_type=user.user_type.value,
        nickname=user.nickname,
        user_id=user.id,
        is_new_user=True,
        onboarding_completed=True,
    )


@router.post("/login", response_model=TokenResponse, summary="이메일 로그인")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 틀렸습니다")
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_type=user.user_type.value,
        nickname=user.nickname,
        user_id=user.id,
        onboarding_completed=user.onboarding_completed,
    )


@router.post("/kakao", response_model=TokenResponse, summary="카카오 로그인")
def kakao_login(req: KakaoLoginRequest, db: Session = Depends(get_db)):
    if not KAKAO_REST_API_KEY:
        raise HTTPException(status_code=503, detail="카카오 로그인이 설정되지 않았습니다")

    # 1. 인가 코드 → 액세스 토큰 교환
    token_payload = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": req.redirect_uri,
        "code": req.code,
    }
    if KAKAO_CLIENT_SECRET:
        token_payload["client_secret"] = KAKAO_CLIENT_SECRET

    token_res = httpx.post(
        "https://kauth.kakao.com/oauth/token",
        data=token_payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    token_data = token_res.json()
    kakao_access_token = token_data.get("access_token")
    if not kakao_access_token:
        err_code = token_data.get("error", "")
        err_desc = token_data.get("error_description", "알 수 없는 오류")
        raise HTTPException(status_code=400, detail=f"카카오 인증 실패 ({err_code}): {err_desc}")

    # 2. 사용자 프로필 조회
    profile_res = httpx.get(
        "https://kapi.kakao.com/v2/user/me",
        headers={"Authorization": f"Bearer {kakao_access_token}"},
        timeout=10,
    )
    profile = profile_res.json()
    kakao_id = str(profile.get("id", ""))
    kakao_account = profile.get("kakao_account", {})
    nickname = kakao_account.get("profile", {}).get("nickname") or f"카카오{kakao_id[-4:]}"

    # 3. DB에서 기존 사용자 조회 or 신규 생성
    user = db.query(User).filter(User.kakao_id == kakao_id).first()
    is_new = user is None
    if is_new:
        user = User(
            username=f"kakao_{kakao_id}",
            nickname=nickname,
            hashed_password="",
            kakao_id=kakao_id,
            user_type=UserType.immigrant,
            onboarding_completed=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_type=user.user_type.value,
        nickname=user.nickname,
        user_id=user.id,
        is_new_user=is_new,
        onboarding_completed=user.onboarding_completed,
    )
