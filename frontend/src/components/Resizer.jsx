import { useState } from 'react'

/** Drag handle to resize the right-hand preview pane. value = preview width in px. */
export function Resizer({ value, onChange, min, max, k }) {
  const [hover, setHover] = useState(false)
  const [drag, setDrag] = useState(false)

  const onPointerDown = (e) => {
    e.preventDefault()
    setDrag(true)
    const startX = e.clientX
    const startValue = value
    const move = (ev) => {
      const dx = ev.clientX - startX
      // dragging left increases the right panel width
      const next = Math.max(min, Math.min(max, startValue - dx))
      onChange(next)
    }
    const up = () => {
      setDrag(false)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }

  const active = hover || drag

  return (
    <div
      onPointerDown={onPointerDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="드래그로 파넬 크기 조절"
      style={{
        width: 6,
        marginLeft: -3,
        marginRight: -3,
        flexShrink: 0,
        position: 'relative',
        zIndex: 5,
        cursor: 'col-resize',
        background: active ? k.primary : 'transparent',
        opacity: active ? (drag ? 1 : 0.5) : 0,
        transition: 'opacity .15s, background .15s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 4,
          height: 36,
          borderRadius: 2,
          background: active ? 'white' : k.borderStrong,
          boxShadow: active ? '0 1px 3px rgba(0,0,0,.2)' : 'none',
          opacity: active ? 1 : 0,
          transition: 'opacity .15s',
        }}
      />
    </div>
  )
}
