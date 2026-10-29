import ImageTracer from 'imagetracerjs'
import { loadImage } from './imageCache'

export interface VectorizeOptions {
  colors: number
  /** 0 (loose, few nodes) … 100 (tight, many nodes) */
  detail: number
  /** drop the colour layer that touches most of the border (typical logo background) */
  dropBackground: boolean
  maxSide?: number
}

/** trace a raster image into SVG markup with one path per colour region */
export async function vectorizeImage(src: string, o: VectorizeOptions): Promise<{ svg: string; paths: number; ms: number }> {
  const t0 = performance.now()
  const img = await loadImage(src)
  const max = o.maxSide ?? 600
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * k))
  const h = Math.max(1, Math.round(img.naturalHeight * k))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h)
  const t = 1 - o.detail / 100
  const pal = kmeansPalette(data, o.colors)
  let svg: string = ImageTracer.imagedataToSVG(data, {
    pal,
    numberofcolors: pal.length,
    colorquantcycles: 1,
    ltres: 0.2 + t * 2.8,
    qtres: 0.2 + t * 2.8,
    pathomit: Math.round(2 + t * 14),
    blurradius: 0,
    strokewidth: 0,
    linefilter: true,
    roundcoords: 1,
    viewbox: true,
    desc: false,
  })
  if (o.dropBackground) svg = dropBorderColour(svg, data)
  svg = svg.replace(/<path[^>]*opacity="0"[^>]*\/>/g, '')
  const paths = (svg.match(/<path/g) ?? []).length
  return { svg, paths, ms: performance.now() - t0 }
}

type Rgba = { r: number; g: number; b: number; a: number }

/** k-means++ on a pixel sample; keeps flat logo colours exact instead of averaging them away */
function kmeansPalette(d: ImageData, k: number): Rgba[] {
  const px: number[][] = []
  const step = Math.max(1, Math.floor((d.width * d.height) / 20000))
  for (let i = 0; i < d.width * d.height; i += step) {
    const j = i * 4
    px.push(d.data[j + 3] < 128 ? [0, 0, 0, 0] : [d.data[j], d.data[j + 1], d.data[j + 2], 255])
  }
  const dist = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 + (a[3] - b[3]) ** 2
  const centres = [px[0]]
  while (centres.length < k) {
    let best = px[0]
    let bestD = -1
    for (const p of px) {
      const m = Math.min(...centres.map((c) => dist(p, c)))
      if (m > bestD) (bestD = m), (best = p)
    }
    if (bestD <= 0) break
    centres.push(best)
  }
  for (let it = 0; it < 8; it++) {
    const sums = centres.map(() => [0, 0, 0, 0, 0])
    for (const p of px) {
      let bi = 0
      let bd = Infinity
      centres.forEach((c, i) => {
        const dd = dist(p, c)
        if (dd < bd) (bd = dd), (bi = i)
      })
      const s = sums[bi]
      s[0] += p[0], s[1] += p[1], s[2] += p[2], s[3] += p[3], s[4]++
    }
    sums.forEach((s, i) => {
      if (s[4]) centres[i] = [s[0] / s[4], s[1] / s[4], s[2] / s[4], s[3] / s[4]]
    })
  }
  return centres.map(([r, g, b, a]) => ({ r: Math.round(r), g: Math.round(g), b: Math.round(b), a: Math.round(a) }))
}

function dropBorderColour(svg: string, d: ImageData): string {
  const { width: w, height: h, data } = d
  const counts = new Map<string, number>()
  const add = (x: number, y: number) => {
    const i = (y * w + x) * 4
    if (data[i + 3] < 128) return
    const key = `${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  for (let x = 0; x < w; x++) add(x, 0), add(x, h - 1)
  for (let y = 0; y < h; y++) add(0, y), add(w - 1, y)
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!best || best[1] < (w + h) * 0.8) return svg
  const [r, g, b] = best[0].split(',').map((n) => +n * 16 + 8)
  return svg.replace(/<path[^>]*fill="rgb\((\d+),(\d+),(\d+)\)"[^>]*\/>/g, (m, pr, pg, pb) =>
    Math.abs(+pr - r) + Math.abs(+pg - g) + Math.abs(+pb - b) < 60 ? '' : m,
  )
}
