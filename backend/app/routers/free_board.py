from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import FreePost, User
from app.auth import require_user, get_current_user

router = APIRouter(prefix="/free-board", tags=["자유게시판"])


class FreePostCreate(BaseModel):
    title: str
    content: str


class FreePostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class FreePostOut(BaseModel):
    id: int
    title: str
    content: str
    author_nickname: str
    created_at: datetime
    updated_at: datetime
    is_mine: bool = False

    class Config:
        from_attributes = True


def _to_out(post: FreePost, current_user: Optional[User] = None) -> FreePostOut:
    return FreePostOut(
        id=post.id,
        title=post.title,
        content=post.content,
        author_nickname=post.author.nickname,
        created_at=post.created_at,
        updated_at=post.updated_at,
        is_mine=current_user is not None and post.author_id == current_user.id,
    )


@router.get("", response_model=List[FreePostOut])
def list_posts(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    posts = (
        db.query(FreePost)
        .order_by(FreePost.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_to_out(p, current_user) for p in posts]


@router.post("", response_model=FreePostOut, status_code=201)
def create_post(
    req: FreePostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    title = req.title.strip()
    content = req.content.strip()
    if not title:
        raise HTTPException(status_code=400, detail="제목을 입력해주세요")
    if not content:
        raise HTTPException(status_code=400, detail="내용을 입력해주세요")

    post = FreePost(title=title, content=content, author_id=current_user.id)
    db.add(post)
    db.commit()
    db.refresh(post)
    return _to_out(post, current_user)


@router.get("/{post_id}", response_model=FreePostOut)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    post = db.query(FreePost).filter(FreePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    return _to_out(post, current_user)


@router.put("/{post_id}", response_model=FreePostOut)
def update_post(
    post_id: int,
    req: FreePostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    post = db.query(FreePost).filter(FreePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다")

    if req.title is not None:
        post.title = req.title.strip()
    if req.content is not None:
        post.content = req.content.strip()
    post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    return _to_out(post, current_user)


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    post = db.query(FreePost).filter(FreePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다")

    db.delete(post)
    db.commit()
