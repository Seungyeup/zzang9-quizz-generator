import { useState } from 'react'
import { FilterBar } from './FilterBar'
import { QuestionList } from './QuestionList'
import { UploadModal } from './UploadModal'
import { useQuestions } from '../hooks/useQuestions'

export function LeftPanel() {
  const [sourceId, setSourceId] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Just to get total count for FilterBar
  const { total } = useQuestions({ sourceId, keyword })

  function handleUploadSuccess() {
    setShowUpload(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-slate-200">
        <h1 className="text-sm font-semibold text-slate-700">문제 목록</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + 파일 업로드
        </button>
      </div>

      <FilterBar
        sourceId={sourceId}
        keyword={keyword}
        onSourceChange={setSourceId}
        onKeywordChange={setKeyword}
        total={total}
      />

      <QuestionList key={refreshKey} sourceId={sourceId} keyword={keyword} />

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={handleUploadSuccess} />
      )}
    </div>
  )
}
