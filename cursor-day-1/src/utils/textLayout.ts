import type { TextElement } from '../types/document'

/** Compute font size when auto-fit is enabled (shrink to fit box width/height). */
export function effectiveFontSize(el: TextElement): number {
  if (!el.autoFit) return el.fontSize
  const lines = el.content.split('\n')
  const maxLineLen = Math.max(1, ...lines.map((l) => l.length))
  const lineCount = Math.max(1, lines.length)
  const para = el.paragraphSpacing ?? 0
  const lh = el.lineHeight
  const pad = 8
  const availW = Math.max(20, el.width - pad)
  const availH = Math.max(20, el.height - pad)
  let size = el.fontSize
  const avgChar = 0.55
  for (let i = 0; i < 24; i++) {
    const textW = maxLineLen * size * avgChar + (el.letterSpacing ?? 0) * maxLineLen
    const textH = lineCount * size * lh + Math.max(0, lineCount - 1) * para
    if (textW <= availW && textH <= availH) break
    size = Math.max(8, size * 0.92)
  }
  return Math.round(size * 10) / 10
}

export function resolveVariables(content: string, vars: Record<string, string>): string {
  return content.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`)
}
