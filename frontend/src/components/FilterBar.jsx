import { useState } from 'react'
import { useSources } from '../hooks/useSources'

export function FilterBar({ sourceId, keyword, onSourceChange, onKeywordChange, total }) {
  const sources = useSources()
  const [inputVal, setInputVal] = useState(keyword)

  function handleKeyDown(e) {
    if (e.key === 'Enter') onKeywordChange(inputVal.trim())
  }

  function handleClear() {
    setInputVal('')
    onKeywordChange('')
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-white border-b border-slate-200">
      <div className="flex gap-2">
        <select
          value={sourceId ?? ''}
          onChange={(e) => onSourceChange(e.target.value ? Number(e.target.value) : null)}
          className="flex-none text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">전체 출처</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.filename} {s.subject ? `(${s.subject})` : ''}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="키워드 검색… (Enter)"
            className="w-full text-sm border border-slate-300 rounded-md px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {inputVal && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="검색어 지우기"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">총 {total.toLocaleString()}개 문제</p>
    </div>
  )
}
