import {
  pageSizePx,
  type DesignElement,
  type Page,
  type TextElement,
  type ShapeElement,
  type ImageElement,
} from '../types/document'

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
  const weight = el.fontWeight
  const style = el.fontStyle
  ctx.font = `${style} ${weight} ${el.fontSize}px ${el.fontFamily}`
  ctx.textAlign = el.textAlign
  ctx.textBaseline = 'top'

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

function drawShape(ctx: CanvasRenderingContext2D, el: ShapeElement): void {
  ctx.save()
  ctx.globalAlpha = el.opacity
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2)
  ctx.rotate((el.rotation * Math.PI) / 180)
  ctx.translate(-el.width / 2, -el.height / 2)

  ctx.fillStyle = el.fill
  ctx.strokeStyle = el.stroke
  ctx.lineWidth = el.strokeWidth

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
  } else {
    ctx.beginPath()
    ctx.ellipse(el.width / 2, el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2)
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

  const sorted = [...page.elements].sort((a, b) => {
    const ai = page.elements.indexOf(a)
    const bi = page.elements.indexOf(b)
    return ai - bi
  })

  for (const el of sorted) {
    await drawElement(ctx, el)
  }
  return canvas
}

export async function exportPagePng(page: Page, scale = 1): Promise<void> {
  const canvas = await renderPageToCanvas(page, scale)
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = `${page.name.replace(/\s+/g, '-').toLowerCase()}.png`
  a.click()
}
