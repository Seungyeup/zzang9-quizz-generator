"""
QuizCraft — FastAPI backend.
All routes are inline for a self-contained, easy-to-run layout.

Run:
    uvicorn main:app --reload --port 8001
"""

import asyncio
import shutil
import uuid
from contextlib import asynccontextmanager
from functools import partial
from pathlib import Path
from urllib.parse import quote

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import (
    AsyncSessionLocal, Base, Choice, Question, Source, engine,
    ChoiceOut, JobStatus, PaginatedQuestions, QuestionListItem, QuestionOut,
    SourceOut, UploadResponse, WorksheetPDFRequest, WorksheetPreviewRequest,
    get_db,
)
from parser import parse_file
from pdf_generator import render_html, render_pdf

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

_jobs: dict[str, dict] = {}


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="QuizCraft API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _process_upload(job_id: str, file_path: Path, subject: str, db: AsyncSession):
    _jobs[job_id].update(status="processing", message="파싱 중...")
    try:
        parsed = parse_file(str(file_path))
        source = Source(filename=parsed["source_file"], subject=subject or None)
        db.add(source)
        await db.flush()

        for qd in parsed["questions"]:
            q = Question(
                source_id=source.id,
                question_no=qd.get("question_no", ""),
                content=qd.get("content", ""),
                answer=qd.get("answer"),
                explanation=qd.get("explanation"),
                difficulty=qd.get("difficulty"),
                unit=qd.get("unit"),
            )
            db.add(q)
            await db.flush()
            for cd in qd.get("choices", []):
                db.add(Choice(
                    question_id=q.id,
                    choice_no=cd.get("no", cd.get("choice_no", "")),
                    content=cd.get("content", ""),
                ))

        await db.commit()
        await db.refresh(source)
        _jobs[job_id].update(
            status="done",
            message=f"{len(parsed['questions'])}개 문제 저장 완료",
            source_id=source.id,
            question_count=len(parsed["questions"]),
        )
    except Exception as exc:
        await db.rollback()
        _jobs[job_id].update(status="error", message=str(exc))
    finally:
        file_path.unlink(missing_ok=True)


async def _get_worksheet_questions(question_ids: list[int], db: AsyncSession) -> list[dict]:
    if not question_ids:
        raise HTTPException(400, "question_ids가 비어 있습니다.")
    stmt = (
        select(Question).where(Question.id.in_(question_ids))
        .options(selectinload(Question.choices))
    )
    rows = (await db.execute(stmt)).scalars().all()
    by_id = {q.id: q for q in rows}
    ordered = [by_id[qid] for qid in question_ids if qid in by_id]
    if not ordered:
        raise HTTPException(404, "문제를 찾을 수 없습니다.")
    return [
        {
            "question_no": q.question_no,
            "content": q.content,
            "answer": q.answer,
            "explanation": q.explanation,
            "choices": [{"choice_no": c.choice_no, "content": c.content} for c in q.choices],
        }
        for q in ordered
    ]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "QuizCraft API", "docs": "/docs"}


# Upload
@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in (".hwp", ".hwpx", ".json"):
        raise HTTPException(400, "지원 형식: .hwp .hwpx .json")
    job_id = str(uuid.uuid4())
    dest = UPLOAD_DIR / f"{job_id}{ext}"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    _jobs[job_id] = {"status": "pending", "message": "대기 중", "source_id": None, "question_count": None}
    background_tasks.add_task(_process_upload, job_id, dest, subject, db)
    return UploadResponse(job_id=job_id, status="pending", message="업로드 완료. 백그라운드 파싱 시작.")


@app.get("/api/upload/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    job = _jobs.get(job_id, {"status": "not_found", "message": "존재하지 않는 작업입니다."})
    return JobStatus(
        job_id=job_id,
        status=job.get("status", "not_found"),
        message=job.get("message", ""),
        source_id=job.get("source_id"),
        question_count=job.get("question_count"),
    )


# Sources
@app.get("/api/sources", response_model=list[SourceOut])
async def list_sources(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Source).order_by(Source.id))).scalars().all()
    return [SourceOut.model_validate(s) for s in rows]


# Questions
@app.get("/api/questions", response_model=PaginatedQuestions)
async def list_questions(
    source_id: int | None = None,
    keyword: str | None = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Question)
    if source_id is not None:
        stmt = stmt.where(Question.source_id == source_id)
    if keyword:
        stmt = stmt.where(Question.content.contains(keyword))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(
        stmt.offset((page - 1) * limit).limit(limit).order_by(Question.id)
    )).scalars().all()
    return PaginatedQuestions(
        total=total, page=page, limit=limit,
        items=[QuestionListItem.model_validate(q) for q in rows],
    )


@app.get("/api/questions/{question_id}", response_model=QuestionOut)
async def get_question(question_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Question).where(Question.id == question_id)
        .options(selectinload(Question.choices))
    )
    q = (await db.execute(stmt)).scalar_one_or_none()
    if q is None:
        raise HTTPException(404, "문제를 찾을 수 없습니다.")
    return QuestionOut.model_validate(q)


# Worksheet
@app.post("/api/worksheet/preview")
async def worksheet_preview(body: WorksheetPreviewRequest, db: AsyncSession = Depends(get_db)):
    questions = await _get_worksheet_questions(body.question_ids, db)
    return {"settings": body.settings.model_dump(), "questions": questions}


@app.post("/api/worksheet/preview-html", response_class=HTMLResponse)
async def worksheet_preview_html(body: WorksheetPDFRequest, db: AsyncSession = Depends(get_db)):
    questions = await _get_worksheet_questions(body.question_ids, db)
    html = render_html(questions, body.settings.model_dump(), preview_mode=True)
    return HTMLResponse(content=html)


@app.post("/api/worksheet/pdf")
async def worksheet_pdf(body: WorksheetPDFRequest, db: AsyncSession = Depends(get_db)):
    questions = await _get_worksheet_questions(body.question_ids, db)
    settings = body.settings.model_dump()
    loop = asyncio.get_event_loop()
    pdf_bytes = await loop.run_in_executor(None, partial(render_pdf, questions, settings))
    filename = f"{settings['title']}.pdf"
    encoded = quote(filename, safe="")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"},
    )
