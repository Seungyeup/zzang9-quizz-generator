import { useState } from 'react'
import { useSources } from '../hooks/useSources'

export function FilterBar({ sourceId, keyword, onSourceChange, onKeywordChange, total, onUpload }) {
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
    <div className="shrink-0 px-10 py-8" style={{ borderBottom: '1px solid #edf0f7', background: '#fff' }}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 leading-tight">문제 목록</h2>
          <p className="text-sm text-gray-400 mt-1">총 {total.toLocaleString()}개 문제</p>
        </div>
        <button
          onClick={onUpload}
          className="flex items-center gap-2 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
          style={{ fontSize: '14px', padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 14px rgba(102,126,234,0.4)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M7 9.5V2M4 5l3-3 3 3M2 11.5h10"/>
          </svg>
          파일 업로드
        </button>
      </div>

      {/* Filter row */}
      <div className="flex gap-3 mt-1">
        <select
          value={sourceId ?? ''}
          onChange={(e) => onSourceChange(e.target.value ? Number(e.target.value) : null)}
          className="shrink-0 text-sm rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-shadow"
          style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc', maxWidth: '160px' }}
        >
          <option value="">전체 출처</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.filename}</option>
          ))}
        </select>

        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l2.5 2.5"/>
          </svg>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="키워드 검색 (Enter)"
            className="w-full text-sm rounded-xl pl-11 pr-10 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-shadow"
            style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
          />
          {inputVal && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
