import { jsPDF } from 'jspdf'
import {
  bleedPx,
  pageSizePx,
  type DesignElement,
  type Page,
  type TextElement,
  type ShapeElement,
  type ImageElement,
  type PathElement,
  type DocumentModel,
} from '../types/document'
import { applyShapeFill } from './shapeStyle'
import { applyCanvasFilter } from './imageFilters'
import { effectiveFontSize, resolveVariables } from './textLayout'
import { resolveFillCss } from './colorModel'
import { downloadVectorPdf } from './exportPdfVector'

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'pdf'

export interface ExportOptions {
  format: ExportFormat
  /** Screen pixels per inch multiplier (96 base). 300 DPI → scale 300/96 */
  dpi?: number
  includeBleed?: boolean
  cropMarks?: boolean
  /** Vector text + embedded fonts (pdf-lib) */
  vectorPdf?: boolean
  /** PDF/X-4 best-effort metadata */
  pdfX?: boolean
  /** Render only these element ids (page coords). */
  selectionIds?: string[]
  templateVariables?: Record<string, string>
  transparentBackground?: boolean
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

function blendToComposite(mode: DesignElement['blendMode']): GlobalCompositeOperation {
  if (!mode || mode === 'normal') return 'source-over'
  return mode as GlobalCompositeOperation
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement, vars: Record<string, string>): void {
  ctx.save()
  ctx.globalAlpha = el.opacity
  ctx.globalCompositeOperation = blendToComposite(el.blendMode)
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate((el.rotation * Math.PI) / 180)
  ctx.translate(-el.width / 2, -el.height / 2)

  const content = resolveVariables(el.content, vars)
  const fontSize = effectiveFontSize({ ...el, content })
  const lh = fontSize * el.lineHeight
  const para = el.paragraphSpacing ?? 0
  const lines = content.split('\n')
  const blockH = lines.length * lh + Math.max(0, lines.length - 1) * para
  let yOff = 0
  const vAlign = el.verticalAlign ?? 'top'
  if (vAlign === 'middle') yOff = (el.height - blockH) / 2
  if (vAlign === 'bottom') yOff = el.height - blockH

  if (el.textBackground) {
    ctx.fillStyle = el.textBackground
    ctx.fillRect(0, yOff, el.width, blockH)
  }

  ctx.fillStyle = resolveFillCss(el)
  ctx.font = `${el.fontStyle} ${el.fontWeight} ${fontSize}px ${el.fontFamily}`
  ctx.textAlign = el.textAlign
  ctx.textBaseline = 'top'
  ctx.direction = el.direction ?? 'ltr'

  if (el.textShadow) {
    const parts = el.textShadow.match(/([\d.]+)px\s+([\d.]+)px\s+([\d.]+)px\s+(.+)/)
    if (parts) {
      ctx.shadowOffsetX = parseFloat(parts[1])
      ctx.shadowOffsetY = parseFloat(parts[2])
      ctx.shadowBlur = parseFloat(parts[3])
      ctx.shadowColor = parts[4]
    }
  }

  if (el.textPath === 'arc') {
    const r = el.pathRadius ?? Math.min(el.width, el.height) / 2
    const sweep = ((el.pathSweep ?? 180) * Math.PI) / 180
    const cx = el.width / 2
    const cy = el.height / 2
    const text = lines.join(' ')
    const chars = text.split('')
    const arcLen = r * sweep
    const charW = arcLen / Math.max(1, chars.length)
    let angle = -Math.PI / 2 - sweep / 2
    for (const ch of chars) {
      const a = angle + charW / r / 2
      const px = cx + Math.cos(a) * r
      const py = cy + Math.sin(a) * r
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(a + Math.PI / 2)
      ctx.fillText(ch, 0, 0)
      ctx.restore()
      angle += charW / r
    }
  } else {
    let y = yOff
    for (const line of lines) {
      let x = 0
      if (el.textAlign === 'center') x = el.width / 2
      if (el.textAlign === 'right') x = el.width
      ctx.fillText(line, x, y)
      y += lh + para
    }
  }
  ctx.restore()
}

function drawPath(ctx: CanvasRenderingContext2D, el: PathElement): void {
  ctx.save()
  ctx.globalAlpha = el.opacity
  ctx.globalCompositeOperation = blendToComposite(el.blendMode)
  if (el.rotation) {
    ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
    ctx.rotate((el.rotation * Math.PI) / 180)
    ctx.translate(-(el.x + el.width / 2), -(el.y + el.height / 2))
  }
  const path = new Path2D(el.d)
  ctx.fillStyle = resolveFillCss(el)
  ctx.fill(path)
  if (el.strokeWidth > 0) {
    ctx.strokeStyle = el.stroke
    ctx.lineWidth = el.strokeWidth
    ctx.stroke(path)
  }
  ctx.restore()
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number, points: number): void {
  const step = Math.PI / points
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + i * step
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function polygonPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number): void {
  ctx.beginPath()
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function drawShape(ctx: CanvasRenderingContext2D, el: ShapeElement): void {
  ctx.save()
  ctx.globalAlpha = el.opacity
  ctx.globalCompositeOperation = blendToComposite(el.blendMode)
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate((el.rotation * Math.PI) / 180)
  ctx.translate(-el.width / 2, -el.height / 2)

  ctx.strokeStyle = el.stroke
  ctx.lineWidth = el.strokeWidth

  if (el.type === 'line') {
    ctx.beginPath()
    ctx.moveTo(0, el.height / 2)
    ctx.lineTo(el.width, el.height / 2)
    ctx.strokeStyle = el.stroke
    ctx.lineWidth = el.strokeWidth
    ctx.stroke()
    ctx.restore()
    return
  }

  applyShapeFill(ctx, el, 0, 0, el.width, el.height)

  if (el.type === 'rect') {
    const r = Math.min(el.cornerRadius, el.width / 2, el.height / 2)
    if (r > 0) {
      ctx.beginPath()
      ctx.roundRect(0, 0, el.width, el.height, r)
      ctx.fill()
      if (el.strokeWidth > 0) ctx.stroke()
    } else {
      ctx.fillRect(0, 0, el.width, el.height)
      if (el.strokeWidth > 0) ctx.strokeRect(0, 0, el.width, el.height)
    }
  } else if (el.type === 'ellipse') {
    ctx.beginPath()
    ctx.ellipse(el.width / 2, el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    if (el.strokeWidth > 0) ctx.stroke()
  } else if (el.type === 'star') {
    starPath(ctx, el.width / 2, el.height / 2, el.width / 2, el.width / 4, el.starPoints)
    ctx.fill()
    if (el.strokeWidth > 0) ctx.stroke()
  } else if (el.type === 'polygon') {
    polygonPath(ctx, el.width / 2, el.height / 2, Math.min(el.width, el.height) / 2, el.polygonSides)
    ctx.fill()
    if (el.strokeWidth > 0) ctx.stroke()
  }
  ctx.restore()
}

function applyImageMask(ctx: CanvasRenderingContext2D, el: ImageElement, w: number, h: number): void {
  const mask = el.maskShape ?? 'none'
  if (mask === 'none') return
  ctx.beginPath()
  if (mask === 'circle' || mask === 'ellipse') {
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  } else {
    ctx.rect(0, 0, w, h)
  }
  ctx.clip()
}

async function drawVectorImage(ctx: CanvasRenderingContext2D, el: ImageElement): Promise<void> {
  if (!el.vectorPaths?.length) return
  ctx.save()
  ctx.globalAlpha = el.opacity
  ctx.globalCompositeOperation = blendToComposite(el.blendMode)
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate((el.rotation * Math.PI) / 180)
  ctx.translate(-el.width / 2, -el.height / 2)
  const vb = el.vectorViewBox?.split(/\s+/).map(Number) ?? [0, 0, 100, 100]
  const sx = el.width / (vb[2] || 100)
  const sy = el.height / (vb[3] || 100)
  ctx.scale(sx, sy)
  ctx.translate(-vb[0], -vb[1])
  for (const p of el.vectorPaths) {
    const path = new Path2D(p.d)
    ctx.fillStyle = p.fill
    ctx.fill(path)
  }
  ctx.restore()
}

async function drawImageEl(ctx: CanvasRenderingContext2D, el: ImageElement): Promise<void> {
  if (el.vectorPaths?.length) {
    await drawVectorImage(ctx, el)
    return
  }
  if (el.isPlaceholder && !el.src) {
    ctx.save()
    ctx.globalAlpha = el.opacity
    ctx.strokeStyle = '#94a3b8'
    ctx.setLineDash([8, 6])
    ctx.strokeRect(el.x, el.y, el.width, el.height)
    ctx.restore()
    return
  }
  const img = await loadImage(el.src)
  ctx.save()
  ctx.globalAlpha = el.opacity
  ctx.globalCompositeOperation = blendToComposite(el.blendMode)
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate((el.rotation * Math.PI) / 180)
  const sx = el.flipX ? -1 : 1
  const sy = el.flipY ? -1 : 1
  ctx.scale(sx, sy)
  ctx.translate(-el.width / 2, -el.height / 2)
  applyImageMask(ctx, el, el.width, el.height)
  applyCanvasFilter(ctx, el)

  const sw = img.naturalWidth * el.cropW
  const sh = img.naturalHeight * el.cropH
  const sx0 = img.naturalWidth * el.cropX
  const sy0 = img.naturalHeight * el.cropY
  ctx.drawImage(img, sx0, sy0, sw, sh, 0, 0, el.width, el.height)
  ctx.restore()
}

async function drawElement(ctx: CanvasRenderingContext2D, el: DesignElement, vars: Record<string, string>): Promise<void> {
  if (!el.visible) return
  switch (el.type) {
    case 'text':
      drawText(ctx, el, vars)
      break
    case 'rect':
    case 'ellipse':
    case 'line':
    case 'star':
    case 'polygon':
      drawShape(ctx, el)
      break
    case 'path':
      drawPath(ctx, el)
      break
    case 'image':
      await drawImageEl(ctx, el)
      break
  }
}

export async function renderPageToCanvas(
  page: Page,
  scale = 1,
  opts: {
    includeBleed?: boolean
    cropMarks?: boolean
    selectionIds?: string[]
    templateVariables?: Record<string, string>
    transparentBackground?: boolean
  } = {},
): Promise<HTMLCanvasElement> {
  const { width, height } = pageSizePx(page)
  const bleed = opts.includeBleed ? bleedPx(page) : 0
  const canvas = document.createElement('canvas')
  canvas.width = Math.round((width + bleed * 2) * scale)
  canvas.height = Math.round((height + bleed * 2) * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.translate(bleed, bleed)
  if (!opts.transparentBackground) {
    ctx.fillStyle = page.background
    ctx.fillRect(0, 0, width, height)
  }

  if (bleed > 0) {
    ctx.save()
    ctx.strokeStyle = '#ef4444'
    ctx.setLineDash([4, 4])
    ctx.strokeRect(0, 0, width, height)
    ctx.restore()
  }
  if (opts.cropMarks) {
    drawCropMarks(ctx, 0, 0, width, height, 18)
  }

  const vars = opts.templateVariables ?? {}
  let elements = page.elements
  if (opts.selectionIds?.length) {
    elements = elements.filter((e) => opts.selectionIds!.includes(e.id))
  }

  for (const el of elements) {
    await drawElement(ctx, el, vars)
  }
  return canvas
}

function drawCropMarks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  len: number,
): void {
  ctx.save()
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 1
  ctx.setLineDash([])
  const corners: [number, number, number, number][] = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ]
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath()
    ctx.moveTo(cx, cy + sy * len)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx + sx * len, cy)
    ctx.stroke()
  }
  ctx.restore()
}

