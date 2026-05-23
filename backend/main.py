"""
9짱 시험지 빌더 — FastAPI backend.
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
from fastapi.responses import FileResponse, HTMLResponse, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import (
    AsyncSessionLocal, Base, Choice, Image, ImageOut, Question, Source, engine,
    FacetItem, JobStatus, PaginatedQuestions, QuestionFacets, QuestionListItem,
    QuestionOut, SourceOut, UploadResponse, WorksheetRequest,
    get_db,
)
from parser import attach_images_from_source, parse_file
from pdf_generator import render_html, render_pdf

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
IMAGE_DIR = Path(__file__).parent / "static" / "images"
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

_jobs: dict[str, dict] = {}


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="9짱 시험지 빌더 API", version="2.0.0", lifespan=lifespan)

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
        # If the upload is a .hwp/.hwpx, also extract embedded images and
        # attach them to the matching questions.
        if file_path.suffix.lower() in (".hwp", ".hwpx", ".hwpml"):
            try:
                attach_images_from_source(str(file_path), parsed["questions"], IMAGE_DIR)
            except Exception:
                pass

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
            )
            db.add(q)
            await db.flush()
            for cd in qd.get("choices", []):
                db.add(Choice(
                    question_id=q.id,
                    choice_no=cd.get("no", cd.get("choice_no", "")),
                    content=cd.get("content", ""),
                ))
            for pos, img in enumerate(qd.get("images", [])):
                db.add(Image(
                    question_id=q.id,
                    position=pos,
                    filename=img.get("filename"),
                    mime_type=img.get("mime_type"),
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


def _question_payload(q: Question) -> dict:
    """Serialize a Question (with .choices, .images, .source loaded) to a worksheet-ready dict."""
    images = [
        {
            "filename": im.filename,
            "mime_type": im.mime_type,
            "file_uri": (IMAGE_DIR / im.filename).as_uri(),
        }
        for im in q.images
    ]
    return {
        "id": q.id,
        "question_no": q.question_no,
        "content": q.content,
        "answer": q.answer,
        "explanation": q.explanation,
        "source": getattr(q.source, "filename", None) if q.source else None,
        "subject": getattr(q.source, "subject", None) if q.source else None,
        "choices": [{"choice_no": c.choice_no, "content": c.content} for c in q.choices],
        "images": images,
        "type": "객관식" if q.choices else "주관식",
    }


async def _load_worksheet_questions(question_ids: list[int], db: AsyncSession) -> list[dict]:
    if not question_ids:
        raise HTTPException(400, "question_ids가 비어 있습니다.")
    stmt = (
        select(Question).where(Question.id.in_(question_ids))
        .options(
            selectinload(Question.choices),
            selectinload(Question.images),
            selectinload(Question.source),
        )
    )
    rows = (await db.execute(stmt)).scalars().all()
    by_id = {q.id: q for q in rows}
    ordered = [by_id[qid] for qid in question_ids if qid in by_id]
    if not ordered:
        raise HTTPException(404, "문제를 찾을 수 없습니다.")
    return [_question_payload(q) for q in ordered]


def _to_list_item(q: Question, choice_count: int, image_count: int) -> QuestionListItem:
    src = q.source
    return QuestionListItem(
        id=q.id,
        source_id=q.source_id,
        source_filename=src.filename if src else None,
        source_subject=src.subject if src else None,
        question_no=q.question_no or "",
        content=q.content or "",
        answer=q.answer,
        choice_count=choice_count,
        image_count=image_count,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "9짱 시험지 빌더 API", "docs": "/docs"}


# Upload ----------------------------------------------------------------------

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


# Sources ---------------------------------------------------------------------

@app.get("/api/sources", response_model=list[SourceOut])
async def list_sources(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Source, func.count(Question.id))
        .outerjoin(Question, Question.source_id == Source.id)
        .group_by(Source.id)
        .order_by(Source.id)
    )
    rows = (await db.execute(stmt)).all()
    return [
        SourceOut(
            id=s.id, filename=s.filename, subject=s.subject,
            uploaded_at=s.uploaded_at, question_count=count,
        )
        for s, count in rows
    ]


# Questions -------------------------------------------------------------------

def _apply_question_filters(stmt, source_id, subject, qtype, keyword):
    if source_id is not None:
        stmt = stmt.where(Question.source_id == source_id)
    if subject:
        stmt = stmt.where(Source.subject == subject)
    if keyword:
        stmt = stmt.where(Question.content.contains(keyword))
    # type filter (객관식/주관식) is applied via subquery on choice count
    if qtype == "객관식":
        sub = select(Choice.question_id).group_by(Choice.question_id)
        stmt = stmt.where(Question.id.in_(sub))
    elif qtype == "주관식":
        sub = select(Choice.question_id).group_by(Choice.question_id)
        stmt = stmt.where(~Question.id.in_(sub))
    return stmt


@app.get("/api/questions", response_model=PaginatedQuestions)
async def list_questions(
    source_id: int | None = None,
    subject: str | None = None,
    type: str | None = None,
    keyword: str | None = None,
    page: int = 1,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
):
    base = select(Question).join(Source, Source.id == Question.source_id)
    base = _apply_question_filters(base, source_id, subject, type, keyword)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    rows = (await db.execute(
        base.options(selectinload(Question.source))
            .order_by(Question.id.desc())
            .offset((page - 1) * limit).limit(limit)
    )).scalars().all()

    if rows:
        ids = [q.id for q in rows]
        choice_counts = dict((await db.execute(
            select(Choice.question_id, func.count(Choice.id))
            .where(Choice.question_id.in_(ids))
            .group_by(Choice.question_id)
        )).all())
        image_counts = dict((await db.execute(
            select(Image.question_id, func.count(Image.id))
            .where(Image.question_id.in_(ids))
            .group_by(Image.question_id)
        )).all())
    else:
        choice_counts, image_counts = {}, {}

    items = [
        _to_list_item(q, choice_counts.get(q.id, 0), image_counts.get(q.id, 0))
        for q in rows
    ]
    return PaginatedQuestions(total=total, page=page, limit=limit, items=items)


@app.get("/api/questions/facets", response_model=QuestionFacets)
async def question_facets(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count(Question.id)))).scalar_one()

    subj_rows = (await db.execute(
        select(Source.subject, func.count(Question.id))
        .join(Question, Question.source_id == Source.id)
        .where(Source.subject.is_not(None))
        .group_by(Source.subject)
        .order_by(func.count(Question.id).desc())
    )).all()

    src_rows = (await db.execute(
        select(Source.filename, func.count(Question.id))
        .join(Question, Question.source_id == Source.id)
        .group_by(Source.filename)
        .order_by(func.count(Question.id).desc())
    )).all()

    # type counts (객관식 vs 주관식)
    qids_with_choices = select(Choice.question_id).group_by(Choice.question_id).subquery()
    objective = (await db.execute(
        select(func.count(Question.id)).where(Question.id.in_(select(qids_with_choices)))
    )).scalar_one()
    subjective = total - objective

    return QuestionFacets(
        total=total,
        subjects=[FacetItem(value=v, count=c) for v, c in subj_rows if v],
        sources=[FacetItem(value=v, count=c) for v, c in src_rows if v],
        types=[
            FacetItem(value="객관식", count=objective),
            FacetItem(value="주관식", count=subjective),
        ],
    )


@app.get("/api/questions/{question_id}", response_model=QuestionOut)
async def get_question(question_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Question).where(Question.id == question_id)
        .options(
            selectinload(Question.choices),
            selectinload(Question.images),
            selectinload(Question.source),
        )
    )
    q = (await db.execute(stmt)).scalar_one_or_none()
    if q is None:
        raise HTTPException(404, "문제를 찾을 수 없습니다.")
    src = q.source
    return QuestionOut(
        id=q.id, source_id=q.source_id,
        source_filename=src.filename if src else None,
        source_subject=src.subject if src else None,
        question_no=q.question_no or "",
        content=q.content or "",
        answer=q.answer, explanation=q.explanation,
        created_at=q.created_at,
        choices=[
            {"id": c.id, "choice_no": c.choice_no, "content": c.content}
            for c in q.choices
        ],
        images=[ImageOut.model_validate(im) for im in q.images],
    )


# Images ----------------------------------------------------------------------

@app.get("/api/images/{filename}")
async def get_image(filename: str):
    # Reject anything with a path separator to keep this firmly inside IMAGE_DIR.
    if "/" in filename or "\\" in filename or filename.startswith("."):
        raise HTTPException(400, "invalid filename")
    path = IMAGE_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(404, "이미지를 찾을 수 없습니다.")
    return FileResponse(path)


# Worksheet -------------------------------------------------------------------

@app.post("/api/worksheet/preview", response_class=HTMLResponse)
async def worksheet_preview(body: WorksheetRequest, db: AsyncSession = Depends(get_db)):
    questions = await _load_worksheet_questions(body.question_ids, db)
    html = render_html(questions, body.settings.model_dump(), preview_mode=True)
    return HTMLResponse(content=html)


@app.post("/api/worksheet/pdf")
async def worksheet_pdf(body: WorksheetRequest, db: AsyncSession = Depends(get_db)):
    questions = await _load_worksheet_questions(body.question_ids, db)
    settings = body.settings.model_dump()
    loop = asyncio.get_event_loop()
    pdf_bytes = await loop.run_in_executor(None, partial(render_pdf, questions, settings))
    suffix = {
        "answer": "_정답지",
        "explain": "_해설지",
    }.get(settings.get("sheet_type"), "")
    filename = f"{settings.get('title') or '시험지'}{suffix}.pdf"
    encoded = quote(filename, safe="")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"},
    )
