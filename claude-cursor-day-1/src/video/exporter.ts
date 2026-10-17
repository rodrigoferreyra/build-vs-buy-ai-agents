import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
  WebMOutputFormat,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  type AudioCodec,
  type VideoCodec,
} from 'mediabunny'
import type { Doc } from '../types'
import type { VideoProject } from './types'
import { activeMediaClips, clipGain, drawFrame, projectDuration } from './engine'
import { MediaPool, seekElement } from './pool'
import { mediaBlob } from './mediaStore'

/**
 * Deterministic (faster/slower than real-time, frame-exact) video export:
 * every frame is drawn on a canvas and fed to the WebCodecs encoder through mediabunny (MP4 / WebM muxing),
 * audio is mixed offline with an OfflineAudioContext and encoded with AudioEncoder.
 */

export interface ExportOpts {
  format: 'mp4' | 'webm'
  width: number
  height: number
  fps: number
  quality: 'low' | 'medium' | 'high' | 'very-high'
  audio: boolean
  onProgress?: (frac: number, msg: string) => void
  signal?: AbortSignal
}

export interface ExportResult {
  blob: Blob
  ext: string
  mime: string
  videoCodec: string
  audioCodec: string | null
  width: number
  height: number
  fps: number
  frames: number
  duration: number
  seconds: number
  notes: string[]
}

export const RESOLUTIONS: { label: string; h: number }[] = [
  { label: '720p', h: 720 },
  { label: '1080p (Full HD)', h: 1080 },
  { label: '1440p (QHD)', h: 1440 },
  { label: '2160p (4K UHD)', h: 2160 },
]

export function webCodecsAvailable() {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

const QUALITY = { low: QUALITY_LOW, medium: QUALITY_MEDIUM, high: QUALITY_HIGH, 'very-high': QUALITY_VERY_HIGH }
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)

export async function mixAudio(p: VideoProject, duration: number, sampleRate = 48000): Promise<AudioBuffer | null> {
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(duration * sampleRate)), sampleRate)
  const decoded = new Map<string, AudioBuffer | null>()
  let used = 0
  for (const track of p.tracks) {
    if (track.muted || track.kind === 'caption' || track.kind === 'overlay') continue
    for (const clip of track.clips) {
      if ((clip.kind !== 'audio' && clip.kind !== 'video') || !clip.media) continue
      const ref = p.media[clip.media]
      if (!ref) continue
      if (!decoded.has(ref.id)) {
        try {
          const blob = await mediaBlob(ref)
          decoded.set(ref.id, await ctx.decodeAudioData(await blob.arrayBuffer()))
        } catch {
          decoded.set(ref.id, null) // video without an audio track, or undecodable
        }
      }
      const buf = decoded.get(ref.id)
      if (!buf) continue
      const src = ctx.createBufferSource()
      src.buffer = buf
      const g = ctx.createGain()
      const step = 0.02
      g.gain.setValueAtTime(clipGain(track, clip, clip.start), Math.max(0, clip.start))
      for (let t = clip.start + step; t < clip.start + clip.dur; t += step) g.gain.linearRampToValueAtTime(clipGain(track, clip, t), t)
      g.gain.linearRampToValueAtTime(0, clip.start + clip.dur)
      src.connect(g).connect(ctx.destination)
      src.start(Math.max(0, clip.start), Math.max(0, clip.inPoint), clip.dur)
      used++
    }
  }
  if (!used) return null
  return ctx.startRendering()
}

