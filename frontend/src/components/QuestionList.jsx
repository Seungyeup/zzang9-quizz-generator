import { useRef, useCallback } from 'react'
import { QuestionCard } from './QuestionCard'
import { useQuestions } from '../hooks/useQuestions'

export function QuestionList({ sourceId, keyword }) {
  const { items, total, loading, error, loadMore, hasMore } = useQuestions({ sourceId, keyword })

  // Infinite scroll via IntersectionObserver
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
      <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg m-3">
        오류: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1">
      {items.length === 0 && !loading && (
        <p className="text-center text-sm text-slate-400 mt-8">문제가 없습니다.</p>
      )}

      {items.map((q) => (
        <QuestionCard key={q.id} question={q} />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="flex justify-center py-3">
          <span className="text-sm text-slate-400 animate-pulse">로딩 중…</span>
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-xs text-slate-400 py-2">모든 문제를 불러왔습니다.</p>
      )}
    </div>
  )
}
