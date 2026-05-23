"""
Database engine, ORM models, and Pydantic schemas.
"""
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

# ── Database setup ────────────────────────────────────────────────────────────
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
    created_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="questions")
    choices = relationship(
        "Choice",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="Choice.id",
    )
    images = relationship(
        "Image",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="Image.position",
    )


class Choice(Base):
    __tablename__ = "choices"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    choice_no = Column(String)
    content = Column(Text)

    question = relationship("Question", back_populates="choices")


class Image(Base):
    """An image (chart, table, photograph) embedded in a question.
    Binary data is stored on disk under static/images/<filename>; the row only
    tracks the link + display order within its question."""
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    position = Column(Integer, default=0)
    filename = Column(String, nullable=False)
    mime_type = Column(String)

    question = relationship("Question", back_populates="images")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ChoiceOut(BaseModel):
    id: int
    choice_no: str
    content: str
    model_config = {"from_attributes": True}


class ImageOut(BaseModel):
    id: int
    position: int = 0
    filename: str
    mime_type: Optional[str] = None
    model_config = {"from_attributes": True}


class QuestionListItem(BaseModel):
    """Slim payload used by the question library list view."""
    id: int
    source_id: int
    source_filename: Optional[str] = None
    source_subject: Optional[str] = None
    question_no: str
    content: str
    answer: Optional[str] = None
    choice_count: int = 0
    image_count: int = 0


class QuestionOut(BaseModel):
    id: int
    source_id: int
    source_filename: Optional[str] = None
    source_subject: Optional[str] = None
    question_no: str
    content: str
    answer: Optional[str] = None
    explanation: Optional[str] = None
    created_at: datetime
    choices: List[ChoiceOut] = []
    images: List[ImageOut] = []


class SourceOut(BaseModel):
    id: int
    filename: str
    subject: Optional[str] = None
    uploaded_at: datetime
    question_count: int = 0


class FacetItem(BaseModel):
    value: str
    count: int


class QuestionFacets(BaseModel):
    """Pre-aggregated counts for the filter sidebar."""
    total: int
    subjects: List[FacetItem]
    sources: List[FacetItem]
    types: List[FacetItem]   # 객관식 / 주관식 (derived from choice count)


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
    """Mirrors the editable meta of the design's A4 preview."""
    title: str = "시험지"
    school: str = ""
    subject: str = ""
    grade: str = ""
    date: str = ""
    session: str = "1"
    columns: int = Field(default=1, ge=1, le=2)
    watermark: bool = False
    sheet_type: str = "question"  # question | answer | explain


class WorksheetRequest(BaseModel):
    question_ids: List[int]
    settings: WorksheetSettings = WorksheetSettings()
