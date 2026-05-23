// A4-sized exam paper preview with page-by-page column packing.
// Adapted from the design bundle's exam-paper.jsx but driven by our backend
// question shape (content + choices objects).

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EditableText } from './ui'

// ── normalization ─────────────────────────────────────────────────────────────
// Convert backend Question → design-shaped object so the renderer is identical.
function normalize(q) {
  // First line is the prompt (발문, the question itself); remaining lines
  // are the passage (지문) shown underneath it.
  const lines = (q.content || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const prompt = lines[0] || ''
  const passage = lines.length > 1 ? lines.slice(1).join('\n') : ''
  const choiceObjs = q.choices || []
  const isObjective = choiceObjs.length > 0
  const type = isObjective ? '객관식' : '주관식'
  const score = type === '서술형' ? 6 : type === '주관식' ? 5 : 4
  const answerText = (() => {
    if (!q.answer || !isObjective) return q.answer_text || ''
    const match = choiceObjs.find((c) => c.choice_no === q.answer)
    return match?.content || ''
  })()
  const choices = choiceObjs.map((c) => `${c.choice_no} ${c.content}`)
  return {
    id: q.id,
    passage,
    prompt,
    choices,
    type,
    score,
    answer: q.answer || '—',
    answerText,
    explain: q.explanation,
    subject: q.source_subject,
    source: q.source_filename,
    images: q.images || [],
  }
}

// ── headers ───────────────────────────────────────────────────────────────────
function ExamHeader({ meta, setMeta, sheetType, total, totalScore }) {
  const subtitle =
    sheetType === 'answer' ? '정 답 지' :
    sheetType === 'explain' ? '해 설 지' : null
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: '#737373' }}>
          ● <EditableText value={meta.school} onChange={(v) => setMeta({ ...meta, school: v })} /> ●
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: '#1f1f1f' }}>
          <EditableText value={meta.title} onChange={(v) => setMeta({ ...meta, title: v })} />
          {subtitle && (
            <span style={{ marginLeft: 10, color: '#b1342a', letterSpacing: 6 }}>· {subtitle}</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#525252', marginBottom: 14 }}>
        <EditableText value={meta.subject} onChange={(v) => setMeta({ ...meta, subject: v })} /> ·
        {' '}<EditableText value={meta.grade} onChange={(v) => setMeta({ ...meta, grade: v })} /> ·
        {' '}<EditableText value={meta.date} onChange={(v) => setMeta({ ...meta, date: v })} />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10.5,
          color: '#525252',
          borderTop: '1.5px solid #1f1f1f',
          borderBottom: '0.5px solid #1f1f1f',
          padding: '5px 0',
          marginBottom: 16,
        }}
      >
        <span>제 <EditableText value={meta.session} onChange={(v) => setMeta({ ...meta, session: v })} /> 교시</span>
        <span>총 {total}문항 · {totalScore}점</span>
        <span>이름: ________________</span>
        <span>학번: __________</span>
      </div>
    </div>
  )
}

function ExamMiniHeader({ meta, sheetType }) {
  const sub =
    sheetType === 'answer' ? '정답지' :
    sheetType === 'explain' ? '해설지' : ''
  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottom: '0.5px solid #1f1f1f',
        padding: '2px 0 5px',
        marginBottom: 12,
        fontSize: 10,
        color: '#525252',
      }}
    >
      <span style={{ fontWeight: 600 }}>
        {meta.title}{sub && ' · ' + sub}
      </span>
      <span>
        {meta.subject || '—'} · {meta.grade || '—'}
      </span>
    </div>
  )
}

function ExamFooter({ meta, sheetType }) {
  const label =
    sheetType === 'answer' ? '정답지' :
    sheetType === 'explain' ? '해설지' : meta.title
  return (
    <div
      style={{
        flexShrink: 0,
        marginTop: 'auto',
        paddingTop: 8,
        borderTop: '0.5px solid #d4d4d4',
        fontSize: 9,
        color: '#a3a3a3',
      }}
    >
      {meta.school || ''}{meta.school && ' · '}{label}
    </div>
  )
}

