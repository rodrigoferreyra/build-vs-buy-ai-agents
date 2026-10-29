import { useSyncExternalStore } from 'react'
import type { DataSource, Doc, El, Guide, ImageEl, Page, Role, VPart, VectorEl } from './types'
import {
  elBounds,
  makeDoc,
  makeImage,
  makePage,
  makeShape,
  makeText,
  round,
  uid,
  unionBounds,
} from './geometry'
import { registerFonts } from './fonts'
import { parseSvg } from './vector'
import { booleanOp, type BoolOp } from './boolean'
import type { VideoProject } from './video/types'
import { newProject } from './video/engine'
import { getLocale } from './i18n'
import { loadWL, mergeWL, saveWL, type WhiteLabel, type WhiteLabelInput } from './whitelabel'

export type LeftTab = 'add' | 'layers' | 'templates' | 'brand' | 'ai'
export type Dialog = 'new' | 'export' | 'storage' | 'saveTemplate' | 'theme' | 'sources' | 'help' | null

export interface State {
  doc: Doc
  past: Doc[]
  future: Doc[]
  pageIndex: number
  selection: string[]
  editingId: string | null
  role: Role
  zoom: number
  panX: number
  panY: number
  viewW: number
  viewH: number
  tool: 'select' | 'hand'
  snapGuides: Guide[]
  toast: string | null
  leftTab: LeftTab
  dialog: Dialog
  saveStatus: string
  hoverPart: { elId: string; partId: string } | null
  mode: 'design' | 'video'
  locale: string
  wl: WhiteLabel
}

const STORAGE_KEY = 'canvasly:current'
export const TEMPLATES_KEY = 'canvasly:templates'

function initialDoc(): Doc {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const d = JSON.parse(raw) as Doc
      if (d && d.version === 1 && d.pages?.length) return d
    }
  } catch {
    /* ignore */
  }
  return makeDoc(1080, 1080, 'px', 'Untitled design')
}

let state: State = {
  doc: initialDoc(),
  past: [],
  future: [],
  pageIndex: 0,
  selection: [],
  editingId: null,
  role: 'creator',
  zoom: 0.5,
  panX: 0,
  panY: 0,
  viewW: 0,
  viewH: 0,
  tool: 'select',
  snapGuides: [],
  toast: null,
  leftTab: 'add',
  dialog: null,
  saveStatus: '',
  hoverPart: null,
  mode: 'design',
  locale: getLocale(),
  wl: loadWL(),
}
registerFonts(state.doc.fonts)

const listeners = new Set<() => void>()
function setState(p: Partial<State>) {
  state = { ...state, ...p }
  listeners.forEach((l) => l())
}
export const getState = () => state
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => sel(state),
  )
}
export function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/* ---------------- history ---------------- */

let lastKey: string | null = null
let lastTime = 0
let txBase: Doc | null = null

function commit(next: Doc, key?: string) {
  if (next === state.doc) return
  if (txBase) {
    setState({ doc: next })
    return
  }
  const now = Date.now()
  if (key && key === lastKey && now - lastTime < 500 && state.past.length) {
    lastTime = now
    setState({ doc: next, future: [] })
    return
  }
  lastKey = key ?? null
  lastTime = now
  setState({ doc: next, past: [...state.past.slice(-199), state.doc], future: [] })
}

function sanitize(doc: Doc, pageIndex: number, selection: string[]) {
  const pi = Math.min(pageIndex, doc.pages.length - 1)
  const ids = new Set(doc.pages[pi].elements.map((e) => e.id))
  return { pageIndex: pi, selection: selection.filter((i) => ids.has(i)) }
}

export const history = {
  undo() {
    if (txBase || !state.past.length) return
    const prev = state.past[state.past.length - 1]
    lastKey = null
    setState({
      doc: prev,
      past: state.past.slice(0, -1),
      future: [state.doc, ...state.future],
      editingId: null,
      ...sanitize(prev, state.pageIndex, state.selection),
    })
  },
  redo() {
    if (txBase || !state.future.length) return
    const next = state.future[0]
    lastKey = null
    setState({
      doc: next,
      past: [...state.past, state.doc],
      future: state.future.slice(1),
      editingId: null,
      ...sanitize(next, state.pageIndex, state.selection),
    })
  },
  begin() {
    txBase = state.doc
  },
  end() {
    if (txBase && txBase !== state.doc) {
      setState({ past: [...state.past.slice(-199), txBase], future: [] })
    }
    txBase = null
    lastKey = null
  },
}

