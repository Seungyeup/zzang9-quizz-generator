import { useState, useEffect } from 'react'

export function useSources() {
  const [sources, setSources] = useState([])

  useEffect(() => {
    fetch('/api/sources')
      .then((r) => r.json())
      .then(setSources)
      .catch(() => {})
  }, [])

  return sources
}
