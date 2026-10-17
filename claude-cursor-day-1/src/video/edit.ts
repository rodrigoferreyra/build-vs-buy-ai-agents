import type { Clip, MediaRef, Track, TransitionType, VideoProject } from './types'
import { clamp, clipEnd, findClip, kindToTrack, makeClip, newTrack, r3, transitionPartner } from './engine'
import type { Cue } from './srt'

/** Pure timeline edit operations (VideoProject → VideoProject). */

export function updateClip(p: VideoProject, id: string, patch: Partial<Clip>): VideoProject {
  return { ...p, tracks: p.tracks.map((t) => (t.clips.some((c) => c.id === id) ? { ...t, clips: t.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : t)) }
}

export function updateTrack(p: VideoProject, id: string, patch: Partial<Track>): VideoProject {
  return { ...p, tracks: p.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }
}

export function removeClip(p: VideoProject, id: string): VideoProject {
  return { ...p, tracks: p.tracks.map((t) => (t.clips.some((c) => c.id === id) ? { ...t, clips: t.clips.filter((c) => c.id !== id) } : t)) }
}

export function addTrack(p: VideoProject, kind: Track['kind']): VideoProject {
  const same = p.tracks.filter((t) => t.kind === kind).length
  const label = kind === 'video' ? `Video ${same + 1}` : kind === 'audio' ? `Audio ${same + 1}` : kind === 'overlay' ? `Overlay ${same + 1}` : `Captions ${same + 1}`
  const t = newTrack(kind, label)
  const tracks = [...p.tracks]
  if (kind === 'audio') tracks.unshift(t)
  else {
    // new visual tracks go above the last visual track of that kind (draw order)
    let at = -1
    tracks.forEach((x, i) => {
      if (x.kind === kind) at = i
    })
    if (at < 0) tracks.push(t)
    else tracks.splice(at + 1, 0, t)
  }
  return { ...p, tracks }
}

export function removeTrack(p: VideoProject, id: string): VideoProject {
  const t = p.tracks.find((x) => x.id === id)
  if (!t || p.tracks.filter((x) => x.kind === t.kind).length <= 1) return p
  return { ...p, tracks: p.tracks.filter((x) => x.id !== id) }
}

/** first free start >= want on a track (clips never silently stack unless a transition overlaps them) */
export function freeStart(track: Track, want: number, dur: number): number {
  let s = want
  for (let i = 0; i < 50; i++) {
    const hit = track.clips.find((c) => s < clipEnd(c) - 1e-6 && s + dur > c.start + 1e-6)
    if (!hit) return r3(s)
    s = clipEnd(hit)
  }
  return r3(s)
}

export function pickTrack(p: VideoProject, kind: Track['kind'], prefer?: string | null): Track {
  const pref = p.tracks.find((t) => t.id === prefer && t.kind === kind)
  if (pref) return pref
  const list = p.tracks.filter((t) => t.kind === kind)
  // the lowest video track / the music track first
  return kind === 'audio' ? list[list.length - 1] : list[0]
}

function pipBox(p: VideoProject, ratio: number) {
  const w = p.width * 0.38
  const h = w / ratio
  return { x: p.width - w - p.width * 0.04, y: p.height - h - p.height * 0.06, w, h }
}

export function addMediaClip(p: VideoProject, ref: MediaRef, at: number, targetTrack?: string | null): { project: VideoProject; id: string } {
  const kind = ref.kind === 'audio' ? 'audio' : 'video'
  const track = pickTrack(p, kind, targetTrack)
  const dur = ref.kind === 'image' ? 4 : Math.max(0.2, r3(ref.duration || 4))
  const start = freeStart(track, at, dur)
  const firstVideo = p.tracks.find((t) => t.kind === 'video')
  let box = { x: 0, y: 0, w: p.width, h: p.height }
  if (kind === 'video' && track.id !== firstVideo?.id) box = pipBox(p, (ref.w || 16) / (ref.h || 9))
  const clip = makeClip({
    kind: ref.kind === 'audio' ? 'audio' : ref.kind === 'image' ? 'image' : 'video',
    name: ref.name,
    media: ref.id,
    start,
    dur,
    ...(kind === 'video' ? { ...box, fit: track.id !== firstVideo?.id ? 'contain' : 'cover' } : {}),
  })
  return {
    project: { ...p, media: { ...p.media, [ref.id]: ref }, tracks: p.tracks.map((t) => (t.id === track.id ? { ...t, clips: [...t.clips, clip] } : t)) },
    id: clip.id,
  }
}

export function addOverlayClip(p: VideoProject, c: Partial<Clip> & Pick<Clip, 'kind' | 'dur'>, at: number): { project: VideoProject; id: string } {
  const track = pickTrack(p, kindToTrack(c.kind))
  const clip = makeClip({ ...c, start: r3(at) })
  return { project: { ...p, tracks: p.tracks.map((t) => (t.id === track.id ? { ...t, clips: [...t.clips, clip] } : t)) }, id: clip.id }
}

export function addTextClip(p: VideoProject, at: number, text = 'Your headline'): { project: VideoProject; id: string } {
  return addOverlayClip(
    p,
    {
      kind: 'text',
      name: 'Text',
      dur: 3,
      text,
      x: p.width * 0.1,
      y: p.height * 0.38,
      w: p.width * 0.8,
      h: p.height * 0.24,
      fontFamily: '"Inter", sans-serif',
      fontSize: Math.round(p.height * 0.09),
      fontWeight: 800,
      color: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 0,
      align: 'center',
      animIn: 'slide-up',
      animOut: 'fade',
      animDur: 0.6,
    },
    at,
  )
}

export function addStickerClip(p: VideoProject, svg: string, name: string, at: number): { project: VideoProject; id: string } {
  const s = p.height * 0.28
  return addOverlayClip(p, { kind: 'sticker', name, svg, dur: 3, x: p.width * 0.08, y: p.height * 0.08, w: s, h: s, animIn: 'pop', animOut: 'fade', animDur: 0.5 }, at)
}

export function addDesignClip(p: VideoProject, pageIndex: number, at: number, name: string): { project: VideoProject; id: string } {
  return addOverlayClip(p, { kind: 'design', name, pageIndex, designKey: Date.now(), dur: 4, x: 0, y: 0, w: p.width, h: p.height, animIn: 'fade', animOut: 'fade', animDur: 0.4 }, at)
}

/** replace the caption track content with these cues */
export function setCaptions(p: VideoProject, cues: Cue[], replace = true): VideoProject {
  let track = p.tracks.find((t) => t.kind === 'caption')
  let tracks = p.tracks
  if (!track) {
    track = newTrack('caption', 'Captions')
    tracks = [...tracks, track]
  }
  const clips = cues.map((c, i) => makeClip({ kind: 'caption', name: `Cue ${i + 1}`, start: r3(c.start), dur: r3(c.end - c.start), text: c.text }))
  const id = track.id
  return { ...p, tracks: tracks.map((t) => (t.id === id ? { ...t, clips: replace ? clips : [...t.clips, ...clips] } : t)) }
}

export function captionCues(p: VideoProject): Cue[] {
  return p.tracks
    .filter((t) => t.kind === 'caption')
    .flatMap((t) => t.clips)
    .sort((a, b) => a.start - b.start)
    .map((c) => ({ start: c.start, end: clipEnd(c), text: c.text || '' }))
}

/** move clip to `start` (optionally to another track of the same kind) */
export function moveClip(p: VideoProject, id: string, start: number, trackId?: string): VideoProject {
  const f = findClip(p, id)
  if (!f) return p
  const to = trackId && trackId !== f.track.id ? p.tracks.find((t) => t.id === trackId) : null
  const moved = { ...f.clip, start: r3(Math.max(0, start)) }
  if (!to || to.kind !== f.track.kind) return updateClip(p, id, { start: moved.start })
  return { ...p, tracks: p.tracks.map((t) => (t.id === f.track.id ? { ...t, clips: t.clips.filter((c) => c.id !== id) } : t.id === to.id ? { ...t, clips: [...t.clips, moved] } : t)) }
}

export function mediaLimit(p: VideoProject, c: Clip): number {
  if (c.kind !== 'video' && c.kind !== 'audio') return Infinity
  const ref = c.media ? p.media[c.media] : null
  return ref && ref.duration > 0 ? ref.duration : Infinity
}

export function trimClip(p: VideoProject, id: string, edge: 'l' | 'r', orig: Clip, delta: number): VideoProject {
  const limit = mediaLimit(p, orig)
  const isMedia = orig.kind === 'video' || orig.kind === 'audio'
  if (edge === 'r') {
    const maxDur = isMedia ? limit - orig.inPoint : Infinity
    return updateClip(p, id, { dur: r3(clamp(orig.dur + delta, 0.1, maxDur)) })
  }
  let d = clamp(delta, -Math.min(orig.start, isMedia ? orig.inPoint : orig.start), orig.dur - 0.1)
  d = r3(d)
  return updateClip(p, id, { start: r3(orig.start + d), dur: r3(orig.dur - d), inPoint: isMedia ? r3(orig.inPoint + d) : orig.inPoint })
}

/** set a transition INTO clip `id` – clips on that track after it ripple so the overlap equals `dur` */
export function applyTransition(p: VideoProject, id: string, type: TransitionType, dur: number): VideoProject {
  const f = findClip(p, id)
  if (!f) return p
  const { track, clip } = f
  if (type === 'none') return updateClip(p, id, { transition: null })
  const partner = transitionPartner(track, clip)
  let prev: Clip | null = partner?.prev ?? null
  if (!prev) {
    // adjacent previous clip
    for (const c of track.clips) if (c.id !== id && c.start < clip.start && Math.abs(clipEnd(c) - clip.start) < 0.06 && (!prev || clipEnd(c) > clipEnd(prev))) prev = c
  }
  if (!prev) return updateClip(p, id, { transition: { type, dur } })
  const cur = partner ? partner.overlap : 0
  const want = clamp(dur, 0.1, Math.max(0.1, Math.min(prev.dur, clip.dur) * 0.9))
  const shift = cur - want // >0 : later
  const tracks = p.tracks.map((t) =>
    t.id !== track.id
      ? t
      : {
          ...t,
          clips: t.clips.map((c) => {
            if (c.id === id) return { ...c, start: r3(c.start + shift), transition: { type, dur: r3(want) } }
            if (c.start > clip.start + 1e-6) return { ...c, start: r3(c.start + shift) }
            return c
          }),
        },
  )
  return { ...p, tracks }
}

export function snapTime(t: number, p: VideoProject, playhead: number, thr: number, ignore: string): number {
  const cands = [0, playhead]
  for (const tr of p.tracks) for (const c of tr.clips) if (c.id !== ignore) cands.push(c.start, clipEnd(c))
  let best = t
  let bd = thr
  for (const c of cands) {
    const d = Math.abs(c - t)
    if (d < bd) {
      bd = d
      best = c
    }
  }
  return best
}
