import { useEffect, useState } from 'react'
import { fetchSources } from '../api'

export function useSources(refreshKey = 0) {
  const [sources, setSources] = useState([])
  useEffect(() => {
    let alive = true
    fetchSources().then((d) => alive && setSources(d)).catch(() => {})
    return () => { alive = false }
  }, [refreshKey])
  return sources
}