function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function dpiToScale(dpi: number): number {
  return dpi / 96
}

export async function exportPage(page: Page, options: ExportOptions): Promise<void> {
  const scale = dpiToScale(options.dpi ?? 96)
  const canvas = await renderPageToCanvas(page, scale, {
    includeBleed: options.includeBleed,
    cropMarks: options.cropMarks,
    selectionIds: options.selectionIds,
    templateVariables: options.templateVariables,
  })
  const base = page.name.replace(/\s+/g, '-').toLowerCase()
  const format = options.format

  if (format === 'pdf' && options.vectorPdf) {
    await downloadVectorPdf(
      { id: 'export', name: page.name, pages: [page], activePageIndex: 0, customFonts: [] },
      [0],
      {
        dpi: options.dpi,
        includeBleed: options.includeBleed,
        cropMarks: options.cropMarks,
        pdfX: options.pdfX,
        selectionIds: options.selectionIds,
        templateVariables: options.templateVariables,
      },
      `${base}.pdf`,
    )
    return
  }

  if (format === 'pdf') {
    const { width, height } = pageSizePx(page)
    const bleed = options.includeBleed ? bleedPx(page) : 0
    const w = (width + bleed * 2) * scale
    const h = (height + bleed * 2) * scale
    const img = canvas.toDataURL('image/jpeg', 0.92)
    const pdf = new jsPDF({
      orientation: w > h ? 'landscape' : 'portrait',
      unit: 'px',
      format: [w, h],
      hotfixes: ['px_scaling'],
    })
    pdf.addImage(img, 'JPEG', 0, 0, w, h)
    if (options.dpi && options.dpi > 96) {
      pdf.setProperties({ title: page.name, subject: `Exported at ${options.dpi} DPI equivalent` })
    }
    pdf.save(`${base}.pdf`)
    return
  }

  const mime =
    format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
  const quality = format === 'png' ? undefined : 0.92
  canvas.toBlob(
    (blob) => {
      if (blob) downloadBlob(blob, `${base}.${format === 'jpeg' ? 'jpg' : format}`)
    },
    mime,
    quality,
  )
}

