import polygonClipping from 'polygon-clipping'
import type { El, VectorEl, VPart } from './types'
import { shapePath, uid } from './geometry'
import { applyM, flatten, mul, parsePathD, transformCmds, type Matrix } from './pathops'
import { partMatrixToBox, partToPathD } from './vector'

export type BoolOp = 'union' | 'subtract' | 'intersect' | 'exclude'

type Pt = [number, number]
type Ring = Pt[]
type MultiPoly = Ring[][] // polygon-clipping format: [polygon[ring[pt]]]

/** local box coords -> page coords (flip about centre, rotate, translate) */
function boxToWorld(el: El): Matrix {
  const fx = el.flipX ? -1 : 1
  const fy = el.flipY ? -1 : 1
  const a = (el.rotation * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  const toCenter: Matrix = [1, 0, 0, 1, -el.w / 2, -el.h / 2]
  const flip: Matrix = [fx, 0, 0, fy, 0, 0]
  const rot: Matrix = [c, s, -s, c, 0, 0]
  const back: Matrix = [1, 0, 0, 1, el.x + el.w / 2, el.y + el.h / 2]
  return mul(mul(mul(toCenter, flip), rot), back)
}

function ringsToGeom(subs: Ring[]): MultiPoly {
  // sub-paths of one element follow even-odd semantics -> xor them
  let acc: MultiPoly | null = null
  for (const r of subs) {
    if (r.length < 3) continue
    const g: MultiPoly = [[r]]
    acc = acc ? (polygonClipping.xor(acc as never, g as never) as MultiPoly) : g
  }
  return acc ?? []
}

function geometryOf(el: El): MultiPoly | null {
  const m = boxToWorld(el)
  if (el.type === 'shape') {
    if (el.shape === 'line') return null
    const cmds = transformCmds(parsePathD(shapePath(el)), m)
    return ringsToGeom(flatten(cmds, 0.5) as Ring[])
  }
  if (el.type === 'vector') {
    let acc: MultiPoly = []
    for (const p of el.parts) {
      if (p.hidden || p.fill === 'none') continue
      const d = partToPathD(p)
      if (!d) continue
      const pm = mul(partMatrixToBox(el, p), m)
      const g = ringsToGeom(flatten(transformCmds(parsePathD(d), pm), 0.5) as Ring[])
      acc = acc.length ? (polygonClipping.union(acc as never, g as never) as MultiPoly) : g
    }
    return acc.length ? acc : null
  }
  return null
}

const ringD = (r: Ring) => r.map((p, i) => `${i ? 'L' : 'M'}${Math.round(p[0] * 100) / 100} ${Math.round(p[1] * 100) / 100}`).join('') + 'Z'

export function booleanOp(els: El[], op: BoolOp): VectorEl {
  if (els.length < 2) throw new Error('Select at least two shapes')
  const geoms = els.map((e) => geometryOf(e))
  if (geoms.some((g) => !g)) throw new Error('Boolean operations work on shapes and vectors (not text, images or lines)')
  const [first, ...rest] = geoms as MultiPoly[]
  let res: MultiPoly
  if (op === 'union') res = polygonClipping.union(first as never, ...(rest as never[])) as MultiPoly
  else if (op === 'subtract') res = polygonClipping.difference(first as never, ...(rest as never[])) as MultiPoly
  else if (op === 'intersect') res = polygonClipping.intersection(first as never, ...(rest as never[])) as MultiPoly
  else res = polygonClipping.xor(first as never, ...(rest as never[])) as MultiPoly
  if (!res.length) throw new Error('The result is empty (the shapes do not overlap)')
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let d = ''
  for (const poly of res)
    for (const ring of poly) {
      for (const p of ring) {
        minX = Math.min(minX, p[0])
        minY = Math.min(minY, p[1])
        maxX = Math.max(maxX, p[0])
        maxY = Math.max(maxY, p[1])
      }
      d += ringD(ring.slice(0, ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? -1 : undefined))
    }
  const w = Math.max(1, maxX - minX)
  const h = Math.max(1, maxY - minY)
  const base = els[0]
  let fill = '#6d5efc'
  let stroke = 'none'
  let strokeWidth = 0
  if (base.type === 'shape') {
    fill = base.fillMode === 'none' ? 'none' : base.fillMode === 'gradient' ? base.gradient.c1 : base.fill
    if (base.strokeWidth > 0) {
      stroke = base.stroke
      strokeWidth = base.strokeWidth
    }
  } else if (base.type === 'vector') {
    const p = base.parts.find((q) => q.fill !== 'none' && !q.fill.startsWith('url'))
    if (p) fill = p.fill
  }
  const part: VPart = {
    id: uid('part'),
    name: 'Combined path',
    tag: 'path',
    geom: { d },
    fill,
    stroke,
    strokeWidth,
    opacity: 1,
    fillRule: 'evenodd',
  }
  return {
    id: uid('el'),
    type: 'vector',
    name: { union: 'Union', subtract: 'Subtract', intersect: 'Intersect', exclude: 'Exclude' }[op],
    x: minX,
    y: minY,
    w,
    h,
    rotation: 0,
    opacity: 1,
    blend: 'normal',
    hidden: false,
    locked: false,
    flipX: false,
    flipY: false,
    viewBox: [minX, minY, w, h],
    defs: '',
    parts: [part],
  }
}

export { applyM }
