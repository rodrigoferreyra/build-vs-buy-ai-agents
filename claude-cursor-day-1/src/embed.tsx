import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import './styles.css'
import { actions, getState, parseDoc, subscribe } from './store'
import { canvasToBlob, renderPage } from './render'
import { buildPdf } from './pdf'
import { getLocale, setLocale, switchLocale } from './i18n'
import { registerAssetSource, type AssetSourceInput } from './assetSources'
import type { Doc, Role } from './types'
import type { WhiteLabelInput } from './whitelabel'

/**
 * Framework-neutral embedding API. Works from plain JS, Vue, Angular, Svelte… (anything that can hand over a DOM element):
 *   const editor = mount(document.getElementById('editor'), { whiteLabel: { title: 'Acme' }, locale: 'de' })
 * or declaratively with the <canvasly-editor> custom element.
 * One editor instance per page (the store is a module singleton).
 */
export interface MountOptions {
  design?: Doc | string
  whiteLabel?: WhiteLabelInput
  /** keep the white-label config in localStorage (default false for embeds) */
  persistWhiteLabel?: boolean
  locale?: string
  role?: Role
  assetSources?: AssetSourceInput[]
  onChange?: (doc: Doc) => void
}

export interface ExportImageOptions {
  page?: number
  dpi?: number
  type?: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number
}

export interface EditorHandle {
  getDesign(): Doc
  loadDesign(design: Doc | string): void
  exportImage(opts?: ExportImageOptions): Promise<Blob>
  exportPdf(opts?: { pdfx?: boolean; dpi?: number }): Promise<Blob>
  setWhiteLabel(p: WhiteLabelInput): void
  setLocale(locale: string): void
  getLocale(): string
  setRole(role: Role): void
  destroy(): void
}

let active: { root: Root; el: HTMLElement; unsub: () => void } | null = null

export function mount(el: HTMLElement, opts: MountOptions = {}): EditorHandle {
  if (active) unmount()
  if (opts.locale) setLocale(opts.locale, false)
  if (opts.whiteLabel) actions.setWhiteLabel(opts.whiteLabel, !!opts.persistWhiteLabel)
  if (opts.role) actions.set({ role: opts.role })
  opts.assetSources?.forEach((s) => registerAssetSource(s))
  if (opts.design) actions.loadDoc(typeof opts.design === 'string' ? parseDoc(opts.design) : parseDoc(JSON.stringify(opts.design)))
  el.classList.add('canvasly-host')
  const root = createRoot(el)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  let last = getState().doc
  const unsub = subscribe(() => {
    const d = getState().doc
    if (d !== last) {
      last = d
      opts.onChange?.(d)
    }
  })
  active = { root, el, unsub }

  return {
    getDesign: () => getState().doc,
    loadDesign: (d) => actions.loadDoc(typeof d === 'string' ? parseDoc(d) : parseDoc(JSON.stringify(d))),
    async exportImage(o = {}) {
      const doc = getState().doc
      const page = doc.pages[o.page ?? getState().pageIndex] ?? doc.pages[0]
      const type = o.type ?? 'image/png'
      let c = await renderPage(doc, page, { scale: (o.dpi ?? 96) / 96, includeBleed: false })
      if (type === 'image/jpeg') {
        const flat = document.createElement('canvas')
        flat.width = c.width
        flat.height = c.height
        const x = flat.getContext('2d')!
        x.fillStyle = '#fff'
        x.fillRect(0, 0, c.width, c.height)
        x.drawImage(c, 0, 0)
        c = flat
      }
      return canvasToBlob(c, type, o.quality ?? 0.92)
    },
    async exportPdf(o = {}) {
      const doc = getState().doc
      const r = await buildPdf(
        doc.pages.map((page) => ({ doc, page })),
        { dpi: o.dpi ?? 150, bleed: false, cropMarks: false, title: doc.name, pdfx: o.pdfx },
      )
      return new Blob([r.bytes as BlobPart], { type: 'application/pdf' })
    },
    setWhiteLabel: (p) => actions.setWhiteLabel(p, !!opts.persistWhiteLabel),
    setLocale: (l) => {
      switchLocale(l, false)
      actions.set({ locale: getLocale() })
    },
    getLocale,
    setRole: (r) => actions.set({ role: r, selection: [], editingId: null }),
    destroy: unmount,
  }
}

export function unmount() {
  if (!active) return
  active.unsub()
  active.root.unmount()
  active.el.classList.remove('canvasly-host')
  active = null
}

/** <canvasly-editor title="Acme" accent="#0b7285" locale="de" hide="video,templates" design-url="/my.json"></canvasly-editor> */
class CanvaslyEditorElement extends HTMLElement {
  handle: EditorHandle | null = null
  async connectedCallback() {
    if (!this.style.display) this.style.display = 'block'
    let design: string | undefined
    const url = this.getAttribute('design-url')
    if (url) design = await (await fetch(url)).text()
    const accent = this.getAttribute('accent')
    const hide = this.getAttribute('hide')
    this.handle = mount(this, {
      design,
      locale: this.getAttribute('locale') || undefined,
      whiteLabel: {
        ...(this.hasAttribute('title') ? { title: this.getAttribute('title')! } : {}),
        ...(this.hasAttribute('logo') ? { logoUrl: this.getAttribute('logo') } : {}),
        ...(accent ? { colors: { accent } } : {}),
        ...(hide ? { hide: hide.split(',').map((s) => s.trim()) as never } : {}),
      },
      onChange: (doc) => this.dispatchEvent(new CustomEvent('change', { detail: doc })),
    })
    this.dispatchEvent(new CustomEvent('ready', { detail: this.handle }))
  }
  disconnectedCallback() {
    this.handle?.destroy()
    this.handle = null
  }
}
if (typeof customElements !== 'undefined' && !customElements.get('canvasly-editor')) customElements.define('canvasly-editor', CanvaslyEditorElement)

export type { Doc, Role, WhiteLabelInput, AssetSourceInput }