/** Export multiple pages or merge to multi-page PDF */
export async function exportPages(doc: DocumentModel, pageIndices: number[], options: ExportOptions): Promise<void> {
  if (pageIndices.length === 1 && options.format !== 'pdf') {
    const page = doc.pages[pageIndices[0]]
    return exportPage(page, options)
  }
  if (options.format === 'pdf' && options.vectorPdf) {
    await downloadVectorPdf(doc, pageIndices, {
      dpi: options.dpi,
      includeBleed: options.includeBleed,
      cropMarks: options.cropMarks,
      pdfX: options.pdfX,
      selectionIds: options.selectionIds,
      templateVariables: options.templateVariables ?? doc.templateVariables,
    }, `${doc.name.replace(/\s+/g, '-').toLowerCase()}-export.pdf`)
    return
  }

  if (options.format === 'pdf') {
    const scale = dpiToScale(options.dpi ?? 96)
    let pdf: jsPDF | null = null
    for (const idx of pageIndices) {
      const page = doc.pages[idx]
      const canvas = await renderPageToCanvas(page, scale, {
        includeBleed: options.includeBleed,
        cropMarks: options.cropMarks,
        selectionIds: options.selectionIds,
        templateVariables: options.templateVariables ?? doc.templateVariables,
      })
      const { width, height } = pageSizePx(page)
      const bleed = options.includeBleed ? bleedPx(page) : 0
      const w = (width + bleed * 2) * scale
      const h = (height + bleed * 2) * scale
      const img = canvas.toDataURL('image/jpeg', 0.92)
      if (!pdf) {
        pdf = new jsPDF({
          orientation: w > h ? 'landscape' : 'portrait',
          unit: 'px',
          format: [w, h],
          hotfixes: ['px_scaling'],
        })
      } else {
        pdf.addPage([w, h], w > h ? 'landscape' : 'portrait')
      }
      pdf.addImage(img, 'JPEG', 0, 0, w, h)
    }
    pdf!.save(`${doc.name.replace(/\s+/g, '-').toLowerCase()}-export.pdf`)
    return
  }
  for (const idx of pageIndices) {
    await exportPage(doc.pages[idx], options)
  }
}

/** @deprecated use exportPage with options */
export async function exportPageLegacy(page: Page, format: ExportFormat, scale = 1): Promise<void> {
  return exportPage(page, { format, dpi: scale * 96 })
}
