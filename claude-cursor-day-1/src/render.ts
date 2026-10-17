import type { Doc, El, ImageEl, LutAsset, Page, ShapeEl, TextEl, VectorEl } from './types'
import {
  applyVariables,
  cssFilter,
  elBounds,
  gradientLine,
  imageRect,
  maskPath,
  rad,
  shapePath,
  unionBounds,
} from './geometry'
import { effectiveDir, fitFontSize, fontMetrics, fontString, layoutText } from './textLayout'
import { loadImage } from './imageCache'
import { lutCanvas } from './lut'
import { vectorDataUrl } from './vector'

export { loadImage }

/** the image an element should show: a bound variable value wins over its own src */
export function resolveImageSrc(el: ImageEl, vars: Record<string, string>): string | null {
  if (el.variable && vars[el.variable]) return vars[el.variable]
  return el.src
}

export interface RenderOptions {
  scale: number
  includeBleed: boolean
  onlyIds?: string[] // export only these elements, cropped to their bounds
  transparent?: boolean
}

function blendOp(b: string): GlobalCompositeOperation {
  return (b === 'normal' ? 'source-over' : b) as GlobalCompositeOperation
}

function drawShape(ctx: CanvasRenderingContext2D, el: ShapeEl) {
  const path = new Path2D(shapePath(el))
  if (el.fillMode === 'solid') {
    ctx.fillStyle = el.fill
    ctx.fill(path)
  } else if (el.fillMode === 'gradient') {
    const g = gradientLine(el.w, el.h, el.gradient.angle)
    const grad = ctx.createLinearGradient(g.x1, g.y1, g.x2, g.y2)
    grad.addColorStop(0, el.gradient.c1)
    grad.addColorStop(1, el.gradient.c2)
    ctx.fillStyle = grad
    ctx.fill(path)
  }
  if (el.strokeWidth > 0) {
    ctx.strokeStyle = el.stroke
    ctx.lineWidth = el.strokeWidth
    ctx.lineJoin = 'miter'
    ctx.stroke(path)
  }
}

function drawText(ctx: CanvasRenderingContext2D, el: TextEl, vars: Record<string, string>, scale: number) {
  const text = applyVariables(el.text, vars)
  if (el.bg) {
    ctx.fillStyle = el.bg
    ctx.fillRect(0, 0, el.w, el.h)
  }
  const size = fitFontSize(el, text)
  const layout = layoutText(text, el, size, el.w)
  const { ascent, descent } = fontMetrics(el, size)
  ctx.font = fontString(el, size)
  ;(ctx as any).letterSpacing = `${el.letterSpacing}px`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.direction = effectiveDir(el, text)
  ctx.fillStyle = el.color
  let y0 = 0
  if (el.valign === 'middle') y0 = (el.h - layout.height) / 2
  if (el.valign === 'bottom') y0 = el.h - layout.height
  if (el.shadow.on) {
    // canvas shadow offsets ignore the CTM, so rotate/scale them manually
    const a = rad(el.rotation)
    ctx.shadowColor = el.shadow.color
    ctx.shadowBlur = el.shadow.blur * scale
    ctx.shadowOffsetX = (el.shadow.x * Math.cos(a) - el.shadow.y * Math.sin(a)) * scale
    ctx.shadowOffsetY = (el.shadow.x * Math.sin(a) + el.shadow.y * Math.cos(a)) * scale
  }
  let y = y0
  layout.lines.forEach((line, i) => {
    if (i > 0 && line.paraStart) y += el.paragraphSpacing
    let x = 0
    if (el.align === 'center') x = (el.w - line.width) / 2
    if (el.align === 'right') x = el.w - line.width
    const baseline = y + (layout.lineHeightPx - (ascent + descent)) / 2 + ascent
    if (line.text) {
      ctx.fillText(line.text, x, baseline)
      if (el.strokeWidth > 0) {
        ctx.save()
        ctx.shadowColor = 'transparent'
        ctx.strokeStyle = el.strokeColor
        ctx.lineWidth = el.strokeWidth
        ctx.lineJoin = 'round'
        ctx.strokeText(line.text, x, baseline)
        ctx.restore()
      }
      if (el.underline) {
        ctx.fillRect(x, baseline + size * 0.1, line.width, Math.max(1, size / 18))
      }
    }
    y += layout.lineHeightPx
  })
}

