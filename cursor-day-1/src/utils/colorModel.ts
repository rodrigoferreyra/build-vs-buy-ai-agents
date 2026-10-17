import type { CmykColor, ColorMode } from '../types/document'

export function cmykToRgb(c: CmykColor): string {
  const r = Math.round(255 * (1 - c.c / 100) * (1 - c.k / 100))
  const g = Math.round(255 * (1 - c.m / 100) * (1 - c.k / 100))
  const b = Math.round(255 * (1 - c.y / 100) * (1 - c.k / 100))
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

export interface ColorLike {
  fill: string
  colorMode?: ColorMode
  cmyk?: CmykColor
  spotName?: string
}

/** Resolve fill for screen rendering (RGB hex). */
export function resolveFillCss(el: ColorLike): string {
  if (el.colorMode === 'cmyk' && el.cmyk) return cmykToRgb(el.cmyk)
  if (el.colorMode === 'spot' && el.spotName) return el.fill
  return el.fill
}

export function colorExportNote(el: ColorLike): string | undefined {
  if (el.colorMode === 'cmyk' && el.cmyk) {
    const { c, m, y, k } = el.cmyk
    return `CMYK ${c}/${m}/${y}/${k}`
  }
  if (el.colorMode === 'spot' && el.spotName) return `Spot ${el.spotName}`
  return undefined
}
