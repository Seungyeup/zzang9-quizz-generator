# 시험지 빌더 · 프론트엔드 디자인 룰

이 문서는 `frontend/`의 톤·간격·컴포넌트 규칙을 한 곳에 모은 것. 새 컴포넌트를 추가하기 전에 이 룰에 맞춰 토큰을 먼저 확장하세요.

---

## 1. 컨셉

- **사용자**: 학원 강사. 화면을 한 번에 보고 빠르게 클릭/드래그해 작업.
- **시각 톤**: B2B SaaS 대시보드 (Linear / Notion / Pretendard 라인) + 우측 미리보기는 진짜 종이 느낌 (Noto Serif KR / 베이지 톤).
- **레이아웃 우선순위**: 가로폭 1440×900 데스크탑 기준. 모바일은 비대상.

---

## 2. 디자인 토큰 (single source of truth)

토큰은 모두 `frontend/src/theme.js` 의 `makeTokens(t)` 가 반환합니다. 컴포넌트는 토큰을 `k` 변수로 받아 인라인 스타일에서 참조하세요. **하드코딩된 색상/간격/폰트를 컴포넌트에 직접 넣지 않습니다.**

```js
import { makeTokens } from './theme'
const k = makeTokens({ color: 'blue', density: 'M', dark: false })
```

### 컬러 토큰
| 토큰 | 용도 |
|---|---|
| `k.primary` / `k.primaryDark` / `k.primarySoft` / `k.primaryTint` | 브랜드. 선택 카드, 액션 버튼, 강조 칩 |
| `k.bg` | 페이지 배경 (가장 차가운 톤) |
| `k.panel` | 카드/사이드바/모달 표면 |
| `k.sub` | 패널 내부의 약간 더 가라앉은 영역 (선택 도크, 칩 안쪽) |
| `k.border` / `k.borderSoft` / `k.borderStrong` | 일반 / 매우 옅음 / 강함 |
| `k.text` / `k.textMid` / `k.textDim` | 본문 / 보조 / 메타 |
| `k.paperBg` `#fbfaf7` / `k.paperText` / `k.paperAccent` `#b1342a` | 시험지(미리보기·PDF) 전용. 다크 모드여도 종이는 그대로. |
| `k.success` / `k.warning` / `k.danger` | 의미 있는 상태에서만 |

### 밀도 / 라운드
- 카드 패딩은 `k.rowPad` (`S=10/14`, `M=14/16`, `L=18/20`) 토큰 사용.
- 라운드: 칩/뱃지 `999`, 인풋/버튼 `6`, 카드 `8`, 모달 `10`.

### 그림자
- 일반 카드: 거의 안 보이는 1px 그림자만.
- 시험지 종이: `0 1px 3px rgba(0,0,0,.10), 0 12px 28px rgba(0,0,0,.08)` — 종이 들림 표현 1곳에만.
- 모달: `0 20px 50px -10px rgba(15, 23, 42, 0.25)`.

---

## 3. 타이포

- UI 폰트: `Pretendard, "Apple SD Gothic Neo", -apple-system, sans-serif` (전역).
- 시험지 폰트: `"Noto Serif KR", "Nanum Myeongjo", serif` — **종이 영역에서만**.
- 코드/메타: `ui-monospace, SFMono-Regular, monospace` (문제 ID `Q-0001`, 페이지 번호 등).

### 위계
| 역할 | 사이즈 / 두께 | 색 |
|---|---|---|
| 페이지 카운트 (`문제 35개`) | 15 / 700 | `k.text` |
| 섹션 라벨 (`과목`, `출처`) | 10.5 / 700, uppercase, letter-spacing 0.6 | `k.textMid` |
| 카드 본문 | 13 / 400, line-height 1.5 | `k.text` |
| 카드 메타 | 11.5 / 400 | `k.textMid` |
| 메타 보조 (`사용 N회`) | 11 / 400 | `k.textDim` |
| 시험지 제목 | 22 / 700, letter-spacing -0.5 | `#1f1f1f` |
| 시험지 본문 | 11 / 400, line-height 1.6 | `#262626` |

---

## 4. 컴포넌트 사용 규칙

- `Pill` — subject / type 같은 짧은 라벨. tone은 의미 기반(`amber=사회`, `blue=과학`, `slate=객관식`, `green=주관식`).
- `Checkbox` — 카드 선택 한정. 라디오/스위치는 별도.
- `EditableText` — 시험지 헤더 인라인 편집 한정. UI 본문에 쓰지 마세요.
- `IconBtn` — 28×28 정사각 아이콘 버튼. tone: `ghost / bordered / primary`.
- `FigurePlaceholder` — 자료/도표 자리표시(SVG 줄무늬). 실제 도표 데이터가 없을 때만 사용.

> 새 시각 컴포넌트가 필요하면 `components/ui.jsx` 에 추가하고 컬러/사이즈는 반드시 토큰을 통하게 하세요.

---

## 5. 레이아웃 규약

- 최상위는 단일 `div` (100vw × 100vh, overflow:hidden), 그 안에 헤더 + 본문 flex.
- 본문은 좌측 필터(220px 고정) · 중앙(flex) · 리사이저(6px) · 우측 미리보기(드래그 가능) 의 4분할.
- 카드 사이 구분은 `border-bottom: 1px solid k.borderSoft`. 카드 자체에는 box-shadow 금지.
- 모든 스크롤 컨테이너는 부모에서 `overflow: hidden` + 자식에서 `flex: 1; overflow: auto` 패턴.

---

## 6. 데이터 안전

- 시안에는 `year / used / correctRate / figure / grade` 같은 부가 필드가 있지만 백엔드 모델에는 없습니다. 카드/시험지 어디서든 **null이면 행/배지를 빼거나 `—` 로 처리**하고 가짜값을 만들지 않습니다.
- 객관식/주관식은 백엔드 컬럼이 아니라 `choices.length > 0` 로 유도합니다.
- 시험지 본문은 `content` 한 컬럼을 개행으로 자른 뒤 마지막 줄을 발문(prompt), 나머지를 지문(passage)으로 취급합니다 — UI · PDF 모두 동일 규약.

---

## 7. 금지

- 임의의 인라인 hex (`#ff0000` 같은). 토큰을 추가하든, 의미상 status면 `k.success/warning/danger` 사용.
- 카드/패널에 그라데이션 배경. 그라데이션은 헤더 로고 1곳만.
- 과도한 transition (200ms 초과). hover/active는 100~150ms 안에 끝낼 것.
- Tailwind 같은 추가 CSS 프레임워크 도입. 토큰+인라인 스타일을 유지합니다.
- API 호출 방식 변경, 상태 관리 구조 변경, 라우팅 도입 — 모두 별도 결정 필요.
