import type { Doc, El, ImageEl, Mask, Page, ShapeEl, TextEl, Unit } from './types'

export const MM_PX = 96 / 25.4
export const unitPx = (u: Unit) => (u === 'px' ? 1 : u === 'mm' ? MM_PX : 96)
export const toUnit = (px: number, u: Unit) => px / unitPx(u)
export const fromUnit = (v: number, u: Unit) => v * unitPx(u)
export const round = (n: number, d = 2) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}

let counter = 0
export const uid = (p = 'id') =>
  `${p}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export const rad = (d: number) => (d * Math.PI) / 180

export function rotatePoint(px: number, py: number, cx: number, cy: number, deg: number) {
  const a = rad(deg)
  const dx = px - cx
  const dy = py - cy
  return { x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) }
}

export function corners(el: { x: number; y: number; w: number; h: number; rotation: number }) {
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2
  return [
    rotatePoint(el.x, el.y, cx, cy, el.rotation),
    rotatePoint(el.x + el.w, el.y, cx, cy, el.rotation),
    rotatePoint(el.x + el.w, el.y + el.h, cx, cy, el.rotation),
    rotatePoint(el.x, el.y + el.h, cx, cy, el.rotation),
  ]
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export function elBounds(el: { x: number; y: number; w: number; h: number; rotation: number }): Box {
  const cs = corners(el)
  const xs = cs.map((c) => c.x)
  const ys = cs.map((c) => c.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function unionBounds(els: El[]): Box | null {
  if (!els.length) return null
  const bs = els.map(elBounds)
  const x = Math.min(...bs.map((b) => b.x))
  const y = Math.min(...bs.map((b) => b.y))
  const r = Math.max(...bs.map((b) => b.x + b.w))
  const b = Math.max(...bs.map((b) => b.y + b.h))
  return { x, y, w: r - x, h: b - y }
}

function polyPath(pts: [number, number][]) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${round(p[0], 3)} ${round(p[1], 3)}`).join('') + 'Z'
}

function roundRectPath(w: number, h: number, radius: number) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  if (r === 0) return `M0 0H${w}V${h}H0Z`
  return (
    `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}` +
    `H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`
  )
}

function ellipsePath(w: number, h: number) {
  return `M0 ${h / 2}A${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2}A${w / 2} ${h / 2} 0 1 0 0 ${h / 2}Z`
}

function ngon(w: number, h: number, n: number, inner?: number) {
  const pts: [number, number][] = []
  const count = inner ? n * 2 : n
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count
    const k = inner && i % 2 === 1 ? inner : 1
    pts.push([w / 2 + (w / 2) * k * Math.cos(a), h / 2 + (h / 2) * k * Math.sin(a)])
  }
  return polyPath(pts)
}

export function shapePath(el: ShapeEl): string {
  const { w, h } = el
  switch (el.shape) {
    case 'rect':
      return roundRectPath(w, h, el.radius)
    case 'ellipse':
      return ellipsePath(w, h)
    case 'line':
      return `M0 ${h / 2}L${w} ${h / 2}`
    case 'polygon':
      return ngon(w, h, Math.max(3, Math.round(el.sides)))
    case 'star':
      return ngon(w, h, Math.max(3, Math.round(el.sides)), el.innerRatio)
  }
}

export function maskPath(mask: Mask, w: number, h: number, radius: number): string | null {
  switch (mask) {
    case 'none':
      return null
    case 'circle':
      return ellipsePath(w, h)
    case 'rounded':
      return roundRectPath(w, h, radius || Math.min(w, h) * 0.12)
    case 'star':
      return ngon(w, h, 5, 0.45)
    case 'triangle':
      return ngon(w, h, 3)
    case 'hexagon':
      return ngon(w, h, 6)
  }
}

export function gradientLine(w: number, h: number, angle: number) {
  const a = rad(angle)
  const dx = Math.sin(a)
  const dy = -Math.cos(a)
  const L = (Math.abs(w * dx) + Math.abs(h * dy)) / 2
  const cx = w / 2
  const cy = h / 2
  return { x1: cx - dx * L, y1: cy - dy * L, x2: cx + dx * L, y2: cy + dy * L }
}

export function imageRect(el: ImageEl) {
  const nw = el.nw || 1
  const nh = el.nh || 1
  const base = el.fit === 'cover' ? Math.max(el.w / nw, el.h / nh) : Math.min(el.w / nw, el.h / nh)
  const s = base * el.zoom
  const dw = nw * s
  const dh = nh * s
  const slackX = Math.max(0, (dw - el.w) / 2)
  const slackY = Math.max(0, (dh - el.h) / 2)
  return {
    x: (el.w - dw) / 2 + el.offX * slackX,
    y: (el.h - dh) / 2 + el.offY * slackY,
    w: dw,
    h: dh,
  }
}

