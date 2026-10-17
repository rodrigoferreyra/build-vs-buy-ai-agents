import type { Doc } from '../types'
import type { VideoProject } from './types'
import { activeMediaClips, clipGain, drawFrame, projectDuration } from './engine'
import { MediaPool } from './pool'

/** Real-time preview: draws the project into a canvas and keeps the media elements in sync. */
export class Player {
  pool = new MediaPool(false)
  t = 0
  playing = false
  private raf = 0
  private wall0 = 0
  private t0 = 0
  private project: VideoProject
  private doc: Doc | null = null
  listeners = new Set<() => void>()

  constructor(private canvas: HTMLCanvasElement, project: VideoProject) {
    this.project = project
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
  }

  get duration() {
    return projectDuration(this.project)
  }

  async setProject(p: VideoProject, doc: Doc | null) {
    this.project = p
    this.doc = doc
    if (this.canvas.width !== p.width || this.canvas.height !== p.height) {
      this.canvas.width = p.width
      this.canvas.height = p.height
    }
    await this.pool.sync(p, doc)
    this.syncMedia(true)
  }

  seek(t: number) {
    this.t = Math.max(0, Math.min(t, Math.max(0, this.duration)))
    this.t0 = this.t
    this.wall0 = performance.now()
    this.syncMedia(true)
    this.emit()
  }

  play() {
    if (this.playing) return
    if (this.t >= this.duration - 0.02) this.t = 0
    this.playing = true
    this.t0 = this.t
    this.wall0 = performance.now()
    this.syncMedia(true)
    this.emit()
  }

  pause() {
    if (!this.playing) return
    this.playing = false
    this.pool.pauseAll()
    this.emit()
  }

  toggle() {
    if (this.playing) this.pause()
    else this.play()
  }

  private emit() {
    this.listeners.forEach((l) => l())
  }

  /** align every media element with the playhead */
  private syncMedia(force: boolean) {
    const active = activeMediaClips(this.project, this.t)
    const activeIds = new Set(active.map((a) => a.clip.id))
    for (const [id, el] of [...this.pool.videos, ...this.pool.audios]) if (!activeIds.has(id) && !el.paused) el.pause()
    for (const { track, clip } of active) {
      const el = this.pool.videos.get(clip.id) || this.pool.audios.get(clip.id)
      if (!el || el.readyState < 1) continue
      const target = clip.inPoint + (this.t - clip.start)
      const drift = Math.abs(el.currentTime - target)
      if (force ? drift > 0.03 : drift > 0.25) el.currentTime = target
      el.volume = Math.max(0, Math.min(1, clipGain(track, clip, this.t)))
      if (this.playing && el.paused) el.play().catch(() => {})
      else if (!this.playing && !el.paused) el.pause()
    }
  }

  private loop() {
    this.raf = requestAnimationFrame(this.loop)
    if (this.playing) {
      this.t = this.t0 + (performance.now() - this.wall0) / 1000
      if (this.t >= this.duration) {
        this.t = this.duration
        this.pause()
      } else this.syncMedia(false)
      this.emit()
    }
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return
    drawFrame(ctx, this.project, this.t, this.pool)
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.pool.dispose()
    this.listeners.clear()
  }

  getDoc() {
    return this.doc
  }
}
