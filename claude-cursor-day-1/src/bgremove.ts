import { loadImage } from './imageCache'

/**
 * Client-side background removal WITHOUT a model: seeds from the image border, flood-fills pixels that
 * stay close to the sampled background colour(s) (allowing slow gradients), then feathers the edge.
 * Works well on product shots / logos on plain or softly shaded backgrounds; it is not a segmentation net.
 */
export interface BgOptions {
  tolerance: number // 4..120 (colour distance)
  feather: number // 0..4 px
  maxSide?: number
}

const dist = (d: Uint8ClampedArray, i: number, r: number, g: number, b: number) => {
  const dr = d[i] - r
  const dg = d[i + 1] - g
  const db = d[i + 2] - b
  return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11) * 1.8
}

export async function removeBackground(src: string, opts: BgOptions): Promise<{ src: string; nw: number; nh: number; removed: number }> {
  const img = await loadImage(src)
  const k = Math.min(1, (opts.maxSide ?? 2000) / Math.max(img.naturalWidth, img.naturalHeight))
  const W = Math.max(1, Math.round(img.naturalWidth * k))
  const H = Math.max(1, Math.round(img.naturalHeight * k))
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, W, H)
  const id = ctx.getImageData(0, 0, W, H)
  const d = id.data

  // reference colours: median of each corner patch (+ edge midpoints)
  const patch = (cx: number, cy: number) => {
    const rs: number[] = []
    const gs: number[] = []
    const bs: number[] = []
    for (let y = Math.max(0, cy - 3); y <= Math.min(H - 1, cy + 3); y++)
      for (let x = Math.max(0, cx - 3); x <= Math.min(W - 1, cx + 3); x++) {
        const i = (y * W + x) * 4
        rs.push(d[i])
        gs.push(d[i + 1])
        bs.push(d[i + 2])
      }
    const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1]
    return [med(rs), med(gs), med(bs)] as [number, number, number]
  }
  const refs = [patch(2, 2), patch(W - 3, 2), patch(2, H - 3), patch(W - 3, H - 3), patch(W >> 1, 2), patch(W >> 1, H - 3), patch(2, H >> 1), patch(W - 3, H >> 1)]
  const nearRef = (i: number) => {
    let m = Infinity
    for (const r of refs) m = Math.min(m, dist(d, i, r[0], r[1], r[2]))
    return m
  }
  const tol = opts.tolerance
  const bg = new Uint8Array(W * H) // 1 = background
  const stack: number[] = []
  const seed = (x: number, y: number) => {
    const p = y * W + x
    if (!bg[p] && nearRef(p * 4) <= tol) {
      bg[p] = 1
      stack.push(p)
    }
  }
  for (let x = 0; x < W; x++) {
    seed(x, 0)
    seed(x, H - 1)
  }
  for (let y = 0; y < H; y++) {
    seed(0, y)
    seed(W - 1, y)
  }
  const step = tol * 0.3
  while (stack.length) {
    const p = stack.pop()!
    const x = p % W
    const y = (p / W) | 0
    const i = p * 4
    const tryN = (nx: number, ny: number) => {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return
      const q = ny * W + nx
      if (bg[q]) return
      const j = q * 4
      const dn = dist(d, j, d[i], d[i + 1], d[i + 2])
      const dr = nearRef(j)
      if (dr <= tol || (dn <= step && dr <= tol * 2.4)) {
        bg[q] = 1
        stack.push(q)
      }
    }
    tryN(x + 1, y)
    tryN(x - 1, y)
    tryN(x, y + 1)
    tryN(x, y - 1)
  }

  // alpha mask, 1px erode of the foreground to drop halo, then feather (box blur)
  let alpha = new Float32Array(W * H)
  for (let p = 0; p < W * H; p++) alpha[p] = bg[p] ? 0 : 1
  const eroded = new Float32Array(alpha)
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x
      if (alpha[p] === 1 && (alpha[p - 1] === 0 || alpha[p + 1] === 0 || alpha[p - W] === 0 || alpha[p + W] === 0)) eroded[p] = 0.5
    }
  alpha = eroded
  const r = Math.round(opts.feather)
  if (r > 0) {
    const tmp = new Float32Array(W * H)
    for (let y = 0; y < H; y++) {
      let sum = 0
      for (let x = -r; x <= r; x++) sum += alpha[y * W + Math.min(W - 1, Math.max(0, x))]
      for (let x = 0; x < W; x++) {
        tmp[y * W + x] = sum / (2 * r + 1)
        sum += alpha[y * W + Math.min(W - 1, x + r + 1)] - alpha[y * W + Math.max(0, x - r)]
      }
    }
    for (let x = 0; x < W; x++) {
      let sum = 0
      for (let y = -r; y <= r; y++) sum += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]
      for (let y = 0; y < H; y++) {
        alpha[y * W + x] = sum / (2 * r + 1)
        sum += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]
      }
    }
  }
  let removed = 0
  for (let p = 0; p < W * H; p++) {
    d[p * 4 + 3] = Math.round(d[p * 4 + 3] * alpha[p])
    if (alpha[p] < 0.5) removed++
  }
  ctx.putImageData(id, 0, 0)
  return { src: c.toDataURL('image/png'), nw: W, nh: H, removed: removed / (W * H) }
}
