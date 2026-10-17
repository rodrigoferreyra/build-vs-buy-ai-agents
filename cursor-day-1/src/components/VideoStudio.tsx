import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createDefaultVideoProject,
  type VideoClip,
  type VideoProject,
} from '../types/video'
import { newId } from '../types/document'
import { parseSrt } from '../utils/srtParser'

const STORAGE_KEY = 'cursor-day-1-video-project'

function loadProject(): VideoProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as VideoProject
  } catch {
    /* ignore */
  }
  return createDefaultVideoProject()
}

export function VideoStudio() {
  const [project, setProject] = useState<VideoProject>(() => loadProject())
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const lastTs = useRef(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  }, [project])

  const videoTracks = useMemo(() => project.tracks.filter((t) => t.kind === 'video'), [project.tracks])
  const overlayTrack = project.tracks.find((t) => t.kind === 'overlay')

  const addClipFromFile = (file: File, trackId: string) => {
    const url = URL.createObjectURL(file)
    const clip: VideoClip = {
      id: newId(),
      name: file.name,
      src: url,
      trackId,
      startTime: playhead,
      duration: 4,
      trimIn: 0,
      trimOut: 4,
      transition: project.clips.length ? 'crossfade' : 'none',
      transitionDuration: 0.5,
    }
    setProject((p) => ({
      ...p,
      clips: [...p.clips, clip],
      duration: Math.max(p.duration, clip.startTime + clip.duration),
    }))
  }

  const splitClip = (id: string) => {
    setProject((p) => {
      const c = p.clips.find((x) => x.id === id)
      if (!c) return p
      const mid = playhead - c.startTime
      if (mid <= 0.1 || mid >= c.duration - 0.1) return p
      const a: VideoClip = { ...c, duration: mid, trimOut: c.trimIn + mid }
      const b: VideoClip = {
        ...c,
        id: newId(),
        startTime: c.startTime + mid,
        duration: c.duration - mid,
        trimIn: c.trimIn + mid,
      }
      return { ...p, clips: p.clips.filter((x) => x.id !== id).concat([a, b]) }
    })
  }

  const trimClip = (id: string, edge: 'in' | 'out') => {
    setProject((p) => ({
      ...p,
      clips: p.clips.map((c) => {
        if (c.id !== id) return c
        if (edge === 'in') {
          const delta = Math.max(0, playhead - c.startTime)
          return {
            ...c,
            startTime: c.startTime + delta,
            duration: c.duration - delta,
            trimIn: c.trimIn + delta,
          }
        }
        const delta = Math.max(0, c.startTime + c.duration - playhead)
        return { ...c, duration: c.duration - delta, trimOut: c.trimOut - delta }
      }),
    }))
  }

  const loadSrt = (text: string) => {
    const captions = parseSrt(text)
    setProject((p) => ({ ...p, captions }))
  }

  const addOverlayText = () => {
    if (!overlayTrack) return
    const clip: VideoClip = {
      id: newId(),
      name: 'Title overlay',
      src: `text:${window.prompt('Overlay text', 'Hello') ?? 'Hello'}`,
      trackId: overlayTrack.id,
      startTime: playhead,
      duration: 3,
      trimIn: 0,
      trimOut: 3,
    }
    setProject((p) => ({ ...p, clips: [...p.clips, clip] }))
  }

  const renderFrame = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const scale = canvas.width / project.width
    ctx.save()
    ctx.scale(scale, scale)

    for (const clip of project.clips.filter((c) => c.trackId !== overlayTrack?.id)) {
      const localT = playhead - clip.startTime + clip.trimIn
      if (playhead < clip.startTime || playhead > clip.startTime + clip.duration) continue
      if (clip.src.startsWith('text:')) continue
      const vid = document.createElement('video')
      vid.src = clip.src
      vid.muted = true
      vid.currentTime = Math.min(localT, clip.trimOut)
      await new Promise<void>((resolve) => {
        vid.onseeked = () => resolve()
        vid.onloadeddata = () => {
          vid.currentTime = Math.min(localT, clip.trimOut)
        }
      })
      const alpha =
        clip.transition === 'crossfade' && playhead - clip.startTime < (clip.transitionDuration ?? 0.5)
          ? (playhead - clip.startTime) / (clip.transitionDuration ?? 0.5)
          : 1
      ctx.globalAlpha = alpha
      ctx.drawImage(vid, 0, 0, project.width, project.height)
      ctx.globalAlpha = 1
    }

    for (const cue of project.captions) {
      if (playhead >= cue.start && playhead <= cue.end) {
        ctx.fillStyle = cue.style?.color ?? '#fff'
        ctx.font = `${cue.style?.fontSize ?? 28}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(cue.text, project.width / 2, project.height - 80, project.width - 120)
      }
    }

    for (const clip of project.clips.filter((c) => c.trackId === overlayTrack?.id)) {
      if (playhead < clip.startTime || playhead > clip.startTime + clip.duration) continue
      const label = clip.src.replace(/^text:/, '')
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 48px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, project.width / 2, project.height * 0.2)
    }

    ctx.restore()
  }, [overlayTrack?.id, playhead, project])

  useEffect(() => {
    void renderFrame()
  }, [renderFrame])

  useEffect(() => {
    if (!playing) return
    const tick = (ts: number) => {
      if (!lastTs.current) lastTs.current = ts
      const dt = (ts - lastTs.current) / 1000
      lastTs.current = ts
      setPlayhead((t) => {
        const next = t + dt
        if (next >= project.duration) {
          setPlaying(false)
          return project.duration
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      lastTs.current = 0
    }
  }, [playing, project.duration])

  const exportMp4 = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const stream = canvas.captureStream(project.fps)
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const rec = new MediaRecorder(stream, { mimeType: mime })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    const stopped = new Promise<void>((resolve) => {
      rec.onstop = () => resolve()
    })
    rec.start(1000 / project.fps)
    setPlaying(false)
    for (let t = 0; t <= project.duration; t += 1 / project.fps) {
      setPlayhead(t)
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
      await renderFrame()
      await new Promise((r) => setTimeout(r, 1000 / project.fps))
    }
    rec.stop()
    await stopped
    const blob = new Blob(chunks, { type: mime })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${project.name.replace(/\s+/g, '-')}-${project.width}p-${project.fps}fps.webm`
    a.click()
  }

  return (
    <div className="video-studio" role="region" aria-label="Video editor">
      <header className="video-toolbar">
        <h1>Video studio</h1>
        <label className="file-btn">
          Add video clip
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              const track = videoTracks[0]
              if (f && track) addClipFromFile(f, track.id)
              e.target.value = ''
            }}
          />
        </label>
        <label className="file-btn">
          Add music
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              const audioTrack = project.tracks.find((t) => t.kind === 'audio')
              if (f && audioTrack) addClipFromFile(f, audioTrack.id)
              e.target.value = ''
            }}
          />
        </label>
        <button type="button" onClick={addOverlayText}>
          Text overlay
        </button>
        <label className="file-btn">
          Load SRT
          <input
            type="file"
            accept=".srt,text/plain"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              void f.text().then(loadSrt)
              e.target.value = ''
            }}
          />
        </label>
        <button type="button" onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => selectedClipId && splitClip(selectedClipId)}>
          Split at playhead
        </button>
        <button type="button" onClick={() => selectedClipId && trimClip(selectedClipId, 'in')}>
          Trim in
        </button>
        <button type="button" onClick={() => selectedClipId && trimClip(selectedClipId, 'out')}>
          Trim out
        </button>
        <label>
          FPS
          <select
            value={project.fps}
            onChange={(e) => setProject((p) => ({ ...p, fps: parseInt(e.target.value, 10) }))}
          >
            <option value={24}>24</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>
        <label>
          Resolution
          <select
            value={project.width}
            onChange={(e) => {
              const w = parseInt(e.target.value, 10)
              setProject((p) => ({ ...p, width: w, height: w === 3840 ? 2160 : 1080 }))
            }}
          >
            <option value={1920}>1080p</option>
            <option value={3840}>4K</option>
          </select>
        </label>
        <button type="button" onClick={() => void exportMp4()}>
          Export MP4/WebM
        </button>
      </header>
      <div className="video-main">
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="video-preview"
          aria-label="Video preview"
        />
        <div className="video-timeline" role="group" aria-label="Timeline">
          <input
            type="range"
            min={0}
            max={project.duration}
            step={0.01}
            value={playhead}
            onChange={(e) => setPlayhead(parseFloat(e.target.value))}
            aria-label="Playhead"
          />
          {project.tracks.map((track) => (
            <div key={track.id} className="track-row">
              <span className="track-label">{track.label}</span>
              <div className="track-clips">
                {project.clips
                  .filter((c) => c.trackId === track.id)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={selectedClipId === c.id ? 'clip selected' : 'clip'}
                      style={{
                        left: `${(c.startTime / project.duration) * 100}%`,
                        width: `${(c.duration / project.duration) * 100}%`,
                      }}
                      onClick={() => setSelectedClipId(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          {project.captions.length > 0 && (
            <p className="muted">{project.captions.length} caption cues loaded</p>
          )}
        </div>
      </div>
    </div>
  )
}