export async function exportVideo(p: VideoProject, doc: Doc | null, o: ExportOpts): Promise<ExportResult> {
  const t0 = performance.now()
  const notes: string[] = []
  const duration = projectDuration(p)
  if (duration <= 0) throw new Error('The timeline is empty – add a clip first')
  if (!webCodecsAvailable()) throw new Error('This browser has no WebCodecs (VideoEncoder). Use a current Chrome, Edge, Safari or Firefox.')
  const W = even(o.width)
  const H = even(o.height)
  const fps = Math.max(1, Math.min(120, Math.round(o.fps)))
  const frames = Math.max(1, Math.round(duration * fps))
  const progress = o.onProgress || (() => {})

  const format = o.format === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat()
  const supV = format.getSupportedVideoCodecs()
  const prefV: VideoCodec[] = o.format === 'mp4' ? ['avc', 'hevc', 'vp9', 'av1'] : ['vp9', 'av1', 'vp8']
  const quality = QUALITY[o.quality]
  const vCodec = await getFirstEncodableVideoCodec(prefV.filter((c) => supV.includes(c)), { width: W, height: H, quality, frameRate: fps })
  if (!vCodec) throw new Error(`No video encoder in this browser can encode ${W}×${H} ${o.format.toUpperCase()} – try a lower resolution or WebM.`)
  if (o.format === 'mp4' && vCodec !== 'avc') notes.push(`H.264 is not available in this browser, so the MP4 contains ${vCodec.toUpperCase()} video (plays in modern browsers/VLC; choose WebM for the most compatible file).`)

  progress(0, 'Loading media…')
  const pool = new MediaPool(true)
  try {
    await pool.sync(p, doc)
    pool.errors.forEach((e) => notes.push(e))

    let audioBuf: AudioBuffer | null = null
    let aCodec: AudioCodec | null = null
    if (o.audio) {
      progress(0, 'Mixing audio…')
      audioBuf = await mixAudio(p, duration)
      if (audioBuf) {
        const supA = format.getSupportedAudioCodecs()
        const prefA: AudioCodec[] = o.format === 'mp4' ? ['aac', 'opus'] : ['opus', 'vorbis']
        aCodec = await getFirstEncodableAudioCodec(prefA.filter((c) => supA.includes(c)), { numberOfChannels: 2, sampleRate: audioBuf.sampleRate })
        if (!aCodec) {
          notes.push('No audio encoder available in this browser – exported without sound.')
          audioBuf = null
        }
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d', { alpha: false })!
    const target = new BufferTarget()
    const output = new Output({ format, target })
    const vSource = new CanvasSource(canvas, { codec: vCodec, quality, keyFrameInterval: 2 })
    output.addVideoTrack(vSource, { frameRate: fps })
    let aSource: AudioBufferSource | null = null
    if (audioBuf && aCodec) {
      aSource = new AudioBufferSource({ codec: aCodec, quality: QUALITY_HIGH })
      output.addAudioTrack(aSource)
    }
    await output.start()
    if (aSource && audioBuf) await aSource.add(audioBuf)

    const sx = W / p.width
    const sy = H / p.height
    for (let i = 0; i < frames; i++) {
      if (o.signal?.aborted) {
        await output.cancel()
        throw new Error('Export cancelled')
      }
      const t = i / fps
      for (const { clip } of activeMediaClips(p, t)) {
        const el = pool.videos.get(clip.id)
        if (el && clip.kind === 'video') await seekElement(el, clip.inPoint + (t - clip.start))
      }
      ctx.setTransform(sx, 0, 0, sy, 0, 0)
      drawFrame(ctx, p, t, pool)
      await vSource.add(t, 1 / fps)
      if (i % 5 === 0) {
        progress((i + 1) / frames, `Encoding frame ${i + 1} / ${frames}`)
        await new Promise((r) => setTimeout(r, 0))
      }
    }
    vSource.close()
    aSource?.close()
    progress(1, 'Finalising file…')
    await output.finalize()
    const buffer = target.buffer
    if (!buffer) throw new Error('Encoder produced no data')
    const mime = o.format === 'mp4' ? 'video/mp4' : 'video/webm'
    return {
      blob: new Blob([buffer], { type: mime }),
      ext: o.format,
      mime,
      videoCodec: vCodec,
      audioCodec: aSource ? aCodec : null,
      width: W,
      height: H,
      fps,
      frames,
      duration,
      seconds: (performance.now() - t0) / 1000,
      notes,
    }
  } finally {
    pool.dispose()
  }
}
