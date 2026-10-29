import { DE, DE_PATTERNS } from './locales/de'

/**
 * Tiny i18n layer. English source strings are the keys; a missing translation falls back to English.
 * `t('Hello {name}', { name: 'Ada' })` supports {placeholders}. Add a language by adding a dictionary to DICTS.
 */
export const LOCALES: { id: string; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
]
const DICTS: Record<string, Record<string, string>> = { de: DE }
const PATTERNS: Record<string, [RegExp, string | ((...m: string[]) => string)][]> = { de: DE_PATTERNS }
const KEY = 'canvasly:locale'

function detect(): string {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored && (stored === 'en' || DICTS[stored])) return stored
    const q = new URLSearchParams(location.search).get('lang')
    if (q && (q === 'en' || DICTS[q])) return q
  } catch {
    /* ignore */
  }
  return 'en'
}

let locale = detect()
export const getLocale = () => locale
export function setLocale(l: string, persist = true) {
  locale = l === 'en' || DICTS[l] ? l : 'en'
  try {
    if (persist) localStorage.setItem(KEY, locale)
    document.documentElement.lang = locale
  } catch {
    /* ignore */
  }
}
if (typeof document !== 'undefined') document.documentElement.lang = locale

export function t(key: string, vars?: Record<string, string | number>): string {
  let s = (locale !== 'en' && DICTS[locale]?.[key]) || key
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
  return s
}

/** register additional / white-label translations at run time (e.g. from the embed API) */
export function extendLocale(id: string, entries: Record<string, string>) {
  DICTS[id] = { ...(DICTS[id] || {}), ...entries }
  if (!LOCALES.some((l) => l.id === id)) LOCALES.push({ id, label: id })
}

/* ---------- DOM translation ----------
 * Components keep English source strings; this layer swaps text nodes and title/placeholder/aria-label
 * attributes for the active locale and restores the English original when switching back.
 * Design content (the canvas viewport, contentEditable, [data-no-i18n]) is never touched.
 */
const ATTRS = ['title', 'placeholder', 'aria-label']
const textOrig = new WeakMap<Text, string>()
const textSet = new WeakMap<Text, string>()
const attrOrig = new WeakMap<Element, Record<string, string>>()
const attrSet = new WeakMap<Element, Record<string, string>>()
const roots = new Set<HTMLElement>()

export function translate(s: string): string | null {
  if (locale === 'en') return null
  const dict = DICTS[locale]
  if (!dict) return null
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s)!
  const core = m[2]
  if (!core) return null
  let hit = dict[core]
  if (hit === undefined) {
    // leading icon/symbol (e.g. "⬆ Upload…", "＋ Page") or trailing colon
    const p = /^([^\p{L}\p{N}(]+)(.+?)(:?)$/u.exec(core)
    if (p && dict[p[2]] !== undefined) hit = p[1] + dict[p[2]] + p[3]
    else if (core.endsWith(':') && dict[core.slice(0, -1)] !== undefined) hit = dict[core.slice(0, -1)] + ':'
  }
  if (hit === undefined)
    for (const [re, rep] of PATTERNS[locale] || []) {
      if (re.test(core)) {
        hit = core.replace(re, rep as never)
        break
      }
    }
  return hit === undefined ? null : m[1] + hit + m[3]
}

const skip = (el: Element | null) => !el || !!el.closest('.viewport, [data-no-i18n], [contenteditable="true"], textarea, script, style')

function doText(n: Text) {
  if (skip(n.parentElement)) return
  const cur = n.data
  const en = textSet.get(n) === cur ? textOrig.get(n) ?? cur : cur
  textOrig.set(n, en)
  const out = translate(en) ?? en
  textSet.set(n, out)
  if (out !== cur) n.data = out
}

function doAttrs(el: Element) {
  if (skip(el)) return
  for (const a of ATTRS) {
    const cur = el.getAttribute(a)
    if (cur === null) continue
    const o = attrOrig.get(el) || {}
    const st = attrSet.get(el) || {}
    const en = st[a] === cur ? o[a] ?? cur : cur
    o[a] = en
    const out = translate(en) ?? en
    st[a] = out
    attrOrig.set(el, o)
    attrSet.set(el, st)
    if (out !== cur) el.setAttribute(a, out)
  }
}

function walk(node: Node) {
  if (node.nodeType === 3) return doText(node as Text)
  if (node.nodeType !== 1) return
  const el = node as Element
  if (skip(el)) return
  doAttrs(el)
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let n = tw.nextNode()
  while (n) {
    if (n.nodeType === 3) doText(n as Text)
    else doAttrs(n as Element)
    n = tw.nextNode()
  }
}

/** keep a subtree translated; returns a disconnect function */
export function translateDom(root: HTMLElement): () => void {
  roots.add(root)
  walk(root)
  const mo = new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === 'characterData') doText(r.target as Text)
      else if (r.type === 'attributes') doAttrs(r.target as Element)
      else r.addedNodes.forEach(walk)
    }
  })
  mo.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS })
  return () => {
    mo.disconnect()
    roots.delete(root)
  }
}

const localeListeners = new Set<(l: string) => void>()
export function onLocaleChange(fn: (l: string) => void) {
  localeListeners.add(fn)
  return () => localeListeners.delete(fn)
}
const _setLocale = setLocale
export function switchLocale(l: string, persist = true) {
  _setLocale(l, persist)
  roots.forEach((r) => walk(r))
  localeListeners.forEach((f) => f(locale))
}
