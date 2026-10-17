import type { VPart, VectorEl } from './types'
import { applyM, IDENTITY, mul, parseMatrix, type Matrix } from './pathops'
import { uid } from './geometry'

const GEOM_ATTRS = ['d', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points']
const SHAPE_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'])
const SKIP_ANCESTORS = new Set(['defs', 'clippath', 'mask', 'pattern', 'symbol', 'marker', 'filter', 'lineargradient', 'radialgradient', 'style', 'title', 'desc', 'metadata'])
const DEF_TAGS = new Set(['lineargradient', 'radialgradient', 'stop'])

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const toHex = (c: string): string => {
  if (!c || c === 'none' || c.startsWith('url(')) return c || 'none'
  const m = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (!m) return c.startsWith('#') ? c : '#000000'
  return '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('')
}

function cleanSerialize(node: Element, rename: (id: string) => string): string {
  const tag = node.tagName
  if (!DEF_TAGS.has(tag.toLowerCase())) return ''
  let attrs = ''
  for (const a of Array.from(node.attributes)) {
    const name = a.name
    if (!/^[a-zA-Z:-]+$/.test(name) || /^on/i.test(name)) continue
    let v = a.value
    if (name === 'id') v = rename(v)
    if ((name === 'href' || name === 'xlink:href') && v.startsWith('#')) v = '#' + rename(v.slice(1))
    else if (name === 'href' || name === 'xlink:href') continue
    attrs += ` ${name === 'xlink:href' ? 'href' : name}="${esc(v)}"`
  }
  const kids = Array.from(node.children)
    .map((c) => cleanSerialize(c, rename))
    .join('')
  return `<${tag}${attrs}>${kids}</${tag}>`
}

export interface ParsedSvg {
  viewBox: [number, number, number, number]
  defs: string
  parts: VPart[]
}

export function parseSvg(text: string): ParsedSvg {
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = parsed.documentElement
  if (!root || root.tagName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) throw new Error('Not a valid SVG file')
  // measure in a live DOM so computed style (classes, <style>, inheritance) and CTMs resolve
  const host = document.createElement('div')
  host.style.cssText = 'position:absolute;left:-99999px;top:0;pointer-events:none'
  document.body.appendChild(host)
  try {
    const live = document.importNode(root, true) as unknown as SVGSVGElement
    host.appendChild(live)
    let vb: [number, number, number, number]
    const vba = live.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
    const wAttr = parseFloat(live.getAttribute('width') || '')
    const hAttr = parseFloat(live.getAttribute('height') || '')
    if (vba && vba.length === 4 && vba.every((n) => !Number.isNaN(n)) && vba[2] > 0 && vba[3] > 0) vb = vba as [number, number, number, number]
    else if (wAttr > 0 && hAttr > 0) vb = [0, 0, wAttr, hAttr]
    else {
      const bb = live.getBBox()
      vb = [bb.x, bb.y, Math.max(1, bb.width), Math.max(1, bb.height)]
    }
    live.setAttribute('viewBox', vb.join(' '))
    live.setAttribute('width', String(vb[2]))
    live.setAttribute('height', String(vb[3]))
    live.setAttribute('preserveAspectRatio', 'none')
    const rootInv = live.getScreenCTM()?.inverse()

    const prefix = uid('v') + '_'
    const rename = (id: string) => prefix + id.replace(/[^\w-]/g, '_')
    let defs = ''
    live.querySelectorAll('linearGradient, radialGradient').forEach((g) => {
      if (g.parentElement && !g.parentElement.closest('lineargradient,radialgradient')) defs += cleanSerialize(g, rename)
    })
    const fixUrl = (v: string) => v.replace(/url\(["']?#([^)"']+)["']?\)/, (_m, id) => `url(#${rename(id)})`)

    const parts: VPart[] = []
    const all = Array.from(live.querySelectorAll('*'))
    let n = 0
    for (const el of all) {
      const tag = el.tagName.toLowerCase()
      if (!SHAPE_TAGS.has(tag)) continue
      let skip = false
      for (let p = el.parentElement; p && p !== (live as Element); p = p.parentElement) if (SKIP_ANCESTORS.has(p.tagName.toLowerCase())) skip = true
      if (skip) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      // opacity: element and ancestors multiplied
      let op = 1
      for (let p: Element | null = el; p; p = p.parentElement) {
        const o = parseFloat(getComputedStyle(p).opacity)
        if (!Number.isNaN(o)) op *= o
        if (p === (live as Element)) break
      }
      const fill = fixUrl(toHex(cs.fill))
      const stroke = fixUrl(toHex(cs.stroke))
      const geom: Record<string, string> = {}
      for (const a of GEOM_ATTRS) {
        const v = el.getAttribute(a)
        if (v !== null) geom[a] = v
      }
      let m: Matrix = IDENTITY
      const screen = (el as unknown as SVGGraphicsElement).getScreenCTM?.()
      if (screen && rootInv) {
        const r = rootInv.multiply(screen)
        m = [r.a, r.b, r.c, r.d, r.e, r.f]
      }
      const fo = parseFloat(cs.fillOpacity)
      const so = parseFloat(cs.strokeOpacity)
      const extra = fill !== 'none' ? (Number.isNaN(fo) ? 1 : fo) : Number.isNaN(so) ? 1 : so
      n++
      parts.push({
        id: uid('part'),
        name: `${tag.charAt(0).toUpperCase() + tag.slice(1)} ${n}`,
        tag,
        geom,
        fill,
        stroke,
        strokeWidth: stroke === 'none' ? 0 : parseFloat(cs.strokeWidth) || 0,
        opacity: Math.round(op * extra * 1000) / 1000,
        fillRule: cs.fillRule === 'evenodd' ? 'evenodd' : undefined,
        linecap: cs.strokeLinecap !== 'butt' ? cs.strokeLinecap : undefined,
        linejoin: cs.strokeLinejoin !== 'miter' ? cs.strokeLinejoin : undefined,
        transform: m.every((v, i) => Math.abs(v - IDENTITY[i]) < 1e-9) ? null : `matrix(${m.map((v) => Math.round(v * 1e5) / 1e5).join(' ')})`,
      })
      if (parts.length > 3000) throw new Error('This SVG has too many shapes (> 3000)')
    }
    if (!parts.length) throw new Error('This SVG has no drawable shapes')
    return { viewBox: vb, defs, parts }
  } finally {
    host.remove()
  }
}

const num = (s: string | undefined, d = 0) => {
  const v = parseFloat(s ?? '')
  return Number.isNaN(v) ? d : v
}

/** path data (user space of the part, before its transform) */
export function partToPathD(p: VPart): string {
  const g = p.geom
  switch (p.tag) {
    case 'path':
      return g.d || ''
    case 'rect': {
      const x = num(g.x)
      const y = num(g.y)
      const w = num(g.width)
      const h = num(g.height)
      let rx = num(g.rx, g.ry ? num(g.ry) : 0)
      let ry = num(g.ry, rx)
      rx = Math.min(rx, w / 2)
      ry = Math.min(ry, h / 2)
      if (rx <= 0 || ry <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
    }
    case 'circle':
    case 'ellipse': {
      const cx = num(g.cx)
      const cy = num(g.cy)
      const rx = p.tag === 'circle' ? num(g.r) : num(g.rx)
      const ry = p.tag === 'circle' ? num(g.r) : num(g.ry)
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`
    }
    case 'line':
      return `M${num(g.x1)} ${num(g.y1)}L${num(g.x2)} ${num(g.y2)}`
    case 'polyline':
    case 'polygon': {
      const pts = (g.points || '').trim().split(/[\s,]+/).map(Number)
      let d = ''
      for (let i = 0; i + 1 < pts.length; i += 2) d += `${i ? 'L' : 'M'}${pts[i]} ${pts[i + 1]}`
      return d + (p.tag === 'polygon' ? 'Z' : '')
    }
  }
  return ''
}

function partMarkup(p: VPart): string {
  if (p.hidden) return ''
  let a = ''
  if (p.tag === 'path') a += ` d="${esc(p.geom.d || '')}"`
  else for (const [k, v] of Object.entries(p.geom)) if (/^[a-z0-9]+$/.test(k)) a += ` ${k}="${esc(v)}"`
  a += ` fill="${esc(p.fill)}" stroke="${esc(p.stroke)}"`
  if (p.stroke !== 'none') a += ` stroke-width="${p.strokeWidth}"`
  if (p.opacity !== 1) a += ` opacity="${p.opacity}"`
  if (p.fillRule) a += ` fill-rule="${p.fillRule}"`
  if (p.linecap) a += ` stroke-linecap="${esc(p.linecap)}"`
  if (p.linejoin) a += ` stroke-linejoin="${esc(p.linejoin)}"`
  if (p.transform) a += ` transform="${esc(p.transform)}"`
  return `<${p.tag}${a}/>`
}

export function vectorSvg(el: Pick<VectorEl, 'viewBox' | 'defs' | 'parts' | 'w' | 'h'>, highlight?: string | null, sizeAttrs = true): string {
  const [x, y, w, h] = el.viewBox
  const hl = highlight ? el.parts.find((p) => p.id === highlight) : null
  const hlMarkup = hl
    ? partMarkup({ ...hl, hidden: false, fill: 'none', stroke: '#ff2d95', strokeWidth: Math.max(w, h) / 120, opacity: 1, linecap: undefined, linejoin: undefined }).replace(' fill="none"', ' fill="none" stroke-dasharray="4 2"')
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"${sizeAttrs ? ` width="${el.w}" height="${el.h}"` : ''} preserveAspectRatio="none" style="overflow:visible;display:block;pointer-events:none">` +
    (el.defs ? `<defs>${el.defs}</defs>` : '') +
    el.parts.map(partMarkup).join('') +
    hlMarkup +
    '</svg>'
  )
}

export function vectorDataUrl(el: Pick<VectorEl, 'viewBox' | 'defs' | 'parts' | 'w' | 'h'>): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(vectorSvg(el))
}

/** path commands of a part in vector-element local coords (px of the element box) */
export function partMatrixToBox(el: Pick<VectorEl, 'viewBox' | 'w' | 'h'>, p: VPart): Matrix {
  const [vx, vy, vw, vh] = el.viewBox
  const toBox: Matrix = [el.w / vw, 0, 0, el.h / vh, (-vx * el.w) / vw, (-vy * el.h) / vh]
  return mul(parseMatrix(p.transform), toBox)
}

export { applyM }
