import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchPreviewHtml, downloadPdf } from '../api'

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

function FormField({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`text-sm border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
    />
  )
}

export function WorksheetModal({ selected, onClose }) {
  const today = new Date().toISOString().slice(0, 10)

  const [settings, setSettings] = useState({
    title: '문제지',
    school: '',
    grade: '',
    class_num: '',
    date: today,
    show_answers: true,
    show_explanation: false,
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

  // Auto-resize iframe to content height after load
  function handleIframeLoad() {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const h = iframe.contentDocument?.body?.scrollHeight
      if (h) iframe.style.height = h + 'px'
    } catch {
      iframe.style.height = '1123px' // fallback: one A4 page at 96dpi
    }
  }

  // Debounced preview fetch
  const fetchPreview = useCallback(
    async (s) => {
      setPreviewLoading(true)
      setPreviewError('')
      try {
        const html = await fetchPreviewHtml(
          selected.map((q) => q.id),
          s
        )
        setPreviewHtml(html)
      } catch (e) {
        setPreviewError(e.message)
      } finally {
        setPreviewLoading(false)
      }
    },
    [selected]
  )

  // Fetch preview whenever settings change (debounced 600ms)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPreview(settings), 600)
    return () => clearTimeout(debounceRef.current)
  }, [settings, fetchPreview])

  async function handleDownload() {
    setPdfLoading(true)
    setPdfError('')
    try {
      await downloadPdf(
        selected.map((q) => q.id),
        settings
      )
    } catch (e) {
      setPdfError(e.message)
    } finally {
      setPdfLoading(false)
    }
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-6xl h-[92vh] overflow-hidden">

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-800">문제지 만들기</span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {selected.length}문제 선택됨
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: Settings Form ── */}
          <div className="w-64 shrink-0 border-r border-slate-200 flex flex-col overflow-y-auto">
            <div className="p-4 flex flex-col gap-4">

              <FormField label="문제지 제목">
                <Input value={settings.title} onChange={(v) => set('title', v)} placeholder="예: 1단원 형성평가" />
              </FormField>

              <FormField label="학교 / 기관명">
                <Input value={settings.school} onChange={(v) => set('school', v)} placeholder="예: ○○중학교" />
              </FormField>

              <div className="flex gap-2">
                <FormField label="학년">
                  <Input value={settings.grade} onChange={(v) => set('grade', v)} placeholder="1" className="w-full" />
                </FormField>
                <FormField label="반">
                  <Input value={settings.class_num} onChange={(v) => set('class_num', v)} placeholder="1" className="w-full" />
                </FormField>
              </div>

              <FormField label="날짜">
                <input
                  type="date"
                  value={settings.date}
                  onChange={(e) => set('date', e.target.value)}
                  className="text-sm border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </FormField>

              <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                <Toggle
                  checked={settings.show_answers}
                  onChange={(v) => set('show_answers', v)}
                  label="정답표 포함"
                />
                <Toggle
                  checked={settings.show_explanation}
                  onChange={(v) => set('show_explanation', v)}
                  label="해설 포함"
                />
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* ── Action Buttons ── */}
            <div className="p-4 border-t border-slate-200 flex flex-col gap-2">
              {pdfError && (
                <p className="text-xs text-red-500 bg-red-50 rounded px-2 py-1">{pdfError}</p>
              )}
              <button
                onClick={handleDownload}
                disabled={pdfLoading}
                className="w-full text-sm py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pdfLoading ? (
                  <span className="animate-spin inline-block">⟳</span>
                ) : (
                  <span>↓</span>
                )}
                PDF 다운로드
              </button>
            </div>
          </div>

          {/* ── Right: Preview ── */}
          <div className="flex-1 overflow-y-auto bg-slate-200">
            {/* Preview toolbar */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-slate-300/80 backdrop-blur-sm border-b border-slate-400/30">
              <span className="text-xs font-medium text-slate-600">미리보기 (A4 기준)</span>
              {previewLoading && (
                <span className="text-xs text-slate-500 animate-pulse">업데이트 중…</span>
              )}
            </div>

            <div className="p-6 flex justify-center">
              {previewError ? (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-4 w-full max-w-2xl">
                  미리보기 오류: {previewError}
                </div>
              ) : previewHtml ? (
                /* A4 shadow frame */
                <div
                  className="bg-white shadow-xl"
                  style={{ width: '794px', minWidth: '794px' }}
                >
                  <iframe
                    ref={iframeRef}
                    title="문제지 미리보기"
                    srcDoc={previewHtml}
                    onLoad={handleIframeLoad}
                    scrolling="no"
                    style={{
                      width: '794px',
                      height: '1123px',
                      border: 'none',
                      display: 'block',
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2 h-64">
                  <span className="text-3xl">📄</span>
                  <span className="text-sm">설정을 변경하면 미리보기가 업데이트됩니다</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
