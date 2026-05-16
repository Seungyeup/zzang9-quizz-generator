"""
Database engine, ORM models, and Pydantic schemas — all in one place.
"""
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

# ── Database setup ────────────────────────────────────────────────────────────
# DB_PATH env var lets Docker Compose point to a persistent volume.
# Defaults to quiz.db in the same directory as this file for local dev.
_db_file = os.environ.get("DB_PATH", str(Path(__file__).parent / "quiz.db"))
DATABASE_URL = f"sqlite+aiosqlite:///{_db_file}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ── ORM models ────────────────────────────────────────────────────────────────

class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    subject = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    questions = relationship("Question", back_populates="source", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    question_no = Column(String)
    content = Column(Text)
    answer = Column(String)
    explanation = Column(Text)
    difficulty = Column(String)
    unit = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="questions")
    choices = relationship(
        "Choice",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="Choice.id",
    )


class Choice(Base):
    __tablename__ = "choices"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    choice_no = Column(String)
    content = Column(Text)

    question = relationship("Question", back_populates="choices")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ChoiceOut(BaseModel):
    id: int
    choice_no: str
    content: str
    model_config = {"from_attributes": True}


class QuestionListItem(BaseModel):
    id: int
    source_id: int
    question_no: str
    content: str
    answer: Optional[str] = None
    difficulty: Optional[str] = None
    unit: Optional[str] = None
    model_config = {"from_attributes": True}


class QuestionOut(BaseModel):
    id: int
    source_id: int
    question_no: str
    content: str
    answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    unit: Optional[str] = None
    created_at: datetime
    choices: List[ChoiceOut] = []
    model_config = {"from_attributes": True}


class SourceOut(BaseModel):
    id: int
    filename: str
    subject: Optional[str] = None
    uploaded_at: datetime
    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    job_id: str
    status: str
    message: str


class JobStatus(BaseModel):
    job_id: str
    status: str
    message: str
    source_id: Optional[int] = None
    question_count: Optional[int] = None


class PaginatedQuestions(BaseModel):
    total: int
    page: int
    limit: int
    items: List[QuestionListItem]


class WorksheetSettings(BaseModel):
    title: str = "문제지"
    school: str = ""
    grade: str = ""
    class_num: str = ""
    date: str = ""
    show_answers: bool = True
    show_explanation: bool = False


class WorksheetPreviewRequest(BaseModel):
    question_ids: List[int]
    settings: WorksheetSettings = WorksheetSettings()


class WorksheetPDFRequest(BaseModel):
    question_ids: List[int]
    settings: WorksheetSettings = WorksheetSettings()
