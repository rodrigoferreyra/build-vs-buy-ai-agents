import { PDFDict, PDFDocument, PDFHeader, PDFHexString, PDFName, PDFNumber, PDFOperator, PDFString, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { Doc, El, ImageEl, Page, ShapeEl, TextEl, VectorEl } from './types'
import { applyVariables, elBounds, shapePath } from './geometry'
import { hasRtl, effectiveDir, fitFontSize, fontMetrics, layoutText } from './textLayout'
import { drawElement, ensureFonts, resolveImageSrc } from './render'
import { parsePathD, transformCmds, type Cmd } from './pathops'
import { partMatrixToBox, partToPathD } from './vector'
import { BUNDLED_FONTS } from './fontsBundle'
import { primaryFamily } from './fonts'
import { srgbIccProfile } from './icc'

/** Client-side PDF writer (pdf-lib): vector shapes/paths, real text with embedded fonts, raster fallback for the rest. */

export interface PdfSpec {
  doc: Doc
  page: Page
}

export interface PdfOptions {
  dpi: number // raster resolution for images / effects
  bleed: boolean
  cropMarks: boolean
  title?: string
  /** write a PDF/X-4 file (sRGB output intent, XMP, all fonts embedded, no device CMYK) */
  pdfx?: boolean
  onProgress?: (done: number, total: number) => void
}

export interface PdfReport {
  vectorText: number
  rasterText: number
  vectorShapes: number
  rasterElements: number
  embeddedFonts: string[]
  standardFonts: string[]
  /** rasterised text that also got an invisible, selectable text layer */
  textLayers: number
  /** system fonts replaced by an embedded bundled face */
  substitutes: string[]
  pdfx: boolean
}

const K = 0.75 // px -> pt
const MM = 96 / 25.4
const f = (n: number) => Math.round(n * 1000) / 1000

const Op = (name: string, args: (number | PDFName)[] = []) => PDFOperator.of(name as never, args.map((a) => (typeof a === 'number' ? PDFNumber.of(f(a)) : a)))
const cm = (a: number, b: number, c: number, d: number, e: number, ff: number) => Op('cm', [a, b, c, d, e, ff])

function parseHex(c: string | undefined | null): [number, number, number] | null {
  if (!c || c === 'none') return null
  let m = /^#([0-9a-f]{3})$/i.exec(c)
  if (m) return m[1].split('').map((h) => parseInt(h + h, 16) / 255) as [number, number, number]
  m = /^#([0-9a-f]{6})/i.exec(c)
  if (m) return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16) / 255) as [number, number, number]
  m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(c)
  if (m) return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255]
  return null
}

const BLEND_PDF: Record<string, string> = {
  normal: 'Normal',
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  darken: 'Darken',
  lighten: 'Lighten',
  'color-dodge': 'ColorDodge',
  'color-burn': 'ColorBurn',
  'hard-light': 'HardLight',
  'soft-light': 'SoftLight',
  difference: 'Difference',
  exclusion: 'Exclusion',
}

