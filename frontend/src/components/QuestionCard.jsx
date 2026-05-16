import { useState } from 'react'
import { useSelection } from '../context/SelectionContext'
import { fetchQuestion } from '../api'

const CIRCLED = ['①', '②', '③', '④', '⑤']

function AnswerBadge({ answer }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
      정답: <strong>{answer}</strong>
    </span>
  )
}

export function QuestionCard({ question }) {
  const { toggle, isSelected } = useSelection()
  const [showAnswer, setShowAnswer] = useState(false)
  const [showExpl, setShowExpl] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const selected = isSelected(question.id)

  async function ensureDetail() {
    if (detail) return
    setLoadingDetail(true)
    try {
      const data = await fetchQuestion(question.id)
      setDetail(data)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleToggleAnswer() {
    await ensureDetail()
    setShowAnswer((v) => !v)
  }

  async function handleToggleExpl() {
    await ensureDetail()
    setShowExpl((v) => !v)
  }

  function handleCardClick() {
    // Load detail then add to selection (detail carries choices)
    if (!detail) {
      fetchQuestion(question.id).then((data) => {
        setDetail(data)
        toggle(data)
      })
    } else {
      toggle(detail)
    }
  }

  const displayQ = detail ?? question
  const choices = detail?.choices ?? []

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm transition-all cursor-pointer select-none
        ${selected ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
    >
      {/* Card header — click to select */}
      <div className="flex items-start gap-2 p-3" onClick={handleCardClick}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 accent-blue-500 shrink-0 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-500">Q{question.question_no}</span>
            {question.difficulty && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded">
                {question.difficulty}
              </span>
            )}
          </div>
          {/* Question content — 2-line clamp */}
          <p className="text-sm text-slate-800 leading-relaxed line-clamp-2 whitespace-pre-wrap">
            {displayQ.content}
          </p>
        </div>
      </div>

      {/* Choices */}
      {choices.length > 0 && (
        <div className="px-3 pb-2 grid grid-cols-1 gap-0.5">
          {choices.map((c) => (
            <div key={c.id ?? c.choice_no} className="flex gap-1.5 text-xs text-slate-600">
              <span className="font-medium shrink-0">{c.choice_no}</span>
              <span className="line-clamp-1">{c.content}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer controls */}
      <div className="flex items-center gap-2 px-3 pb-2 pt-1 border-t border-slate-100">
        {displayQ.answer && (
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleAnswer() }}
            className="text-xs text-blue-600 hover:underline"
          >
            {showAnswer ? '정답 숨기기' : '정답 보기'}
          </button>
        )}
        {displayQ.explanation && (
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleExpl() }}
            className="text-xs text-slate-500 hover:underline"
          >
            {showExpl ? '해설 접기' : '해설 보기'}
          </button>
        )}
        {loadingDetail && <span className="text-xs text-slate-400">로딩…</span>}
      </div>

      {showAnswer && displayQ.answer && (
        <div className="px-3 pb-2">
          <AnswerBadge answer={displayQ.answer} />
        </div>
      )}

      {showExpl && displayQ.explanation && (
        <div className="px-3 pb-3 text-xs text-slate-600 bg-slate-50 rounded-b-lg leading-relaxed whitespace-pre-wrap">
          {displayQ.explanation}
        </div>
      )}
    </div>
  )
}
