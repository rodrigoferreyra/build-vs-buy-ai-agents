import type { ShapeElement } from '../types/document'

export function shapeFillCss(el: ShapeElement): string {
  if (el.fillKind === 'gradient') {
    return `linear-gradient(${el.gradientAngle}deg, ${el.fill}, ${el.gradientTo})`
  }
  return el.fill
}

export function applyShapeFill(
  ctx: CanvasRenderingContext2D,
  el: ShapeElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (el.fillKind === 'gradient') {
    const rad = ((el.gradientAngle - 90) * Math.PI) / 180
    const cx = x + w / 2
    const cy = y + h / 2
    const len = Math.sqrt(w * w + h * h) / 2
    const g = ctx.createLinearGradient(
      cx - Math.cos(rad) * len,
      cy - Math.sin(rad) * len,
      cx + Math.cos(rad) * len,
      cy + Math.sin(rad) * len,
    )
    g.addColorStop(0, el.fill)
    g.addColorStop(1, el.gradientTo)
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = el.fill
  }
}
