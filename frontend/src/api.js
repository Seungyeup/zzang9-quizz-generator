// Thin fetch wrappers for the backend API.

const BASE = '/api'

async function jsonOrThrow(res) {
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchFacets() {
  return jsonOrThrow(await fetch(`${BASE}/questions/facets`))
}

export async function fetchSources() {
  return jsonOrThrow(await fetch(`${BASE}/sources`))
}

export async function fetchQuestions({ source_id, subject, type, keyword, page = 1, limit = 30 } = {}) {
  const params = new URLSearchParams()
  if (source_id != null) params.set('source_id', source_id)
  if (subject) params.set('subject', subject)
  if (type) params.set('type', type)
  if (keyword) params.set('keyword', keyword)
  params.set('page', String(page))
  params.set('limit', String(limit))
  return jsonOrThrow(await fetch(`${BASE}/questions?${params}`))
}

export async function fetchQuestion(id) {
  return jsonOrThrow(await fetch(`${BASE}/questions/${id}`))
}

export async function uploadFile(file, subject) {
  const fd = new FormData()
  fd.append('file', file)
  if (subject) fd.append('subject', subject)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: fd })
  return jsonOrThrow(res)
}

export async function fetchJobStatus(jobId) {
  return jsonOrThrow(await fetch(`${BASE}/upload/${jobId}`))
}

export async function fetchPreviewHtml(questionIds, settings) {
  const res = await fetch(`${BASE}/worksheet/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_ids: questionIds, settings }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.text()
}

export async function downloadPdf(questionIds, settings) {
  const res = await fetch(`${BASE}/worksheet/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_ids: questionIds, settings }),
  })
  if (!res.ok) throw new Error(await res.text())
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const disp = res.headers.get('content-disposition') || ''
  const match = disp.match(/filename\*=UTF-8''([^;]+)/)
  const filename = match ? decodeURIComponent(match[1]) : `${settings.title || '시험지'}.pdf`
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
