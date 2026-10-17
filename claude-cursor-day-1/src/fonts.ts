import type { CustomFont } from './types'
import { BUNDLED_FONTS } from './fontsBundle'

export const SYSTEM_FONTS: { label: string; css: string }[] = [
  { label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet MS', css: '"Trebuchet MS", sans-serif' },
  { label: 'Tahoma', css: 'Tahoma, sans-serif' },
  { label: 'Georgia', css: 'Georgia, serif' },
  { label: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { label: 'Palatino', css: '"Palatino Linotype", Palatino, serif' },
  { label: 'Courier New', css: '"Courier New", monospace' },
  { label: 'Impact', css: 'Impact, Charcoal, sans-serif' },
  { label: 'Comic Sans MS', css: '"Comic Sans MS", cursive' },
  { label: 'System UI', css: 'system-ui, sans-serif' },
  { label: 'Serif', css: 'serif' },
  { label: 'Monospace', css: 'monospace' },
]

export const BUILTIN_FONTS: { label: string; css: string; bundled?: boolean }[] = [
  ...BUNDLED_FONTS.map((b) => ({ label: b.label + ' (bundled)', css: b.css, bundled: true })),
  ...SYSTEM_FONTS,
]

/** first family name of a css font stack, unquoted */
export function primaryFamily(css: string): string {
  const m = css.match(/^\s*(?:"([^"]+)"|'([^']+)'|([^,]+))/)
  return (m?.[1] || m?.[2] || m?.[3] || css).trim()
}

export function fontLabel(css: string, custom: CustomFont[] = []): string {
  const fam = primaryFamily(css)
  if (custom.some((c) => c.family === fam)) return fam + ' (custom)'
  return BUILTIN_FONTS.find((b) => b.css === css)?.label ?? fam
}

export const FONT_WEIGHTS = [
  { v: 100, l: 'Thin' },
  { v: 300, l: 'Light' },
  { v: 400, l: 'Regular' },
  { v: 500, l: 'Medium' },
  { v: 600, l: 'Semibold' },
  { v: 700, l: 'Bold' },
  { v: 800, l: 'Extra bold' },
  { v: 900, l: 'Black' },
]

const registered = new Set<string>()

export async function registerFont(f: CustomFont): Promise<void> {
  if (registered.has(f.family)) return
  try {
    const face = new FontFace(f.family, `url(${f.dataUrl})`)
    await face.load()
    document.fonts.add(face)
    registered.add(f.family)
  } catch (e) {
    console.warn('Could not load font', f.family, e)
  }
}

export async function registerFonts(fonts: CustomFont[]) {
  await Promise.all(fonts.map(registerFont))
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** Upload a TTF/OTF/WOFF/WOFF2 file and return a CustomFont. */
export async function fontFromFile(file: File): Promise<CustomFont> {
  const family = file.name.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/i, '').replace(/[^\w\- ]+/g, '').trim() || 'Custom font'
  let dataUrl = await fileToDataUrl(file)
  // make sure the mime type is something FontFace is happy with
  if (!dataUrl.startsWith('data:font') && !dataUrl.startsWith('data:application/font')) {
    dataUrl = dataUrl.replace(/^data:[^;,]*/, 'data:font/' + (file.name.split('.').pop() || 'ttf').toLowerCase())
  }
  const f = { family, dataUrl }
  await registerFont(f)
  return f
}
