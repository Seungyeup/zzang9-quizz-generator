import { useRef, useState } from 'react'
import { uploadFile, fetchJobStatus } from '../api'
import { SVG_ICONS } from './ui'

export function UploadModal({ k, onClose, onSuccess }) {
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
            setTimeout(() => onSuccess?.(), 900)
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
    setFile(e.target.files?.[0] ?? null)
    setStatus(null)
    setMessage('')
  }

  const isDone = status === 'done'
  const isError = status === 'error'
  const disabled = !file || !!status

  const statusColors = isError
    ? { bg: '#fef2f2', border: '#fecaca', fg: k.danger }
    : isDone
    ? { bg: '#ecfdf5', border: '#a7f3d0', fg: k.success }
    : { bg: k.sub, border: k.border, fg: k.textMid }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.45)',
      }}
    >
      <div
        style={{
          width: 440,
          maxWidth: '92vw',
          background: k.panel,
          color: k.text,
          borderRadius: 10,
          border: `1px solid ${k.border}`,
          boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${k.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>파일 업로드</div>
            <div style={{ fontSize: 11.5, color: k.textDim, marginTop: 2 }}>
              .hwp · .hwpx · .json 형식 지원
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              border: `1px solid ${k.border}`,
              background: k.panel,
              borderRadius: 6,
              color: k.textMid,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {SVG_ICONS.x}
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              padding: 28,
              textAlign: 'center',
              cursor: 'pointer',
              border: `1.5px dashed ${file ? k.primary : k.borderStrong}`,
              background: file ? k.primaryTint : k.sub,
              borderRadius: 8,
              transition: 'border-color .15s, background .15s',
            }}
          >
            {file ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: k.primaryDark }}>{file.name}</div>
                <div style={{ fontSize: 11, color: k.textDim, marginTop: 4 }}>
                  클릭하여 다른 파일 선택
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: k.text }}>클릭하여 파일을 선택하세요</div>
                <div style={{ fontSize: 11, color: k.textDim, marginTop: 4 }}>.hwp · .hwpx · .json</div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".hwp,.hwpx,.json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: k.textMid, fontWeight: 500 }}>
              과목명 <span style={{ color: k.textDim }}>(선택)</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="예: 사회 / 과학 / 수학"
              style={{
                padding: '8px 10px',
                border: `1px solid ${k.border}`,
                borderRadius: 6,
                background: k.panel,
                fontSize: 13,
                outline: 'none',
                color: k.text,
              }}
            />
          </div>

          {message && (
            <div
              style={{
                fontSize: 12.5,
                padding: '10px 12px',
                borderRadius: 6,
                background: statusColors.bg,
                color: statusColors.fg,
                border: `1px solid ${statusColors.border}`,
              }}
            >
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                border: `1px solid ${k.border}`,
                background: k.panel,
                color: k.text,
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              취소
            </button>
            <button
              onClick={handleUpload}
              disabled={disabled}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: disabled ? k.borderStrong : k.primary,
                color: 'white',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                opacity: disabled ? 0.7 : 1,
              }}
            >
              업로드
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
