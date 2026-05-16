import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchQuestions } from '../api'

export function useQuestions({ sourceId, keyword }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const limit = 20

  // Reset when filters change
  useEffect(() => {
    setItems([])
    setPage(1)
    setTotal(0)
  }, [sourceId, keyword])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchQuestions({ sourceId, keyword, page, limit })
      .then((data) => {
        if (cancelled) return
        setTotal(data.total)
        setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]))
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [sourceId, keyword, page])

  const loadMore = useCallback(() => {
    if (!loading && items.length < total) setPage((p) => p + 1)
  }, [loading, items.length, total])

  return { items, total, loading, error, loadMore, hasMore: items.length < total }
}
