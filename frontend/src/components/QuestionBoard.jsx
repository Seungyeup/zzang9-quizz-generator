import { useEffect, useRef } from 'react'
import { ActiveFilter } from './FilterSidebar'
import { QuestionCard } from './QuestionCard'

function activeChipsFor(filters, facets, sources, k, onChange) {
  const chips = []
  if (filters.subject) {
    chips.push(
      <ActiveFilter k={k} key="subject" label={'과목 · ' + filters.subject}
        onRemove={() => onChange({ ...filters, subject: null })} />
    )
  }
  if (filters.source_id != null) {
    const src = sources.find((s) => s.id === filters.source_id)
    if (src) chips.push(
      <ActiveFilter k={k} key="source" label={'출처 · ' + src.filename}
        onRemove={() => onChange({ ...filters, source_id: null })} />
    )
  }
  if (filters.type) {
    chips.push(
      <ActiveFilter k={k} key="type" label={'유형 · ' + filters.type}
        onRemove={() => onChange({ ...filters, type: null })} />
    )
  }
  if (filters.keyword) {
    chips.push(
      <ActiveFilter k={k} key="kw" label={'검색 · ' + filters.keyword}
        onRemove={() => onChange({ ...filters, keyword: '' })} />
    )
  }
  return chips
}

export function QuestionBoard({
  k, density,
  questions, total, loading, hasMore, error, loadMore,
  filters, facets, sources, onFilterChange,
  selectedIds, expandedId, onExpand,
  onToggle, onClearSelection,
}) {
  const scrollRef = useRef(null)
  const ioRef = useRef(null)

  // Keep the latest values in a ref so the IntersectionObserver — whose
  // callback closure is created once when the sentinel mounts — always
  // reads fresh state instead of the version that existed at attach time.
  const latestRef = useRef({ hasMore, loading, loadMore })
  latestRef.current = { hasMore, loading, loadMore }

  // The sentinel is conditionally rendered after the first page of data
  // arrives, so a plain useEffect-on-mount would attach the observer when
  // the node still isn't in the DOM. We attach via a callback ref and
  // bind the root to the scroll container we set up below.
  const sentinelRef = (node) => {
    if (ioRef.current) {
      ioRef.current.disconnect()
      ioRef.current = null
    }
    if (!node || !scrollRef.current) return
    ioRef.current = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        const { hasMore, loading, loadMore } = latestRef.current
        if (hasMore && !loading) loadMore()
      },
      { root: scrollRef.current, rootMargin: '160px 0px' }
    )
    ioRef.current.observe(node)
  }
  useEffect(() => () => ioRef.current?.disconnect(), [])

  const chips = activeChipsFor(filters, facets, sources, k, onFilterChange)

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        background: k.panel,
        borderRight: `1px solid ${k.border}`,
      }}
    >
      {/* Header row */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${k.border}`,
          background: k.panel,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: chips.length > 0 ? 8 : 0,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: k.text }}>
            문제 {total.toLocaleString()}개
          </span>
          <span style={{ fontSize: 12, color: k.textDim }}>· {selectedIds.length}개 선택됨</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClearSelection}
            disabled={selectedIds.length === 0}
            style={{
              fontSize: 12,
              padding: '5px 10px',
              border: `1px solid ${k.border}`,
              background: k.panel,
              borderRadius: 6,
              color: selectedIds.length === 0 ? k.textDim : k.textMid,
              opacity: selectedIds.length === 0 ? 0.5 : 1,
            }}
          >
            선택 해제
          </button>
        </div>
        {chips.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: k.textMid }}>활성 필터:</span>
            {chips}
            <button
              onClick={() => onFilterChange({ subject: null, source_id: null, type: null, keyword: '' })}
              style={{
                fontSize: 11,
                color: k.textMid,
                background: 'transparent',
                border: 'none',
                padding: '3px 6px',
              }}
            >
              모두 해제
            </button>
          </div>
        )}
      </div>

      {/* Scroll body */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
        {error ? (
          <div style={{ padding: 30, color: k.danger, fontSize: 13 }}>
            오류: {error}
          </div>
        ) : questions.length === 0 && !loading ? (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              color: k.textDim,
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
            }}
          >
            일치하는 문제가 없습니다.
          </div>
        ) : (
          <>
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                q={q}
                k={k}
                density={density}
                selected={selectedIds.includes(q.id)}
                onToggle={(full) => onToggle(full || q)}
                expanded={expandedId === q.id}
                onExpand={() => onExpand(expandedId === q.id ? null : q.id)}
              />
            ))}
            <div ref={sentinelRef} style={{ height: 1 }} />
            {loading && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: k.textDim }}>
                불러오는 중…
              </div>
            )}
            {!hasMore && questions.length > 0 && (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: k.textDim }}>
                — 모두 불러왔습니다 —
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
