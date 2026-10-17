import type { Anim, CaptionStyle, Clip, Track, TrackKind, TransitionType, VideoProject } from './types'
import { DEFAULT_CAPTION_STYLE } from './types'

/* ---------------- model helpers ---------------- */

let counter = 0
export const vid = (p = 'v') => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export const clipEnd = (c: Pick<Clip, 'start' | 'dur'>) => c.start + c.dur
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const r3 = (n: number) => Math.round(n * 1000) / 1000

export function newTrack(kind: TrackKind, name: string): Track {
  return { id: vid('trk'), kind, name, clips: [], muted: false, hidden: false }
}

export function newProject(width = 1920, height = 1080, fps = 30): VideoProject {
  return {
    width,
    height,
    fps,
    // array order = draw order, bottom → top (the timeline shows it reversed)
    tracks: [newTrack('audio', 'Audio 2'), newTrack('audio', 'Music'), newTrack('video', 'Video 1'), newTrack('video', 'Video 2'), newTrack('overlay', 'Text & stickers'), newTrack('caption', 'Captions')],
    media: {},
    captionStyle: { ...DEFAULT_CAPTION_STYLE },
  }
}

export function makeClip(p: Partial<Clip> & Pick<Clip, 'kind' | 'start' | 'dur'>): Clip {
  return {
    id: vid('clip'),
    name: p.kind,
    inPoint: 0,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    rotation: 0,
    opacity: 1,
    fit: 'cover',
    animIn: 'none',
    animOut: 'none',
    animDur: 0.5,
    transition: null,
    ...p,
  }
}

export function projectDuration(p: VideoProject): number {
  let d = 0
  for (const t of p.tracks) for (const c of t.clips) d = Math.max(d, clipEnd(c))
  return r3(d)
}

export const hasVideoContent = (p: VideoProject) => p.tracks.some((t) => t.clips.length > 0)

/** the clip on the same track that overlaps the start of `clip` (transition partner) */
export function transitionPartner(track: Track, clip: Clip): { prev: Clip; overlap: number } | null {
  let best: Clip | null = null
  for (const c of track.clips) {
    if (c.id === clip.id) continue
    if (c.start < clip.start && clipEnd(c) > clip.start + 1e-6 && (!best || clipEnd(c) > clipEnd(best))) best = c
  }
  return best ? { prev: best, overlap: Math.min(clipEnd(best), clipEnd(clip)) - clip.start } : null
}

function nextWithTransition(track: Track, clip: Clip, t: number): { next: Clip; p: number; type: TransitionType } | null {
  for (const n of track.clips) {
    if (n.id === clip.id || !n.transition || n.transition.type === 'none') continue
    if (n.start <= clip.start || n.start >= clipEnd(clip) || t < n.start || t >= clipEnd(clip)) continue
    const partner = transitionPartner(track, n)
    if (!partner || partner.prev.id !== clip.id) continue
    const p = clamp((t - n.start) / Math.max(1e-6, partner.overlap), 0, 1)
    return { next: n, p, type: n.transition.type }
  }
  return null
}

function ownTransition(track: Track, clip: Clip, t: number): { p: number; type: TransitionType } | null {
  if (!clip.transition || clip.transition.type === 'none') return null
  const partner = transitionPartner(track, clip)
  if (!partner) return null
  if (t >= clip.start + partner.overlap) return null
  return { p: clamp((t - clip.start) / Math.max(1e-6, partner.overlap), 0, 1), type: clip.transition.type }
}

/** linear volume at time t (clip volume, fades, transition cross-fades, track mute) */
export function clipGain(track: Track, clip: Clip, t: number): number {
  if (track.muted) return 0
  let g = clip.volume
  const local = t - clip.start
  const rem = clipEnd(clip) - t
  if (clip.fadeIn > 0) g *= clamp(local / clip.fadeIn, 0, 1)
  if (clip.fadeOut > 0) g *= clamp(rem / clip.fadeOut, 0, 1)
  const own = ownTransition(track, clip, t)
  if (own) g *= own.type === 'dip-black' ? clamp(own.p * 2 - 1, 0, 1) : own.p
  const nx = nextWithTransition(track, clip, t)
  if (nx) g *= nx.type === 'dip-black' ? clamp(1 - nx.p * 2, 0, 1) : 1 - nx.p
  return Math.max(0, g)
}