/* ---------------- helpers ---------------- */

export const currentPage = (s: State = state): Page => s.doc.pages[s.pageIndex]

function mapPage(doc: Doc, pageIndex: number, fn: (p: Page) => Page): Doc {
  return { ...doc, pages: doc.pages.map((p, i) => (i === pageIndex ? fn(p) : p)) }
}

function expandGroups(ids: string[], els: El[]): string[] {
  const groups = new Set(els.filter((e) => ids.includes(e.id) && e.groupId).map((e) => e.groupId))
  const out = new Set(ids)
  els.forEach((e) => {
    if (e.groupId && groups.has(e.groupId)) out.add(e.id)
  })
  return [...out]
}

const canTouch = (e: El) => state.role === 'creator' || !e.locked

let toastTimer: number | undefined
export function toast(msg: string) {
  setState({ toast: msg })
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => setState({ toast: null }), 2600)
}

let clipboard: El[] = []

/* ---------------- actions ---------------- */

export const actions = {
  set: setState,
  toast,

  select(ids: string[], additive = false) {
    const els = currentPage().elements
    let next = additive ? [...new Set([...state.selection, ...ids])] : ids
    next = expandGroups(next, els)
    setState({ selection: next, editingId: null })
  },
  toggleSelect(id: string) {
    const els = currentPage().elements
    const grp = expandGroups([id], els)
    const has = state.selection.includes(id)
    const next = has ? state.selection.filter((i) => !grp.includes(i)) : [...new Set([...state.selection, ...grp])]
    setState({ selection: next, editingId: null })
  },
  clearSelection() {
    setState({ selection: [], editingId: null })
  },
  selectAll() {
    setState({ selection: currentPage().elements.filter((e) => !e.hidden).map((e) => e.id) })
  },

  /** patch elements on the current page. `patch` may be a function of the element. */
  patch(ids: string[], patch: Partial<El> | ((e: El) => Partial<El>), key?: string) {
    const doc = mapPage(state.doc, state.pageIndex, (p) => ({
      ...p,
      elements: p.elements.map((e) =>
        ids.includes(e.id) && canTouch(e)
          ? ({ ...e, ...(typeof patch === 'function' ? patch(e) : patch) } as El)
          : e,
      ),
    }))
    commit(doc, key ?? (ids.length ? 'patch:' + ids.join(',') + ':' + Object.keys(typeof patch === 'function' ? {} : patch).join(',') : undefined))
  },
  /** same as patch but allowed on any element regardless of lock (used for lock toggling by creator) */
  patchForce(ids: string[], patch: Partial<El>, key?: string) {
    const doc = mapPage(state.doc, state.pageIndex, (p) => ({
      ...p,
      elements: p.elements.map((e) => (ids.includes(e.id) ? ({ ...e, ...patch } as El) : e)),
    }))
    commit(doc, key)
  },
  patchSelection(patch: Partial<El>, key?: string) {
    actions.patch(state.selection, patch, key)
  },

  addElements(els: El[], select = true) {
    const doc = mapPage(state.doc, state.pageIndex, (p) => ({ ...p, elements: [...p.elements, ...els] }))
    commit(doc)
    if (select) setState({ selection: els.map((e) => e.id), editingId: null })
  },
  addShape(kind: 'rect' | 'ellipse' | 'line' | 'polygon' | 'star') {
    if (state.role === 'adopter') return
    const { width: W, height: H } = state.doc
    const s = Math.min(W, H) * 0.3
    const w = kind === 'line' ? Math.min(W, H) * 0.4 : s
    const h = kind === 'line' ? 24 : s
    const off = (currentPage().elements.length % 8) * 24
    actions.addElements([makeShape(kind, (W - w) / 2 + off, (H - h) / 2 + off, round(w), round(h), kind === 'rect' ? { radius: 0 } : {})])
  },
  addText(preset: 'heading' | 'subheading' | 'body' = 'body') {
    if (state.role === 'adopter') return
    const { width: W, height: H } = state.doc
    const size = preset === 'heading' ? W * 0.08 : preset === 'subheading' ? W * 0.05 : W * 0.032
    const w = W * 0.7
    const el = makeText((W - w) / 2, H * 0.4, round(w), preset === 'heading' ? 'Add a heading' : preset === 'subheading' ? 'Add a subheading' : 'Add a little bit of body text', {
      fontSize: Math.round(size),
      fontWeight: preset === 'body' ? 400 : 700,
      name: preset === 'heading' ? 'Heading' : preset === 'subheading' ? 'Subheading' : 'Text',
    })
    el.h = round(size * 1.2 * 2)
    actions.addElements([el])
    setState({ editingId: el.id })
  },
  addImageFromSrc(src: string, nw: number, nh: number, name = 'Image') {
    if (state.role === 'adopter') return
    const { width: W, height: H } = state.doc
    const max = Math.min(W, H) * 0.6
    const k = Math.min(max / nw, max / nh, 1.5 * Math.max(W, H))
    const w = round(nw * k)
    const h = round(nh * k)
    actions.addElements([makeImage((W - w) / 2, (H - h) / 2, w, h, src, nw, nh, { name })])
  },
  addPlaceholder() {
    if (state.role === 'adopter') return
    const { width: W, height: H } = state.doc
    const w = W * 0.6
    const h = H * 0.35
    actions.addElements([makeImage((W - w) / 2, (H - h) / 2, round(w), round(h), null, 0, 0)])
  },
  setImageSrc(id: string, src: string, nw: number, nh: number) {
    actions.patch([id], { src, nw, nh, zoom: 1, offX: 0, offY: 0, name: 'Image' } as Partial<ImageEl>)
  },

  /** import SVG markup as an editable vector (parts stay selectable / recolourable) */
  addSvgText(text: string, name = 'Vector', opts: { maxFrac?: number; cover?: boolean; box?: { x: number; y: number; w: number; h: number; rotation: number } } = {}) {
    if (state.role === 'adopter') return
    const parsed = parseSvg(text)
    const { width: W, height: H } = state.doc
    const [, , vw, vh] = parsed.viewBox
    const k = Math.min((W * (opts.maxFrac ?? 0.5)) / vw, (H * (opts.maxFrac ?? 0.5)) / vh)
    const w = opts.box ? opts.box.w : opts.cover ? W : round(vw * k)
    const h = opts.box ? opts.box.h : opts.cover ? H : round(vh * k)
    const el: VectorEl = {
      id: uid('el'),
      type: 'vector',
      name,
      x: opts.box ? opts.box.x : opts.cover ? 0 : round((W - w) / 2),
      y: opts.box ? opts.box.y : opts.cover ? 0 : round((H - h) / 2),
      w,
      h,
      rotation: opts.box?.rotation ?? 0,
      opacity: 1,
      blend: 'normal',
      hidden: false,
      locked: false,
      flipX: false,
      flipY: false,
      viewBox: parsed.viewBox,
      defs: parsed.defs,
      parts: parsed.parts,
    }
    actions.addElements([el])
    if (opts.cover) actions.reorder('back')
  },
  patchPart(elId: string, partId: string, patch: Partial<VPart>, key?: string) {
    const doc = mapPage(state.doc, state.pageIndex, (p) => ({
      ...p,
      elements: p.elements.map((e) =>
        e.id === elId && e.type === 'vector' && canTouch(e) ? { ...e, parts: e.parts.map((q) => (q.id === partId ? { ...q, ...patch } : q)) } : e,
      ),
    }))
    commit(doc, key ?? `part:${partId}:${Object.keys(patch).join(',')}`)
  },
  deletePart(elId: string, partId: string) {
    const doc = mapPage(state.doc, state.pageIndex, (p) => ({
      ...p,
      elements: p.elements.map((e) => (e.id === elId && e.type === 'vector' && canTouch(e) && e.parts.length > 1 ? { ...e, parts: e.parts.filter((q) => q.id !== partId) } : e)),
    }))
    commit(doc)
    setState({ hoverPart: null })
  },
  /** replace every use of one colour in a vector (fill and stroke) */
  recolorVector(elId: string, from: string, to: string) {
    const doc = mapPage(state.doc, state.pageIndex, (p) => ({
      ...p,
      elements: p.elements.map((e) =>
        e.id === elId && e.type === 'vector' && canTouch(e)
          ? { ...e, parts: e.parts.map((q) => ({ ...q, fill: q.fill === from ? to : q.fill, stroke: q.stroke === from ? to : q.stroke })) }
          : e,
      ),
    }))
    commit(doc)
  },
  booleanOp(op: BoolOp) {
    if (state.role === 'adopter') return
    const els = currentPage().elements.filter((e) => state.selection.includes(e.id))
    try {
      const res = booleanOp(els, op)
      const ids = new Set(els.map((e) => e.id))
      const lastIdx = Math.max(...els.map((e) => currentPage().elements.indexOf(e)))
      const doc = mapPage(state.doc, state.pageIndex, (p) => {
        const kept = p.elements.filter((e) => !ids.has(e.id))
        const insertAt = Math.min(kept.length, lastIdx - (els.length - 1))
        const out = [...kept]
        out.splice(Math.max(0, insertAt), 0, res)
        return { ...p, elements: out }
      })
      commit(doc)
      setState({ selection: [res.id], editingId: null })
      toast('Boolean ' + op + ' applied – the result is an editable vector')
    } catch (e) {
      toast((e as Error).message)
    }
  },

  /** video studio: edit the timeline project (undoable, saved with the design) */
  setVideo(fn: (p: VideoProject) => VideoProject, key?: string) {
    const cur = state.doc.video ?? newProject()
    const next = fn(cur)
    if (next === cur && state.doc.video) return
    commit({ ...state.doc, video: next }, key)
  },
  setMode(mode: 'design' | 'video') {
    if (mode === 'video' && !state.doc.video) commit({ ...state.doc, video: newProject() })
    setState({ mode, editingId: null })
  },

  /* luts, data */
  addLut(name: string, cube: string): string {
    const id = uid('lut')
    commit({ ...state.doc, luts: [...(state.doc.luts || []), { id, name, cube }] })
    return id
  },
  setData(data: DataSource | null) {
    commit({ ...state.doc, data })
    if (data) actions.setDataIndex(0)
  },
  setDataIndex(i: number) {
    const data = state.doc.data
    if (!data || !data.rows.length) return
    const idx = Math.max(0, Math.min(data.rows.length - 1, i))
    const row = data.rows[idx]
    commit({ ...state.doc, data: { ...data, index: idx }, variables: { ...state.doc.variables, ...row } })
  },

  deleteSelection() {
    const ids = state.selection.filter((id) => {
      const e = currentPage().elements.find((x) => x.id === id)
      return e && (state.role === 'creator' || !e.locked)
    })
    if (!ids.length || state.role === 'adopter') return
    const doc = mapPage(state.doc, state.pageIndex, (p) => ({ ...p, elements: p.elements.filter((e) => !ids.includes(e.id)) }))
    commit(doc)
    setState({ selection: [], editingId: null })
  },
  duplicateSelection() {
    if (state.role === 'adopter') return
    const src = currentPage().elements.filter((e) => state.selection.includes(e.id))
    if (!src.length) return
    const copies = cloneElements(src, 20)
    actions.addElements(copies)
  },
  copy() {
    clipboard = currentPage().elements.filter((e) => state.selection.includes(e.id))
    if (clipboard.length) toast(`Copied ${clipboard.length} element${clipboard.length > 1 ? 's' : ''}`)
  },
  cut() {
    actions.copy()
    actions.deleteSelection()
  },
  paste() {
    if (!clipboard.length || state.role === 'adopter') return
    const copies = cloneElements(clipboard, 20)
    clipboard = copies.map((c) => ({ ...c }))
    actions.addElements(copies)
  },

  group() {
    if (state.role === 'adopter') return
    const ids = state.selection
    if (ids.length < 2) return
    const gid = uid('grp')
    actions.patch(ids, { groupId: gid }, 'group')
  },
  ungroup() {
    if (state.role === 'adopter') return
    const ids = state.selection
    const doc = mapPage(state.doc, state.pageIndex, (p) => ({
      ...p,
      elements: p.elements.map((e) => {
        if (!ids.includes(e.id) || !e.groupId) return e
        const { groupId, ...rest } = e
        return rest as El
      }),
    }))
    commit(doc)
  },

  /** z-order operations */
  reorder(mode: 'front' | 'back' | 'forward' | 'backward') {
    if (state.role === 'adopter') return
    const sel = new Set(state.selection)
    const els = currentPage().elements
    let out = els
    if (mode === 'front') out = [...els.filter((e) => !sel.has(e.id)), ...els.filter((e) => sel.has(e.id))]
    else if (mode === 'back') out = [...els.filter((e) => sel.has(e.id)), ...els.filter((e) => !sel.has(e.id))]
    else if (mode === 'forward') {
      out = [...els]
      for (let i = out.length - 2; i >= 0; i--) if (sel.has(out[i].id) && !sel.has(out[i + 1].id)) [out[i], out[i + 1]] = [out[i + 1], out[i]]
    } else {
      out = [...els]
      for (let i = 1; i < out.length; i++) if (sel.has(out[i].id) && !sel.has(out[i - 1].id)) [out[i], out[i - 1]] = [out[i - 1], out[i]]
    }
    commit(mapPage(state.doc, state.pageIndex, (p) => ({ ...p, elements: out })))
  },
  moveLayer(fromIdx: number, toIdx: number) {
    if (state.role === 'adopter') return
    const els = [...currentPage().elements]
    if (fromIdx === toIdx || fromIdx < 0 || fromIdx >= els.length) return
    const [m] = els.splice(fromIdx, 1)
    els.splice(Math.max(0, Math.min(els.length, toIdx)), 0, m)
    commit(mapPage(state.doc, state.pageIndex, (p) => ({ ...p, elements: els })))
  },

  align(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    const els = currentPage().elements.filter((e) => state.selection.includes(e.id) && canTouch(e) && !e.locked)
    if (!els.length) return
    const ref = els.length === 1 ? { x: 0, y: 0, w: state.doc.width, h: state.doc.height } : unionBounds(els)!
    actions.patch(
      els.map((e) => e.id),
      (e) => {
        const b = elBounds(e)
        let dx = 0
        let dy = 0
        if (mode === 'left') dx = ref.x - b.x
        if (mode === 'center') dx = ref.x + ref.w / 2 - (b.x + b.w / 2)
        if (mode === 'right') dx = ref.x + ref.w - (b.x + b.w)
        if (mode === 'top') dy = ref.y - b.y
        if (mode === 'middle') dy = ref.y + ref.h / 2 - (b.y + b.h / 2)
        if (mode === 'bottom') dy = ref.y + ref.h - (b.y + b.h)
        return { x: round(e.x + dx), y: round(e.y + dy) }
      },
      'align:' + mode,
    )
  },
  distribute(axis: 'h' | 'v') {
    const els = currentPage().elements.filter((e) => state.selection.includes(e.id) && !e.locked)
    if (els.length < 3) return
    const items = els.map((e) => ({ e, b: elBounds(e) }))
    items.sort((a, b) => (axis === 'h' ? a.b.x - b.b.x : a.b.y - b.b.y))
    const first = items[0].b
    const last = items[items.length - 1].b
    const total = items.reduce((s, i) => s + (axis === 'h' ? i.b.w : i.b.h), 0)
    const span = axis === 'h' ? last.x + last.w - first.x : last.y + last.h - first.y
    const gap = (span - total) / (items.length - 1)
    let pos = axis === 'h' ? first.x : first.y
    const moves = new Map<string, number>()
    items.forEach((i) => {
      const cur = axis === 'h' ? i.b.x : i.b.y
      moves.set(i.e.id, pos - cur)
      pos += (axis === 'h' ? i.b.w : i.b.h) + gap
    })
    actions.patch(
      [...moves.keys()],
      (e) => (axis === 'h' ? { x: round(e.x + moves.get(e.id)!) } : { y: round(e.y + moves.get(e.id)!) }),
      'distribute',
    )
  },
  nudge(dx: number, dy: number) {
    const ids = state.selection.filter((id) => {
      const e = currentPage().elements.find((x) => x.id === id)
      return e && !e.locked
    })
    actions.patch(ids, (e) => ({ x: round(e.x + dx), y: round(e.y + dy) }), 'nudge')
  },

  /* pages */
  setPage(i: number) {
    if (i < 0 || i >= state.doc.pages.length) return
    setState({ pageIndex: i, selection: [], editingId: null })
  },
  addPage() {
    if (state.role === 'adopter') return
    const pg = makePage(`Page ${state.doc.pages.length + 1}`)
    const doc = { ...state.doc, pages: [...state.doc.pages, pg] }
    commit(doc)
    setState({ pageIndex: doc.pages.length - 1, selection: [] })
  },
  duplicatePage() {
    if (state.role === 'adopter') return
    const src = currentPage()
    const idMap = new Map<string, string>()
    const copy: Page = {
      ...src,
      id: uid('pg'),
      name: src.name + ' copy',
      elements: src.elements.map((e) => {
        const id = uid('el')
        idMap.set(e.id, id)
        return { ...e, id }
      }),
    }
    const groupMap = new Map<string, string>()
    copy.elements = copy.elements.map((e) => {
      if (!e.groupId) return e
      if (!groupMap.has(e.groupId)) groupMap.set(e.groupId, uid('grp'))
      return { ...e, groupId: groupMap.get(e.groupId) }
    })
    const pages = [...state.doc.pages]
    pages.splice(state.pageIndex + 1, 0, copy)
    commit({ ...state.doc, pages })
    setState({ pageIndex: state.pageIndex + 1, selection: [] })
  },
  deletePage() {
    if (state.role === 'adopter' || state.doc.pages.length <= 1) return
    const pages = state.doc.pages.filter((_, i) => i !== state.pageIndex)
    commit({ ...state.doc, pages })
    setState({ pageIndex: Math.min(state.pageIndex, pages.length - 1), selection: [] })
  },
  movePage(from: number, to: number) {
    if (state.role === 'adopter') return
    if (to < 0 || to >= state.doc.pages.length || from === to) return
    const pages = [...state.doc.pages]
    const [m] = pages.splice(from, 1)
    pages.splice(to, 0, m)
    commit({ ...state.doc, pages })
    setState({ pageIndex: to })
  },
  renamePage(i: number, name: string) {
    commit({ ...state.doc, pages: state.doc.pages.map((p, k) => (k === i ? { ...p, name } : p)) }, 'rename-page' + i)
  },
  setBackground(color: string) {
    commit(mapPage(state.doc, state.pageIndex, (p) => ({ ...p, background: color })), 'bg')
  },
  pasteToPage(i: number) {
    if (!clipboard.length) return
    const copies = cloneElements(clipboard, 0)
    commit(mapPage(state.doc, i, (p) => ({ ...p, elements: [...p.elements, ...copies] })))
  },

  /* document */
  setDoc(patch: Partial<Doc>, key?: string) {
    commit({ ...state.doc, ...patch }, key)
  },
  setName(name: string) {
    commit({ ...state.doc, name }, 'docname')
  },
  resizeDoc(width: number, height: number, unit?: Doc['unit']) {
    commit({ ...state.doc, width: round(Math.max(8, width)), height: round(Math.max(8, height)), unit: unit ?? state.doc.unit }, 'docsize')
    requestFit()
  },
  setGuides(guides: Guide[]) {
    commit({ ...state.doc, guides })
  },
  setVariable(name: string, value: string) {
    commit({ ...state.doc, variables: { ...state.doc.variables, [name]: value } }, 'var:' + name)
  },

  /** replace the current document (new design / open / template) and reset history */
  loadDoc(doc: Doc) {
    txBase = null
    lastKey = null
    registerFonts(doc.fonts || [])
    setState({ doc, past: [], future: [], pageIndex: 0, selection: [], editingId: null, snapGuides: [] })
    requestFit()
  },
  newDoc(width: number, height: number, unit: Doc['unit'], name = 'Untitled design') {
    actions.loadDoc(makeDoc(width, height, unit, name))
  },

  /** white-label the editor UI (title, logo, colours, hidden panels); `persist` keeps it in this browser */
  setWhiteLabel(p: WhiteLabelInput, persist = true) {
    const wl = mergeWL(state.wl, p)
    setState({ wl })
    if (persist) saveWL(wl)
    if (typeof document !== 'undefined' && document.title.length) document.title = `${wl.title} – design editor`
  },
}

