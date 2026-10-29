import { baseDir, readUrl, registerFontData, registerFontFile, setBaseDir } from './shim'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { renderPage } from '../src/render'
import { buildPdf } from '../src/pdf'
import { parseData } from '../src/data'
import { BUNDLED_FONTS } from '../src/fontsBundle'
import type { Doc, Page } from '../src/types'

const HELP = `canvasly-render – render Canvasly designs without a browser or UI

Usage:
  canvasly-render <design.json> [options]

Options:
  --data <file.csv|file.json>  batch: one output per data row (columns fill {variables} and image variables)
  --format png|jpeg|webp|pdf   output format (default png)
  --dpi <n>                    resolution (default 96 = 1 px per design px; 300 for print)
  --out <dir>                  output directory (default ./out)
  --pages all|<n>              which pages (default all)
  --pdfx                       PDF/X-4 (with --format pdf)
  --one-pdf                    batch + pdf: one multi-page PDF instead of one file per row
  --quiet                      no per-file log
`

function args(argv: string[]) {
  const o: Record<string, string | boolean> = {}
  const pos: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--') && !['pdfx', 'one-pdf', 'quiet', 'help'].includes(k)) {
        o[k] = next
        i++
      } else o[k] = true
    } else pos.push(a)
  }
  return { o, pos }
}

const slug = (s: string) => s.replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32)

async function main() {
  const { o, pos } = args(process.argv.slice(2))
  if (o.help || !pos[0]) {
    console.log(HELP)
    process.exit(pos[0] ? 0 : 1)
  }
  const designPath = path.resolve(pos[0])
  setBaseDir(path.dirname(designPath))
  const doc = JSON.parse(await readFile(designPath, 'utf8')) as Doc
  if (doc.version !== 1 || !Array.isArray(doc.pages)) throw new Error('Not a Canvasly design file')
  doc.variables ||= {}
  doc.fonts ||= []

  for (const f of BUNDLED_FONTS) for (const url of Object.values(f.files)) registerFontFile(url, f.family)
  for (const f of doc.fonts) registerFontData(f.dataUrl, f.family)

  const fmt = String(o.format || 'png') as 'png' | 'jpeg' | 'webp' | 'pdf'
  const dpi = Number(o.dpi || 96)
  const outDir = path.resolve(String(o.out || 'out'))
  await mkdir(outDir, { recursive: true })
  const pageSel = o.pages && o.pages !== 'all' ? [Number(o.pages) - 1] : doc.pages.map((_, i) => i)
  const pages: Page[] = pageSel.map((i) => doc.pages[i]).filter(Boolean)
  const base = slug(doc.name || 'design') || 'design'

  let rows: Record<string, string>[] = [{}]
  if (o.data) {
    const file = path.resolve(String(o.data))
    const data = parseData(await readFile(file, 'utf8'), file)
    rows = data.rows
    console.error(`data: ${rows.length} rows, columns ${data.columns.join(', ')}`)
  }
  const batch = !!o.data
  const t0 = Date.now()
  let written = 0
  const log = (f: string) => {
    written++
    if (!o.quiet) console.log(f)
  }

  if (fmt === 'pdf' && batch && o['one-pdf']) {
    const specs = rows.flatMap((row) => pages.map((page) => ({ doc: { ...doc, variables: { ...doc.variables, ...row } }, page })))
    const r = await buildPdf(specs, { dpi: Math.max(dpi, 150), bleed: false, cropMarks: false, title: doc.name, pdfx: !!o.pdfx })
    const f = path.join(outDir, `${base}-all.pdf`)
    await writeFile(f, r.bytes)
    log(f)
  } else {
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri]
      const d: Doc = { ...doc, variables: { ...doc.variables, ...row } }
      const rowLabel = batch ? `-${String(ri + 1).padStart(3, '0')}${Object.values(row)[0] ? '-' + slug(String(Object.values(row)[0])) : ''}` : ''
      if (fmt === 'pdf') {
        const r = await buildPdf(pages.map((page) => ({ doc: d, page })), { dpi: Math.max(dpi, 150), bleed: false, cropMarks: false, title: doc.name, pdfx: !!o.pdfx })
        const f = path.join(outDir, `${base}${rowLabel}.pdf`)
        await writeFile(f, r.bytes)
        log(f)
        continue
      }
      for (let pi = 0; pi < pages.length; pi++) {
        const canvas = (await renderPage(d, pages[pi], { scale: dpi / 96, includeBleed: false })) as unknown as {
          encode(f: string, q?: number): Promise<Buffer>
        }
        const ext = fmt === 'jpeg' ? 'jpg' : fmt
        const f = path.join(outDir, `${base}${rowLabel}${pages.length > 1 ? `-p${pageSel[pi] + 1}` : ''}.${ext}`)
        await writeFile(f, await canvas.encode(fmt, fmt === 'png' ? undefined : 92))
        log(f)
      }
    }
  }
  console.error(`done: ${written} file(s) in ${((Date.now() - t0) / 1000).toFixed(1)} s → ${outDir}`)
}

void readUrl
void baseDir
main().catch((e) => {
  console.error('error:', (e as Error).message)
  process.exit(1)
})
