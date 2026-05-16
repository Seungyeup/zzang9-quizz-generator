# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**zzang9-quizz-autogen** (짱구를 위한 문제 자동 생성) — parses Korean quiz documents (HWPX / HWPML) into structured JSON and serves them through a REST API with PDF worksheet generation.

## Running with Docker (primary)

```bash
docker compose up --build
# → frontend: http://localhost:5173
# → backend API: http://localhost:8001
```

Optional Claude API parsing: `ANTHROPIC_API_KEY="sk-ant-..." docker compose up --build`

## Local dev (no Docker)

```bash
# macOS system dep for WeasyPrint
brew install pango

# Backend
cd backend
pip install -r requirements.txt
python3 init_db.py   # load sample data (once)
uvicorn main:app --port 8001 --reload

# Frontend (separate terminal)
cd frontend
npm install --legacy-peer-deps
npm run dev          # port 5173, proxies /api → 8001
```

## Architecture

```
docker-compose.yml   ← backend + frontend services, named volume quizcraft_db

backend/
  Dockerfile         — python:3.12-slim + Pango/Cairo for WeasyPrint
  entrypoint.sh      — runs init_db.py then uvicorn
  main.py            — FastAPI app with all routes inline
  models.py          — DB engine (DB_PATH env var), ORM models, Pydantic schemas
  parser.py          — HWPML / HWPX / JSON → DB-ready dicts
  pdf_generator.py   — WeasyPrint + Jinja2; render_html() / render_pdf()
  init_db.py         — idempotent loader: reads backend/data/*.json into SQLite
  requirements.txt
  templates/
    worksheet.html   — A4 Jinja2 template (NanumGothic, answer table, preview mode)
  static/fonts/      — NanumGothic.ttf auto-downloaded on first PDF request
  data/              — pre-parsed JSON (loaded by init_db.py on startup)
  uploads/           — temp storage for uploaded files

frontend/
  Dockerfile         — node:20-alpine build → nginx:alpine serve
  nginx.conf         — SPA fallback + /api/ proxy → http://backend:8001/api/
  src/
    App.jsx          — 58/42 split layout
    api.js           — fetch wrappers for all endpoints
    context/SelectionContext.jsx  — selected question state (toggle, reorder, clear)
    hooks/useQuestions.js         — paginated + infinite-scroll fetching
    hooks/useSources.js           — source list
    components/
      LeftPanel / FilterBar / QuestionList / QuestionCard
      SelectedPanel  — drag-and-drop via react-beautiful-dnd
      UploadModal    — file upload + job status polling
      WorksheetModal — A4 iframe preview + PDF download

data/                ← original source documents (.hwp, .hwpx)
```

### Key design decisions

- **Upload flow**: POST /api/upload returns `job_id` immediately; parsing runs in `BackgroundTasks`. Poll `GET /api/upload/{job_id}` for status.
- **SQLite persistence**: Docker named volume `quizcraft_db` at `/data/quiz.db`; `DB_PATH` env var makes path configurable.
- **PDF**: WeasyPrint is sync — called via `loop.run_in_executor` to avoid blocking the async event loop.
- **NanumGothic font**: auto-downloaded to `backend/static/fonts/NanumGothic.ttf` on first PDF request.
- **react-beautiful-dnd**: requires `--legacy-peer-deps` with React 19.
