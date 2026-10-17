import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import {
  bleedPx,
  pageSizePx,
  type CustomFont,
  type DocumentModel,
  type TextElement,
  type DesignElement,
} from '../types/document'
import { renderPageToCanvas } from './exportPage'
import { resolveFillCss } from './colorModel'
import { resolveVariables } from './textLayout'

export interface VectorPdfOptions {
  dpi?: number
  includeBleed?: boolean
  cropMarks?: boolean
  pdfX?: boolean
  selectionIds?: string[]
  templateVariables?: Record<string, string>
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

async function embedCustomFont(pdf: PDFDocument, font: CustomFont): Promise<PDFFont | null> {
  try {
    const base64 = font.dataUrl.split(',')[1]
    if (!base64) return null
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    return pdf.embedFont(bytes)
  } catch {
    return null
  }
}

async function drawTextElement(
  page: ReturnType<PDFDocument['addPage']>,
  el: TextElement,
  vars: Record<string, string>,
  fontMap: Map<string, PDFFont>,
  scale: number,
  bleed: number,
): Promise<void> {
  const content = resolveVariables(el.content, vars)
  const familyKey = el.fontFamily.split(',')[0].trim()
  const font = fontMap.get(familyKey) ?? fontMap.get('Helvetica')!
  const color = hexToRgb(resolveFillCss(el))
  const size = el.fontSize * scale
  const x = (el.x + bleed) * scale
  const y = page.getHeight() - (el.y + bleed + el.fontSize) * scale
  page.drawText(content.replace(/\n/g, ' '), {
    x,
    y,
    size,
    font,
    color: rgb(color.r, color.g, color.b),
    opacity: el.opacity,
  })
}

export async function exportDocumentPdfVector(
  doc: DocumentModel,
  pageIndices: number[],
  options: VectorPdfOptions,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(doc.name)
  pdf.setProducer('cursor-day-1 design editor')
  if (options.pdfX) {
    pdf.setSubject('PDF/X-4 best-effort export (OutputIntent sRGB)')
    pdf.setKeywords(['PDF/X-4', 'sRGB', 'cursor-day-1'])
  }

  const fontMap = new Map<string, PDFFont>()
  fontMap.set('Helvetica', await pdf.embedFont(StandardFonts.Helvetica))
  fontMap.set('Inter', fontMap.get('Helvetica')!)
  for (const cf of doc.customFonts ?? []) {
    const embedded = await embedCustomFont(pdf, cf)
    if (embedded) fontMap.set(cf.family, embedded)
  }

  const scale = (options.dpi ?? 96) / 96
  const vars = options.templateVariables ?? doc.templateVariables ?? {}

  for (const idx of pageIndices) {
    const pg = doc.pages[idx]
    const { width, height } = pageSizePx(pg)
    const bleed = options.includeBleed ? bleedPx(pg) : 0
    const w = (width + bleed * 2) * scale
    const h = (height + bleed * 2) * scale
    const pdfPage = pdf.addPage([w, h])
    pdfPage.drawRectangle({ x: 0, y: 0, width: w, height: h, color: rgb(1, 1, 1) })

    const rasterElements: DesignElement[] = []
    for (const el of pg.elements) {
      if (options.selectionIds?.length && !options.selectionIds.includes(el.id)) continue
      if (el.type === 'text') {
        await drawTextElement(pdfPage, el, vars, fontMap, scale, bleed)
      } else {
        rasterElements.push(el)
      }
    }

    if (rasterElements.length) {
      const canvas = await renderPageToCanvas(
        { ...pg, elements: rasterElements },
        scale,
        {
          includeBleed: options.includeBleed,
          cropMarks: options.cropMarks,
          templateVariables: vars,
          transparentBackground: true,
        },
      )
      const png = canvas.toDataURL('image/png')
      const img = await pdf.embedPng(png)
      pdfPage.drawImage(img, { x: 0, y: 0, width: w, height: h })
    }
  }

  return pdf.save()
}

export async function downloadVectorPdf(
  doc: DocumentModel,
  pageIndices: number[],
  options: VectorPdfOptions,
  filename: string,
): Promise<void> {
  const bytes = await exportDocumentPdfVector(doc, pageIndices, options)
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
