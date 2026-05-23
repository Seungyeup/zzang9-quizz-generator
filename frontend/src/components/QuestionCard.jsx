import { useState } from 'react'
import { Checkbox, Pill } from './ui'
import { fetchQuestion } from '../api'

function subjectTone(subject) {
  if (subject === '사회') return 'amber'
  if (subject === '과학') return 'blue'
  return 'slate'
}

function splitContent(content) {
  // First line = prompt (발문, the question itself).
  // Remaining lines = passage (지문, supporting context).
  const lines = (content || '').split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { passage: '', prompt: '' }
  if (lines.length === 1) return { passage: '', prompt: lines[0] }
  return { prompt: lines[0], passage: lines.slice(1).join('\n') }
}

export function QuestionCard({ q, selected, onToggle, k, density, expanded, onExpand }) {
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const ensureDetail = async () => {
    if (detail) return detail
    setLoadingDetail(true)
    try {
      const d = await fetchQuestion(q.id)
      setDetail(d)
      return d
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleToggle = async () => {
    const full = await ensureDetail()
    onToggle(full)
  }

  const handleExpand = async (e) => {
    e.stopPropagation()
    if (!expanded) await ensureDetail()
    onExpand()
  }

  const type = (q.choice_count ?? 0) > 0 ? '객관식' : '주관식'
  const { passage, prompt } = splitContent(q.content)
  const subject = q.source_subject

  return (
    <div
      onClick={handleToggle}
      style={{
        display: 'flex',
        gap: 12,
        padding: k.rowPad,
        background: selected ? k.primaryTint : k.panel,
        borderBottom: `1px solid ${k.borderSoft}`,
        borderLeft: `3px solid ${selected ? k.primary : 'transparent'}`,
        cursor: 'pointer',
        transition: 'background .1s',
        position: 'relative',
      }}
    >
      <Checkbox checked={selected} onChange={handleToggle} k={k} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              color: k.textDim,
            }}
          >
            Q-{String(q.id).padStart(4, '0')}
          </span>
          {subject && <Pill tone={subjectTone(subject)}>{subject}</Pill>}
          <Pill tone={type === '객관식' ? 'slate' : 'green'}>{type}</Pill>
          {(q.image_count ?? 0) > 0 && (
            <span
              title={`자료 ${q.image_count}개`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                fontSize: 11,
                color: k.textMid,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="12" height="10" rx="1.5" />
                <circle cx="6" cy="7" r="1.2" />
                <path d="M14 11l-3-3-3 2-2-1.5L2 11" />
              </svg>
              {q.image_count}
            </span>
          )}
          <div style={{ flex: 1 }} />
        </div>

        <div
          style={{
            fontSize: 13,
            color: k.text,
            lineHeight: 1.5,
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: density === 'S' ? 1 : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 6,
            whiteSpace: expanded ? 'pre-wrap' : 'normal',
          }}
        >
          {prompt || passage}
        </div>

        {expanded && passage && (
          <div
            style={{
              padding: '8px 10px',
              marginBottom: 6,
              background: k.sub,
              borderRadius: 6,
              border: `1px solid ${k.borderSoft}`,
              fontSize: 12,
              color: k.textMid,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {passage}
          </div>
        )}

        {expanded && detail?.images?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
            {detail.images.map((img) => (
              <img
                key={img.id}
                src={`/api/images/${img.filename}`}
                alt=""
                style={{
                  maxWidth: '100%',
                  maxHeight: 220,
                  objectFit: 'contain',
                  borderRadius: 4,
                  border: `1px solid ${k.borderSoft}`,
                  background: k.panel,
                }}
              />
            ))}
          </div>
        )}

        {expanded && (
          <div style={{ marginBottom: 6 }}>
            {detail?.choices?.length > 0 ? (
              <div style={{ fontSize: 11.5, color: k.textMid, lineHeight: 1.6 }}>
                {detail.choices.map((c, i) => (
                  <div key={i}>{c.choice_no} {c.content}</div>
                ))}
              </div>
            ) : loadingDetail ? (
              <div style={{ fontSize: 11, color: k.textDim, fontStyle: 'italic' }}>불러오는 중…</div>
            ) : (
              <div style={{ fontSize: 11, color: k.textDim, fontStyle: 'italic' }}>
                (주관식 — 답안 작성 영역)
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: k.textMid }}>
          <span>{q.source_filename || '출처 미상'}</span>
          {q.answer && <span style={{ color: k.textDim }}>정답 {q.answer}</span>}
          <div style={{ flex: 1 }} />
          <button
            onClick={handleExpand}
            style={{
              border: 'none',
              background: 'transparent',
              color: k.primary,
              fontSize: 11,
              fontWeight: 500,
              padding: 0,
            }}
          >
            {expanded ? '접기 ▴' : '자세히 ▾'}
          </button>
        </div>
      </div>
    </div>
  )
}
