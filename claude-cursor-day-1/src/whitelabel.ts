import type { CSSProperties } from 'react'

/** Integrator-controlled branding of the editor UI itself (not the design's brand kit). */
export interface WhiteLabel {
  title: string
  /** image URL or data URL; null shows the default mark */
  logoUrl: string | null
  colors: {
    accent: string
    bg: string
    panel: string
    text: string
    line: string
    muted: string
  }
  /** UI areas to hide */
  hide: {
    add: boolean
    layers: boolean
    templates: boolean
    brand: boolean
    ai: boolean
    video: boolean
    inspector: boolean
    pages: boolean
    rulers: boolean
    file: boolean
    cloud: boolean
    role: boolean
    export: boolean
    settings: boolean
  }
}

export type HideKey = keyof WhiteLabel['hide']

export const HIDE_LABELS: Record<HideKey, string> = {
  add: 'Add tab',
  layers: 'Layers tab',
  templates: 'Templates tab',
  brand: 'Brand tab',
  ai: 'AI tab',
  video: 'Video mode',
  inspector: 'Inspector (right panel)',
  pages: 'Pages & zoom bar',
  rulers: 'Rulers',
  file: 'File buttons (New/Open/Save/Download)',
  cloud: 'Cloud storage button',
  role: 'Role switch',
  export: 'Export button',
  settings: 'White-label settings button',
}

export const DEFAULT_WL: WhiteLabel = {
  title: 'Canvasly',
  logoUrl: null,
  colors: { accent: '#6d5efc', bg: '#eceef5', panel: '#ffffff', text: '#1c1d2b', line: '#e1e3ee', muted: '#5f6277' },
  hide: {
    add: false,
    layers: false,
    templates: false,
    brand: false,
    ai: false,
    video: false,
    inspector: false,
    pages: false,
    rulers: false,
    file: false,
    cloud: false,
    role: false,
    export: false,
    settings: false,
  },
}

export const WL_KEY = 'canvasly:whitelabel'

export type WhiteLabelInput = Partial<Omit<WhiteLabel, 'colors' | 'hide'>> & {
  colors?: Partial<WhiteLabel['colors']>
  hide?: Partial<WhiteLabel['hide']> | HideKey[]
}

export function mergeWL(base: WhiteLabel, p: WhiteLabelInput | null | undefined): WhiteLabel {
  if (!p) return base
  const hide = Array.isArray(p.hide) ? Object.fromEntries(p.hide.map((k) => [k, true])) : p.hide || {}
  return {
    ...base,
    ...(p.title !== undefined ? { title: p.title } : {}),
    ...(p.logoUrl !== undefined ? { logoUrl: p.logoUrl } : {}),
    colors: { ...base.colors, ...(p.colors || {}) },
    hide: { ...base.hide, ...hide },
  }
}

export function loadWL(): WhiteLabel {
  try {
    const raw = localStorage.getItem(WL_KEY)
    if (raw) return mergeWL(DEFAULT_WL, JSON.parse(raw))
  } catch {
    /* ignore */
  }
  return DEFAULT_WL
}

export function saveWL(wl: WhiteLabel) {
  try {
    localStorage.setItem(WL_KEY, JSON.stringify(wl))
  } catch {
    /* ignore */
  }
}

function hexToRgb(h: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim())
  if (!m) return [109, 94, 252]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: string, b: string, t: number) => {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  return `rgb(${x.map((v, i) => Math.round(v * (1 - t) + y[i] * t)).join(',')})`
}

/** CSS custom properties applied on the editor root */
export function wlStyle(wl: WhiteLabel): CSSProperties {
  const c = wl.colors
  const lum = (() => {
    const [r, g, b] = hexToRgb(c.accent)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  })()
  return {
    '--accent': c.accent,
    '--accent-soft': mix(c.accent, c.panel, 0.88),
    '--accent-strong': mix(c.accent, '#000000', 0.12),
    // accent used as text on panel / soft backgrounds: pulled toward the text colour for WCAG AA contrast
    '--accent-text': mix(c.accent, c.text, 0.35),
    '--on-accent': lum > 160 ? '#111111' : '#ffffff',
    '--bg': c.bg,
    '--canvas-bg': mix(c.bg, c.text, 0.07),
    '--panel': c.panel,
    '--hover': mix(c.panel, c.text, 0.04),
    '--text': c.text,
    '--line': c.line,
    '--muted': c.muted,
    color: c.text,
    background: c.bg,
  } as CSSProperties
}
