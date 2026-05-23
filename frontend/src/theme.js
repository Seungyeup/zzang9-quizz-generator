// Design tokens — single source of truth for color/spacing/typography.

export const THEMES = {
  blue:    { primary: '#2563eb', primarySoft: '#dbeafe', primaryTint: '#eff6ff', primaryDark: '#1d4ed8' },
  emerald: { primary: '#059669', primarySoft: '#d1fae5', primaryTint: '#ecfdf5', primaryDark: '#047857' },
  violet:  { primary: '#7c3aed', primarySoft: '#ede9fe', primaryTint: '#f5f3ff', primaryDark: '#6d28d9' },
  amber:   { primary: '#d97706', primarySoft: '#fef3c7', primaryTint: '#fffbeb', primaryDark: '#b45309' },
}

const DENSITY_ROW = { S: 8, M: 12, L: 16 }
const DENSITY_PAD = { S: '10px 14px', M: '14px 16px', L: '18px 20px' }

export function makeTokens(t = { color: 'blue', density: 'M', dark: false }) {
  const theme = THEMES[t.color] || THEMES.blue
  const dark = !!t.dark
  return {
    ...theme,
    bg: dark ? '#0b1020' : '#f8fafc',
    panel: dark ? '#13182b' : '#ffffff',
    sub: dark ? '#0e1426' : '#fafbfc',
    border: dark ? '#252b41' : '#e5e7eb',
    borderSoft: dark ? '#1d2238' : '#f1f5f9',
    borderStrong: dark ? '#3a4262' : '#cbd5e1',
    text: dark ? '#f1f5f9' : '#0f172a',
    textMid: dark ? '#94a3b8' : '#475569',
    textDim: dark ? '#5a6685' : '#94a3b8',
    paperBg: '#fbfaf7',
    paperText: '#1f1f1f',
    paperAccent: '#b1342a',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    row: DENSITY_ROW[t.density] || DENSITY_ROW.M,
    rowPad: DENSITY_PAD[t.density] || DENSITY_PAD.M,
  }
}

export const DEFAULT_TWEAKS = { color: 'blue', density: 'M', dark: false }