const PRESETS: Record<string, string> = {
  none: '',
  grayscale: 'grayscale(1)',
  sepia: 'sepia(0.9)',
  vintage: 'sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.8)',
  vivid: 'saturate(1.6) contrast(1.1)',
  fade: 'contrast(0.85) brightness(1.1) saturate(0.8)',
  warm: 'sepia(0.35) saturate(1.3)',
  noir: 'grayscale(1) contrast(1.45) brightness(0.95)',
  dramatic: 'contrast(1.35) saturate(1.2) brightness(0.9)',
}
export const FILTER_PRESETS = Object.keys(PRESETS)

export function cssFilter(el: ImageEl): string {
  const parts: string[] = []
  const exp = Math.pow(2, el.exposure / 50)
  const b = (el.brightness / 100) * exp
  if (b !== 1) parts.push(`brightness(${round(b, 3)})`)
  if (el.contrast !== 100) parts.push(`contrast(${el.contrast / 100})`)
  if (el.saturation !== 100) parts.push(`saturate(${el.saturation / 100})`)
  if (el.temperature > 0) parts.push(`sepia(${round(el.temperature / 250, 3)}) saturate(${round(1 + el.temperature / 400, 3)})`)
  if (el.temperature < 0) parts.push(`sepia(${round(-el.temperature / 250, 3)}) hue-rotate(180deg)`)
  if (el.blur > 0) parts.push(`blur(${el.blur}px)`)
  const p = PRESETS[el.preset]
  if (p) parts.push(p)
  return parts.join(' ') || 'none'
}

/** Replace {variable} tokens at render time. */
export function applyVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== '' ? vars[k] : m))
}

export function findVariables(doc: Doc): string[] {
  const set = new Set<string>()
  for (const p of doc.pages)
    for (const e of p.elements)
      if (e.type === 'text') for (const m of e.text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) set.add(m[1])
  return [...set]
}

/* ---------- element factories ---------- */

const baseDefaults = () => ({
  rotation: 0,
  opacity: 1,
  blend: 'normal' as const,
  hidden: false,
  locked: false,
  flipX: false,
  flipY: false,
})

export function makeShape(shape: ShapeEl['shape'], x: number, y: number, w: number, h: number, extra: Partial<ShapeEl> = {}): ShapeEl {
  const names = { rect: 'Rectangle', ellipse: 'Ellipse', line: 'Line', polygon: 'Polygon', star: 'Star' }
  return {
    id: uid('el'),
    type: 'shape',
    name: names[shape],
    x,
    y,
    w,
    h,
    ...baseDefaults(),
    shape,
    fillMode: shape === 'line' ? 'none' : 'solid',
    fill: '#6d5efc',
    gradient: { c1: '#6d5efc', c2: '#ff6aa2', angle: 90 },
    stroke: shape === 'line' ? '#1a1a2e' : '#1a1a2e',
    strokeWidth: shape === 'line' ? 4 : 0,
    radius: 0,
    sides: shape === 'polygon' ? 6 : 5,
    innerRatio: 0.45,
    ...extra,
  }
}

export function makeText(x: number, y: number, w: number, text = 'Double-click to edit', extra: Partial<TextEl> = {}): TextEl {
  return {
    id: uid('el'),
    type: 'text',
    name: 'Text',
    x,
    y,
    w,
    h: 80,
    ...baseDefaults(),
    text,
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: 48,
    fontWeight: 400,
    italic: false,
    underline: false,
    color: '#1a1a2e',
    align: 'left',
    valign: 'top',
    lineHeight: 1.2,
    letterSpacing: 0,
    paragraphSpacing: 0,
    autoFit: false,
    strokeColor: '#000000',
    strokeWidth: 0,
    shadow: { on: false, x: 4, y: 4, blur: 6, color: '#00000066' },
    bg: null,
    ...extra,
  }
}

export function makeImage(x: number, y: number, w: number, h: number, src: string | null, nw: number, nh: number, extra: Partial<ImageEl> = {}): ImageEl {
  return {
    id: uid('el'),
    type: 'image',
    name: src ? 'Image' : 'Image placeholder',
    x,
    y,
    w,
    h,
    ...baseDefaults(),
    src,
    nw,
    nh,
    fit: 'cover',
    zoom: 1,
    offX: 0,
    offY: 0,
    mask: 'none',
    radius: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    exposure: 0,
    temperature: 0,
    blur: 0,
    preset: 'none',
    ...extra,
  }
}

export function makePage(name = 'Page 1', background = '#ffffff'): Page {
  return { id: uid('pg'), name, background, elements: [] }
}

export function makeDoc(width: number, height: number, unit: Unit = 'px', name = 'Untitled design'): Doc {
  return {
    version: 1,
    id: uid('doc'),
    name,
    width: round(width),
    height: round(height),
    unit,
    bleed: 0,
    pages: [makePage()],
    fonts: [],
    variables: {},
    brand: { colors: ['#6d5efc', '#ff6aa2', '#1a1a2e'], restrict: false },
    guides: [],
  }
}
