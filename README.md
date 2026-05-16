# QuizCraft — 문제지 자동 생성

한국 교육 문서(HWPX/HWPML)를 파싱하여 맞춤형 문제지를 만드는 웹 애플리케이션입니다.

## 빠른 시작 (Docker Compose)

### 사전 요구사항

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker Engine + Compose 포함)

### 실행

```bash
cd quizcraft
docker compose up --build
```

브라우저에서 **http://localhost:5173** 접속

> 최초 빌드 시 이미지 생성에 수 분이 소요될 수 있습니다. 이후 재실행은 `docker compose up`만으로 충분합니다.

### Claude API 연동 (선택)

HWPML/HWPX 신규 파일 업로드 시 Claude API를 사용하면 더 정확한 파싱이 가능합니다.

```bash
ANTHROPIC_API_KEY="sk-ant-..." docker compose up --build
```

### 종료 및 데이터 초기화

```bash
# 종료 (데이터 보존)
docker compose down

# 데이터까지 삭제
docker compose down -v
```

---

## 수동 실행 (Docker 없이)

### 사전 요구사항

| 도구 | 최소 버전 |
|------|-----------|
| Python | 3.10+ |
| Node.js | 18+ |

**macOS 시스템 의존성 (WeasyPrint PDF 생성용):**
```bash
brew install pango
```

### 실행

```bash
# 백엔드
cd backend
pip3 install -r requirements.txt
python3 init_db.py          # 샘플 데이터 로드 (최초 1회)
uvicorn main:app --port 8001 --reload

# 프론트엔드 (별도 터미널)
cd frontend
npm install --legacy-peer-deps
npm run dev
```

브라우저에서 **http://localhost:5173** 접속

---

## 주요 기능

### 문제 탐색
- 파일 소스별 필터링, 키워드 검색
- 무한 스크롤로 문제 목록 탐색
- 문제 카드에서 정답/해설 토글 확인

### 문제 선택 & 순서 편집
- 카드 클릭으로 우측 패널에 추가
- 드래그앤드롭으로 순서 변경
- ✕ 버튼으로 개별 삭제, 초기화 버튼으로 전체 삭제

### 문제지 생성
- [문제지 만들기] 클릭 → 설정 입력
- 실시간 A4 미리보기 (설정 변경 시 자동 갱신)
- `문제지_YYYYMMDD.pdf` 형식으로 다운로드

### 파일 업로드
- `.hwp` (HWPML XML), `.hwpx` (ZIP XML), `.json` (사전 파싱) 지원
- `ANTHROPIC_API_KEY` 환경변수 설정 시 Claude API로 정밀 파싱

---

## 프로젝트 구조

```
quizcraft/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── main.py            FastAPI 앱 (모든 라우트 포함)
│   ├── models.py          DB 엔진 + ORM 모델 + Pydantic 스키마
│   ├── parser.py          파일 파싱 (HWPML / HWPX / JSON)
│   ├── pdf_generator.py   WeasyPrint + Jinja2 PDF/HTML 렌더러
│   ├── init_db.py         초기 데이터 로드 스크립트
│   ├── requirements.txt   Python 의존성
│   ├── templates/
│   │   └── worksheet.html A4 문제지 Jinja2 템플릿
│   ├── static/fonts/      NanumGothic.ttf (없으면 자동 다운로드)
│   └── data/              사전 파싱된 JSON 파일
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js          백엔드 fetch 래퍼
│   │   ├── context/        SelectionContext (선택 문제 전역 상태)
│   │   ├── hooks/          useQuestions, useSources
│   │   └── components/
│   │       ├── QuestionCard.jsx
│   │       ├── QuestionList.jsx
│   │       ├── FilterBar.jsx
│   │       ├── LeftPanel.jsx
│   │       ├── SelectedPanel.jsx  드래그앤드롭 선택 목록
│   │       ├── UploadModal.jsx
│   │       └── WorksheetModal.jsx 미리보기 + PDF 설정
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/upload` | 파일 업로드 → 백그라운드 파싱 |
| `GET` | `/api/upload/{job_id}` | 파싱 진행 상태 조회 |
| `GET` | `/api/sources` | 업로드된 파일 목록 |
| `GET` | `/api/questions` | 문제 목록 (source_id, keyword, page, limit) |
| `GET` | `/api/questions/{id}` | 문제 상세 (선택지 포함) |
| `POST` | `/api/worksheet/preview-html` | HTML 미리보기 (iframe용) |
| `POST` | `/api/worksheet/pdf` | PDF 파일 다운로드 |

전체 문서: **http://localhost:8001/docs**

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 인프라 | Docker Compose, Nginx |
| 백엔드 | Python, FastAPI, SQLAlchemy (async), SQLite |
| PDF | WeasyPrint, Jinja2, NanumGothic |
| 프론트엔드 | React 19, Tailwind CSS v4, Vite 8 |
| 드래그앤드롭 | react-beautiful-dnd |