function dataUrlBytes(url: string): Uint8Array {
  const b64 = url.slice(url.indexOf(',') + 1)
  if (!/;base64,/.test(url.slice(0, url.indexOf(',') + 1))) return new TextEncoder().encode(decodeURIComponent(b64))
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function cmdsToOps(cmds: Cmd[]): PDFOperator[] {
  const ops: PDFOperator[] = []
  for (const c of cmds) {
    if (c[0] === 'M') ops.push(Op('m', [c[1], c[2]]))
    else if (c[0] === 'L') ops.push(Op('l', [c[1], c[2]]))
    else if (c[0] === 'C') ops.push(Op('c', [c[1], c[2], c[3], c[4], c[5], c[6]]))
    else ops.push(Op('h'))
  }
  return ops
}

class Writer {
  pdf!: PDFDocument
  fontCache = new Map<string, Promise<PDFFont | null>>()
  report: PdfReport = { vectorText: 0, rasterText: 0, vectorShapes: 0, rasterElements: 0, embeddedFonts: [], standardFonts: [], textLayers: 0, substitutes: [], pdfx: false }
  pdfx = false
  imgCounter = 0
  gsCounter = 0
  spotCounter = 0
  spots = new Map<string, PDFName>()

  async init(title?: string) {
    this.pdf = await PDFDocument.create()
    this.pdf.registerFontkit(fontkit)
    this.pdf.setCreator('Canvasly')
    this.pdf.setProducer('Canvasly + pdf-lib')
    if (title) this.pdf.setTitle(title)
  }

  note(list: string[], name: string) {
    if (!list.includes(name)) list.push(name)
  }

  getFont(doc: Doc, el: TextEl): Promise<PDFFont | null> {
    const fam = primaryFamily(el.fontFamily)
    const italic = el.italic
    const bold = el.fontWeight >= 600
    const custom = doc.fonts.find((c) => c.family === fam)
    let bundled = BUNDLED_FONTS.find((b) => b.family === fam)
    if (!custom && !bundled) {
      // system fonts cannot be read from the browser: embed the closest bundled face so every font is embedded
      const first = el.fontFamily.toLowerCase().split(',')[0].replace(/["']/g, '').trim()
      const sub = /courier|mono|consol/.test(first) ? 'Roboto Mono' : /times|georgia|palatino|garamond|^serif$|book/.test(first) ? 'Lora' : 'Inter'
      bundled = BUNDLED_FONTS.find((b) => b.family === sub)!
      this.note(this.report.substitutes, `${fam} → ${sub}`)
    }
    let key: string
    if (custom) key = `c|${fam}`
    else {
      const avail = Object.keys(bundled!.files)
      const w = avail.some((k) => k.startsWith(bold ? '700' : '400')) ? (bold ? 700 : 400) : 400
      const it = italic && avail.includes(`${w}-1`) ? 1 : 0
      key = `b|${bundled!.family}|${w}-${it}`
    }
    let p = this.fontCache.get(key)
    if (!p) {
      p = (async () => {
        try {
          if (custom) {
            const font = await this.pdf.embedFont(dataUrlBytes(custom.dataUrl), { subset: true })
            this.note(this.report.embeddedFonts, fam)
            return font
          }
          if (key.startsWith('b|')) {
            const file = key.split('|')[2]
            const font = await this.pdf.embedFont(await fetchBytes(bundled!.files[file]), { subset: true })
            this.note(this.report.embeddedFonts, `${bundled!.family} ${file.startsWith('700') ? 'Bold' : 'Regular'}${file.endsWith('-1') ? ' Italic' : ''}`)
            return font
          }
          return null
        } catch (e) {
          console.warn('PDF font failed', key, e)
          return null
        }
      })()
      this.fontCache.set(key, p)
    }
    return p
  }

  gs(page: PDFPage, opacity: number, blend: string): PDFOperator[] {
    if (opacity >= 1 && blend === 'normal') return []
    const dict = this.pdf.context.obj({ Type: 'ExtGState', ca: opacity, CA: opacity, BM: BLEND_PDF[blend] || 'Normal' })
    const key = page.node.newExtGState('GS' + this.gsCounter++, dict)
    return [Op('gs', [key])]
  }

  /** Separation colour; in PDF/X (RGB output intent) the alternate space is DeviceRGB instead of DeviceCMYK */
  spot(page: PDFPage, name: string, cmyk: number[], rgbAlt: number[] | null = null): PDFName {
    const ctx = this.pdf.context
    const res = page.node.normalizedEntries().Resources
    let cs = res.lookupMaybe(PDFName.of('ColorSpace'), PDFDict)
    if (!cs) {
      cs = ctx.obj({})
      res.set(PDFName.of('ColorSpace'), cs)
    }
    const key = PDFName.of('Sep' + this.spotCounter++)
    const fn = rgbAlt
      ? ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [1, 1, 1], C1: rgbAlt, N: 1 })
      : ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: cmyk.map((v) => v / 100), N: 1 })
    cs.set(key, ctx.obj([PDFName.of('Separation'), PDFName.of(name || 'Spot'), PDFName.of(rgbAlt ? 'DeviceRGB' : 'DeviceCMYK'), fn]))
    return key
  }

  async embedCanvas(page: PDFPage, canvas: HTMLCanvasElement, jpeg: boolean): Promise<PDFName> {
    const enc = (canvas as unknown as { encode?: (f: string, q?: number) => Promise<Uint8Array> }).encode
    const bytes = enc
      ? new Uint8Array(await enc.call(canvas, jpeg ? 'jpeg' : 'png', 92))
      : new Uint8Array(await (await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('raster failed'))), jpeg ? 'image/jpeg' : 'image/png', 0.92))).arrayBuffer())
    const img = jpeg ? await this.pdf.embedJpg(bytes) : await this.pdf.embedPng(bytes)
    return page.node.newXObject('Im' + this.imgCounter++, img.ref)
  }
}

