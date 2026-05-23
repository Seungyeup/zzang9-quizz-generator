# 9짱 — 시험지 빌더

한국 중·고등 사회/과학 문항을 파싱해 DB로 적재하고, 강사가 클릭 몇 번으로 시험지 / 정답지 / 해설지를 만들어 PDF로 받을 수 있게 해주는 데스크탑 SaaS.

```
┌── 헤더 (브랜드 · 검색 · 파일 업로드) ─────────────────────────────────┐
│ ┌───── 좌측 ─────┬──────── 중앙 문제 라이브러리 ────┬── 우측 미리보기 ──┐│
│ │ 과목/출처/유형  │ 활성필터칩 · 카드 리스트          │ 시험지/정답지/해설지│
│ │                 │ ────────────────────────────── │ A4 멀티페이지       │
│ │                 │ 선택된 문제 도크(드래그 재정렬)   │ 인쇄 / PDF 다운로드│
│ └─────────────────┴────────────────────────────────┴────────────────────┘│
└───────────────────────────────────────────────────────────────────────────┘
```

핵심 기능 — 라이브 A4 미리보기, 1단/2단 토글, 시험지 메타 인라인 편집, 페이지 단위 컬럼 패킹, 워터마크, 정답지/해설지 별도 PDF.

---

## 빠른 시작 (Docker Compose)

### 사전 요구사항

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 실행

```bash
docker compose up --build
```

- 프론트엔드 → http://localhost:5173
- 백엔드 API → http://localhost:8001
- API 문서 → http://localhost:8001/docs

> 최초 빌드는 백엔드 의존성 + WeasyPrint 시스템 라이브러리 때문에 수 분 걸릴 수 있어요. 이후엔 `docker compose up`만으로 충분합니다.

### 종료 / 초기화

```bash
docker compose down        # 종료 (DB 보존)
docker compose down -v     # DB까지 초기화
```

### Claude API 연동 (선택)

업로드된 .hwp / .hwpx 가 정형이 아니라면 Claude API로 더 정확하게 파싱할 수 있습니다.

```bash
ANTHROPIC_API_KEY="sk-ant-..." docker compose up --build
```

---

## 수동 실행 (Docker 없이)

| 도구 | 최소 버전 |
|------|-----------|
| Python | 3.10+ |
| Node.js | 18+ |

```bash
# macOS 시스템 의존성 (WeasyPrint)
brew install pango

# 백엔드
cd backend
pip3 install -r requirements.txt
python3 init_db.py          # 샘플 데이터 로드 (최초 1회)
uvicorn main:app --port 8001 --reload

# 프론트엔드 (별도 터미널)
cd frontend
npm install
npm run dev
```

브라우저에서 **http://localhost:5173** 접속.

---

## 화면 구조

### 좌측 필터 사이드바
- **과목** (`sources.subject` 기반)
- **출처** (`sources.filename`)
- **문제 유형** (객관식/주관식 — `choices.length`로 유도)

`/api/questions/facets` 한 번으로 모든 카운트를 받아옵니다.

### 중앙 문제 라이브러리
- 활성 필터 칩 (개별 / 모두 해제)
- 무한 스크롤 카드 리스트
- 카드 클릭 = 선택 토글, "자세히 ▾" = 보기/선택지 펼침
- 선택된 문제 도크: 접기/펼치기, **드래그로 순서 변경**

### 우측 시험지 미리보기
- 탭: **시험지 / 정답지 / 해설지** — 각각 다른 레이아웃
- **1단 / 2단 토글** (시험지 모드)
- 워터마크 체크박스
- A4 비율(210:297) 강제, 페이지 단위 컬럼 패킹, 페이지마다 20px 분리
- 헤더(학교명/제목/과목/학년/날짜/교시) **인라인 편집**
- 액션 바: 문항 수 · 점수 · A4 N쪽 · 인쇄 미리보기 · **PDF 다운로드**

### 패널 사이 리사이저
중앙/우측 경계를 드래그해 미리보기를 380px ~ (화면너비 - 580px) 사이로 조절.

---

## 데이터 모델

DB 스키마는 한국 시험 문제의 **공통 골격**만 저장합니다 — 시안에 있는 `year/used/correctRate/figure` 같은 부가 메타는 들어오면 좋지만 없는 경우 `null`로 안전하게 비워두고 UI에서 가립니다.

### `sources`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | INTEGER PK | |
| filename | TEXT NOT NULL | 업로드 원본 파일명 ≈ 시안의 `source` |
| subject | TEXT NULL | 사회 / 과학 등 — 사이드바 "과목" 필터 |
| uploaded_at | DATETIME | |

