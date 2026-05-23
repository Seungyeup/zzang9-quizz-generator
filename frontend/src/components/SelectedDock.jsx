import { useState } from 'react'
import { SVG_ICONS } from './ui'

function splitFirstLine(text) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean)
  return lines[lines.length - 1] || lines[0] || ''
}

function SelectedItem({ q, idx, k, onRemove, dragIdx, setDragIdx, onReorder }) {
  const isDragging = dragIdx === idx
  const subject = q.source_subject

  return (
    <div
      draggable
      onDragStart={(e) => {
        setDragIdx(idx)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        e.preventDefault()
        if (dragIdx !== null && dragIdx !== idx) onReorder(dragIdx, idx)
        setDragIdx(null)
      }}
      onDragEnd={() => setDragIdx(null)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        background: isDragging ? k.primarySoft : 'transparent',
        borderBottom: `1px solid ${k.borderSoft}`,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
      }}
    >
      <span style={{ color: k.textDim, display: 'inline-flex' }}>{SVG_ICONS.grip}</span>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: k.primary,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {idx + 1}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11.5,
            color: k.text,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {splitFirstLine(q.content)}
        </div>
        <div style={{ fontSize: 10.5, color: k.textDim }}>
          {subject || '—'} · {(q.choices && q.choices.length > 0) || (q.choice_count ?? 0) > 0 ? '객관식' : '주관식'} · {q.source_filename || '출처 미상'}
        </div>
      </div>
      <button
        onClick={() => onRemove(q.id)}
        title="제거"
        style={{
          border: 'none',
          background: 'transparent',
          color: k.textDim,
          padding: 4,
          lineHeight: 1,
          fontSize: 14,
        }}
      >
        ×
      </button>
    </div>
  )
}

export function SelectedDock({ k, items, onRemove, onReorder }) {
  const [open, setOpen] = useState(true)
  const [dragIdx, setDragIdx] = useState(null)

  return (
    <div
      style={{
        borderTop: `1px solid ${k.border}`,
        background: k.sub,
        flexShrink: 0,
        maxHeight: open ? 200 : 38,
        transition: 'max-height .2s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: 'none',
          color: k.text,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform .15s',
            color: k.textMid,
          }}
        >
          {SVG_ICONS.chevron}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          선택된 문제 ({items.length}개)
        </span>
        <span style={{ fontSize: 11, color: k.textDim }}>드래그로 순서 변경</span>
      </button>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: '10px 14px',
              fontSize: 11.5,
              color: k.textDim,
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            아직 선택된 문제 없음
          </div>
        ) : (
          items.map((q, i) => (
            <SelectedItem
              key={q.id}
              q={q}
              idx={i}
              k={k}
              onRemove={onRemove}
              dragIdx={dragIdx}
              setDragIdx={setDragIdx}
              onReorder={onReorder}
            />
          ))
        )}
      </div>
    </div>
  )
}
