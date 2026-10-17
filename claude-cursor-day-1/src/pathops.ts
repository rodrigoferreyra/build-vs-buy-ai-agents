/** Tiny SVG path toolkit: parse to absolute M/L/C/Z, transform, flatten to polylines. */

export type Cmd = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['Z']
export type Matrix = [number, number, number, number, number, number]

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

/** a then b (apply b to the result of a) -> single matrix */
export function mul(a: Matrix, b: Matrix): Matrix {
  // result = b * a  (point p -> b(a(p)))
  return [
    b[0] * a[0] + b[2] * a[1],
    b[1] * a[0] + b[3] * a[1],
    b[0] * a[2] + b[2] * a[3],
    b[1] * a[2] + b[3] * a[3],
    b[0] * a[4] + b[2] * a[5] + b[4],
    b[1] * a[4] + b[3] * a[5] + b[5],
  ]
}

export function parseMatrix(s: string | null | undefined): Matrix {
  if (!s) return IDENTITY
  const m = s.match(/matrix\(([^)]+)\)/)
  if (!m) return IDENTITY
  const n = m[1].split(/[\s,]+/).map(Number)
  return n.length === 6 && n.every((x) => !Number.isNaN(x)) ? (n as Matrix) : IDENTITY
}

export const applyM = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

function arcToCubics(x1: number, y1: number, rx: number, ry: number, phiDeg: number, fa: number, fs: number, x2: number, y2: number): Cmd[] {
  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) return [['L', x2, y2]]
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  const phi = (phiDeg * Math.PI) / 180
  const cp = Math.cos(phi)
  const sp = Math.sin(phi)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const x1p = cp * dx + sp * dy
  const y1p = -sp * dx + cp * dy
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lam > 1) {
    const s = Math.sqrt(lam)
    rx *= s
    ry *= s
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
  let co = den === 0 ? 0 : Math.sqrt(Math.max(0, num / den))
  if (fa === fs) co = -co
  const cxp = (co * rx * y1p) / ry
  const cyp = (-co * ry * x1p) / rx
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2
  const cy = sp * cxp + cp * cyp + (y1 + y2) / 2
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    return a
  }
  const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
  if (!fs && dth > 0) dth -= 2 * Math.PI
  if (fs && dth < 0) dth += 2 * Math.PI
  const n = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9))
  const d = dth / n
  const t = (4 / 3) * Math.tan(d / 4)
  const out: Cmd[] = []
  let a = th1
  for (let i = 0; i < n; i++) {
    const b = a + d
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const cb = Math.cos(b)
    const sb = Math.sin(b)
    const pt = (px: number, py: number): [number, number] => [cp * rx * px - sp * ry * py + cx, sp * rx * px + cp * ry * py + cy]
    const p1 = pt(ca - t * sa, sa + t * ca)
    const p2 = pt(cb + t * sb, sb - t * cb)
    const p3 = i === n - 1 ? ([x2, y2] as [number, number]) : pt(cb, sb)
    out.push(['C', p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]])
    a = b
  }
  return out
}

