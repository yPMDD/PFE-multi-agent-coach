"""
Database models for PFE Coach.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class User(Base):
    """User model representing authenticated users via Google OAuth."""
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # Firebase UID
    email = Column(String, nullable=False, unique=True)
    display_name = Column(String)
    photo_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Session(Base):
    """Session model representing a chat session."""
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    session_type = Column(String, default="chat")  # "chat" or "review"
    created_at = Column(DateTime, default=datetime.utcnow)


class Message(Base):
    """Message model representing a chat message."""
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    agent_used = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Milestone(Base):
    """Milestone model representing project milestones."""
    __tablename__ = "milestones"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    due_date = Column(DateTime, nullable=False)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)