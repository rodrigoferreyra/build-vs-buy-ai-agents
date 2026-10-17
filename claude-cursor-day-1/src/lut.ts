import type { LutAsset } from './types'
import { loadImage } from './imageCache'

/** 3D colour lookup table. `data` is size³ RGB triplets (0..1), red varies fastest (.cube order). */
export interface Lut {
  size: number
  data: Float32Array
}

export function parseCube(text: string): Lut {
  let size = 0
  const vals: number[] = []
  let dmin = [0, 0, 0]
  let dmax = [1, 1, 1]
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('LUT_3D_SIZE')) size = parseInt(line.split(/\s+/)[1], 10)
    else if (line.startsWith('LUT_1D_SIZE')) throw new Error('1D LUTs are not supported (need a 3D .cube)')
    else if (line.startsWith('DOMAIN_MIN')) dmin = line.split(/\s+/).slice(1).map(Number)
    else if (line.startsWith('DOMAIN_MAX')) dmax = line.split(/\s+/).slice(1).map(Number)
    else if (/^[-+\d.]/.test(line)) {
      const p = line.split(/\s+/).map(Number)
      if (p.length >= 3 && p.every((n) => !Number.isNaN(n))) vals.push(p[0], p[1], p[2])
    }
  }
  if (!size || vals.length !== size * size * size * 3) throw new Error('Invalid .cube file')
  const data = new Float32Array(vals.length)
  for (let i = 0; i < vals.length; i++) {
    const c = i % 3
    data[i] = Math.min(1, Math.max(0, (vals[i] - dmin[c]) / (dmax[c] - dmin[c] || 1)))
  }
  return { size, data }
}

/* ---------- built-in procedural looks ---------- */

type Fn = (r: number, g: number, b: number) => [number, number, number]
const clamp = (x: number) => Math.min(1, Math.max(0, x))
const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const curve = (x: number, k: number) => clamp(x + k * Math.sin(x * Math.PI) * 0.5)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

const BUILTIN: Record<string, { name: string; fn: Fn }> = {
  'teal-orange': {
    name: 'Teal & orange',
    fn: (r, g, b) => {
      const l = lum(r, g, b)
      const sh = 1 - l
      return [clamp(r + 0.12 * l - 0.08 * sh), clamp(g + 0.02 * l + 0.03 * sh), clamp(b - 0.1 * l + 0.14 * sh)]
    },
  },
  'cool-film': {
    name: 'Cool film',
    fn: (r, g, b) => [curve(r * 0.95, 0.05), curve(g, 0.04), curve(b * 1.05 + 0.03, 0.08)],
  },
  'warm-sunset': {
    name: 'Warm sunset',
    fn: (r, g, b) => [clamp(r * 1.08 + 0.04), clamp(g * 0.98), clamp(b * 0.8)],
  },
  'bleach-bypass': {
    name: 'Bleach bypass',
    fn: (r, g, b) => {
      const l = lum(r, g, b)
      const c = (x: number) => clamp(mix(x, l, 0.5) * 1.15 - 0.06)
      return [c(r), c(g), c(b)]
    },
  },
  'cross-process': {
    name: 'Cross process',
    fn: (r, g, b) => [clamp(r * r * 0.6 + r * 0.55), clamp(g * 1.05), clamp(0.15 + b * 0.7)],
  },
  'mono-blue': {
    name: 'Cyanotype',
    fn: (r, g, b) => {
      const l = lum(r, g, b)
      return [clamp(l * 0.2 + 0.02), clamp(l * 0.55 + 0.1 * l), clamp(0.15 + l * 0.85)]
    },
  },
  'matte-fade': {
    name: 'Matte fade',
    fn: (r, g, b) => [clamp(0.08 + r * 0.86), clamp(0.07 + g * 0.86), clamp(0.1 + b * 0.82)],
  },
  'neon-night': {
    name: 'Neon night',
    fn: (r, g, b) => {
      const l = lum(r, g, b)
      return [clamp(mix(l, r, 1.5) * 0.9 + 0.1 * (1 - l)), clamp(mix(l, g, 1.2) * 0.85), clamp(mix(l, b, 1.6) * 1.1 + 0.1 * (1 - l))]
    },
  },
}

export const BUILTIN_LUT_LIST = Object.entries(BUILTIN).map(([k, v]) => ({ id: 'builtin:' + k, name: v.name }))

const builtinCache = new Map<string, Lut>()
function builtinLut(id: string): Lut | null {
  const key = id.replace('builtin:', '')
  const hit = builtinCache.get(key)
  if (hit) return hit
  const def = BUILTIN[key]
  if (!def) return null
  const size = 17
  const data = new Float32Array(size ** 3 * 3)
  let i = 0
  for (let b = 0; b < size; b++)
    for (let g = 0; g < size; g++)
      for (let r = 0; r < size; r++) {
        const [or, og, ob] = def.fn(r / (size - 1), g / (size - 1), b / (size - 1))
        data[i++] = or
        data[i++] = og
        data[i++] = ob
      }
  const lut = { size, data }
  builtinCache.set(key, lut)
  return lut
}

