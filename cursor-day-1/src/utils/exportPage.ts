import { jsPDF } from 'jspdf'
import {
  pageSizePx,
  type DesignElement,
  type Page,
  type TextElement,
  type ShapeElement,
  type ImageElement,
} from '../types/document'
import { applyShapeFill } from './shapeStyle'

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'pdf'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement): void {
  ctx.save()
  ctx.globalAlpha = el.opacity
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate((el.rotation * Math.PI) / 180)
  ctx.translate(-el.width / 2, -el.height / 2)

  ctx.fillStyle = el.fill
  ctx.font = `${el.fontStyle} ${el.fontWeight} ${el.fontSize}px ${el.fontFamily}`
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

  const lines = el.content.split('\n')
  const lh = el.fontSize * el.lineHeight
  let y = 0
  for (const line of lines) {
    let x = 0
    if (el.textAlign === 'center') x = el.width / 2
    if (el.textAlign === 'right') x = el.width
    ctx.fillText(line, x, y)
    y += lh
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

async function drawImageEl(ctx: CanvasRenderingContext2D, el: ImageElement): Promise<void> {
  const img = await loadImage(el.src)
  ctx.save()
  ctx.globalAlpha = el.opacity
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate((el.rotation * Math.PI) / 180)
  const sx = el.flipX ? -1 : 1
  const sy = el.flipY ? -1 : 1
  ctx.scale(sx, sy)
  ctx.translate(-el.width / 2, -el.height / 2)

  const sw = img.naturalWidth * el.cropW
  const sh = img.naturalHeight * el.cropH
  const sx0 = img.naturalWidth * el.cropX
  const sy0 = img.naturalHeight * el.cropY
  ctx.drawImage(img, sx0, sy0, sw, sh, 0, 0, el.width, el.height)
  ctx.restore()
}

async function drawElement(ctx: CanvasRenderingContext2D, el: DesignElement): Promise<void> {
  if (!el.visible) return
  switch (el.type) {
    case 'text':
      drawText(ctx, el)
      break
    case 'rect':
    case 'ellipse':
    case 'line':
    case 'star':
    case 'polygon':
      drawShape(ctx, el)
      break
    case 'image':
      await drawImageEl(ctx, el)
      break
  }
}

export async function renderPageToCanvas(page: Page, scale = 1): Promise<HTMLCanvasElement> {
  const { width, height } = pageSizePx(page)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = page.background
  ctx.fillRect(0, 0, width, height)

  for (const el of page.elements) {
    await drawElement(ctx, el)
  }
  return canvas
}

function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function exportPage(page: Page, format: ExportFormat, scale = 1): Promise<void> {
  const canvas = await renderPageToCanvas(page, scale)
  const base = page.name.replace(/\s+/g, '-').toLowerCase()

  if (format === 'pdf') {
    const { width, height } = pageSizePx(page)
    const w = width * scale
    const h = height * scale
    const img = canvas.toDataURL('image/jpeg', 0.92)
    const pdf = new jsPDF({
      orientation: w > h ? 'landscape' : 'portrait',
      unit: 'px',
      format: [w, h],
      hotfixes: ['px_scaling'],
    })
    pdf.addImage(img, 'JPEG', 0, 0, w, h)
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

/** @deprecated use exportPage */
export async function exportPagePng(page: Page, scale = 1): Promise<void> {
  return exportPage(page, 'png', scale)
}
