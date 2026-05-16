import { createContext, useContext, useState, useCallback } from 'react'

const SelectionContext = createContext(null)

export function SelectionProvider({ children }) {
  const [selected, setSelected] = useState([]) // array of full question objects

  const toggle = useCallback((question) => {
    setSelected((prev) => {
      const exists = prev.some((q) => q.id === question.id)
      if (exists) return prev.filter((q) => q.id !== question.id)
      return [...prev, question]
    })
  }, [])

  const remove = useCallback((id) => {
    setSelected((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const reorder = useCallback((sourceIndex, destIndex) => {
    setSelected((prev) => {
      const next = [...prev]
      const [item] = next.splice(sourceIndex, 1)
      next.splice(destIndex, 0, item)
      return next
    })
  }, [])

  const clear = useCallback(() => setSelected([]), [])

  const isSelected = useCallback((id) => selected.some((q) => q.id === id), [selected])

  return (
    <SelectionContext.Provider value={{ selected, toggle, remove, reorder, clear, isSelected }}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  return useContext(SelectionContext)
}
