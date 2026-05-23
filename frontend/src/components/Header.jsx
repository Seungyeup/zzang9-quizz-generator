import { SVG_ICONS } from './ui'

export function Header({ k, search, onSearchChange, onUpload }) {
  return (
    <header
      style={{
        height: 56,
        background: k.panel,
        borderBottom: `1px solid ${k.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 14,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${k.primary}, ${k.primaryDark})`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: -0.5,
          }}
        >
          9
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>9짱</span>
        <span style={{ color: k.textDim, fontSize: 13 }}>시험지 빌더</span>
      </div>

      <div style={{ width: 1, height: 20, background: k.border }} />

      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, color: k.textMid, fontSize: 13 }}>
        <span style={{ cursor: 'default' }}>내 문제은행</span>
        <span style={{ color: k.textDim }}>/</span>
        <span style={{ color: k.text, fontWeight: 500 }}>새 시험지 만들기</span>
      </nav>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 12px',
          background: k.bg,
          borderRadius: 8,
          width: 320,
          border: `1px solid ${k.border}`,
        }}
      >
        <span style={{ color: k.textDim, display: 'inline-flex' }}>{SVG_ICONS.search}</span>
        <input
          placeholder="지문, 발문, 문제 ID로 검색"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            flex: 1,
            fontSize: 13,
            color: k.text,
            minWidth: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: k.textDim,
            padding: '1px 5px',
            border: `1px solid ${k.border}`,
            borderRadius: 3,
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          ⌘K
        </span>
      </div>

      <button
        onClick={onUpload}
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: `1px solid ${k.border}`,
          background: k.panel,
          fontSize: 13,
          fontWeight: 500,
          color: k.text,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {SVG_ICONS.upload}
        파일 업로드
      </button>
    </header>
  )
}
