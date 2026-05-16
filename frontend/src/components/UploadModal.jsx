import { useState, useRef } from 'react'
import { uploadFile, fetchJobStatus } from '../api'

export function UploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState(null)
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
      pollRef.current = setInterval(async () => {
        try {
          const s = await fetchJobStatus(job.job_id)
          setMessage(s.message)
          if (s.status === 'done') {
            clearInterval(pollRef.current)
            setStatus('done')
            setTimeout(() => onSuccess?.(), 1200)
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

  const isDone = status === 'done'
  const isError = status === 'error'
  const isProcessing = status === 'uploading' || status === 'processing'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(15,20,40,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white w-full max-w-md overflow-hidden" style={{ borderRadius: '24px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-7" style={{ borderBottom: '1px solid #f0f2f7' }}>
          <div>
            <h2 className="text-base font-bold text-gray-800">파일 업로드</h2>
            <p className="text-sm text-gray-400 mt-1">.hwp · .hwpx · .json 형식 지원</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
            style={{ border: '1.5px solid #e8ecf0' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l11 11M12 1L1 12"/>
            </svg>
          </button>
        </div>

        <div className="px-8 py-7 flex flex-col gap-6">

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl p-10 text-center cursor-pointer transition-all"
            style={{
              border: `2px dashed ${file ? '#818cf8' : '#dde2ee'}`,
              background: file ? '#f5f3ff' : '#fafbfd',
            }}
            onMouseEnter={e => { if (!file) { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.background = '#f8f9ff' } }}
            onMouseLeave={e => { if (!file) { e.currentTarget.style.borderColor = '#dde2ee'; e.currentTarget.style.background = '#fafbfd' } }}
          >
            {file ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#ede9fe' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#6d28d9' }}>{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">클릭하여 다른 파일 선택</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#f1f5f9' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">클릭하여 파일 선택</p>
                  <p className="text-xs text-gray-400 mt-1">.hwp · .hwpx · .json</p>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".hwp,.hwpx,.json" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Subject */}
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="과목명 (선택 사항)"
            className="w-full text-sm rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ border: '1.5px solid #e2e8f0', background: '#fafbfc' }}
          />

          {/* Status */}
          {message && (
            <div
              className="flex items-center gap-4 text-sm px-5 py-4 rounded-xl font-semibold"
              style={{
                background: isError ? '#fff1f2' : isDone ? '#f0fdf4' : '#f5f3ff',
                color: isError ? '#e11d48' : isDone ? '#16a34a' : '#6d28d9',
                border: `1px solid ${isError ? '#fecdd3' : isDone ? '#bbf7d0' : '#ddd6fe'}`,
              }}
            >
              {isProcessing && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin shrink-0">
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/>
                </svg>
              )}
              {isDone && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                  <path d="M2 8l5 5 8-9"/>
                </svg>
              )}
              {isError && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11v.5"/>
                </svg>
              )}
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              style={{ fontSize: '14px', padding: '14px 20px' }}
              style={{ border: '1.5px solid #e2e8f0' }}
            >
              취소
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || !!status}
              className="flex-[2] rounded-xl font-bold text-white transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-35 disabled:cursor-not-allowed"
              style={{ fontSize: '14px', padding: '14px 20px' }}
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 16px rgba(102,126,234,0.4)' }}
            >
              업로드
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
