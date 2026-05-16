import { useRef, useCallback } from 'react'
import { QuestionCard } from './QuestionCard'
import { useQuestions } from '../hooks/useQuestions'

export function QuestionList({ sourceId, keyword }) {
  const { items, loading, error, loadMore, hasMore } = useQuestions({ sourceId, keyword })

  const observer = useRef(null)
  const sentinelRef = useCallback(
    (node) => {
      if (observer.current) observer.current.disconnect()
      if (!node) return
      observer.current = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) loadMore()
      })
      observer.current.observe(node)
    },
    [hasMore, loading, loadMore]
  )

  if (error) {
    return (
      <div className="mx-6 mt-6 p-5 text-sm text-red-600 rounded-2xl font-medium" style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
        오류: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-8 py-6 overflow-y-auto flex-1">
      {items.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#f1f5f9' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-500">문제가 없습니다</p>
            <p className="text-xs text-gray-400 mt-1">파일을 업로드하여 문제를 추가하세요</p>
          </div>
        </div>
      )}

      {items.map((q) => (
        <QuestionCard key={q.id} question={q} />
      ))}

      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="flex justify-center py-8">
          <span className="text-sm text-gray-400 animate-pulse">불러오는 중…</span>
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-xs text-gray-300 py-6">— 모든 문제를 불러왔습니다 —</p>
      )}
    </div>
  )
}