function cloneElements(src: El[], offset: number): El[] {
  const gmap = new Map<string, string>()
  return src.map((e) => {
    let groupId = e.groupId
    if (groupId) {
      if (!gmap.has(groupId)) gmap.set(groupId, uid('grp'))
      groupId = gmap.get(groupId)
    }
    return { ...e, id: uid('el'), x: round(e.x + offset), y: round(e.y + offset), groupId, name: e.name } as El
  })
}

/* ---------------- viewport ---------------- */

export function requestFit() {
  setTimeout(() => fitToScreen(), 0)
}

export function fitToScreen() {
  const { viewW, viewH, doc } = state
  if (!viewW || !viewH) return
  const pad = 60
  const z = Math.max(0.02, Math.min(8, Math.min((viewW - pad * 2) / doc.width, (viewH - pad * 2) / doc.height)))
  setState({ zoom: z, panX: (viewW - doc.width * z) / 2, panY: (viewH - doc.height * z) / 2 })
}

export function zoomAt(newZoom: number, sx?: number, sy?: number) {
  const { zoom, panX, panY, viewW, viewH } = state
  const z = Math.max(0.02, Math.min(16, newZoom))
  const cx = sx ?? viewW / 2
  const cy = sy ?? viewH / 2
  const wx = (cx - panX) / zoom
  const wy = (cy - panY) / zoom
  setState({ zoom: z, panX: cx - wx * z, panY: cy - wy * z })
}