/* ---------------- animation ---------------- */

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const backOut = (x: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

export interface AnimState {
  alpha: number
  dx: number
  dy: number
  scale: number
  chars: number // 0..1 fraction of text shown
}

export function animState(c: Clip, t: number): AnimState {
  const s: AnimState = { alpha: 1, dx: 0, dy: 0, scale: 1, chars: 1 }
  const d = Math.max(0.05, Math.min(c.animDur, c.dur / 2))
  const pin = clamp((t - c.start) / d, 0, 1)
  const pout = clamp((clipEnd(c) - t) / d, 0, 1)
  const apply = (a: Anim, p: number, out: boolean) => {
    if (a === 'none' || p >= 1) return
    const e = easeOut(p)
    if (a === 'fade') s.alpha *= p
    else if (a === 'slide-up') {
      s.alpha *= e
      s.dy += (out ? -1 : 1) * (1 - e) * 80
    } else if (a === 'slide-left') {
      s.alpha *= e
      s.dx += (out ? -1 : 1) * (1 - e) * 160
    } else if (a === 'pop') {
      s.alpha *= Math.min(1, p * 2)
      s.scale *= Math.max(0, backOut(p))
    } else if (a === 'bounce') {
      s.alpha *= Math.min(1, p * 3)
      s.dy += -Math.abs(Math.sin(p * Math.PI * 2.5)) * (1 - p) * 90
    } else if (a === 'typewriter') {
      if (!out) s.chars = p
      else s.alpha *= p
    }
  }
  apply(c.animIn, pin, false)
  apply(c.animOut, pout, true)
  return s
}

/* ---------------- drawing ---------------- */

export interface FrameSources {
  video(clip: Clip): CanvasImageSource | null
  image(clip: Clip): CanvasImageSource | null
}

function srcSize(s: CanvasImageSource): { w: number; h: number } {
  const a = s as unknown as { videoWidth?: number; videoHeight?: number; naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }
  return { w: a.videoWidth || a.naturalWidth || (a.width as number) || 1, h: a.videoHeight || a.naturalHeight || (a.height as number) || 1 }
}

function drawFit(ctx: CanvasRenderingContext2D, src: CanvasImageSource, x: number, y: number, w: number, h: number, fit: 'cover' | 'contain') {
  const { w: sw, h: sh } = srcSize(src)
  const k = fit === 'cover' ? Math.max(w / sw, h / sh) : Math.min(w / sw, h / sh)
  const dw = sw * k
  const dh = sh * k
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (!words.length) {
      out.push('')
      continue
    }
    let cur = ''
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w
      if (cur && ctx.measureText(test).width > maxW) {
        out.push(cur)
        cur = w
      } else cur = test
    }
    out.push(cur)
  }
  return out
}

function drawTextBlock(ctx: CanvasRenderingContext2D, c: Clip, text: string, box: { x: number; y: number; w: number; h: number }, a: AnimState) {
  const size = c.fontSize || 64
  ctx.font = `${c.fontWeight || 700} ${size}px ${c.fontFamily || 'Inter, sans-serif'}`
  ctx.textBaseline = 'middle'
  const full = text
  const shown = a.chars < 1 ? full.slice(0, Math.ceil(full.length * a.chars)) : full
  const lines = wrapText(ctx, full, box.w)
  const lh = size * 1.2
  const totalH = lines.length * lh
  let y = box.y + (box.h - totalH) / 2 + lh / 2
  let remaining = shown.length
  const align = c.align || 'center'
  for (const line of lines) {
    const part = line.slice(0, Math.max(0, remaining))
    remaining -= line.length + 1
    if (part || !shown.length) {
      const tw = ctx.measureText(line).width
      const x = align === 'left' ? box.x : align === 'right' ? box.x + box.w - tw : box.x + (box.w - tw) / 2
      ctx.textAlign = 'left'
      if (c.bg && part) {
        ctx.save()
        ctx.fillStyle = c.bg
        ctx.fillRect(x - size * 0.25, y - lh / 2, tw + size * 0.5, lh)
        ctx.restore()
      }
      if (c.strokeWidth && c.strokeWidth > 0) {
        ctx.save()
        ctx.lineJoin = 'round'
        ctx.lineWidth = c.strokeWidth
        ctx.strokeStyle = c.strokeColor || '#000'
        ctx.strokeText(part, x, y)
        ctx.restore()
      }
      ctx.fillStyle = c.color || '#fff'
      ctx.fillText(part, x, y)
    }
    y += lh
  }
}

