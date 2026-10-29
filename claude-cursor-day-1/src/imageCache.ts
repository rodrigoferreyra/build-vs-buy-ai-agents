const imgCache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imgCache.get(src)
  const hook = (globalThis as { __canvaslyLoadImage?: (src: string) => Promise<HTMLImageElement> }).__canvaslyLoadImage
  if (!p && hook) {
    p = hook(src)
    imgCache.set(src, p)
  }
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => {
        imgCache.delete(src)
        reject(new Error('Image failed to load'))
      }
      img.src = src
    })
    imgCache.set(src, p)
  }
  return p
}

/** natural size (cached sync after first load) */
const dims = new Map<string, { w: number; h: number }>()
export function knownDims(src: string) {
  return dims.get(src)
}
export async function imageDims(src: string) {
  const d = dims.get(src)
  if (d) return d
  const img = await loadImage(src)
  const r = { w: img.naturalWidth || 512, h: img.naturalHeight || 512 }
  dims.set(src, r)
  return r
}