/* ---------------- persistence ---------------- */

export function saveLocal(manual = false): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.doc))
    setState({ saveStatus: 'Saved locally ' + new Date().toLocaleTimeString() })
    if (manual) toast('Saved to browser storage')
    return true
  } catch {
    setState({ saveStatus: 'Storage full – use Download .json' })
    if (manual) toast('Browser storage is full – download the .json instead')
    return false
  }
}

export interface Template {
  id: string
  name: string
  category: string
  doc: Doc
  builtin?: boolean
}

export function loadUserTemplates(): Template[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveUserTemplate(name: string, category: string) {
  const list = loadUserTemplates()
  list.push({ id: uid('tpl'), name, category, doc: state.doc })
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list))
    toast('Template saved')
    templateTick++
    listeners.forEach((l) => l())
  } catch {
    toast('Storage full – could not save template')
  }
}
export function deleteUserTemplate(id: string) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(loadUserTemplates().filter((t) => t.id !== id)))
  templateTick++
  listeners.forEach((l) => l())
}
export let templateTick = 0

export function parseDoc(json: string): Doc {
  const d = JSON.parse(json) as Doc
  if (!d || d.version !== 1 || !Array.isArray(d.pages) || !d.pages.length) throw new Error('Not a valid design file')
  d.fonts = d.fonts || []
  d.variables = d.variables || {}
  d.guides = d.guides || []
  d.bleed = d.bleed || 0
  d.brand = d.brand || { colors: [], restrict: false }
  d.luts = d.luts || []
  d.data = d.data || null
  return d
}

export function cloneDocForUse(doc: Doc): Doc {
  return JSON.parse(JSON.stringify({ ...doc, id: uid('doc') }))
}