function drawCaption(ctx: CanvasRenderingContext2D, p: VideoProject, c: Clip, t: number) {
  const st: CaptionStyle = p.captionStyle
  const raw = c.text || ''
  const text = st.uppercase ? raw.toUpperCase() : raw
  ctx.save()
  ctx.font = `${st.fontWeight} ${st.fontSize}px ${st.fontFamily}`
  ctx.textBaseline = 'middle'
  const maxW = (p.width * st.maxWidthPct) / 100
  const lines = wrapText(ctx, text, maxW)
  const lh = st.fontSize * 1.25
  const padX = st.fontSize * 0.45
  const padY = st.fontSize * 0.25
  const totalH = lines.length * lh + padY * 2
  const margin = p.height * 0.06
  const top = st.position === 'top' ? margin : st.position === 'middle' ? (p.height - totalH) / 2 : p.height - margin - totalH
  const fade = clamp((t - c.start) / 0.12, 0, 1) * clamp((clipEnd(c) - t) / 0.12, 0, 1)
  ctx.globalAlpha *= fade
  let y = top + padY + lh / 2
  for (const line of lines) {
    const tw = ctx.measureText(line).width
    const x = (p.width - tw) / 2
    if (st.bgOpacity > 0 && line) {
      ctx.fillStyle = hexA(st.bg, st.bgOpacity)
      roundRect(ctx, x - padX, y - lh / 2, tw + padX * 2, lh, st.fontSize * 0.2)
      ctx.fill()
    }
    if (st.strokeWidth > 0) {
      ctx.lineJoin = 'round'
      ctx.lineWidth = st.strokeWidth
      ctx.strokeStyle = st.strokeColor
      ctx.strokeText(line, x, y)
    }
    ctx.fillStyle = st.color
    ctx.fillText(line, x, y)
    y += lh
  }
  ctx.restore()
}

function hexA(hex: string, a: number) {
  const m = /^#([0-9a-f]{6})/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

interface Visual {
  alpha: number
  dx: number
  scale: number
  clip?: [number, number, number, number]
}

function drawClip(ctx: CanvasRenderingContext2D, p: VideoProject, track: Track, c: Clip, t: number, src: FrameSources, vis: Visual) {
  if (c.kind === 'audio') return
  ctx.save()
  const a = animState(c, t)
  ctx.globalAlpha = clamp(c.opacity * vis.alpha * a.alpha, 0, 1)
  if (vis.clip) {
    ctx.beginPath()
    ctx.rect(...vis.clip)
    ctx.clip()
  }
  if (c.kind === 'caption') {
    drawCaption(ctx, p, c, t)
    ctx.restore()
    return
  }
  const box = { x: c.x, y: c.y, w: c.w || p.width, h: c.h || p.height }
  const cx = box.x + box.w / 2 + a.dx + vis.dx
  const cy = box.y + box.h / 2 + a.dy
  ctx.translate(cx, cy)
  if (c.rotation) ctx.rotate((c.rotation * Math.PI) / 180)
  const sc = a.scale * vis.scale
  if (sc !== 1) ctx.scale(sc, sc)
  ctx.translate(-box.w / 2, -box.h / 2)
  const local = { x: 0, y: 0, w: box.w, h: box.h }
  if (c.kind === 'video') {
    const v = src.video(c)
    if (v) drawFit(ctx, v, local.x, local.y, local.w, local.h, c.fit)
  } else if (c.kind === 'image' || c.kind === 'sticker' || c.kind === 'design') {
    const im = src.image(c)
    if (im) drawFit(ctx, im, local.x, local.y, local.w, local.h, c.kind === 'image' ? c.fit : 'contain')
  } else if (c.kind === 'text') {
    drawTextBlock(ctx, c, c.text || '', local, a)
  }
  ctx.restore()
}

/** Draw the project at time t. `ctx` must already be scaled so that project pixels are 1 unit. */
export function drawFrame(ctx: CanvasRenderingContext2D, p: VideoProject, t: number, src: FrameSources) {
  ctx.save()
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, p.width, p.height)
  for (const track of p.tracks) {
    if (track.kind === 'audio' || track.hidden) continue
    const active = track.clips.filter((c) => t >= c.start && t < clipEnd(c)).sort((a, b) => a.start - b.start)
    for (const c of active) {
      const vis: Visual = { alpha: 1, dx: 0, scale: 1 }
      if (track.kind === 'video') {
        const out = nextWithTransition(track, c, t)
        if (out) {
          if (out.type === 'dip-black' && out.p >= 0.5) continue
          if (out.type === 'slide-left') vis.dx = -out.p * p.width
        }
        const own = ownTransition(track, c, t)
        if (own) {
          const q = own.p
          switch (own.type) {
            case 'crossfade':
              vis.alpha = q
              break
            case 'dip-black':
              if (q < 0.5) {
                // paint the fading-out black over what is below, skip this clip
                ctx.save()
                ctx.globalAlpha = q * 2
                ctx.fillStyle = '#000'
                ctx.fillRect(0, 0, p.width, p.height)
                ctx.restore()
                continue
              }
              ctx.save()
              ctx.fillStyle = '#000'
              ctx.fillRect(0, 0, p.width, p.height)
              ctx.restore()
              vis.alpha = q * 2 - 1
              break
            case 'wipe-left':
              vis.clip = [0, 0, p.width * q, p.height]
              break
            case 'wipe-right':
              vis.clip = [p.width * (1 - q), 0, p.width * q, p.height]
              break
            case 'slide-left':
              vis.dx = (1 - q) * p.width
              break
            case 'zoom':
              vis.alpha = q
              vis.scale = 1 + (1 - q) * 0.5
              break
          }
        }
      }
      drawClip(ctx, p, track, c, t, src, vis)
    }
  }
  ctx.restore()
}

