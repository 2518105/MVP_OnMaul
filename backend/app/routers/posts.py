import os
import uuid
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
import aiofiles

from app.database import get_db
from app.models.models import Post, Comment, PostLike, User
from app.auth import get_current_user, require_user

router = APIRouter(prefix="/posts", tags=["게시판"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------- Schemas ----------

class CommentOut(BaseModel):
    id: int
    content: str
    author_nickname: str
    author_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class PostOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    image_url: Optional[str]
    author_nickname: str
    author_type: str
    like_count: int
    view_count: int
    comment_count: int
    created_at: datetime
    is_liked: bool = False

    class Config:
        from_attributes = True


class PostDetail(PostOut):
    comments: List[CommentOut] = []


# ---------- Helpers ----------

def _post_out(post: Post, current_user: Optional[User], db: Session) -> PostOut:
    is_liked = False
    if current_user:
        is_liked = db.query(PostLike).filter(
            PostLike.post_id == post.id,
            PostLike.user_id == current_user.id,
        ).first() is not None
    return PostOut(
        id=post.id,
        title=post.title,
        content=post.content,
        category=post.category,
        image_url=post.image_url,
        author_nickname=post.author.nickname,
        author_type=post.author.user_type.value,
        like_count=post.like_count,
        view_count=post.view_count,
        comment_count=len(post.comments),
        created_at=post.created_at,
        is_liked=is_liked,
    )


# ---------- Endpoints ----------

@router.get("", response_model=List[PostOut], summary="게시글 목록")
def list_posts(
    category: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    q = db.query(Post).options(joinedload(Post.author), joinedload(Post.comments), joinedload(Post.likes))
    if category:
        q = q.filter(Post.category == category)
    posts = q.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return [_post_out(p, current_user, db) for p in posts]


@router.get("/{post_id}", response_model=PostDetail, summary="게시글 상세")
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    post = db.query(Post).options(
        joinedload(Post.author),
        joinedload(Post.comments).joinedload(Comment.author),
        joinedload(Post.likes),
    ).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    post.view_count += 1
    db.commit()
    out = _post_out(post, current_user, db)
    comments = [
        CommentOut(
            id=c.id,
            content=c.content,
            author_nickname=c.author.nickname,
            author_type=c.author.user_type.value,
            created_at=c.created_at,
        )
        for c in post.comments
    ]
    return PostDetail(**out.model_dump(), comments=comments)


@router.post("", response_model=PostOut, summary="게시글 작성")
async def create_post(
    title: str = Form(...),
    content: str = Form(...),
    category: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    image_url = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        path = os.path.join(UPLOAD_DIR, filename)
        async with aiofiles.open(path, "wb") as f:
            await f.write(await image.read())
        image_url = f"/uploads/{filename}"

    post = Post(
        title=title,
        content=content,
        category=category,
        image_url=image_url,
        author_id=current_user.id,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    post = db.query(Post).options(joinedload(Post.author), joinedload(Post.comments), joinedload(Post.likes)).filter(Post.id == post.id).first()
    return _post_out(post, current_user, db)


@router.post("/{post_id}/like", summary="좋아요 토글")
def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    existing = db.query(PostLike).filter(
        PostLike.post_id == post_id,
        PostLike.user_id == current_user.id,
    ).first()
    if existing:
        db.delete(existing)
        post.like_count = max(0, post.like_count - 1)
        liked = False
    else:
        db.add(PostLike(post_id=post_id, user_id=current_user.id))
        post.like_count += 1
        liked = True
    db.commit()
    return {"liked": liked, "like_count": post.like_count}


class CommentRequest(BaseModel):
    content: str


@router.post("/{post_id}/comments", response_model=CommentOut, summary="댓글 작성")
def create_comment(
    post_id: int,
    req: CommentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    comment = Comment(content=req.content, post_id=post_id, author_id=current_user.id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    comment = db.query(Comment).options(joinedload(Comment.author)).filter(Comment.id == comment.id).first()
    return CommentOut(
        id=comment.id,
        content=comment.content,
        author_nickname=comment.author.nickname,
        author_type=comment.author.user_type.value,
        created_at=comment.created_at,
    )
