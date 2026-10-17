import type { ImageElement } from '../types/document'

export type FilterPreset = 'none' | 'grayscale' | 'sepia' | 'vintage' | 'cool' | 'warm'

export function imageFilterCss(el: ImageElement): string | undefined {
  const parts: string[] = []
  const b = el.brightness ?? 1
  const c = el.contrast ?? 1
  const s = el.saturation ?? 1
  if (b !== 1) parts.push(`brightness(${b})`)
  if (c !== 1) parts.push(`contrast(${c})`)
  if (s !== 1) parts.push(`saturate(${s})`)
  const exp = el.exposure ?? 0
  if (exp !== 0) parts.push(`brightness(${1 + exp * 0.3})`)
  const temp = el.temperature ?? 0
  if (temp !== 0) parts.push(`hue-rotate(${temp * 30}deg)`)

  const preset = el.filterPreset ?? 'none'
  if (preset === 'grayscale') parts.push('grayscale(1)')
  else if (preset === 'sepia') parts.push('sepia(0.85)')
  else if (preset === 'vintage') parts.push('sepia(0.4) contrast(1.1) saturate(0.85)')
  else if (preset === 'cool') parts.push('hue-rotate(15deg) saturate(1.1)')
  else if (preset === 'warm') parts.push('hue-rotate(-15deg) saturate(1.15)')

  return parts.length ? parts.join(' ') : undefined
}

export function applyCanvasFilter(ctx: CanvasRenderingContext2D, el: ImageElement): void {
  const css = imageFilterCss(el)
  if (css) ctx.filter = css
}
