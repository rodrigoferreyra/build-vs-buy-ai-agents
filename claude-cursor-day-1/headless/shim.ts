// Minimal browser surface for the shared renderer (src/render.ts, src/pdf.ts) on top of Skia via @napi-rs/canvas.
// Must be imported before anything from ../src.
import { createCanvas, loadImage, Path2D, GlobalFonts } from '@napi-rs/canvas'
import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const g = globalThis as Record<string, unknown>

export let baseDir = process.cwd()
export function setBaseDir(dir: string) {
  baseDir = dir
}

function dataUrlToBuffer(url: string): Buffer {
  const comma = url.indexOf(',')
  const meta = url.slice(5, comma)
  const body = url.slice(comma + 1)
  return /;base64/i.test(meta) ? Buffer.from(body, 'base64') : Buffer.from(decodeURIComponent(body), 'utf8')
}

export async function readUrl(src: string): Promise<Buffer> {
  if (src.startsWith('data:')) return dataUrlToBuffer(src)
  if (/^https?:/i.test(src)) {
    const r = await fetch(src)
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${src}`)
    return Buffer.from(await r.arrayBuffer())
  }
  if (src.startsWith('file:')) return readFile(fileURLToPath(src))
  return readFile(path.resolve(baseDir, src))
}

g.document = {
  createElement(tag: string) {
    if (tag === 'canvas') return createCanvas(300, 150)
    throw new Error(`headless: document.createElement('${tag}') is not available`)
  },
  body: { appendChild() {}, removeChild() {} },
  documentElement: {},
}
g.Path2D = Path2D
g.__canvaslyLoadImage = async (src: string) => {
  const img = await loadImage(await readUrl(src))
  return img
}
g.__canvaslyReadUrl = async (u: string) => new Uint8Array(await readUrl(u))

export function registerFontFile(fileUrl: string, family: string) {
  GlobalFonts.registerFromPath(fileUrl.startsWith('file:') ? fileURLToPath(fileUrl) : fileUrl, family)
}
export function registerFontData(dataUrl: string, family: string) {
  GlobalFonts.register(dataUrlToBuffer(dataUrl), family)
}
export { pathToFileURL }
