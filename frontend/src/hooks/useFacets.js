import { useEffect, useState } from 'react'
import { fetchFacets } from '../api'

export function useFacets(refreshKey = 0) {
  const [facets, setFacets] = useState({
    total: 0, subjects: [], sources: [], types: [],
  })
  useEffect(() => {
    let alive = true
    fetchFacets().then((d) => alive && setFacets(d)).catch(() => {})
    return () => { alive = false }
  }, [refreshKey])
  return facets
}
