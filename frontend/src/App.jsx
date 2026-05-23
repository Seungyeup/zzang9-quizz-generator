import { useEffect, useMemo, useState } from 'react'
import { SelectionProvider, useSelection } from './context/SelectionContext'
import { useQuestions } from './hooks/useQuestions'
import { useFacets } from './hooks/useFacets'
import { useSources } from './hooks/useSources'
import { DEFAULT_TWEAKS, makeTokens } from './theme'
import { Header } from './components/Header'
import { FilterSidebar } from './components/FilterSidebar'
import { QuestionBoard } from './components/QuestionBoard'
import { SelectedDock } from './components/SelectedDock'
import { Resizer } from './components/Resizer'
import { PreviewPanel } from './components/PreviewPanel'
import { UploadModal } from './components/UploadModal'

const DEFAULT_FILTERS = {
  subject: null, source_id: null, type: null, keyword: '',
}

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

function BuilderShell() {
  const t = DEFAULT_TWEAKS
  const k = useMemo(() => makeTokens(t), [])

  const [refreshKey, setRefreshKey] = useState(0)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [expandedId, setExpandedId] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [previewWidth, setPreviewWidth] = useState(540)

  const queryFilters = useMemo(() => ({
    source_id: filters.source_id ?? undefined,
    subject: filters.subject ?? undefined,
    type: filters.type ?? undefined,
    keyword: filters.keyword || undefined,
  }), [filters])

  const { items: questions, total, loading, error, hasMore, loadMore } = useQuestions(queryFilters, refreshKey)
  const facets = useFacets(refreshKey)
  const sources = useSources(refreshKey)

  const { items: selected, toggle, remove, reorder, clear } = useSelection()
  const selectedIds = selected.map((q) => q.id)

  const [meta, setMeta] = useState({
    school: '',
    title: '시험지',
    subject: '',
    grade: '',
    date: todayString(),
    session: '1',
    watermark: false,
  })

  useEffect(() => {
    const onResize = () => {
      const maxAllowed = Math.max(380, window.innerWidth - 580)
      setPreviewWidth((w) => Math.min(w, maxAllowed))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: k.bg,
        color: k.text,
        fontFamily: 'Pretendard, "Apple SD Gothic Neo", -apple-system, sans-serif',
        fontSize: 14,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Header
        k={k}
        search={filters.keyword}
        onSearchChange={(v) => setFilters((f) => ({ ...f, keyword: v }))}
        onUpload={() => setShowUpload(true)}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <FilterSidebar
          k={k}
          facets={facets}
          sources={sources}
          filters={filters}
          onChange={setFilters}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <QuestionBoard
            k={k}
            density={t.density}
            questions={questions}
            total={total}
            loading={loading}
            hasMore={hasMore}
            error={error}
            loadMore={loadMore}
            filters={filters}
            facets={facets}
            sources={sources}
            onFilterChange={setFilters}
            selectedIds={selectedIds}
            expandedId={expandedId}
            onExpand={setExpandedId}
            onToggle={toggle}
            onClearSelection={clear}
          />
          <SelectedDock
            k={k}
            items={selected}
            onRemove={remove}
            onReorder={reorder}
          />
        </div>

        <Resizer
          k={k}
          value={previewWidth}
          min={380}
          max={Math.max(380, window.innerWidth - 580)}
          onChange={setPreviewWidth}
        />

        <PreviewPanel
          k={k}
          items={selected}
          meta={meta}
          setMeta={setMeta}
          width={previewWidth}
          onReorder={reorder}
        />
      </div>

      {showUpload && (
        <UploadModal
          k={k}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false)
            setRefreshKey((x) => x + 1)
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <SelectionProvider>
      <BuilderShell />
    </SelectionProvider>
  )
}
