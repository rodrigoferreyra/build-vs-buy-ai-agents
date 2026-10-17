import type { MediaRef } from './types'
import { vid } from './engine'

/**
 * Media for the video studio. User files stay on the device: they are kept as Blobs in memory and
 * persisted in IndexedDB (`canvasly-media`) so a saved project can be reopened. Built-in samples are plain URLs.
 */

const blobs = new Map<string, Blob>()
const urls = new Map<string, string>()

const DB = 'canvasly-media'
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('blobs')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
async function idbPut(id: string, blob: Blob) {
  try {
    const db = await openDb()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('blobs', 'readwrite')
      tx.objectStore('blobs').put(blob, id)
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
    db.close()
  } catch {
    /* persistence is best-effort */
  }
}
async function idbGet(id: string): Promise<Blob | null> {
  try {
    const db = await openDb()
    const b = await new Promise<Blob | null>((res, rej) => {
      const r = db.transaction('blobs').objectStore('blobs').get(id)
      r.onsuccess = () => res((r.result as Blob) || null)
      r.onerror = () => rej(r.error)
    })
    db.close()
    return b
  } catch {
    return null
  }
}

function probe(kind: 'video' | 'audio' | 'image', url: string): Promise<{ duration: number; w?: number; h?: number }> {
  return new Promise((resolve, reject) => {
    if (kind === 'image') {
      const im = new Image()
      im.onload = () => resolve({ duration: 0, w: im.naturalWidth, h: im.naturalHeight })
      im.onerror = () => reject(new Error('Image could not be read'))
      im.src = url
      return
    }
    const el = document.createElement(kind === 'video' ? 'video' : 'audio')
    el.preload = 'metadata'
    const done = () => {
      let d = el.duration
      if (!isFinite(d)) d = 0
      resolve({ duration: d, w: (el as HTMLVideoElement).videoWidth || undefined, h: (el as HTMLVideoElement).videoHeight || undefined })
    }
    el.onloadedmetadata = () => {
      if (!isFinite(el.duration)) {
        // webm without duration: seek to the end to learn it
        el.currentTime = 1e9
        el.onseeked = el.ontimeupdate = () => done()
      } else done()
    }
    el.onerror = () => reject(new Error(`This browser cannot decode that ${kind} file`))
    el.src = url
  })
}

export function kindOfFile(f: File): MediaRef['kind'] | null {
  if (f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(f.name)) return 'video'
  if (f.type.startsWith('audio/') || /\.(mp3|wav|ogg|opus|m4a|aac|flac)$/i.test(f.name)) return 'audio'
  if (f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name)) return 'image'
  return null
}

export async function addMediaFile(file: File): Promise<MediaRef> {
  const kind = kindOfFile(file)
  if (!kind) throw new Error(`${file.name}: unsupported file type`)
  const id = vid('media')
  blobs.set(id, file)
  const url = URL.createObjectURL(file)
  urls.set(id, url)
  const info = await probe(kind, url)
  idbPut(id, file)
  return { id, name: file.name.replace(/\.[^.]+$/, ''), kind, mime: file.type, ...info }
}

export async function addMediaUrl(name: string, kind: MediaRef['kind'], url: string): Promise<MediaRef> {
  const info = await probe(kind, url)
  return { id: vid('media'), name, kind, url, ...info }
}

export async function mediaUrl(ref: MediaRef): Promise<string> {
  if (ref.url) return ref.url
  let u = urls.get(ref.id)
  if (u) return u
  let b = blobs.get(ref.id) || (await idbGet(ref.id))
  if (!b) throw new Error(`Media “${ref.name}” is not available on this device any more – re-import it`)
  blobs.set(ref.id, b)
  u = URL.createObjectURL(b)
  urls.set(ref.id, u)
  return u
}

export async function mediaBlob(ref: MediaRef): Promise<Blob> {
  const b = blobs.get(ref.id)
  if (b) return b
  if (ref.url) {
    const r = await fetch(ref.url)
    if (!r.ok) throw new Error(`Could not load ${ref.url}`)
    return await r.blob()
  }
  const fromDb = await idbGet(ref.id)
  if (!fromDb) throw new Error(`Media “${ref.name}” is missing`)
  blobs.set(ref.id, fromDb)
  return fromDb
}

export const SAMPLES: { name: string; kind: 'video' | 'audio'; url: string }[] = [
  { name: 'Sample clip A (gradient)', kind: 'video', url: import.meta.env.BASE_URL + 'samples/clip-a.webm' },
  { name: 'Sample clip B (test card)', kind: 'video', url: import.meta.env.BASE_URL + 'samples/clip-b.webm' },
  { name: 'Sample music (synth pulse)', kind: 'audio', url: import.meta.env.BASE_URL + 'samples/music.webm' },
]
