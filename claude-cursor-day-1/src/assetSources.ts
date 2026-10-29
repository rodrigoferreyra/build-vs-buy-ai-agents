import { useSyncExternalStore } from 'react'
import { actions, currentPage, getState, toast } from './store'
import { fetchAsDataUrl } from './stock'
import { fileToDataUrl, registerFont } from './fonts'
import type { El } from './types'

/**
 * Pluggable asset sources: your own stock photos, stickers (SVG) and fonts.
 * - URL source: a JSON manifest (see public/asset-sources/demo/manifest.json) or a public S3 / GCS bucket
 *   listing URL (ListBucketResult XML); relative asset URLs resolve against the source URL.
 * - Code source (embed API): `{ id, name, search(query) }` returning assets from any backend.
 */
export type AssetType = 'image' | 'svg' | 'font'

export interface Asset {
  id: string
  type: AssetType
  name: string
  url: string
  thumb?: string
  tags?: string[]
  /** font family name for type 'font' */
  family?: string
  license?: string
}

export interface AssetSourceInput {
  id: string
  name: string
  /** manifest or bucket listing URL */
  url?: string
  search?: (query: string) => Promise<Asset[]> | Asset[]
}

interface Source extends AssetSourceInput {
  assets?: Asset[]
  error?: string
  loading?: boolean
}

const KEY = 'canvasly:asset-sources'
let sources: Source[] = []
const listeners = new Set<() => void>()
const emit = () => {
  sources = [...sources]
  listeners.forEach((l) => l())
}

export function useAssetSources(): Source[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => sources,
  )
}

const EXT_TYPE: [RegExp, AssetType][] = [
  [/\.svg$/i, 'svg'],
  [/\.(png|jpe?g|webp|gif|avif)$/i, 'image'],
  [/\.(ttf|otf|woff2?)$/i, 'font'],
]

function typeFromUrl(u: string): AssetType | null {
  for (const [re, t] of EXT_TYPE) if (re.test(u.split('?')[0])) return t
  return null
}

function prettyName(key: string) {
  return decodeURIComponent(key.split('/').pop() || key)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
}

/** load a JSON manifest or an S3-style bucket listing */
export async function loadSourceUrl(url: string): Promise<{ name: string; assets: Asset[] }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const text = await res.text()
  const base = new URL(url, location.href)
  const abs = (u: string) => new URL(u, base).href
  if (text.trim().startsWith('<')) {
    const xml = new DOMParser().parseFromString(text, 'application/xml')
    const bucket = xml.querySelector('Name')?.textContent || base.hostname
    const root = base.origin + base.pathname.replace(/[^/]*$/, '')
    const assets: Asset[] = []
    xml.querySelectorAll('Contents > Key').forEach((k) => {
      const key = k.textContent || ''
      const t = typeFromUrl(key)
      if (!t) return
      const href = root + key.split('/').map(encodeURIComponent).join('/')
      assets.push({ id: key, type: t, name: prettyName(key), url: href, family: t === 'font' ? prettyName(key) : undefined, tags: key.split('/').slice(0, -1) })
    })
    return { name: bucket, assets }
  }
  const m = JSON.parse(text) as { name?: string; assets: Asset[] }
  if (!Array.isArray(m.assets)) throw new Error('Manifest needs an "assets" array')
  return {
    name: m.name || base.hostname,
    assets: m.assets.map((a, i) => ({
      ...a,
      id: a.id || String(i),
      type: a.type || typeFromUrl(a.url) || 'image',
      url: abs(a.url),
      thumb: a.thumb ? abs(a.thumb) : undefined,
    })),
  }
}

export function registerAssetSource(input: AssetSourceInput) {
  const src: Source = { ...input, loading: !!input.url && !input.search }
  sources = sources.filter((s) => s.id !== input.id).concat(src)
  emit()
  if (input.url && !input.search) {
    loadSourceUrl(input.url)
      .then((r) => {
        Object.assign(src, { assets: r.assets, loading: false, name: input.name || r.name })
        emit()
      })
      .catch((e) => {
        Object.assign(src, { error: (e as Error).message, loading: false })
        emit()
      })
  }
}

export function removeAssetSource(id: string) {
  sources = sources.filter((s) => s.id !== id)
  persist()
  emit()
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(sources.filter((s) => s.url && !s.search).map((s) => ({ id: s.id, name: s.name, url: s.url }))))
  } catch {
    /* ignore */
  }
}

export function addUrlSource(url: string, name = '') {
  const id = 'url:' + url
  registerAssetSource({ id, name: name || new URL(url, location.href).hostname, url })
  persist()
}

export async function searchSource(s: Source, q: string): Promise<Asset[]> {
  const needle = q.trim().toLowerCase()
  if (s.search) return await s.search(q)
  return (s.assets || []).filter((a) => !needle || (a.name + ' ' + (a.tags || []).join(' ') + ' ' + a.type).toLowerCase().includes(needle))
}

/** insert an asset into the design (images and SVGs are copied into the design so it stays self-contained) */
export async function insertAsset(a: Asset) {
  try {
    if (a.type === 'svg') {
      const text = await (await fetch(a.url)).text()
      actions.addSvgText(text, a.name, { maxFrac: 0.35 })
    } else if (a.type === 'image') {
      const im = await fetchAsDataUrl(a.url)
      actions.addImageFromSrc(im.src, im.w, im.h, a.name)
    } else {
      const blob = await (await fetch(a.url)).blob()
      let dataUrl = await fileToDataUrl(blob)
      const ext = (a.url.split('?')[0].split('.').pop() || 'ttf').toLowerCase()
      dataUrl = dataUrl.replace(/^data:[^;,]*/, 'data:font/' + ext)
      const family = a.family || a.name
      await registerFont({ family, dataUrl })
      const doc = getState().doc
      actions.setDoc({ fonts: [...doc.fonts.filter((f) => f.family !== family), { family, dataUrl }] })
      const css = `"${family}", sans-serif`
      const texts = currentPage().elements.filter((e) => getState().selection.includes(e.id) && e.type === 'text')
      if (texts.length) actions.patch(texts.map((e) => e.id), { fontFamily: css } as Partial<El>, 'asset-font')
      toast(`Font "${family}" added${texts.length ? ' and applied' : ' – pick it in the font menu'}`)
    }
  } catch (e) {
    toast('Could not insert asset: ' + (e as Error).message)
  }
}

// restore URL sources the user added earlier
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '[]') as { id: string; name: string; url: string }[]
  saved.forEach((s) => registerAssetSource(s))
} catch {
  /* ignore */
}
