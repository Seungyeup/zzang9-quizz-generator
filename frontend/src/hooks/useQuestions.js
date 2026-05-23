import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchQuestions } from '../api'

const PAGE_SIZE = 30

export function useQuestions(filters, refreshKey = 0) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const reqIdRef = useRef(0)
  const key = JSON.stringify({ filters, refreshKey })

  useEffect(() => {
    setItems([]); setPage(1); setHasMore(true); setError(null)
  }, [key])

  const load = useCallback(async (pageNum) => {
    const me = ++reqIdRef.current
    setLoading(true)
    try {
      const data = await fetchQuestions({ ...filters, page: pageNum, limit: PAGE_SIZE })
      if (me !== reqIdRef.current) return
      setTotal(data.total)
      setItems((prev) => pageNum === 1 ? data.items : [...prev, ...data.items])
      setHasMore(pageNum * PAGE_SIZE < data.total)
    } catch (e) {
      if (me === reqIdRef.current) setError(e.message)
    } finally {
      if (me === reqIdRef.current) setLoading(false)
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(1) }, [load])

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    const next = page + 1
    setPage(next)
    load(next)
  }, [loading, hasMore, page, load])

  return { items, total, loading, error, hasMore, loadMore }
}
