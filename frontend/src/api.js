const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res
}

export async function fetchSources() {
  // Re-use questions endpoint grouped: just get all source_ids from first page
  const res = await request('/questions?limit=1')
  const data = await res.json()
  return data
}

export async function fetchQuestions({ sourceId, keyword, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit })
  if (sourceId) params.set('source_id', sourceId)
  if (keyword) params.set('keyword', keyword)
  const res = await request(`/questions?${params}`)
  return res.json()
}

export async function fetchQuestion(id) {
  const res = await request(`/questions/${id}`)
  return res.json()
}

export async function uploadFile(file, subject = '') {
  const form = new FormData()
  form.append('file', file)
  form.append('subject', subject)
  const res = await request('/upload', { method: 'POST', body: form })
  return res.json()
}

export async function fetchJobStatus(jobId) {
  const res = await request(`/upload/${jobId}`)
  return res.json()
}

export async function previewWorksheet(questionIds, settings) {
  const res = await request('/worksheet/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_ids: questionIds, settings }),
  })
  return res.json()
}

export async function fetchPreviewHtml(questionIds, settings) {
  const res = await request('/worksheet/preview-html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_ids: questionIds, settings }),
  })
  return res.text()
}

export async function downloadPdf(questionIds, settings) {
  const res = await request('/worksheet/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_ids: questionIds, settings }),
  })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  // filename: "문제지_YYYYMMDD.pdf"
  const dateStr = settings.date
    ? settings.date.replace(/[^0-9]/g, '').slice(0, 8)
    : new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.download = `${settings.title || '문제지'}_${dateStr}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