### `questions`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | INTEGER PK | |
| source_id | FK → sources.id | |
| question_no | TEXT | 원본 시험지의 문항 번호 |
| content | TEXT | 지문 + 발문 (개행 분리, 마지막 줄을 발문으로 취급) |
| answer | TEXT NULL | 정답 (객관식이면 보기 번호) |
| explanation | TEXT NULL | 해설 |
| created_at | DATETIME | |

### `choices`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | INTEGER PK | |
| question_id | FK → questions.id | |
| choice_no | TEXT | ①②③④⑤ 등 |
| content | TEXT | |

> `choices.length > 0` 으로 객관식/주관식을 유도합니다. 서술형은 백엔드 데이터에 별도 컬럼이 없어 미리보기에서도 동일하게 "주관식 답란"으로 처리됩니다.

---

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/api/upload` | 파일 업로드, `BackgroundTasks`로 파싱 시작 |
| `GET` | `/api/upload/{job_id}` | 파싱 진행 상태 폴링 |
| `GET` | `/api/sources` | 업로드 소스 목록 + 문항 수 |
| `GET` | `/api/questions` | 페이지네이션·필터 (`subject`, `source_id`, `type`, `keyword`) |
| `GET` | `/api/questions/facets` | 사이드바용 카운트 집계 (한 번에 전체) |
| `GET` | `/api/questions/{id}` | 보기/해설 포함 상세 |
| `POST` | `/api/worksheet/preview` | 동일 데이터 + Jinja 템플릿 → HTML (PDF와 같은 렌더러) |
| `POST` | `/api/worksheet/pdf` | WeasyPrint PDF — `sheet_type=question/answer/explain`, `columns=1/2`, `watermark` |

전체 스키마 / 시도용 UI: **http://localhost:8001/docs**

---

## 프로젝트 구조

```
zzang9-quizz-autogen/
├── docker-compose.yml         backend + frontend services
├── DESIGN.md                  프론트엔드 디자인 룰
├── README.md
├── backend/
│   ├── Dockerfile             python:3.12-slim + Pango/Cairo (WeasyPrint)
│   ├── entrypoint.sh          init_db.py → uvicorn
│   ├── main.py                FastAPI 라우트 (목록/팩셋/디테일/미리보기/PDF)
│   ├── models.py              DB 엔진 · ORM · Pydantic 스키마
│   ├── parser.py              HWPML / HWPX / JSON 파싱
│   ├── pdf_generator.py       Jinja2 + WeasyPrint · content → (passage, prompt) 분리
│   ├── init_db.py             샘플 JSON 로드 (idempotent)
│   ├── requirements.txt
│   ├── templates/worksheet.html   Noto Serif KR 기반 A4 템플릿
│   ├── static/fonts/              NotoSerifKR-Regular.ttf (자동 다운로드)
│   └── data/                      사전 파싱된 샘플 JSON
└── frontend/
    ├── Dockerfile             node:20-alpine 빌드 → nginx:alpine 서비스
    ├── nginx.conf             SPA fallback + /api → backend:8001
    ├── index.html             Pretendard + Noto Serif KR 로드
    └── src/
        ├── main.jsx
        ├── App.jsx                레이아웃 합성
        ├── theme.js               THEMES + makeTokens
        ├── api.js                 fetch 래퍼
        ├── context/SelectionContext.jsx
        ├── hooks/{useQuestions,useFacets,useSources}.js
        └── components/
            ├── Header.jsx
            ├── FilterSidebar.jsx
            ├── QuestionBoard.jsx
            ├── QuestionCard.jsx
            ├── SelectedDock.jsx        드래그 재정렬
            ├── Resizer.jsx             중앙/우측 패널 리사이저
            ├── ExamPaper.jsx           A4 페이지 패킹 · 인라인 메타 편집
            ├── PreviewPanel.jsx        탭 · 1/2단 · 워터마크 · PDF
            ├── UploadModal.jsx
            └── ui.jsx                  Pill / Difficulty / Checkbox / EditableText / icons
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 인프라 | Docker Compose, Nginx |
| 백엔드 | Python 3.12, FastAPI, SQLAlchemy (async), SQLite |
| PDF | WeasyPrint, Jinja2, Noto Serif KR |
| 프론트엔드 | React 19, Vite 8 (스타일은 디자인 토큰 + 인라인 스타일) |
| 폰트 | Pretendard (UI), Noto Serif KR (시험지) |
