import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchPreviewHtml, downloadPdf } from '../api'

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative shrink-0 w-12 h-6 rounded-full transition-all"
        style={{ background: checked ? '#667eea' : '#e2e8f0', boxShadow: checked ? '0 2px 8px rgba(102,126,234,0.4)' : 'none' }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? '28px' : '4px' }}
        />
      </button>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-shadow'
const inputStyle = { border: '1.5px solid #e8ecf0', background: '#fff' }

export function WorksheetModal({ selected, onClose }) {
  const today = new Date().toISOString().slice(0, 10)

  const [settings, setSettings] = useState({
    title: '문제지',
    school: '',
    grade: '',
    class_num: '',
    date: today,
    show_answers: true,
    show_explanation: true,
  })

  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const iframeRef = useRef(null)
  const debounceRef = useRef(null)

  function set(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function handleIframeLoad() {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const h = iframe.contentDocument?.body?.scrollHeight
      if (h) iframe.style.height = h + 'px'
    } catch {
      iframe.style.height = '1123px'
    }
  }

  const fetchPreview = useCallback(async (s) => {
    setPreviewLoading(true)
    setPreviewError('')
    try {
      const html = await fetchPreviewHtml(selected.map((q) => q.id), s)
      setPreviewHtml(html)
    } catch (e) {
      setPreviewError(e.message)
    } finally {
      setPreviewLoading(false)
    }
  }, [selected])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPreview(settings), 600)
    return () => clearTimeout(debounceRef.current)
  }, [settings, fetchPreview])

  async function handleDownload() {
    setPdfLoading(true)
    setPdfError('')
    try {
      await downloadPdf(selected.map((q) => q.id), settings)
    } catch (e) {
      setPdfError(e.message)
    } finally {
      setPdfLoading(false)
    }
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(15,20,40,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="bg-white flex flex-col w-full max-w-6xl overflow-hidden"
        style={{ height: '92vh', borderRadius: '24px', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}
      >
        {/* ── Modal Header ── */}
        <div className="shrink-0 flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid #f0f2f7' }}>
          <div className="flex items-center gap-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <rect x="2" y="1" width="12" height="14" rx="2"/>
                <path d="M5 6h6M5 9h4"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800 leading-tight">문제지 만들기</h2>
              <p className="text-xs text-gray-400 mt-0.5">{selected.length}개 문제 선택됨</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors text-gray-400 hover:text-gray-600"
            style={{ border: '1.5px solid #e8ecf0' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l11 11M12 1L1 12"/>
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* ── Settings Panel ── */}
          <div
            className="w-80 shrink-0 flex flex-col overflow-y-auto"
            style={{ borderRight: '1px solid #f0f2f7', background: '#fafbfd' }}
          >
            <div className="px-8 py-7 flex flex-col gap-7">

              <Field label="문제지 제목">
                <input className={inputCls} style={inputStyle} value={settings.title}
                  onChange={(e) => set('title', e.target.value)} placeholder="예: 1단원 형성평가" />
              </Field>

              <Field label="학교 / 기관">
                <input className={inputCls} style={inputStyle} value={settings.school}
                  onChange={(e) => set('school', e.target.value)} placeholder="예: ○○중학교" />
              </Field>

              <div className="flex gap-4">
                <Field label="학년">
                  <input className={inputCls} style={inputStyle} value={settings.grade}
                    onChange={(e) => set('grade', e.target.value)} placeholder="1" />
                </Field>
                <Field label="반">
                  <input className={inputCls} style={inputStyle} value={settings.class_num}
                    onChange={(e) => set('class_num', e.target.value)} placeholder="1" />
                </Field>
              </div>

              <Field label="날짜">
                <input type="date" value={settings.date}
                  onChange={(e) => set('date', e.target.value)}
                  className={inputCls} style={inputStyle} />
              </Field>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #edf0f7' }} />

              <div className="flex flex-col gap-6">
                <Toggle
                  checked={settings.show_answers}
                  onChange={(v) => set('show_answers', v)}
                  label="정답표 포함"
                  description="문제지 하단에 정답 표를 추가합니다"
                />
                <Toggle
                  checked={settings.show_explanation}
                  onChange={(v) => set('show_explanation', v)}
                  label="해설 포함"
                  description="각 문제 아래에 해설을 포함합니다"
                />
              </div>
            </div>

            <div className="flex-1" />

            {/* Download button */}
            <div className="px-8 py-7" style={{ borderTop: '1px solid #edf0f7' }}>
              {pdfError && (
                <p className="text-xs font-medium text-red-500 rounded-xl px-4 py-3 mb-5" style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
                  {pdfError}
                </p>
              )}
              <button
                onClick={handleDownload}
                disabled={pdfLoading}
                className="w-full flex items-center justify-center gap-3 rounded-2xl font-bold text-white transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-50"
                style={{ fontSize: '15px', padding: '16px 24px' }}
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 6px 20px rgba(102,126,234,0.45)' }}
              >
                {pdfLoading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
                      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/>
                    </svg>
                    생성 중…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M8 1.5v9M5 7.5l3 3 3-3M2.5 13h11"/>
                    </svg>
                    PDF 다운로드
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Preview Area ── */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#1a1d2e' }}>

            {/* Preview toolbar */}
            <div
              className="shrink-0 flex items-center justify-between px-8 py-4"
              style={{ background: '#1e2235', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#667eea' }} />
                <span className="text-sm font-semibold" style={{ color: '#a0aabf' }}>미리보기</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: '#6b7a99' }}>
                  A4 · 210 × 297mm
                </span>
              </div>
              {previewLoading && (
                <div className="flex items-center gap-2" style={{ color: '#6b7a99' }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
                    <path d="M6.5 1v1.5M6.5 10.5V12M1 6.5h1.5M10.5 6.5H12M2.7 2.7l1.1 1.1M9.2 9.2l1.1 1.1M2.7 10.3l1.1-1.1M9.2 3.8l1.1-1.1"/>
                  </svg>
                  <span className="text-xs font-medium">업데이트 중…</span>
                </div>
              )}
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-y-auto px-10 py-10">
              {previewError ? (
                <div className="flex items-start gap-4 p-6 rounded-2xl max-w-lg mx-auto mt-8"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.2)' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                      <circle cx="7" cy="7" r="6"/><path d="M7 4v3M7 10v.5"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#fca5a5' }}>미리보기 오류</p>
                    <p className="text-xs mt-1" style={{ color: '#f87171' }}>{previewError}</p>
                  </div>
                </div>
              ) : previewHtml ? (
                <div className="flex justify-center">
                  <div
                    style={{
                      width: '794px',
                      minWidth: '794px',
                      background: '#fff',
                      borderRadius: '4px',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.2), 0 32px 64px rgba(0,0,0,0.4)',
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      title="문제지 미리보기"
                      srcDoc={previewHtml}
                      onLoad={handleIframeLoad}
                      scrolling="no"
                      style={{ width: '794px', height: '1123px', border: 'none', display: 'block', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-6 py-20">
                  <div
                    className="w-24 h-24 rounded-3xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>미리보기 준비 중</p>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>좌측에서 설정을 입력하면 자동으로 나타납니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
