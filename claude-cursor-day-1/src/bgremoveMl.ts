import { loadImage } from './imageCache'

/**
 * In-browser background removal with a salient-object segmentation network (U²-Net-p, Apache-2.0, 4.6 MB)
 * running on onnxruntime-web (WASM). Model and runtime are served from this app (/models, /ort); no image leaves the browser.
 */
const MODEL_URL = '/models/u2netp.onnx'
const SIZE = 320
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

type Ort = typeof import('onnxruntime-web/wasm')
let sessionP: Promise<{ ort: Ort; session: import('onnxruntime-web/wasm').InferenceSession }> | null = null

function getSession(onStatus?: (s: string) => void) {
  if (!sessionP) {
    sessionP = (async () => {
      onStatus?.('Loading segmentation model…')
      const ort = await import('onnxruntime-web/wasm')
      // dev servers refuse module imports from /public, so hand the runtime glue over as a blob URL
      const glue = await (await fetch('/ort/ort-wasm-simd-threaded.mjs')).text()
      const mjs = URL.createObjectURL(new Blob([glue], { type: 'text/javascript' }))
      ort.env.wasm.wasmPaths = { mjs, wasm: new URL('/ort/ort-wasm-simd-threaded.wasm', location.href).href }
      ort.env.wasm.numThreads = 1
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
      return { ort, session }
    })()
    sessionP.catch(() => (sessionP = null))
  }
  return sessionP
}

export interface MlBgOptions {
  /** 0..1: pushes soft edges towards hard (0 = raw network output) */
  hardness: number
  maxSide?: number
  onStatus?: (s: string) => void
}

export async function removeBackgroundMl(src: string, opts: MlBgOptions): Promise<{ src: string; nw: number; nh: number; removed: number; ms: number }> {
  const t0 = performance.now()
  const { ort, session } = await getSession(opts.onStatus)
  opts.onStatus?.('Segmenting…')
  const img = await loadImage(src)
  const k = Math.min(1, (opts.maxSide ?? 2500) / Math.max(img.naturalWidth, img.naturalHeight))
  const W = Math.max(1, Math.round(img.naturalWidth * k))
  const H = Math.max(1, Math.round(img.naturalHeight * k))

  // network input: 320×320, scaled by the max value, ImageNet normalisation, NCHW
  const small = document.createElement('canvas')
  small.width = SIZE
  small.height = SIZE
  const sctx = small.getContext('2d', { willReadFrequently: true })!
  sctx.drawImage(img, 0, 0, SIZE, SIZE)
  const px = sctx.getImageData(0, 0, SIZE, SIZE).data
  let max = 1
  for (let i = 0; i < px.length; i += 4) max = Math.max(max, px[i], px[i + 1], px[i + 2])
  const input = new Float32Array(3 * SIZE * SIZE)
  for (let p = 0; p < SIZE * SIZE; p++)
    for (let c = 0; c < 3; c++) input[c * SIZE * SIZE + p] = (px[p * 4 + c] / max - MEAN[c]) / STD[c]
  const feeds = { [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) }
  const out = await session.run(feeds)
  const pred = out[session.outputNames[0]].data as Float32Array
  let lo = Infinity
  let hi = -Infinity
  for (const v of pred) {
    lo = Math.min(lo, v)
    hi = Math.max(hi, v)
  }
  const range = hi - lo || 1

  // mask → alpha canvas, upscaled with smoothing to the image size
  const m = document.createElement('canvas')
  m.width = SIZE
  m.height = SIZE
  const mctx = m.getContext('2d')!
  const mid = mctx.createImageData(SIZE, SIZE)
  const hard = Math.max(0, Math.min(1, opts.hardness))
  for (let p = 0; p < SIZE * SIZE; p++) {
    let a = (pred[p] - lo) / range
    if (hard > 0) {
      const g = 1 + hard * 7
      a = 1 / (1 + Math.exp(-g * (a - 0.5) * 2))
    }
    mid.data[p * 4 + 3] = Math.round(a * 255)
  }
  mctx.putImageData(mid, 0, 0)

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(m, 0, 0, W, H)
  ctx.globalCompositeOperation = 'source-in'
  ctx.drawImage(img, 0, 0, W, H)
  ctx.globalCompositeOperation = 'source-over'
  const alpha = ctx.getImageData(0, 0, W, H).data
  let removed = 0
  for (let i = 3; i < alpha.length; i += 4) if (alpha[i] < 128) removed++
  return { src: c.toDataURL('image/png'), nw: W, nh: H, removed: removed / (W * H), ms: Math.round(performance.now() - t0) }
}
