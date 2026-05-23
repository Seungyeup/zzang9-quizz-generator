import { useState } from 'react'
import { ExamPaper } from './ExamPaper'
import { SVG_ICONS } from './ui'
import { downloadPdf, fetchPreviewHtml } from '../api'

export function PreviewPanel({
  k, items, meta, setMeta,
  width, onReorder, onClearError,
}) {
  const [sheetType, setSheetType] = useState('question')
  const [columns, setColumns] = useState(2)
  const [pageCount, setPageCount] = useState(1)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [printLoading, setPrintLoading] = useState(false)

  const totalScore = items.reduce((s, q) => {
    const t = (q.choices?.length ?? q.choice_count ?? 0) > 0 ? '객관식' : '주관식'
    return s + (t === '객관식' ? 4 : 5)
  }, 0)

  function buildSettings() {
    return {
      title: meta.title,
      school: meta.school,
      subject: meta.subject,
      grade: meta.grade,
      date: meta.date,
      session: meta.session,
      columns: sheetType === 'question' ? columns : 1,
      watermark: meta.watermark,
      sheet_type: sheetType,
    }
  }

  async function handleDownload() {
    if (items.length === 0) return
    setPdfLoading(true)
    setPdfError('')
    try {
      await downloadPdf(items.map((q) => q.id), buildSettings())
    } catch (e) {
      setPdfError(e.message)
    } finally {
      setPdfLoading(false)
    }
  }

  // Print preview = open the worksheet HTML (the one our backend renders for
  // both the live iframe and the PDF) in a popup and trigger that popup's
  // print dialog, so the user sees the paper itself, not the whole web app.
  //
  // The window MUST be opened synchronously inside the click handler — if we
  // `await` first, the popup blocker sees a non-user-initiated open() and
  // refuses it. So we open immediately with a placeholder, then fill in the
  // real HTML once the fetch resolves.
  function handlePrint() {
    if (items.length === 0) return
    setPdfError('')
    const w = window.open('', '_blank')
    if (!w) {
      setPdfError('팝업이 차단되어 인쇄창을 열 수 없습니다.')
      return
    }
    w.document.write(
      '<!doctype html><meta charset="utf-8"><title>시험지 인쇄</title>' +
      '<body style="font-family:Pretendard,sans-serif;color:#64748b;padding:48px;text-align:center">' +
      '시험지를 불러오는 중입니다…</body>'
    )
    setPrintLoading(true)
    fetchPreviewHtml(items.map((q) => q.id), buildSettings())
      .then((html) => {
        w.document.open()
        w.document.write(html)
        w.document.close()
        const trigger = () => { try { w.focus(); w.print() } catch {} }
        w.addEventListener('load', trigger, { once: true })
        // fallback for browsers that fire load before fonts/images are ready
        setTimeout(trigger, 600)
      })
      .catch((e) => {
        setPdfError(e.message)
        try { w.close() } catch {}
      })
      .finally(() => setPrintLoading(false))
  }

  return (
    <aside
      style={{
        width,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        background: k.bg,
        minWidth: 0,
      }}
    >
      {/* toolbar */}
      <div
        style={{
          padding: '10px 16px',
          background: k.panel,
          borderBottom: `1px solid ${k.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 2, background: k.bg, borderRadius: 7, padding: 2 }}>
          {[
            { v: 'question', label: '시험지' },
            { v: 'answer', label: '정답지' },
            { v: 'explain', label: '해설지' },
          ].map((tab) => (
            <button
              key={tab.v}
              onClick={() => setSheetType(tab.v)}
              style={{
                padding: '5px 10px',
                border: 'none',
                borderRadius: 5,
                background: sheetType === tab.v ? k.panel : 'transparent',
                color: sheetType === tab.v ? k.text : k.textMid,
                fontSize: 12,
                fontWeight: sheetType === tab.v ? 600 : 500,
                boxShadow: sheetType === tab.v ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {sheetType === 'question' && (
          <div style={{ display: 'flex', gap: 2, background: k.bg, borderRadius: 7, padding: 2 }}>
            {[1, 2].map((c) => (
              <button
                key={c}
                onClick={() => setColumns(c)}
                style={{
                  width: 32,
                  height: 24,
                  border: 'none',
                  borderRadius: 5,
                  background: columns === c ? k.panel : 'transparent',
                  color: columns === c ? k.text : k.textMid,
                  fontSize: 11,
                  fontWeight: columns === c ? 600 : 500,
                  boxShadow: columns === c ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {c}단
              </button>
            ))}
          </div>
        )}

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11.5,
            color: k.textMid,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={!!meta.watermark}
            onChange={(e) => setMeta({ ...meta, watermark: e.target.checked })}
            style={{ accentColor: k.primary, margin: 0 }}
          />
          워터마크
        </label>
      </div>

      {/* canvas */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <ExamPaper
          selectedItems={items}
          meta={meta}
          setMeta={setMeta}
          sheetType={sheetType}
          columns={columns}
          onReorder={onReorder}
          paperWidth={Math.min(Math.max(360, width - 56), 560)}
          onPagesChange={setPageCount}
        />
      </div>

      {/* action bar */}
      <div
        style={{
          padding: '12px 16px',
          background: k.panel,
          borderTop: `1px solid ${k.border}`,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: k.text }}>
            {items.length}문항 · {totalScore}점 · A4 {pageCount}쪽
          </div>
          <div style={{ fontSize: 10.5, color: k.textDim }}>
            {pdfError
              ? <span style={{ color: k.danger }}>PDF 오류: {pdfError}</span>
              : `예상 시험 시간 약 ${Math.max(20, items.length * 3)}분`}
          </div>
        </div>
        <button
          onClick={handlePrint}
          disabled={items.length === 0 || printLoading}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            border: `1px solid ${k.border}`,
            background: k.panel,
            fontSize: 12,
            fontWeight: 500,
            color: items.length === 0 || printLoading ? k.textDim : k.text,
            opacity: items.length === 0 ? 0.6 : 1,
          }}
        >
          {printLoading ? '여는 중…' : '인쇄 미리보기'}
        </button>
        <button
          onClick={handleDownload}
          disabled={items.length === 0 || pdfLoading}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            background: items.length === 0 || pdfLoading ? k.textDim : k.primary,
            color: 'white',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: items.length === 0 ? 0.6 : 1,
          }}
        >
          {SVG_ICONS.download}
          {pdfLoading ? '생성 중…' : 'PDF 다운로드'}
        </button>
      </div>
    </aside>
  )
}