async function drawImageEl(ctx: CanvasRenderingContext2D, el: ImageEl, vars: Record<string, string>, luts?: LutAsset[]) {
  const src = resolveImageSrc(el, vars)
  if (!src) return
  const img = await loadImage(src)
  ctx.save()
  const mp = maskPath(el.mask, el.w, el.h, el.radius)
  const clip = new Path2D()
  if (mp) clip.addPath(new Path2D(mp))
  else clip.rect(0, 0, el.w, el.h)
  ctx.clip(clip)
  const r = imageRect(el.variable || !el.nw ? { ...el, nw: img.naturalWidth, nh: img.naturalHeight } : el)
  const f = cssFilter(el)
  if (f !== 'none') ctx.filter = f
  let source: CanvasImageSource = img
  if (el.lut) source = await lutCanvas(src, el.lut, (el.lutAmount ?? 100) / 100, luts)
  ctx.drawImage(source, r.x, r.y, r.w, r.h)
  ctx.restore()
}

async function drawVectorEl(ctx: CanvasRenderingContext2D, el: VectorEl) {
  const img = await loadImage(vectorDataUrl(el))
  ctx.drawImage(img, 0, 0, el.w, el.h)
}

export async function drawElement(ctx: CanvasRenderingContext2D, el: El, vars: Record<string, string>, scale: number, luts?: LutAsset[]) {
  ctx.save()
  const cx = el.x + el.w / 2
  const cy = el.y + el.h / 2
  ctx.translate(cx, cy)
  ctx.rotate(rad(el.rotation))
  ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1)
  ctx.translate(-el.w / 2, -el.h / 2)
  ctx.globalAlpha = el.opacity
  ctx.globalCompositeOperation = blendOp(el.blend)
  if (el.type === 'shape') drawShape(ctx, el)
  else if (el.type === 'text') drawText(ctx, el, vars, scale)
  else if (el.type === 'vector') await drawVectorEl(ctx, el)
  else await drawImageEl(ctx, el, vars, luts)
  ctx.restore()
}

export async function ensureFonts(page: Page, vars: Record<string, string>) {
  if (!document.fonts) return
  const jobs: Promise<unknown>[] = []
  for (const e of page.elements) {
    if (e.type !== 'text') continue
    const text = applyVariables(e.text, vars)
    jobs.push(document.fonts.load(fontString(e, e.fontSize), text || 'A').catch(() => []))
  }
  await Promise.all(jobs)
  await document.fonts.ready
}

export async function renderPage(doc: Doc, page: Page, opts: RenderOptions): Promise<HTMLCanvasElement> {
  await ensureFonts(page, doc.variables)
  const b = opts.includeBleed ? doc.bleed : 0
  let area = { x: -b, y: -b, w: doc.width + 2 * b, h: doc.height + 2 * b }
  let elements = page.elements.filter((e) => !e.hidden)
  const selOnly = !!opts.onlyIds?.length
  if (selOnly) {
    elements = elements.filter((e) => opts.onlyIds!.includes(e.id))
    const u = unionBounds(elements)
    if (u) area = u
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(area.w * opts.scale))
  canvas.height = Math.max(1, Math.round(area.h * opts.scale))
  const ctx = canvas.getContext('2d')!
  ctx.scale(opts.scale, opts.scale)
  ctx.translate(-area.x, -area.y)
  ctx.save()
  ctx.beginPath()
  ctx.rect(area.x, area.y, area.w, area.h)
  ctx.clip()
  if (!selOnly && !opts.transparent) {
    ctx.fillStyle = page.background
    ctx.fillRect(area.x, area.y, area.w, area.h)
  }
  for (const el of elements) await drawElement(ctx, el, doc.variables, opts.scale, doc.luts)
  ctx.restore()
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), mime, quality),
  )
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function pageThumbnail(doc: Doc, page: Page, maxSide = 96): Promise<string> {
  const scale = maxSide / Math.max(doc.width, doc.height)
  const c = await renderPage(doc, page, { scale, includeBleed: false })
  return c.toDataURL('image/png')
}

export { elBounds }