function fillOps(w: Writer, page: PDFPage, el: ShapeEl): PDFOperator[] {
  if (el.colorModel === 'cmyk' && el.cmyk && !w.pdfx) return [Op('k', el.cmyk.map((v) => v / 100))]
  if (el.colorModel === 'spot' && el.cmyk) {
    const key = w.spot(page, el.spotName || 'Spot', el.cmyk, w.pdfx ? parseHex(el.fill) || [0, 0, 0] : null)
    return [Op('cs', [key]), Op('scn', [1])]
  }
  const rgb = parseHex(el.fill) || [0, 0, 0]
  return [Op('rg', rgb)]
}

export async function buildPdf(specs: PdfSpec[], opts: PdfOptions): Promise<{ bytes: Uint8Array; report: PdfReport }> {
  const w = new Writer()
  await w.init(opts.title)
  w.pdfx = w.report.pdfx = !!opts.pdfx
  let n = 0
  for (const spec of specs) {
    await writePage(w, spec, opts)
    opts.onProgress?.(++n, specs.length)
  }
  if (opts.pdfx) makePdfX4(w.pdf, opts.title || specs[0]?.doc.name || 'Design')
  const bytes = await w.pdf.save({ useObjectStreams: false, updateFieldAppearances: false })
  // pdf-lib's writer always emits %PDF-1.7; PDF/X-4 requires <= 1.6 (same length, so xref offsets stay valid)
  if (opts.pdfx) bytes.set(new TextEncoder().encode('%PDF-1.6'), 0)
  return { bytes, report: w.report }
}

async function writePage(w: Writer, spec: PdfSpec, opts: PdfOptions) {
  const { doc, page } = spec
  await ensureFonts(page, doc.variables)
  const b = opts.bleed ? doc.bleed : 0
  const off = Math.max(b, 2 * MM) + 1 * MM
  const len = 4 * MM
  const slug = opts.cropMarks ? off + len + 1 * MM : 0
  const O = opts.cropMarks ? slug : b
  const Wt = doc.width + 2 * O
  const Ht = doc.height + 2 * O
  const pp = w.pdf.addPage([Wt * K, Ht * K])
  pp.setTrimBox(O * K, O * K, doc.width * K, doc.height * K)
  pp.setBleedBox((O - b) * K, (O - b) * K, (doc.width + 2 * b) * K, (doc.height + 2 * b) * K)
  const pre: PDFOperator[] = [Op('q'), cm(K, 0, 0, -K, O * K, (Ht - O) * K)]
  const clipB = b
  pre.push(Op('re', [-clipB, -clipB, doc.width + 2 * clipB, doc.height + 2 * clipB]), Op('W'), Op('n'))
  const bg = parseHex(page.background) || [1, 1, 1]
  pre.push(Op('q'), Op('rg', bg), Op('re', [-clipB, -clipB, doc.width + 2 * clipB, doc.height + 2 * clipB]), Op('f'), Op('Q'))
  pp.pushOperators(...pre)

  for (const el of page.elements) {
    if (el.hidden) continue
    try {
      await writeElement(w, pp, doc, el, opts)
    } catch (e) {
      console.warn('PDF: element skipped', el.name, e)
    }
  }
  pp.pushOperators(Op('Q'))

  if (opts.cropMarks) {
    const ops: PDFOperator[] = [Op('q'), cm(K, 0, 0, -K, O * K, (Ht - O) * K), ...(w.pdfx ? [Op('RG', [0, 0, 0])] : [Op('K', [1, 1, 1, 1])]), Op('w', [0.33])]
    for (const cx of [0, doc.width])
      for (const cy of [0, doc.height]) {
        const sx = cx === 0 ? -1 : 1
        const sy = cy === 0 ? -1 : 1
        ops.push(Op('m', [cx + sx * off, cy]), Op('l', [cx + sx * (off + len), cy]), Op('S'))
        ops.push(Op('m', [cx, cy + sy * off]), Op('l', [cx, cy + sy * (off + len)]), Op('S'))
      }
    ops.push(Op('Q'))
    pp.pushOperators(...ops)
  }
}