/** clips that must be decoded/seeked at time t */
export function activeMediaClips(p: VideoProject, t: number): { track: Track; clip: Clip }[] {
  const out: { track: Track; clip: Clip }[] = []
  for (const track of p.tracks) for (const clip of track.clips) if ((clip.kind === 'video' || clip.kind === 'audio') && t >= clip.start && t < clipEnd(clip)) out.push({ track, clip })
  return out
}

/* ---------------- timeline editing ---------------- */

export function findClip(p: VideoProject, id: string | null): { track: Track; clip: Clip } | null {
  if (!id) return null
  for (const track of p.tracks) {
    const clip = track.clips.find((c) => c.id === id)
    if (clip) return { track, clip }
  }
  return null
}

export function mapClips(p: VideoProject, fn: (c: Clip, t: Track) => Clip): VideoProject {
  return { ...p, tracks: p.tracks.map((t) => ({ ...t, clips: t.clips.map((c) => fn(c, t)) })) }
}

/** split a clip at time t; returns the new project and the id of the right-hand clip */
export function splitClip(p: VideoProject, id: string, t: number): { project: VideoProject; right: string } | null {
  const f = findClip(p, id)
  if (!f) return null
  const c = f.clip
  if (t <= c.start + 0.04 || t >= clipEnd(c) - 0.04) return null
  const left: Clip = { ...c, dur: r3(t - c.start), fadeOut: 0, animOut: 'none' }
  const right: Clip = {
    ...c,
    id: vid('clip'),
    name: c.name.replace(/ \(\d+\)$/, '') + ' (2)',
    start: r3(t),
    dur: r3(clipEnd(c) - t),
    inPoint: r3(c.inPoint + (t - c.start)),
    fadeIn: 0,
    animIn: 'none',
    transition: null,
  }
  const project: VideoProject = {
    ...p,
    tracks: p.tracks.map((tr) => (tr.id === f.track.id ? { ...tr, clips: tr.clips.flatMap((x) => (x.id === id ? [left, right] : [x])) } : tr)),
  }
  return { project, right: right.id }
}

export function kindToTrack(kind: Clip['kind']): TrackKind {
  return kind === 'video' || kind === 'image' ? 'video' : kind === 'audio' ? 'audio' : kind === 'caption' ? 'caption' : 'overlay'
}

export function formatTime(t: number, fps = 30): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  const f = Math.floor((t % 1) * fps)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}
