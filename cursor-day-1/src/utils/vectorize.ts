import { newId, type SvgPathPart } from '../types/document'

/** Simple raster-to-vector: threshold edges → SVG path rectangles (logo-style). */
export async function vectorizeImage(src: string, maxSize = 128): Promise<{ paths: SvgPathPart[]; viewBox: string }> {
  const img = await loadImage(src)
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(8, Math.round(img.naturalWidth * scale))
  const h = Math.max(8, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const paths: SvgPathPart[] = []
  const step = 2
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      if (lum < 200) {
        const hex = `#${[data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`
        paths.push({
          id: newId(),
          d: `M${x} ${y}h${step}v${step}h-${step}z`,
          fill: hex,
        })
      }
    }
  }
  return { paths, viewBox: `0 0 ${w} ${h}` }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
