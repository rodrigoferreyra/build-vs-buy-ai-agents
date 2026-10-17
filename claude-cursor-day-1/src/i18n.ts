import { DE } from './locales/de'

/**
 * Tiny i18n layer. English source strings are the keys; a missing translation falls back to English.
 * `t('Hello {name}', { name: 'Ada' })` supports {placeholders}. Add a language by adding a dictionary to DICTS.
 */
export const LOCALES: { id: string; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
]
const DICTS: Record<string, Record<string, string>> = { de: DE }
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