// ── question (per-sheet renderer) ─────────────────────────────────────────────
function ExamQuestion({ q, idx, sheetType, columns, dragging, setDragging, onReorder, allowDrag, figW }) {
  const dragProps = allowDrag ? {
    draggable: true,
    onDragStart: (e) => { setDragging(idx); e.dataTransfer.effectAllowed = 'move' },
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' },
    onDrop: (e) => {
      e.preventDefault()
      if (dragging !== null && dragging !== idx) onReorder(dragging, idx)
      setDragging(null)
    },
    onDragEnd: () => setDragging(null),
    style: { opacity: dragging === idx ? 0.4 : 1, cursor: 'grab' },
  } : {}

  if (sheetType === 'answer') {
    return (
      <div
        {...dragProps}
        style={{
          display: 'flex',
          gap: 10,
          padding: '7px 10px',
          borderBottom: '0.5px solid #e5e5e5',
          ...(dragProps.style || {}),
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 12, color: '#1f1f1f', minWidth: 24 }}>{idx + 1}.</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#b1342a', minWidth: 22 }}>{q.answer}</span>
        <span style={{ flex: 1, fontSize: 10, color: '#525252', marginLeft: 4, overflow: 'hidden' }}>
          {q.answerText}
        </span>
      </div>
    )
  }

  if (sheetType === 'explain') {
    return (
      <div
        {...dragProps}
        style={{
          marginBottom: 12,
          padding: '10px 12px',
          background: '#fafafa',
          borderLeft: '3px solid #b1342a',
          ...(dragProps.style || {}),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1f1f1f' }}>{idx + 1}.</span>
          <span style={{ fontSize: 10, color: '#737373' }}>{q.type}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11 }}>
            <span style={{ color: '#737373' }}>정답 </span>
            <strong style={{ color: '#b1342a' }}>{q.answer}</strong>
          </span>
        </div>
        {q.prompt && (
          <div style={{ fontSize: 10.5, color: '#525252', lineHeight: 1.55, marginBottom: 5, fontStyle: 'italic' }}>
            {q.prompt}
          </div>
        )}
        <div style={{ fontSize: 11, lineHeight: 1.7, color: '#1f1f1f' }}>
          <strong style={{ color: '#b1342a' }}>[ 풀이 ] </strong>
          {q.explain || '해설이 등록되지 않았습니다.'}
        </div>
        {q.answerText && q.type !== '객관식' && (
          <div style={{ fontSize: 10.5, lineHeight: 1.5, marginTop: 5, color: '#404040' }}>
            <strong>모범답안 · </strong>{q.answerText}
          </div>
        )}
      </div>
    )
  }

  // 시험지: 문제번호. 발문 → 지문 → 이미지 → 보기/답란
  //
  // Within a CSS multi-column layout, the question itself may need to
  // split across columns when its content alone exceeds one column's
  // height. We do that by letting the outer wrapper break inside, while
  // each *section* (prompt-line, passage, image, each choice line) is
  // marked break-inside: avoid so lines stay intact at the break point.
  const imgMax = figW || (columns === 2 ? 180 : 360)
  return (
      <div
        {...dragProps}
        style={{
          marginBottom: 16,
          breakInside: 'auto',
          ...(dragProps.style || {}),
        }}
      >
        {/* line 1: 문제번호 + 발문 (질문) + 배점 */}
        <div
          style={{
            display: 'flex', gap: 5, marginBottom: 6, alignItems: 'baseline',
            breakInside: 'avoid',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1f1f1f', flexShrink: 0 }}>
            {idx + 1}.
          </span>
          <span style={{ fontSize: 11, lineHeight: 1.55, color: '#1f1f1f', flex: 1, whiteSpace: 'pre-wrap' }}>
            {q.prompt}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#b1342a', flexShrink: 0 }}>
            [{q.score}점]
          </span>
        </div>

        {/* line 2: 지문 — long passages may break between paragraphs.
            Wrapped in a thin border so 발문 / 지문 / 보기 are clearly
            separated even when the question splits across columns. */}
        {q.passage && (
          <div style={{
            marginBottom: 6,
            marginLeft: 14,
            border: '0.5px solid #1f1f1f',
            padding: '6px 9px',
          }}>
            {q.passage.split('\n').map((line, li) => (
              <div
                key={li}
                style={{
                  fontSize: 10.5,
                  lineHeight: 1.6,
                  color: '#262626',
                  whiteSpace: 'pre-wrap',
                  breakInside: 'avoid',
                }}
              >
                {line}
              </div>
            ))}
          </div>
        )}

        {/* line 3: 이미지 — never split. Block layout, not flex, because
            CSS multi-column fragmentation inside flex containers is
            undefined behaviour and can cause trailing content to vanish. */}
        {q.images && q.images.length > 0 && (
          <div
            style={{
              marginBottom: 6, paddingLeft: 14, breakInside: 'avoid',
            }}
          >
            {q.images.map((img) => (
              <img
                key={img.id}
                src={`/api/images/${img.filename}`}
                alt=""
                style={{
                  maxWidth: imgMax, maxHeight: 200, objectFit: 'contain',
                  display: 'block', marginBottom: 4,
                }}
              />
            ))}
          </div>
        )}

        {/* line 4: 보기 — each choice never splits inside, but breaks
            between choices are allowed for long lists. Block layout for
            the same column-fragmentation reason as the image group. */}
        {q.choices.length > 0 ? (
          <div style={{
            fontSize: 10.5, color: '#262626', paddingLeft: 14,
          }}>
            {q.choices.map((c, i) => (
              <div key={i} style={{ breakInside: 'avoid', marginBottom: 2 }}>{c}</div>
            ))}
          </div>
        ) : (
          <div style={{
            marginLeft: 14, marginTop: 2,
            height: q.type === '서술형' ? 56 : 36,
            background: 'repeating-linear-gradient(to bottom, transparent 0, transparent 11px, #d4d4d4 11px, #d4d4d4 12px)',
            breakInside: 'avoid',
          }} />
        )}
      </div>
    )
  }

// ── main ──────────────────────────────────────────────────────────────────────
export function ExamPaper({
  selectedItems, meta, setMeta,
  sheetType, columns: questionColumns,
  onReorder, paperWidth, onPagesChange,
}) {
  const selQs = selectedItems.map(normalize)
  const totalScore = selQs.reduce((s, q) => s + q.score, 0)

  const columns =
    sheetType === 'explain' ? 1 :
    sheetType === 'answer' ? 2 :
    questionColumns

  const paperHeight = paperWidth * 297 / 210
  const padX = Math.round(paperWidth * 0.075)
  const padTop = Math.round(paperWidth * 0.07)
  const padBottom = Math.round(paperWidth * 0.08)
  const colGap = Math.round(paperWidth * 0.045)
  const innerWidth = paperWidth - 2 * padX
  const colWidth = (innerWidth - (columns - 1) * colGap) / columns
  const innerHeight = paperHeight - padTop - padBottom
  const figW = sheetType === 'question' && columns === 2
    ? Math.round(colWidth * 0.9)
    : Math.round(innerWidth * 0.75)

  const qMeasureRef = useRef(null)
  const headerMeasureRef = useRef(null)
  const miniHeaderMeasureRef = useRef(null)
  const footerMeasureRef = useRef(null)
  const [qHeights, setQHeights] = useState([])
  const [headerH, setHeaderH] = useState(140)
  const [miniHeaderH, setMiniHeaderH] = useState(28)
  const [footerH, setFooterH] = useState(28)
  const [dragging, setDragging] = useState(null)

  useLayoutEffect(() => {
    if (qMeasureRef.current) {
      const items = Array.from(qMeasureRef.current.children)
      const next = items.map((el) => el.offsetHeight)
      if (next.length !== qHeights.length || next.some((h, i) => h !== qHeights[i])) {
        setQHeights(next)
      }
    }
    if (headerMeasureRef.current) {
      const h = headerMeasureRef.current.offsetHeight
      if (h !== headerH) setHeaderH(h)
    }
    if (miniHeaderMeasureRef.current) {
      const h = miniHeaderMeasureRef.current.offsetHeight
      if (h !== miniHeaderH) setMiniHeaderH(h)
    }
    if (footerMeasureRef.current) {
      const h = footerMeasureRef.current.offsetHeight
      if (h !== footerH) setFooterH(h)
    }
  })

  // Pack questions into pages. We then let CSS columns lay out each page
  // *internally* — that way the natural column-fill flow handles questions
  // whose body alone is taller than one column: their later sections
  // (image, choices) automatically continue at the top of the next column
  // instead of overflowing the paper.
  //
  // For paging, capacity per page ≈ columns × (innerHeight - chrome).
  // A single monster question whose height > capacity still fits on its
  // own page (and may overflow vertically — that's accepted, since the
  // alternative is to stretch the paper).
  const pages = []
  if (selQs.length > 0) {
    const safety = 8
    const interGap = 16  // marginBottom between questions, not counted in offsetHeight
    const buffer = 0.92  // absorbs column-flow rounding / border / line-wrap drift

    const firstColAvail = innerHeight - headerH - footerH - safety
    const restColAvail = innerHeight - miniHeaderH - footerH - safety

    let current = []
    let curH = 0
    let isFirstPage = true

    const flush = () => {
      if (current.length > 0) {
        pages.push(current)
        current = []
        curH = 0
        isFirstPage = false
      }
    }

    selQs.forEach((q, i) => {
      const h = qHeights[i] || 100
      const colAvail = isFirstPage && current.length === 0 ? firstColAvail : restColAvail
      const cap = colAvail * columns * buffer

      // A question taller than one column on its own needs both columns to
      // lay out its overflow into. Pair it with anything else and the
      // browser runs out of column space and clips the tail (the user saw
      // this with Q48's choices disappearing). Give such questions their
      // own page so they have the full two-column area to themselves.
      const tooTallForColumn = columns > 1 && h > colAvail * buffer
      if (tooTallForColumn) {
        flush()
        pages.push([i])
        isFirstPage = false
        return
      }

      const effH = h + (current.length > 0 ? interGap : 0)
      if (curH + effH > cap && current.length > 0) {
        flush()
        current.push(i)
        curH = qHeights[i] || 100
      } else {
        current.push(i)
        curH += effH
      }
    })
    flush()
  } else {
    pages.push([])
  }

  const pageCount = pages.length
  useEffect(() => {
    onPagesChange?.(pageCount)
  }, [pageCount, onPagesChange])

  const pageStyle = {
    width: paperWidth,
    height: paperHeight,
    background: '#fbfaf7',
    boxShadow: '0 1px 3px rgba(0,0,0,.10), 0 12px 28px rgba(0,0,0,.08)',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    fontFamily: '"Noto Serif KR", "Nanum Myeongjo", serif',
    color: '#1f1f1f',
    borderRadius: 1,
  }

  const pageInnerStyle = {
    position: 'relative',
    zIndex: 1,
    padding: `${padTop}px ${padX}px ${padBottom}px`,
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div style={{ width: paperWidth, margin: '0 auto', position: 'relative' }}>
      {/* hidden measurement layer */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: -99999, top: 0, visibility: 'hidden', pointerEvents: 'none' }}
      >
        <div ref={headerMeasureRef} style={{ width: innerWidth }}>
          <ExamHeader meta={meta} setMeta={setMeta} sheetType={sheetType} total={selQs.length} totalScore={totalScore} />
        </div>
        <div ref={miniHeaderMeasureRef} style={{ width: innerWidth }}>
          <ExamMiniHeader meta={meta} sheetType={sheetType} />
        </div>
        <div ref={footerMeasureRef} style={{ width: innerWidth }}>
          <ExamFooter meta={meta} sheetType={sheetType} />
        </div>
        <div ref={qMeasureRef} style={{ width: colWidth }}>
          {selQs.map((q, i) => (
            <ExamQuestion
              key={q.id} q={q} idx={i} sheetType={sheetType} columns={columns}
              dragging={null} setDragging={() => {}} onReorder={() => {}}
              allowDrag={false} figW={figW}
            />
          ))}
        </div>
      </div>

      {/* empty state */}
      {selQs.length === 0 && (
        <div style={pageStyle}>
          <div style={pageInnerStyle}>
            <ExamHeader meta={meta} setMeta={setMeta} sheetType={sheetType} total={0} totalScore={0} />
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 13,
                textAlign: 'center',
                border: '1px dashed #cbd5e1',
                borderRadius: 4,
                padding: 40,
                margin: '20px 0',
              }}
            >
              좌측에서 문제를 선택하면<br />
              여기에 실시간으로 시험지가 만들어집니다.
            </div>
            <ExamFooter meta={meta} sheetType={sheetType} />
          </div>
        </div>
      )}

      {selQs.length > 0 && pages.map((page, pi) => (
        <div
          key={pi}
          style={{
            ...pageStyle,
            marginBottom: pi < pages.length - 1 ? 20 : 0,
          }}
        >
          {meta.watermark && meta.school && (
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-30deg)',
                fontSize: Math.round(paperWidth * 0.16),
                fontWeight: 900,
                color: '#b1342a',
                opacity: 0.04,
                letterSpacing: 12,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 0,
              }}
            >
              {meta.school}
            </div>
          )}

          <div style={pageInnerStyle}>
            {pi === 0
              ? <ExamHeader meta={meta} setMeta={setMeta} sheetType={sheetType} total={selQs.length} totalScore={totalScore} />
              : <ExamMiniHeader meta={meta} sheetType={sheetType} />
            }

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                columnCount: columns,
                columnGap: colGap,
                columnFill: 'auto',
                ...(columns === 2 && sheetType === 'question'
                  ? { columnRule: '0.5px solid #d4d4d4' } : {}),
              }}
            >
              {page.map((qi) => (
                <ExamQuestion
                  key={selQs[qi].id} q={selQs[qi]} idx={qi}
                  sheetType={sheetType} columns={columns}
                  dragging={dragging} setDragging={setDragging}
                  onReorder={onReorder} allowDrag={true} figW={figW}
                />
              ))}
            </div>

            <ExamFooter meta={meta} sheetType={sheetType} />
          </div>

          {pages.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                right: 14,
                zIndex: 2,
                fontSize: 9.5,
                color: '#525252',
                fontFamily: 'ui-monospace, monospace',
                background: 'rgba(255,255,255,.85)',
                padding: '2px 7px',
                borderRadius: 3,
                boxShadow: '0 1px 2px rgba(0,0,0,.06)',
                letterSpacing: 0.3,
              }}
            >
              {pi + 1} / {pages.length}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
