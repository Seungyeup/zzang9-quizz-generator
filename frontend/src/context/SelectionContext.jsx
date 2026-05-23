import { createContext, useCallback, useContext, useState } from 'react'

const SelectionContext = createContext(null)

export function SelectionProvider({ children }) {
  // Selected items keep the full question object so the preview / dock can
  // render without re-fetching as the user scrolls past pages.
  const [items, setItems] = useState([])

  const toggle = useCallback((q) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === q.id)
      if (i >= 0) return prev.filter((_, idx) => idx !== i)
      return [...prev, q]
    })
  }, [])

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const reorder = useCallback((from, to) => {
    setItems((prev) => {
      const next = prev.slice()
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      return next
    })
  }, [])

  const clear = useCallback(() => setItems([]), [])
  const isSelected = useCallback((id) => items.some((q) => q.id === id), [items])

  return (
    <SelectionContext.Provider value={{ items, toggle, remove, reorder, clear, isSelected }}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  return useContext(SelectionContext)
}
