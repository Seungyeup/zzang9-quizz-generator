import { useState, useRef } from 'react'
import { uploadFile, fetchJobStatus } from '../api'

export function UploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState(null) // null | 'uploading' | 'processing' | 'done' | 'error'
  const [message, setMessage] = useState('')
  const fileRef = useRef(null)
  const pollRef = useRef(null)

  async function handleUpload() {
    if (!file) return
    setStatus('uploading')
    setMessage('업로드 중…')
    try {
      const job = await uploadFile(file, subject)
      setStatus('processing')
      setMessage('파싱 중…')

      // Poll every 1.5s until done or error
      pollRef.current = setInterval(async () => {
        try {
          const s = await fetchJobStatus(job.job_id)
          setMessage(s.message)
          if (s.status === 'done') {
            clearInterval(pollRef.current)
            setStatus('done')
            setTimeout(() => onSuccess?.(), 1500)
          } else if (s.status === 'error') {
            clearInterval(pollRef.current)
            setStatus('error')
          }
        } catch {
          clearInterval(pollRef.current)
          setStatus('error')
          setMessage('상태 확인 실패')
        }
      }, 1500)
    } catch (e) {
      setStatus('error')
      setMessage(e.message)
    }
  }

  function handleFileChange(e) {
    setFile(e.target.files[0] ?? null)
    setStatus(null)
    setMessage('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">파일 업로드</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors mb-3"
        >
          {file ? (
            <p className="text-sm text-slate-700 font-medium">{file.name}</p>
          ) : (
            <>
              <p className="text-2xl mb-1">📁</p>
              <p className="text-sm text-slate-500">클릭하여 파일 선택</p>
              <p className="text-xs text-slate-400 mt-1">.hwp · .hwpx · .json</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".hwp,.hwpx,.json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="과목명 (선택)"
          className="w-full text-sm border border-slate-300 rounded-md px-3 py-1.5 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {message && (
          <div
            className={`text-sm px-3 py-2 rounded-md mb-3 ${
              status === 'error'
                ? 'bg-red-50 text-red-600'
                : status === 'done'
                ? 'bg-green-50 text-green-700'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            {status === 'processing' && <span className="animate-pulse">⟳ </span>}
            {message}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-sm px-4 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !!status}
            className="text-sm px-4 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            업로드
          </button>
        </div>
      </div>
    </div>
  )
}