function localMatrix(el: El): PDFOperator[] {
  const a = (el.rotation * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [
    cm(1, 0, 0, 1, el.x + el.w / 2, el.y + el.h / 2),
    ...(el.rotation ? [cm(c, s, -s, c, 0, 0)] : []),
    ...(el.flipX || el.flipY ? [cm(el.flipX ? -1 : 1, 0, 0, el.flipY ? -1 : 1, 0, 0)] : []),
    cm(1, 0, 0, 1, -el.w / 2, -el.h / 2),
  ]
}

async function writeElement(w: Writer, page: PDFPage, doc: Doc, el: El, opts: PdfOptions) {
  const gs = w.gs(page, el.opacity, el.blend)
  if (el.type === 'shape') {
    if (el.fillMode === 'gradient') return rasterElement(w, page, doc, el, opts)
    w.report.vectorShapes++
    const ops: PDFOperator[] = [Op('q'), ...gs, ...localMatrix(el)]
    const cmds = parsePathD(shapePath(el))
    const hasFill = el.fillMode === 'solid' && el.shape !== 'line'
    const hasStroke = el.strokeWidth > 0
    if (!hasFill && !hasStroke) return
    if (hasFill) ops.push(...fillOps(w, page, el))
    if (hasStroke) ops.push(Op('RG', parseHex(el.stroke) || [0, 0, 0]), Op('w', [el.strokeWidth]), Op('j', [0]))
    ops.push(...cmdsToOps(cmds), Op(hasFill && hasStroke ? 'B' : hasFill ? 'f' : 'S'), Op('Q'))
    page.pushOperators(...ops)
    return
  }
  if (el.type === 'text') {
    const needsRaster = el.shadow.on || el.flipX || el.flipY || !!el.curve
    if (!needsRaster && (await writeText(w, page, doc, el, gs))) return
    w.report.rasterText++
    await rasterElement(w, page, doc, el, opts)
    // keep effect text selectable/searchable: invisible real text on top of the raster
    if (await writeText(w, page, doc, el, [], true)) w.report.textLayers++
    return
  }
  if (el.type === 'vector') {
    if (el.parts.some((p) => p.fill.startsWith('url(') || p.stroke.startsWith('url('))) return rasterElement(w, page, doc, el, opts)
    writeVector(w, page, el, gs)
    return
  }
  return rasterElement(w, page, doc, el, opts)
}

function writeVector(w: Writer, page: PDFPage, el: VectorEl, gs: PDFOperator[]) {
  w.report.vectorShapes++
  const ops: PDFOperator[] = [Op('q'), ...gs, ...localMatrix(el)]
  for (const p of el.parts) {
    if (p.hidden) continue
    const d = partToPathD(p)
    if (!d) continue
    const fill = p.fill === 'none' ? null : parseHex(p.fill)
    const stroke = p.stroke === 'none' ? null : parseHex(p.stroke)
    if (!fill && !stroke) continue
    const m = partMatrixToBox(el, p)
    let cmds: Cmd[]
    try {
      cmds = parsePathD(d)
    } catch {
      continue
    }
    ops.push(Op('q'), ...w.gs(page, p.opacity, 'normal'))
    if (fill) ops.push(Op('rg', fill))
    if (stroke) {
      const sc = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1
      ops.push(Op('RG', stroke), Op('w', [p.strokeWidth * sc]), Op('J', [p.linecap === 'round' ? 1 : p.linecap === 'square' ? 2 : 0]), Op('j', [p.linejoin === 'round' ? 1 : p.linejoin === 'bevel' ? 2 : 0]))
    }
    ops.push(...cmdsToOps(transformCmds(cmds, m)))
    const even = p.fillRule === 'evenodd'
    ops.push(Op(fill && stroke ? (even ? 'B*' : 'B') : fill ? (even ? 'f*' : 'f') : 'S'), Op('Q'))
  }
  ops.push(Op('Q'))
  page.pushOperators(...ops)
}

async function writeText(w: Writer, page: PDFPage, doc: Doc, el: TextEl, gs: PDFOperator[], invisible = false): Promise<boolean> {
  const text = applyVariables(el.text, doc.variables)
  if (hasRtl(text) || effectiveDir(el, text) === 'rtl') return false
  const font = await w.getFont(doc, el)
  if (!font) return false
  const size = fitFontSize(el, text)
  const layout = layoutText(text, el, size, el.w)
  const { ascent, descent } = fontMetrics(el, size)
  const rgb = parseHex(el.color) || [0, 0, 0]
  const fontKey = page.node.newFontDictionary(font.name, font.ref)
  const outline = el.strokeWidth > 0
  const body: PDFOperator[] = []
  let y = el.valign === 'middle' ? (el.h - layout.height) / 2 : el.valign === 'bottom' ? el.h - layout.height : 0
  try {
    layout.lines.forEach((line, i) => {
      if (i > 0 && line.paraStart) y += el.paragraphSpacing
      const baseline = y + (layout.lineHeightPx - (ascent + descent)) / 2 + ascent
      y += layout.lineHeightPx
      if (!line.text) return
      const lw = font.widthOfTextAtSize(line.text, size) + el.letterSpacing * line.text.length
      const x = el.align === 'center' ? (el.w - lw) / 2 : el.align === 'right' ? el.w - lw : 0
      const enc = font.encodeText(line.text) // throws if the font lacks a glyph
      body.push(
        Op('BT'),
        Op('Tf', [fontKey, size]),
        Op('Tc', [el.letterSpacing]),
        Op('Tr', [invisible ? 3 : outline ? 2 : 0]),
        Op('Tm', [1, 0, 0, -1, x, baseline]),
        PDFOperator.of('Tj' as never, [enc]),
        Op('ET'),
      )
      if (el.underline && !invisible) body.push(Op('re', [x, baseline + size * 0.1, lw, Math.max(1, size / 18)]), Op('f'))
    })
  } catch {
    return false
  }
  const ops: PDFOperator[] = [Op('q'), ...gs, ...localMatrix(el)]
  if (outline) ops.push(Op('RG', parseHex(el.strokeColor) || [0, 0, 0]), Op('w', [el.strokeWidth]), Op('j', [1]))
  if (el.bg && !invisible) {
    const bg = parseHex(el.bg)
    if (bg) ops.push(Op('q'), Op('rg', bg), Op('re', [0, 0, el.w, el.h]), Op('f'), Op('Q'))
  }
  ops.push(Op('rg', rgb), ...body, Op('Q'))
  page.pushOperators(...ops)
  if (!invisible) w.report.vectorText++
  return true
}

async function rasterElement(w: Writer, page: PDFPage, doc: Doc, el: El, opts: PdfOptions) {
  w.report.rasterElements++
  const src = el.type === 'image' ? resolveImageSrc(el as ImageEl, doc.variables) : null
  const jpeg = !!src && /^data:image\/jpe?g/i.test(src) && (el as ImageEl).mask === 'none' && el.rotation === 0 && (el as ImageEl).fit === 'cover' && (el as ImageEl).zoom >= 1 && el.opacity === 1 && !el.flipX && !el.flipY
  const pad = jpeg ? 0 : el.type === 'text' || el.type === 'shape' ? 32 : 2
  const bb = elBounds(el)
  const bx = bb.x - pad
  const by = bb.y - pad
  const bw = bb.w + pad * 2
  const bh = bb.h + pad * 2
  let scale = Math.max(1, opts.dpi / 96)
  scale = Math.min(scale, 7000 / Math.max(bw, bh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bw * scale))
  canvas.height = Math.max(1, Math.round(bh * scale))
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.translate(-bx, -by)
  await drawElement(ctx, { ...el, opacity: 1, blend: 'normal' }, doc.variables, scale, doc.luts)
  const key = await w.embedCanvas(page, canvas, jpeg)
  page.pushOperators(Op('q'), ...w.gs(page, el.opacity, el.blend), cm(bw, 0, 0, -bh, bx, by + bh), Op('Do', [key]), Op('Q'))
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith('data:')) return dataUrlBytes(url)
  const read = (globalThis as { __canvaslyReadUrl?: (u: string) => Promise<Uint8Array> }).__canvaslyReadUrl
  if (read) return read(url)
  const res = await fetch(url)
  return new Uint8Array(await res.arrayBuffer())
}

