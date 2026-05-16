import { useState, useEffect } from 'react'
import { useSelection } from '../context/SelectionContext'
import { fetchQuestion } from '../api'

const DIFFICULTY_STYLE = {
  '상': { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3' },
  '중': { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  '하': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
}

function Checkbox({ checked }) {
  return (
    <div
      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
      style={{
        border: checked ? 'none' : '2px solid #d1d5db',
        background: checked ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#fff',
        boxShadow: checked ? '0 2px 8px rgba(102,126,234,0.4)' : 'none',
      }}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

function PassageBox({ text }) {
  return (
    <div
      className="mt-3 mb-1 text-sm leading-7 whitespace-pre-wrap"
      style={{
        border: '1px solid #b0b8c8',
        borderRadius: '6px',
        padding: '10px 14px',
        background: '#f7f8fa',
        color: '#374151',
        fontFamily: 'inherit',
      }}
    >
      {text}
    </div>
  )
}

export function QuestionCard({ question }) {
  const { toggle, isSelected } = useSelection()
  const [showAnswer, setShowAnswer] = useState(false)
  const [showExpl, setShowExpl] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  const selected = isSelected(question.id)
  const displayQ = detail ?? question
  const choices = detail?.choices ?? []
  const diffStyle = DIFFICULTY_STYLE[question.difficulty]

  // 카드 마운트 시 즉시 detail(선택지 포함) 로드
  useEffect(() => {
    fetchQuestion(question.id).then(setDetail)
  }, [question.id])

  // Split content into question stem + passage
  const contentLines = displayQ.content?.split('\n') ?? []
  const stem = contentLines[0] ?? ''
  const passage = contentLines.slice(1).join('\n').trim()
  const hasPassage = passage.length > 3

  async function ensureDetail() {
    if (detail) return detail
    setLoading(true)
    try {
      const data = await fetchQuestion(question.id)
      setDetail(data)
      return data
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAnswer(e) {
    e.stopPropagation()
    await ensureDetail()
    setShowAnswer((v) => !v)
  }

  async function handleToggleExpl(e) {
    e.stopPropagation()
    await ensureDetail()
    setShowExpl((v) => !v)
  }

  function handleCardClick() {
    toggle(detail ?? question)
  }

  return (
    <div
      className="rounded-2xl bg-white cursor-pointer select-none transition-all duration-150"
      style={{
        border: selected ? '1.5px solid #818cf8' : '1.5px solid #edf0f7',
        boxShadow: selected
          ? '0 0 0 4px rgba(129,140,248,0.12), 0 4px 16px rgba(0,0,0,0.06)'
          : '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header — px-7 pt-7: checkbox(20)+gap(16)=36px → text starts at 7*4+36=64px */}
      <div className="flex items-start gap-4 px-7 pt-7 pb-3" onClick={handleCardClick}>
        <div className="mt-0.5 shrink-0">
          <Checkbox checked={selected} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={selected
                ? { background: '#ede9fe', color: '#6d28d9' }
                : { background: '#f1f5f9', color: '#64748b' }
              }
            >
              {question.question_no}번
            </span>
            {question.difficulty && diffStyle && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: diffStyle.bg, color: diffStyle.color, border: `1px solid ${diffStyle.border}` }}
              >
                {question.difficulty}
              </span>
            )}
            {question.unit && (
              <span className="text-xs text-gray-400 font-medium">{question.unit}</span>
            )}
          </div>

          {/* Question stem */}
          <p className="text-sm text-gray-800 leading-7 whitespace-pre-wrap">
            {stem}
          </p>

          {/* Passage box */}
          {hasPassage && <PassageBox text={passage} />}
        </div>
      </div>

      {/* Choices — left-aligned with question text (px-7 + checkbox 20px + gap 16px = 64px) */}
      {choices.length > 0 && (
        <div className="pb-5 pt-2 pr-7" style={{ paddingLeft: '64px' }}>
          <div className="rounded-xl px-4 py-4 flex flex-col gap-2.5" style={{ background: '#f8fafc', border: '1px solid #edf0f7' }}>
            {choices.map((c) => (
              <div key={c.id ?? c.choice_no} className="flex gap-3 text-sm text-gray-600">
                <span className="font-semibold text-gray-400 shrink-0">{c.choice_no}</span>
                <span className="leading-6">{c.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {question.answer && (
        <div
          className="flex items-center gap-3"
          style={{ paddingLeft: '64px', paddingRight: '28px', paddingTop: '14px', paddingBottom: '14px', borderTop: '1px solid #f1f5f9' }}
        >
          <button
            onClick={handleToggleAnswer}
            className="text-sm font-semibold rounded-xl transition-all"
            style={{
              padding: '8px 18px',
              ...(showAnswer
                ? { background: '#ede9fe', color: '#6d28d9', border: '1.5px solid #c4b5fd' }
                : { background: '#f4f6f9', color: '#64748b', border: '1.5px solid #e2e8f0' })
            }}
          >
            {showAnswer ? '정답 숨기기' : '정답 보기'}
          </button>
          {detail?.explanation && (
            <button
              onClick={handleToggleExpl}
              className="text-sm font-semibold rounded-xl transition-all"
              style={{
                padding: '8px 18px',
                ...(showExpl
                  ? { background: '#ede9fe', color: '#6d28d9', border: '1.5px solid #c4b5fd' }
                  : { background: '#f4f6f9', color: '#64748b', border: '1.5px solid #e2e8f0' })
              }}
            >
              {showExpl ? '해설 접기' : '해설 보기'}
            </button>
          )}
          {loading && <span className="text-xs text-gray-300 ml-auto animate-pulse">로딩…</span>}
        </div>
      )}

      {/* Answer reveal */}
      {showAnswer && displayQ.answer && (
        <div style={{ paddingLeft: '64px', paddingRight: '28px', paddingBottom: '20px' }}>
          <span
            className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background: '#ede9fe', color: '#6d28d9' }}
          >
            정답 <strong className="text-base">{displayQ.answer}</strong>
          </span>
        </div>
      )}

      {/* Explanation reveal */}
      {showExpl && displayQ.explanation && (
        <div style={{ paddingLeft: '64px', paddingRight: '28px', paddingBottom: '24px' }}>
          <div
            className="text-sm text-gray-600 rounded-xl px-5 py-4 leading-7 whitespace-pre-wrap"
            style={{ background: '#f8fafc', border: '1px solid #edf0f7' }}
          >
            {displayQ.explanation}
          </div>
        </div>
      )}
    </div>
  )
}
