import type { CustomFont } from '../types/document'

const injected = new Set<string>()

export function injectCustomFont(font: CustomFont): void {
  if (injected.has(font.id)) return
  const style = document.createElement('style')
  style.textContent = `@font-face {
    font-family: ${JSON.stringify(font.family)};
    src: url(${JSON.stringify(font.dataUrl)});
  }`
  document.head.appendChild(style)
  injected.add(font.id)
}

export function injectAllCustomFonts(fonts: CustomFont[]): void {
  for (const f of fonts) injectCustomFont(f)
}

export function fontFamilyFromUpload(fileName: string): string {
  const base = fileName.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[^\w-]+/g, '-')
  return `Custom-${base || 'Font'}-${crypto.randomUUID().slice(0, 6)}`
}
