import type { Doc } from '../types'
import type { Clip, VideoProject } from './types'
import type { FrameSources } from './engine'
import { mediaUrl } from './mediaStore'
import { loadImage } from '../imageCache'
import { renderPage } from '../render'
import { svgUrl } from '../stock'

/** Decoded media (HTMLVideoElement / HTMLAudioElement / images) for the clips of a project. */
export class MediaPool implements FrameSources {
  videos = new Map<string, HTMLVideoElement>()
  audios = new Map<string, HTMLAudioElement>()
  images = new Map<string, { sig: string; src: CanvasImageSource }>()
  private pending = new Set<string>()
  errors: string[] = []

  constructor(public muteVideos = false) {}

  video(c: Clip) {
    const v = this.videos.get(c.id)
    return v && v.readyState >= 2 ? v : null
  }
  image(c: Clip) {
    return this.images.get(c.id)?.src ?? null
  }

  /** create elements for new clips, drop elements of deleted clips */
  async sync(p: VideoProject, doc: Doc | null) {
    const alive = new Set<string>()
    const jobs: Promise<unknown>[] = []
    for (const t of p.tracks)
      for (const c of t.clips) {
        alive.add(c.id)
        if ((c.kind === 'video' || c.kind === 'audio') && c.media && !this.videos.has(c.id) && !this.audios.has(c.id) && !this.pending.has(c.id)) {
          const ref = p.media[c.media]
          if (!ref) continue
          this.pending.add(c.id)
          jobs.push(
            mediaUrl(ref)
              .then(
                (url) =>
                  new Promise<void>((resolve) => {
                    const el = document.createElement(c.kind === 'video' ? 'video' : 'audio') as HTMLVideoElement
                    el.preload = 'auto'
                    el.playsInline = true
                    el.muted = this.muteVideos
                    el.crossOrigin = 'anonymous'
                    const fin = () => {
                      el.onloadeddata = null
                      resolve()
                    }
                    el.onloadeddata = fin
                    el.onerror = () => {
                      this.errors.push(`${ref.name}: cannot be decoded in this browser`)
                      fin()
                    }
                    el.src = url
                    el.load()
                    if (c.kind === 'video') this.videos.set(c.id, el)
                    else this.audios.set(c.id, el as unknown as HTMLAudioElement)
                    setTimeout(fin, 8000)
                  }),
              )
              .catch((e) => this.errors.push((e as Error).message))
              .finally(() => this.pending.delete(c.id)),
          )
        } else if (c.kind === 'image' || c.kind === 'sticker' || c.kind === 'design') {
          const sig = c.kind === 'image' ? `i:${c.media}` : c.kind === 'sticker' ? `s:${c.svg}` : `d:${c.pageIndex}:${c.designKey}:${doc?.pages.length}`
          const cur = this.images.get(c.id)
          if (cur?.sig === sig || this.pending.has(c.id + sig)) continue
          this.pending.add(c.id + sig)
          jobs.push(
            (async () => {
              try {
                let src: CanvasImageSource | null = null
                if (c.kind === 'image' && c.media && p.media[c.media]) src = await loadImage(await mediaUrl(p.media[c.media]))
                else if (c.kind === 'sticker' && c.svg) src = await loadImage(svgUrl(c.svg))
                else if (c.kind === 'design' && doc) {
                  const page = doc.pages[Math.min(c.pageIndex ?? 0, doc.pages.length - 1)]
                  src = await renderPage(doc, page, { scale: Math.min(2, p.width / doc.width), includeBleed: false })
                }
                if (src) this.images.set(c.id, { sig, src })
              } catch (e) {
                this.errors.push((e as Error).message)
              } finally {
                this.pending.delete(c.id + sig)
              }
            })(),
          )
        }
      }
    for (const [id, el] of this.videos) if (!alive.has(id)) this.drop(id, el)
    for (const [id, el] of this.audios) if (!alive.has(id)) this.drop(id, el)
    for (const id of [...this.images.keys()]) if (!alive.has(id)) this.images.delete(id)
    await Promise.all(jobs)
  }

  private drop(id: string, el: HTMLMediaElement) {
    el.pause()
    el.removeAttribute('src')
    el.load()
    this.videos.delete(id)
    this.audios.delete(id)
  }

  pauseAll() {
    for (const el of [...this.videos.values(), ...this.audios.values()]) if (!el.paused) el.pause()
  }

  dispose() {
    for (const [id, el] of [...this.videos]) this.drop(id, el)
    for (const [id, el] of [...this.audios]) this.drop(id, el)
    this.images.clear()
  }
}

/** seek an element and wait until the frame is available */
export function seekElement(el: HTMLMediaElement, time: number, timeoutMs = 4000): Promise<void> {
  const t = Math.max(0, Math.min(isFinite(el.duration) && el.duration > 0 ? el.duration - 0.001 : time, time))
  if (Math.abs(el.currentTime - t) < 0.0005 && el.readyState >= 2) return Promise.resolve()
  return new Promise((resolve) => {
    let done = false
    const fin = () => {
      if (done) return
      done = true
      el.removeEventListener('seeked', fin)
      clearTimeout(to)
      resolve()
    }
    const to = setTimeout(fin, timeoutMs)
    el.addEventListener('seeked', fin)
    el.currentTime = t
  })
}
