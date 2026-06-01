from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, Enum
)
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class UserType(str, enum.Enum):
    immigrant = "이주민"
    resident = "주민"
    admin = "관리자"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    nickname = Column(String(50), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    user_type = Column(Enum(UserType), default=UserType.immigrant, nullable=False)
    kakao_id = Column(String(50), unique=True, nullable=True, index=True)
    village_name = Column(String(100), nullable=True)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    bus_votes = relationship("BusVote", back_populates="user")
    daily_answers = relationship("DailyAnswer", back_populates="user")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    image_url = Column(String(500), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    like_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")


class PostLike(Base):
    __tablename__ = "post_likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="likes")


class BusStop(Base):
    __tablename__ = "bus_stops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    latitude = Column(String(20), nullable=True)
    longitude = Column(String(20), nullable=True)
    is_main = Column(Boolean, default=False)

    schedules = relationship("BusSchedule", back_populates="stop")


class BusSchedule(Base):
    __tablename__ = "bus_schedules"

    id = Column(Integer, primary_key=True, index=True)
    stop_id = Column(Integer, ForeignKey("bus_stops.id"), nullable=False)
    route_name = Column(String(50), nullable=False)
    route_number = Column(String(20), nullable=False)
    departure_time = Column(String(5), nullable=False)  # "HH:MM"
    direction = Column(String(100), nullable=True)
    color = Column(String(10), default="#2E75B6")

    stop = relationship("BusStop", back_populates="schedules")
    votes = relationship("BusVote", back_populates="schedule")


class BusVote(Base):
    __tablename__ = "bus_votes"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("bus_schedules.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_correct = Column(Boolean, nullable=False)  # True=O, False=X
    voted_at = Column(DateTime, default=datetime.utcnow)

    schedule = relationship("BusSchedule", back_populates="votes")
    user = relationship("User", back_populates="bus_votes")


class NoticeCategory(str, enum.Enum):
    town_office = "면사무소"
    chief = "이장"
    council = "자치회"


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(Enum(NoticeCategory), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    external_id = Column(String(200), unique=True, nullable=True)
    published_at = Column(DateTime, nullable=True)
    view_count = Column(Integer, default=0)
    source_url = Column(String(500), nullable=True)
    is_external = Column(Boolean, default=False)
    
    author = relationship("User")


class MeetingMinutes(Base):
    __tablename__ = "meeting_minutes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    meeting_date = Column(DateTime, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User")


class ScheduleType(str, enum.Enum):
    festival = "festival"
    policy = "policy"
    meeting = "meeting"


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime, nullable=False)
    event_type = Column(Enum(ScheduleType), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User")


class DailyAnswer(Base):
    __tablename__ = "daily_answers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_index = Column(Integer, nullable=False, index=True)
    content = Column(Text, nullable=True)
    media_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    help_count = Column(Integer, default=0)

    user = relationship("User", back_populates="daily_answers")
    reactions = relationship("AnswerReaction", back_populates="answer", cascade="all, delete-orphan")


class AnswerReaction(Base):
    __tablename__ = "answer_reactions"

    id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("daily_answers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(10), nullable=False)  # "like" | "comment"
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    answer = relationship("DailyAnswer", back_populates="reactions")
    user = relationship("User")


class BusRoute(Base):
    __tablename__ = "bus_routes"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(10), default="#2E75B6")
    stops = Column(Text, nullable=True)  # JSON array string
    duration = Column(String(50), nullable=True)
    daily_count = Column(Integer, nullable=True)


class HanMadiQuestion(Base):
    __tablename__ = "hanmadi_questions"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(200), nullable=False)
    answer_type = Column(String(10), default="text")  # text | media | both
    is_active = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)


class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_key = Column(String(100), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_type = Column(String(20), nullable=False, default="비로그인")
    properties = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