export function parsePathD(d: string): Cmd[] {
  const out: Cmd[] = []
  let i = 0
  const n = d.length
  const isWs = (c: string) => c === ' ' || c === ',' || c === '\n' || c === '\t' || c === '\r'
  const skip = () => {
    while (i < n && isWs(d[i])) i++
  }
  const num = (): number => {
    skip()
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(d.slice(i, i + 40))
    if (!m) throw new Error('bad path number at ' + i)
    i += m[0].length
    return parseFloat(m[0])
  }
  const flag = (): number => {
    skip()
    const c = d[i++]
    return c === '1' ? 1 : 0
  }
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let lastCmd = ''
  let lcx = 0 // last control point (for S/T)
  let lcy = 0
  let cmd = ''
  const hasNum = () => {
    skip()
    return i < n && /[-+.\d]/.test(d[i])
  }
  while (true) {
    skip()
    if (i >= n) break
    if (/[A-Za-z]/.test(d[i])) cmd = d[i++]
    else if (!cmd) throw new Error('bad path')
    else if (cmd === 'M') cmd = 'L'
    else if (cmd === 'm') cmd = 'l'
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    const ox = rel ? cx : 0
    const oy = rel ? cy : 0
    switch (C) {
      case 'M': {
        cx = num() + ox
        cy = num() + oy
        sx = cx
        sy = cy
        out.push(['M', cx, cy])
        while (hasNum()) {
          cx = num() + (rel ? cx : 0)
          cy = num() + (rel ? cy : 0)
          out.push(['L', cx, cy])
        }
        break
      }
      case 'L':
        cx = num() + ox
        cy = num() + oy
        out.push(['L', cx, cy])
        break
      case 'H':
        cx = num() + ox
        out.push(['L', cx, cy])
        break
      case 'V':
        cy = num() + oy
        out.push(['L', cx, cy])
        break
      case 'C': {
        const x1 = num() + ox
        const y1 = num() + oy
        const x2 = num() + ox
        const y2 = num() + oy
        const x = num() + ox
        const y = num() + oy
        out.push(['C', x1, y1, x2, y2, x, y])
        lcx = x2
        lcy = y2
        cx = x
        cy = y
        break
      }
      case 'S': {
        const prevC = lastCmd === 'C' || lastCmd === 'S'
        const x1 = prevC ? 2 * cx - lcx : cx
        const y1 = prevC ? 2 * cy - lcy : cy
        const x2 = num() + ox
        const y2 = num() + oy
        const x = num() + ox
        const y = num() + oy
        out.push(['C', x1, y1, x2, y2, x, y])
        lcx = x2
        lcy = y2
        cx = x
        cy = y
        break
      }
      case 'Q': {
        const qx = num() + ox
        const qy = num() + oy
        const x = num() + ox
        const y = num() + oy
        out.push(['C', cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y])
        lcx = qx
        lcy = qy
        cx = x
        cy = y
        break
      }
      case 'T': {
        const prevQ = lastCmd === 'Q' || lastCmd === 'T'
        const qx = prevQ ? 2 * cx - lcx : cx
        const qy = prevQ ? 2 * cy - lcy : cy
        const x = num() + ox
        const y = num() + oy
        out.push(['C', cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y])
        lcx = qx
        lcy = qy
        cx = x
        cy = y
        break
      }
      case 'A': {
        const rx = num()
        const ry = num()
        const rot = num()
        const fa = flag()
        const fs = flag()
        const x = num() + ox
        const y = num() + oy
        out.push(...arcToCubics(cx, cy, rx, ry, rot, fa, fs, x, y))
        cx = x
        cy = y
        break
      }
      case 'Z':
        out.push(['Z'])
        cx = sx
        cy = sy
        break
      default:
        throw new Error('unsupported path command ' + cmd)
    }
    lastCmd = C
  }
  return out
}

export function transformCmds(cmds: Cmd[], m: Matrix): Cmd[] {
  return cmds.map((c) => {
    if (c[0] === 'Z') return c
    if (c[0] === 'C') {
      const a = applyM(m, c[1], c[2])
      const b = applyM(m, c[3], c[4])
      const e = applyM(m, c[5], c[6])
      return ['C', a[0], a[1], b[0], b[1], e[0], e[1]] as Cmd
    }
    const p = applyM(m, c[1], c[2])
    return [c[0], p[0], p[1]] as Cmd
  })
}

/** flatten to closed polylines (points per sub-path) */
export function flatten(cmds: Cmd[], step = 0.5): [number, number][][] {
  const subs: [number, number][][] = []
  let cur: [number, number][] = []
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  const flush = () => {
    if (cur.length > 2) subs.push(cur)
    cur = []
  }
  for (const c of cmds) {
    if (c[0] === 'M') {
      flush()
      x = sx = c[1]
      y = sy = c[2]
      cur = [[x, y]]
    } else if (c[0] === 'L') {
      x = c[1]
      y = c[2]
      cur.push([x, y])
    } else if (c[0] === 'C') {
      const len = Math.hypot(c[1] - x, c[2] - y) + Math.hypot(c[3] - c[1], c[4] - c[2]) + Math.hypot(c[5] - c[3], c[6] - c[4])
      const n = Math.max(4, Math.min(64, Math.ceil(len / (step * 4))))
      for (let k = 1; k <= n; k++) {
        const t = k / n
        const u = 1 - t
        cur.push([
          u * u * u * x + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t * t * t * c[5],
          u * u * u * y + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6],
        ])
      }
      x = c[5]
      y = c[6]
    } else {
      x = sx
      y = sy
      flush()
    }
  }
  flush()
  return subs
}