const userCache = new Map<string, Lut>()
export function resolveLut(id: string | null | undefined, luts: LutAsset[] | undefined): Lut | null {
  if (!id) return null
  if (id.startsWith('builtin:')) return builtinLut(id)
  const a = luts?.find((l) => l.id === id)
  if (!a) return null
  const key = a.id + ':' + a.cube.length
  let l = userCache.get(key)
  if (!l) {
    try {
      l = parseCube(a.cube)
      userCache.set(key, l)
    } catch {
      return null
    }
  }
  return l
}

/** trilinear lookup applied in place to RGBA pixels, blended by `amount` 0..1 */
export function applyLut(data: Uint8ClampedArray, lut: Lut, amount: number) {
  const n = lut.size
  const m = n - 1
  const d = lut.data
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] === 0) continue
    const r = (data[p] / 255) * m
    const g = (data[p + 1] / 255) * m
    const b = (data[p + 2] / 255) * m
    const r0 = Math.min(m - 1, Math.floor(r))
    const g0 = Math.min(m - 1, Math.floor(g))
    const b0 = Math.min(m - 1, Math.floor(b))
    const fr = r - r0
    const fg = g - g0
    const fb = b - b0
    const idx = (ri: number, gi: number, bi: number) => ((bi * n + gi) * n + ri) * 3
    const out = [0, 0, 0]
    for (let c = 0; c < 3; c++) {
      const c000 = d[idx(r0, g0, b0) + c]
      const c100 = d[idx(r0 + 1, g0, b0) + c]
      const c010 = d[idx(r0, g0 + 1, b0) + c]
      const c110 = d[idx(r0 + 1, g0 + 1, b0) + c]
      const c001 = d[idx(r0, g0, b0 + 1) + c]
      const c101 = d[idx(r0 + 1, g0, b0 + 1) + c]
      const c011 = d[idx(r0, g0 + 1, b0 + 1) + c]
      const c111 = d[idx(r0 + 1, g0 + 1, b0 + 1) + c]
      const c00 = c000 + (c100 - c000) * fr
      const c10 = c010 + (c110 - c010) * fr
      const c01 = c001 + (c101 - c001) * fr
      const c11 = c011 + (c111 - c011) * fr
      const c0 = c00 + (c10 - c00) * fg
      const c1 = c01 + (c11 - c01) * fg
      out[c] = (c0 + (c1 - c0) * fb) * 255
    }
    data[p] = data[p] + (out[0] - data[p]) * amount
    data[p + 1] = data[p + 1] + (out[1] - data[p + 1]) * amount
    data[p + 2] = data[p + 2] + (out[2] - data[p + 2]) * amount
  }
}

const lutCanvasCache = new Map<string, Promise<HTMLCanvasElement>>()
const MAX_SIDE = 2048

/** The source image with the LUT baked in (async, cached). */
export function lutCanvas(src: string, lutId: string, amount: number, luts: LutAsset[] | undefined): Promise<HTMLCanvasElement> {
  const asset = lutId.startsWith('builtin:') ? '' : luts?.find((l) => l.id === lutId)?.cube.length ?? 0
  const key = `${lutId}|${asset}|${amount}|${src.length}|${src.slice(-64)}|${src.slice(0, 64)}`
  let p = lutCanvasCache.get(key)
  if (!p) {
    p = (async () => {
      const img = await loadImage(src)
      const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(img.naturalWidth * k))
      c.height = Math.max(1, Math.round(img.naturalHeight * k))
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0, c.width, c.height)
      const lut = resolveLut(lutId, luts)
      if (lut) {
        const id = ctx.getImageData(0, 0, c.width, c.height)
        applyLut(id.data, lut, amount)
        ctx.putImageData(id, 0, 0)
      }
      return c
    })()
    lutCanvasCache.set(key, p)
    if (lutCanvasCache.size > 24) lutCanvasCache.delete(lutCanvasCache.keys().next().value as string)
  }
  return p
}

const urlCache = new Map<HTMLCanvasElement, string>()
export async function lutObjectUrl(src: string, lutId: string, amount: number, luts: LutAsset[] | undefined): Promise<string> {
  const c = await lutCanvas(src, lutId, amount, luts)
  let u = urlCache.get(c)
  if (!u) {
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'))
    u = blob ? URL.createObjectURL(blob) : c.toDataURL('image/png')
    urlCache.set(c, u)
  }
  return u
}
