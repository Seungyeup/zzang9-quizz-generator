// Atomic UI parts shared across the builder.

const PILL_TONES = {
  slate:   { bg: '#f1f5f9', fg: '#475569' },
  blue:    { bg: '#dbeafe', fg: '#1d4ed8' },
  green:   { bg: '#dcfce7', fg: '#166534' },
  amber:   { bg: '#fef3c7', fg: '#92400e' },
  rose:    { bg: '#ffe4e6', fg: '#9f1239' },
  violet:  { bg: '#ede9fe', fg: '#6d28d9' },
}

export function Pill({ children, tone = 'slate', k }) {
  const tones = tone === 'primary' && k
    ? { bg: k.primarySoft, fg: k.primaryDark }
    : PILL_TONES[tone] || PILL_TONES.slate
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 999,
        background: tones.bg,
        color: tones.fg,
        letterSpacing: -0.1,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {children}
    </span>
  )
}

export function Checkbox({ checked, onChange, k, size = 18 }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange?.() }}
      style={{
        width: size, height: size, borderRadius: 5, flexShrink: 0,
        border: `1.5px solid ${checked ? k.primary : k.borderStrong}`,
        background: checked ? k.primary : k.panel,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0,
        transition: 'background .12s, border-color .12s',
      }}
    >
      {checked && (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export function IconBtn({ children, onClick, title, k, tone = 'ghost' }) {
  const styles = {
    ghost:    { bg: 'transparent', fg: k.textMid, border: 'transparent' },
    bordered: { bg: k.panel, fg: k.text, border: k.border },
    primary:  { bg: k.primary, fg: 'white', border: k.primary },
  }[tone]
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 6,
        background: styles.bg, color: styles.fg,
        border: `1px solid ${styles.border}`, padding: 0,
      }}
    >
      {children}
    </button>
  )
}

export function EditableText({ value, onChange, style, placeholder }) {
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onChange?.(e.currentTarget.textContent || '')}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
      }}
      style={{
        outline: 'none',
        borderRadius: 3,
        padding: '0 3px',
        margin: '0 -3px',
        cursor: 'text',
        display: 'inline-block',
        ...style,
      }}
    >
      {value || placeholder}
    </span>
  )
}

export function FigurePlaceholder({ figure, w = 260, h = 70, stripe = '#94a3b8', bg = '#f8fafc' }) {
  if (!figure) return null
  const id = 'fp-' + String(figure).replace(/[^a-zA-Z0-9_-]/g, '_')
  return (
    <svg
      width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', maxWidth: '100%' }}
    >
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={stripe} strokeWidth="1" opacity="0.25" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill={bg} stroke={stripe} strokeOpacity="0.4" />
      <rect width={w} height={h} fill={`url(#${id})`} />
      <text
        x={w / 2} y={h / 2 + 3}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize="11" fill={stripe}
      >
        [ {figure} ]
      </text>
    </svg>
  )
}

export const SVG_ICONS = {
  search: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="4.5" />
      <path d="M9.5 9.5L13 13" />
    </svg>
  ),
  upload: (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7 9.5V2M4 5l3-3 3 3M2 11.5h10" />
    </svg>
  ),
  download: (
    <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6.5 1v8M3 6l3.5 3.5L10 6M1.5 11.5h10" />
    </svg>
  ),
  grip: (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" style={{ flexShrink: 0 }}>
      <circle cx="3" cy="3" r="1"/><circle cx="7" cy="3" r="1"/>
      <circle cx="3" cy="7" r="1"/><circle cx="7" cy="7" r="1"/>
      <circle cx="3" cy="11" r="1"/><circle cx="7" cy="11" r="1"/>
    </svg>
  ),
  chevron: (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 4l3.5 3.5L9 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  x: (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 1l9 9M10 1L1 10" />
    </svg>
  ),
}