const xmlEsc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!)

/** PDF/X-4 (ISO 15930-7): PDF 1.6 header, Info + XMP identification, sRGB output intent, trailer ID. */
function makePdfX4(pdf: PDFDocument, title: string) {
  const ctx = pdf.context
  const now = new Date()
  now.setMilliseconds(0)
  pdf.setTitle(title)
  pdf.setCreationDate(now)
  pdf.setModificationDate(now)
  const info = ctx.lookup(ctx.trailerInfo.Info, PDFDict)
  info.set(PDFName.of('GTS_PDFXVersion'), PDFString.of('PDF/X-4'))
  info.set(PDFName.of('Trapped'), PDFName.of('False'))

  const hex = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
  const docId = hex()
  ctx.trailerInfo.ID = ctx.obj([PDFHexString.of(docId), PDFHexString.of(docId)])

  const iso = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const uuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"
    xmlns:pdfxid="http://www.npes.org/pdfx/ns/id/">
   <dc:format>application/pdf</dc:format>
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmlEsc(title)}</rdf:li></rdf:Alt></dc:title>
   <xmp:CreateDate>${iso}</xmp:CreateDate>
   <xmp:ModifyDate>${iso}</xmp:ModifyDate>
   <xmp:MetadataDate>${iso}</xmp:MetadataDate>
   <xmp:CreatorTool>Canvasly</xmp:CreatorTool>
   <pdf:Producer>Canvasly + pdf-lib</pdf:Producer>
   <pdf:Trapped>False</pdf:Trapped>
   <xmpMM:DocumentID>uuid:${uuid(docId)}</xmpMM:DocumentID>
   <xmpMM:InstanceID>uuid:${uuid(hex())}</xmpMM:InstanceID>
   <xmpMM:VersionID>1</xmpMM:VersionID>
   <xmpMM:RenditionClass>default</xmpMM:RenditionClass>
   <pdfxid:GTS_PDFXVersion>PDF/X-4</pdfxid:GTS_PDFXVersion>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`
  const meta = ctx.stream(new TextEncoder().encode(xmp), { Type: 'Metadata', Subtype: 'XML' })
  pdf.catalog.set(PDFName.of('Metadata'), ctx.register(meta))

  const icc = ctx.flateStream(srgbIccProfile(), { N: 3 })
  const intent = ctx.obj({
    Type: 'OutputIntent',
    S: 'GTS_PDFX',
    OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
    OutputCondition: PDFString.of('sRGB IEC61966-2.1 (RGB print workflow)'),
    RegistryName: PDFString.of('http://www.color.org'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
    DestOutputProfile: ctx.register(icc),
  })
  pdf.catalog.set(PDFName.of('OutputIntents'), ctx.obj([ctx.register(intent)]))
}
