import type { TextEl } from './types'

let _ctx: CanvasRenderingContext2D | null = null
function ctx() {
  if (!_ctx) _ctx = document.createElement('canvas').getContext('2d')!
  return _ctx
}

export function fontString(el: Pick<TextEl, 'italic' | 'fontWeight' | 'fontFamily'>, size: number) {
  return `${el.italic ? 'italic ' : ''}${el.fontWeight} ${size}px ${el.fontFamily}`
}

const RTL_CHAR = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/
const STRONG_LTR = /[A-Za-z\u00C0-\u02AF\u0370-\u058F\u0900-\u1FFF\u2C00-\uFB1C]/

export const hasRtl = (s: string) => RTL_CHAR.test(s)

/** direction of the first strong character */
export function detectDir(text: string): 'ltr' | 'rtl' {
  for (const ch of text) {
    if (RTL_CHAR.test(ch)) return 'rtl'
    if (STRONG_LTR.test(ch)) return 'ltr'
  }
  return 'ltr'
}

export function effectiveDir(el: Pick<TextEl, 'direction'>, text: string): 'ltr' | 'rtl' {
  const d = el.direction ?? 'auto'
  return d === 'auto' ? detectDir(text) : d
}

export interface Line {
  text: string
  width: number
  paraStart: boolean
}

export interface Layout {
  lines: Line[]
  height: number
  lineHeightPx: number
}

type LayoutParams = Pick<TextEl, 'italic' | 'fontWeight' | 'fontFamily' | 'letterSpacing' | 'lineHeight' | 'paragraphSpacing'>

export function layoutText(text: string, p: LayoutParams, size: number, maxWidth: number): Layout {
  const c = ctx()
  c.font = fontString(p, size)
  ;(c as any).letterSpacing = `${p.letterSpacing}px`
  const measure = (s: string) => c.measureText(s).width
  const lines: Line[] = []
  const paras = text.split('\n')
  paras.forEach((para) => {
    if (para === '') {
      lines.push({ text: '', width: 0, paraStart: true })
      return
    }
    const words = para.match(/\s+|[^\s-]*-+|[^\s-]+/g) || []
    let cur = ''
    let first = true
    const push = (t: string) => {
      lines.push({ text: t, width: measure(t), paraStart: first })
      first = false
    }
    for (const w of words) {
      const test = cur + w
      if (cur === '' || measure(test.trimEnd()) <= maxWidth) {
        cur = test
        // break overly long single word
        if (measure(cur) > maxWidth && !/\s/.test(cur)) {
          let chunk = ''
          for (const ch of cur) {
            if (chunk && measure(chunk + ch) > maxWidth) {
              push(chunk)
              chunk = ch
            } else chunk += ch
          }
          cur = chunk
        }
      } else {
        push(cur.trimEnd())
        cur = /^\s+$/.test(w) ? '' : w
      }
    }
    push(cur.trimEnd())
  })
  const lh = size * p.lineHeight
  let height = 0
  lines.forEach((l, i) => {
    if (i > 0 && l.paraStart) height += p.paragraphSpacing
    height += lh
  })
  return { lines, height, lineHeightPx: lh }
}

/** Auto-fit: shrink the font (never grow) until the wrapped text fits the box. */
export function fitFontSize(el: TextEl, text: string): number {
  if (!el.autoFit) return el.fontSize
  if (layoutText(text, el, el.fontSize, el.w).height <= el.h) return el.fontSize
  let lo = 4
  let hi = el.fontSize
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    const l = layoutText(text, el, mid, el.w)
    if (l.height <= el.h) lo = mid
    else hi = mid
  }
  return Math.floor(lo * 0.98 * 10) / 10
}

export interface ArcGlyph {
  ch: string
  x: number
  y: number
  /** radians, clockwise */
  angle: number
}

/**
 * Text on an arc. `curve` -100…100 maps to ±360° of bend; positive arches up (centre below),
 * negative sags (centre above). One line; glyph centres sit on the baseline circle,
 * which is vertically centred in the element box.
 */
export function arcLayout(el: TextEl, text: string, size: number): ArcGlyph[] {
  const c = ctx()
  c.font = fontString(el, size)
  ;(c as any).letterSpacing = '0px'
  const chars = [...text.replace(/\s*\n\s*/g, ' ')]
  const widths = chars.map((ch) => c.measureText(ch).width + el.letterSpacing)
  const total = widths.reduce((a, b) => a + b, 0)
  const curve = Math.max(-100, Math.min(100, el.curve ?? 0))
  if (!total || !curve) return []
  const theta = (Math.abs(curve) / 100) * Math.PI * 2
  const R = total / theta
  const { ascent, descent } = fontMetrics(el, size)
  const half = Math.min(theta / 2, Math.PI)
  const sag = R * (1 - Math.cos(half))
  const height = sag + ascent + descent
  const top = (el.h - height) / 2
  const cx = el.w / 2
  const up = curve > 0
  const cy = up ? top + ascent + R : top + height - descent - R
  let s = 0
  return chars.map((ch, i) => {
    const a = -theta / 2 + (s + widths[i] / 2) / R
    s += widths[i]
    return up
      ? { ch, x: cx + R * Math.sin(a), y: cy - R * Math.cos(a), angle: a }
      : { ch, x: cx + R * Math.sin(a), y: cy + R * Math.cos(a), angle: -a }
  })
}

export function fontMetrics(el: TextEl, size: number) {
  const c = ctx()
  c.font = fontString(el, size)
  const m = c.measureText('Hg')
  return {
    ascent: m.fontBoundingBoxAscent ?? size * 0.9,
    descent: m.fontBoundingBoxDescent ?? size * 0.25,
  }
}
