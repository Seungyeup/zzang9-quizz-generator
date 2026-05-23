// Left filter rail. Reads pre-aggregated facets from the backend so each chip
// shows an accurate count without re-running the question query.

function FilterChip({ label, active, count, onClick, k }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '6px 10px',
        borderRadius: 6,
        border: 'none',
        background: active ? k.primarySoft : 'transparent',
        color: active ? k.primaryDark : k.text,
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        textAlign: 'left',
        transition: 'background .1s',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {count !== undefined && (
        <span
          style={{
            fontSize: 11,
            color: active ? k.primaryDark : k.textDim,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function FilterGroup({ title, children, k }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: k.textMid,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: 8,
          padding: '0 10px',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  )
}

export function FilterSidebar({ k, facets, sources, filters, onChange }) {
  const setOne = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <aside
      style={{
        width: 220,
        background: k.panel,
        borderRight: `1px solid ${k.border}`,
        padding: '16px 6px',
        overflow: 'auto',
        flexShrink: 0,
      }}
    >
      <FilterGroup title="과목" k={k}>
        <FilterChip
          k={k} label="전체" count={facets.total}
          active={!filters.subject}
          onClick={() => setOne('subject', null)}
        />
        {facets.subjects.map((s) => (
          <FilterChip
            k={k} key={s.value} label={s.value} count={s.count}
            active={filters.subject === s.value}
            onClick={() => setOne('subject', filters.subject === s.value ? null : s.value)}
          />
        ))}
      </FilterGroup>

      {sources.length > 0 && (
        <FilterGroup title="출처" k={k}>
          {sources.slice(0, 12).map((s) => (
            <FilterChip
              k={k} key={s.id} label={s.filename} count={s.question_count}
              active={filters.source_id === s.id}
              onClick={() => setOne('source_id', filters.source_id === s.id ? null : s.id)}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="문제 유형" k={k}>
        {facets.types.map((t) => (
          <FilterChip
            k={k} key={t.value} label={t.value} count={t.count}
            active={filters.type === t.value}
            onClick={() => setOne('type', filters.type === t.value ? null : t.value)}
          />
        ))}
      </FilterGroup>
    </aside>
  )
}

export function ActiveFilter({ label, onRemove, k }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 4px 3px 9px',
        borderRadius: 999,
        background: k.primarySoft,
        color: k.primaryDark,
        fontSize: 11.5,
        fontWeight: 500,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </span>
  )
}
