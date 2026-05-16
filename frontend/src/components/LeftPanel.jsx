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

  const { total } = useQuestions({ sourceId, keyword })

  function handleUploadSuccess() {
    setShowUpload(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <FilterBar
        sourceId={sourceId}
        keyword={keyword}
        onSourceChange={setSourceId}
        onKeywordChange={setKeyword}
        total={total}
        onUpload={() => setShowUpload(true)}
      />
      <QuestionList key={refreshKey} sourceId={sourceId} keyword={keyword} />
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={handleUploadSuccess} />
      )}
    </div>
  )
}
