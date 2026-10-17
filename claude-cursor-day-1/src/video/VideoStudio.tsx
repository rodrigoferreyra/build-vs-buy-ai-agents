import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { actions, history, toast, useStore } from '../store'
import { t } from '../i18n'
import { BUNDLED_FONTS } from '../fontsBundle'
import { STOCK } from '../stock'
import { downloadBlob } from '../render'
import { ColorField, Modal, Num, Row, Section, Slider, Toggle } from '../components/ui'
import type { Anim, Clip, MediaRef, TransitionType, VideoProject } from './types'
import { ANIMS, TRANSITIONS } from './types'
import { clamp, clipEnd, findClip, formatTime, newProject, projectDuration, r3, splitClip } from './engine'
import { Player } from './player'
import { SAMPLES, addMediaFile, addMediaUrl, kindOfFile } from './mediaStore'
import { SAMPLE_SRT, parseSrt, stringifySrt } from './srt'
import {
  addDesignClip,
  addMediaClip,
  addStickerClip,
  addTextClip,
  addTrack,
  applyTransition,
  captionCues,
  moveClip,
  removeClip,
  removeTrack,
  setCaptions,
  snapTime,
  trimClip,
  updateClip,
  updateTrack,
} from './edit'
import { RESOLUTIONS, exportVideo, webCodecsAvailable, type ExportResult } from './exporter'
import { openFilePicker } from '../upload'

const LABEL_W = 136
const ROW_H = 46
const RULER_H = 26

const FONT_CHOICES = [...BUNDLED_FONTS.map((f) => ({ label: f.label, css: f.css })), { label: 'Arial', css: 'Arial, Helvetica, sans-serif' }, { label: 'Georgia', css: 'Georgia, serif' }]

function usePlayerTime(player: Player | null) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!player) return
    const l = () => tick((x) => x + 1)
    player.listeners.add(l)
    return () => {
      player.listeners.delete(l)
    }
  }, [player])
  return { t: player?.t ?? 0, playing: player?.playing ?? false }
}

export function VideoStudio() {
  const doc = useStore((s) => s.doc)
  const project: VideoProject = doc.video ?? newProject()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [targetTrack, setTargetTrack] = useState<string | null>(null)
  const [pps, setPps] = useState(90)
  const [exporting, setExporting] = useState(false)
  const projectRef = useRef(project)
  projectRef.current = project
  const selRef = useRef(sel)
  selRef.current = sel

  /* player lifecycle */
  useEffect(() => {
    const p = new Player(canvasRef.current!, projectRef.current)
    setPlayer(p)
    ;(window as unknown as { __player: Player }).__player = p
    return () => p.dispose()
  }, [])
  useEffect(() => {
    player?.setProject(project, doc).then(() => {
      if (player.pool.errors.length) {
        toast(player.pool.errors[0])
        player.pool.errors.length = 0
      }
    })
  }, [player, project, doc])

  const { t: time, playing } = usePlayerTime(player)
  const duration = projectDuration(project)
  const found = findClip(project, sel)
  const setVideo = useCallback((fn: (p: VideoProject) => VideoProject, key?: string) => actions.setVideo(fn, key), [])

  const afterAdd = (id: string) => setSel(id)

  /* add helpers */
  const addRef = (ref: MediaRef) => {
    const r = addMediaClip(projectRef.current, ref, player?.t ?? 0, targetTrack)
    setVideo(() => r.project)
    afterAdd(r.id)
  }
  const importFiles = async (files: File[]) => {
    for (const f of files) {
      try {
        if (!kindOfFile(f)) throw new Error(`${f.name}: ${t('unsupported file type')}`)
        addRef(await addMediaFile(f))
      } catch (e) {
        toast((e as Error).message)
      }
    }
  }
  const addSample = async (s: (typeof SAMPLES)[number]) => {
    try {
      addRef(await addMediaUrl(s.name, s.kind, s.url))
    } catch (e) {
      toast((e as Error).message)
    }
  }
  const loadSrt = (text: string) => {
    try {
      const cues = parseSrt(text)
      setVideo((p) => setCaptions(p, cues))
      toast(t('{n} captions loaded', { n: cues.length }))
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const split = useCallback(() => {
    const id = selRef.current
    const p = projectRef.current
    const tt = player?.t ?? 0
    let target = id
    if (!target || !findClip(p, id)) {
      // split every clip under the playhead on the first video track
      const f = p.tracks.flatMap((x) => x.clips).find((c) => tt > c.start + 0.04 && tt < clipEnd(c) - 0.04)
      target = f?.id ?? null
    }
    if (!target) return toast(t('Place the playhead inside a clip to split it'))
    const r = splitClip(p, target, tt)
    if (!r) return toast(t('Place the playhead inside the selected clip to split it'))
    setVideo(() => r.project)
    setSel(r.right)
  }, [player, setVideo])

  const del = useCallback(() => {
    const id = selRef.current
    if (!id) return
    setVideo((p) => removeClip(p, id))
    setSel(null)
  }, [setVideo])

  /* keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      const mod = e.ctrlKey || e.metaKey
      if (mod) return
      const k = e.key.toLowerCase()
      if (k === ' ') {
        if (el?.tagName === 'BUTTON') return
        e.preventDefault()
        player?.toggle()
      } else if (k === 's') {
        e.preventDefault()
        split()
      } else if (k === 'delete' || k === 'backspace') {
        if (selRef.current) {
          e.preventDefault()
          del()
        }
      } else if (k === 'arrowleft' || k === 'arrowright') {
        if (el?.getAttribute('data-clip')) return // arrows on a focused clip move the clip
        e.preventDefault()
        const step = e.shiftKey ? 1 : 1 / projectRef.current.fps
        player?.seek((player?.t ?? 0) + (k === 'arrowleft' ? -step : step))
      } else if (k === 'home') player?.seek(0)
      else if (k === 'end') player?.seek(projectDuration(projectRef.current))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, split, del])

  /* preview: click selects / drag moves a visual clip */
  const onPreviewDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current!
    const r = cv.getBoundingClientRect()
    const p = projectRef.current
    const px = ((e.clientX - r.left) / r.width) * p.width
    const py = ((e.clientY - r.top) / r.height) * p.height
    const tt = player?.t ?? 0
    let hit: Clip | null = null
    for (let i = p.tracks.length - 1; i >= 0 && !hit; i--) {
      const tr = p.tracks[i]
      if (tr.kind === 'audio' || tr.kind === 'caption' || tr.hidden) continue
      for (const c of tr.clips) {
        if (tt >= c.start && tt < clipEnd(c) && px >= c.x && px <= c.x + (c.w || p.width) && py >= c.y && py <= c.y + (c.h || p.height)) hit = c
      }
    }
    if (!hit) return setSel(null)
    setSel(hit.id)
    const start = { px, py, x: hit.x, y: hit.y, id: hit.id }
    history.begin()
    const move = (ev: PointerEvent) => {
      const nx = ((ev.clientX - r.left) / r.width) * p.width
      const ny = ((ev.clientY - r.top) / r.height) * p.height
      setVideo((pp) => updateClip(pp, start.id, { x: Math.round(start.x + nx - start.px), y: Math.round(start.y + ny - start.py) }))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      history.end()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="vs" role="main" aria-label={t('Video studio')}>
      <aside className="vs-left" aria-label={t('Media')}>
        <MediaPanel
          project={project}
          addRef={addRef}
          addSample={addSample}
          importFiles={importFiles}
          loadSrt={loadSrt}
          time={player?.t ?? 0}
          onAdd={(r) => {
            setVideo(() => r.project)
            afterAdd(r.id)
          }}
        />
      </aside>
      <section className="vs-center" aria-label={t('Preview')}>
        <div className="vs-stage">
          <canvas
            ref={canvasRef}
            className="vs-canvas"
            width={project.width}
            height={project.height}
            style={{ aspectRatio: `${project.width} / ${project.height}` }}
            onPointerDown={onPreviewDown}
            role="img"
            aria-label={t('Video preview at {time}', { time: formatTime(time, project.fps) })}
          />
        </div>
        <div className="vs-transport" role="toolbar" aria-label={t('Playback')}>
          <button onClick={() => player?.seek(0)} title={t('Go to start (Home)')} aria-label={t('Go to start')}>
            ⏮
          </button>
          <button className="primary" onClick={() => player?.toggle()} title={t('Play / pause (Space)')} aria-label={playing ? t('Pause') : t('Play')}>
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={() => player?.seek(duration)} title={t('Go to end (End)')} aria-label={t('Go to end')}>
            ⏭
          </button>
          <span className="vs-time" aria-live="off">
            {formatTime(time, project.fps)} / {formatTime(duration, project.fps)}
          </span>
          <span className="sep-v" />
          <button onClick={split} title={t('Split the clip at the playhead (S)')}>
            ✂ {t('Split')}
          </button>
          <button onClick={del} disabled={!sel} title={t('Delete clip (Delete)')}>
            🗑 {t('Delete')}
          </button>
          <span className="spacer" />
          <label className="vs-zoom">
            {t('Zoom')}
            <input type="range" min={20} max={300} value={pps} onChange={(e) => setPps(Number(e.target.value))} aria-label={t('Timeline zoom')} />
          </label>
          <button className="primary" onClick={() => setExporting(true)}>
            {t('Export video…')}
          </button>
        </div>
      </section>
      <aside className="vs-right" aria-label={t('Clip properties')}>
        {found ? <ClipInspector project={project} track={found.track} clip={found.clip} player={player} onSplit={split} onDelete={del} /> : <ProjectInspector project={project} />}
      </aside>
      <Timeline
        project={project}
        player={player}
        time={time}
        pps={pps}
        sel={sel}
        setSel={setSel}
        targetTrack={targetTrack}
        setTargetTrack={setTargetTrack}
      />
      {exporting && <VideoExportDialog project={project} onClose={() => setExporting(false)} />}
    </div>
  )
}

/* ================= media / add panel ================= */

function MediaPanel({
  project,
  addRef,
  addSample,
  importFiles,
  loadSrt,
  time,
  onAdd,
}: {
  project: VideoProject
  addRef: (r: MediaRef) => void
  addSample: (s: (typeof SAMPLES)[number]) => void
  importFiles: (f: File[]) => void
  loadSrt: (text: string) => void
  time: number
  onAdd: (r: { project: VideoProject; id: string }) => void
}) {
  const doc = useStore((s) => s.doc)
  const [srtText, setSrtText] = useState('')
  const stickers = useMemo(() => STOCK.filter((s) => s.category === 'Stickers'), [])
  const [pageIdx, setPageIdx] = useState(0)
  return (
    <>
      <Section title={t('Import')}>
        <button className="wide" onClick={() => openFilePicker('video/*,audio/*,image/*', true, importFiles)}>
          ⬆ {t('Import video, audio or image files')}
        </button>
        <div className="subtle">{t('Files stay on this device (kept in browser storage).')}</div>
        {SAMPLES.map((s) => (
          <button key={s.url} className="wide small" onClick={() => addSample(s)}>
            {s.kind === 'video' ? '🎞' : '♪'} {s.name}
          </button>
        ))}
      </Section>
      {Object.keys(project.media).length > 0 && (
        <Section title={t('Media bin')}>
          {Object.values(project.media).map((m) => (
            <div key={m.id} className="vs-bin">
              <span>
                {m.kind === 'video' ? '🎞' : m.kind === 'audio' ? '♪' : '🖼'} {m.name}
                {m.duration > 0 && <em> {m.duration.toFixed(1)}s</em>}
              </span>
              <button className="mini" onClick={() => addRef(m)} title={t('Add to the timeline at the playhead')} aria-label={t('Add {name} to the timeline', { name: m.name })}>
                ＋
              </button>
            </div>
          ))}
        </Section>
      )}
      <Section title={t('Text & stickers')}>
        <button className="wide" onClick={() => onAdd(addTextClip(project, time))}>
          T {t('Animated title')}
        </button>
        <div className="sticker-grid">
          {stickers.map((s) => (
            <button key={s.id} title={s.name} aria-label={t('Add sticker {name}', { name: s.name })} onClick={() => onAdd(addStickerClip(project, s.svg, s.name, time))}>
              <img src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svg)} alt="" />
            </button>
          ))}
        </div>
      </Section>
      <Section title={t('Design overlay')}>
        <div className="subtle">{t('Put a page from the Design editor over the video (keeps its transparency).')}</div>
        <Row label={t('Page')}>
          <select value={pageIdx} onChange={(e) => setPageIdx(Number(e.target.value))}>
            {doc.pages.map((p, i) => (
              <option key={p.id} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </Row>
        <button className="wide" onClick={() => onAdd(addDesignClip(project, pageIdx, time, doc.pages[pageIdx]?.name || 'Design'))}>
          ▨ {t('Add page as overlay')}
        </button>
      </Section>
      <Section title={t('Captions')}>
        <button className="wide" onClick={() => openFilePicker('.srt,.vtt,text/plain', false, async (f) => loadSrt(await f[0].text()))}>
          ⬆ {t('Load .srt / .vtt file')}
        </button>
        <button className="wide small" onClick={() => loadSrt(SAMPLE_SRT)}>
          {t('Use sample subtitles')}
        </button>
        <textarea className="vs-srt" rows={4} placeholder={t('…or paste SRT text here')} value={srtText} onChange={(e) => setSrtText(e.target.value)} aria-label={t('SRT text')} />
        <div className="btn-row">
          <button disabled={!srtText.trim()} onClick={() => loadSrt(srtText)}>
            {t('Apply')}
          </button>
          <button
            disabled={!captionCues(project).length}
            onClick={() => downloadBlob(new Blob([stringifySrt(captionCues(project))], { type: 'text/plain' }), 'captions.srt')}
          >
            {t('Download .srt')}
          </button>
        </div>
      </Section>
    </>
  )
}

/* ================= timeline ================= */

type Drag = { mode: 'move' | 'l' | 'r'; id: string; x0: number; orig: Clip; trackId: string }

function Timeline({
  project,
  player,
  time,
  pps,
  sel,
  setSel,
  targetTrack,
  setTargetTrack,
}: {
  project: VideoProject
  player: Player | null
  time: number
  pps: number
  sel: string | null
  setSel: (id: string | null) => void
  targetTrack: string | null
  setTargetTrack: (id: string | null) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const duration = projectDuration(project)
  const totalW = Math.max(duration + 6, 14) * pps
  const rows = useMemo(() => [...project.tracks].reverse(), [project.tracks])
  const pRef = useRef(project)
  pRef.current = project

  const scrub = (clientX: number) => {
    const sc = scrollRef.current!
    const rect = sc.getBoundingClientRect()
    const x = clientX - rect.left + sc.scrollLeft - LABEL_W
    player?.seek(clamp(x / pps, 0, 3600))
  }

  const startScrub = (e: React.PointerEvent) => {
    scrub(e.clientX)
    const move = (ev: PointerEvent) => scrub(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startDrag = (e: React.PointerEvent, mode: Drag['mode'], clip: Clip, trackId: string) => {
    e.stopPropagation()
    if ((e.target as HTMLElement).closest('button.vt-x')) return
    setSel(clip.id)
    dragRef.current = { mode, id: clip.id, x0: e.clientX, orig: clip, trackId }
    history.begin()
    const thr = 9 / pps
    const move = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dt = (ev.clientX - d.x0) / pps
      const ph = player?.t ?? 0
      actions.setVideo((p) => {
        if (d.mode === 'move') {
          let s = Math.max(0, d.orig.start + dt)
          const a = snapTime(s, p, ph, thr, d.id)
          const b = snapTime(s + d.orig.dur, p, ph, thr, d.id) - d.orig.dur
          s = a !== s ? a : b
          const under = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest('[data-lane]') as HTMLElement | null
          const lane = under?.getAttribute('data-lane') || d.trackId
          return moveClip(p, d.id, s, lane)
        }
        const edge = d.mode
        let delta = dt
        const base = edge === 'l' ? d.orig.start : d.orig.start + d.orig.dur
        const snapped = snapTime(base + dt, p, ph, thr, d.id)
        if (snapped !== base + dt) delta = snapped - base
        return trimClip(p, d.id, edge, d.orig, delta)
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      dragRef.current = null
      history.end()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onClipKey = (e: React.KeyboardEvent, clip: Clip) => {
    const step = e.shiftKey ? 1 : 0.1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      actions.setVideo((p) => moveClip(p, clip.id, clip.start + (e.key === 'ArrowLeft' ? -step : step)), 'kbmove' + clip.id)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSel(clip.id)
      player?.seek(clip.start)
    }
  }

  // tick spacing
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60]
  const step = steps.find((s) => s * pps >= 70) ?? 60
  const ticks: number[] = []
  for (let x = 0; x <= totalW / pps; x += step) ticks.push(r3(x))
  const phX = LABEL_W + time * pps

  return (
    <section className="vs-timeline" aria-label={t('Timeline')}>
      <div className="vs-tl-tools">
        <strong>{t('Timeline')}</strong>
        <button className="mini" onClick={() => actions.setVideo((p) => addTrack(p, 'video'))}>
          ＋ {t('Video track')}
        </button>
        <button className="mini" onClick={() => actions.setVideo((p) => addTrack(p, 'audio'))}>
          ＋ {t('Audio track')}
        </button>
        <button className="mini" onClick={() => actions.setVideo((p) => addTrack(p, 'overlay'))}>
          ＋ {t('Overlay track')}
        </button>
        <span className="subtle">{t('Drag clips to move, drag their edges to trim, S splits at the playhead.')}</span>
      </div>
      <div className="vs-scroll" ref={scrollRef}>
        <div className="vs-content" style={{ width: LABEL_W + totalW, minHeight: RULER_H + rows.length * ROW_H }}>
          <div className="vs-ruler" style={{ height: RULER_H }} onPointerDown={startScrub} role="slider" aria-label={t('Playhead')} aria-valuemin={0} aria-valuemax={Math.round(duration * 100) / 100} aria-valuenow={Math.round(time * 100) / 100} tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') player?.seek((player?.t ?? 0) - 1 / project.fps)
              if (e.key === 'ArrowRight') player?.seek((player?.t ?? 0) + 1 / project.fps)
            }}>
            <div className="vs-ruler-label" style={{ width: LABEL_W }} />
            {ticks.map((s) => (
              <div key={s} className="vs-tick" style={{ left: LABEL_W + s * pps }}>
                <span>{s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${s}s`}</span>
              </div>
            ))}
          </div>
          {rows.map((track) => (
            <div key={track.id} className={'vs-row kind-' + track.kind + (targetTrack === track.id ? ' target' : '')} style={{ height: ROW_H }}>
              <div className="vs-label" style={{ width: LABEL_W }}>
                <button className="vs-name" onClick={() => setTargetTrack(targetTrack === track.id ? null : track.id)} title={t('Click to use this track for new clips')}>
                  {track.name}
                </button>
                <button className={'mini' + (track.muted ? ' on' : '')} title={track.kind === 'audio' || track.kind === 'video' ? t('Mute track') : t('Hide track')} aria-pressed={track.muted || track.hidden}
                  onClick={() => actions.setVideo((p) => updateTrack(p, track.id, track.kind === 'audio' || track.kind === 'video' ? { muted: !track.muted } : { hidden: !track.hidden }))}>
                  {track.kind === 'audio' || track.kind === 'video' ? (track.muted ? '🔇' : '🔊') : track.hidden ? '🙈' : '👁'}
                </button>
                {project.tracks.filter((x) => x.kind === track.kind).length > 1 && (
                  <button className="mini" title={t('Remove track')} aria-label={t('Remove track {name}', { name: track.name })} onClick={() => actions.setVideo((p) => removeTrack(p, track.id))}>
                    ✕
                  </button>
                )}
              </div>
              <div className="vs-lane" data-lane={track.id} style={{ width: totalW }} onPointerDown={(e) => { if (e.target === e.currentTarget) { setSel(null); startScrub(e) } }}>
                {track.clips.map((c) => (
                  <div
                    key={c.id}
                    data-clip={c.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`${track.name}: ${c.name}, ${t('starts at {s}s, {d}s long', { s: c.start.toFixed(2), d: c.dur.toFixed(2) })}`}
                    aria-pressed={sel === c.id}
                    className={'vs-clip clip-' + c.kind + (sel === c.id ? ' sel' : '')}
                    style={{ left: c.start * pps, width: Math.max(8, c.dur * pps) }}
                    onPointerDown={(e) => startDrag(e, 'move', c, track.id)}
                    onKeyDown={(e) => onClipKey(e, c)}
                    title={`${c.name} · ${c.start.toFixed(2)}s → ${clipEnd(c).toFixed(2)}s`}
                  >
                    <span className="vt-h l" onPointerDown={(e) => startDrag(e, 'l', c, track.id)} />
                    <span className="vt-label">
                      {c.transition && c.transition.type !== 'none' && <i className="vt-tr" title={t('Transition: {name}', { name: c.transition.type })}>⧉</i>}
                      {c.kind === 'caption' || c.kind === 'text' ? c.text : c.name}
                    </span>
                    <span className="vt-h r" onPointerDown={(e) => startDrag(e, 'r', c, track.id)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="vs-playhead" style={{ left: phX, height: RULER_H + rows.length * ROW_H }} aria-hidden="true">
            <i />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ================= inspectors ================= */

function ProjectInspector({ project }: { project: VideoProject }) {
  const presets = [
    { label: '1920 × 1080 (16:9)', w: 1920, h: 1080 },
    { label: '1280 × 720 (16:9)', w: 1280, h: 720 },
    { label: '1080 × 1920 (9:16)', w: 1080, h: 1920 },
    { label: '1080 × 1080 (1:1)', w: 1080, h: 1080 },
    { label: '3840 × 2160 (4K)', w: 3840, h: 2160 },
  ]
  const cur = presets.findIndex((p) => p.w === project.width && p.h === project.height)
  const cs = project.captionStyle
  const setCs = (patch: Partial<typeof cs>) => actions.setVideo((p) => ({ ...p, captionStyle: { ...p.captionStyle, ...patch } }), 'capstyle:' + Object.keys(patch).join())
  return (
    <>
      <Section title={t('Video project')}>
        <Row label={t('Canvas')}>
          <select
            value={cur}
            onChange={(e) => {
              const pr = presets[Number(e.target.value)]
              if (pr) actions.setVideo((p) => ({ ...p, width: pr.w, height: pr.h }))
            }}
          >
            {cur < 0 && <option value={-1}>{project.width} × {project.height}</option>}
            {presets.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t('Frame rate')}>
          <select value={project.fps} onChange={(e) => actions.setVideo((p) => ({ ...p, fps: Number(e.target.value) }))}>
            {[24, 25, 30, 50, 60].map((f) => (
              <option key={f} value={f}>
                {f} fps
              </option>
            ))}
          </select>
        </Row>
        <div className="subtle">{t('Select a clip on the timeline to edit it. Click a track name to make it the target for new clips.')}</div>
      </Section>
      <Section title={t('Caption style (all captions)')}>
        <Row label={t('Font')}>
          <select value={cs.fontFamily} onChange={(e) => setCs({ fontFamily: e.target.value })}>
            {FONT_CHOICES.map((f) => (
              <option key={f.label} value={f.css}>
                {f.label}
              </option>
            ))}
          </select>
        </Row>
        <div className="grid2">
          <Num label={t('Size')} value={cs.fontSize} min={10} max={300} onChange={(v) => setCs({ fontSize: v })} />
          <Num label={t('Weight')} value={cs.fontWeight} min={100} max={900} step={100} onChange={(v) => setCs({ fontWeight: v })} />
        </div>
        <ColorField label={t('Text colour')} value={cs.color} onChange={(c) => c && setCs({ color: c })} />
        <ColorField label={t('Box colour')} value={cs.bg} onChange={(c) => c && setCs({ bg: c })} />
        <Slider label={t('Box opacity')} value={cs.bgOpacity} min={0} max={1} step={0.05} onChange={(v) => setCs({ bgOpacity: v })} />
        <Slider label={t('Outline')} value={cs.strokeWidth} min={0} max={12} step={0.5} suffix=" px" onChange={(v) => setCs({ strokeWidth: v })} />
        <Row label={t('Position')}>
          <select value={cs.position} onChange={(e) => setCs({ position: e.target.value as 'top' | 'middle' | 'bottom' })}>
            <option value="bottom">{t('Bottom')}</option>
            <option value="middle">{t('Middle')}</option>
            <option value="top">{t('Top')}</option>
          </select>
        </Row>
        <label className="check">
          <input type="checkbox" checked={cs.uppercase} onChange={(e) => setCs({ uppercase: e.target.checked })} /> {t('UPPERCASE')}
        </label>
      </Section>
    </>
  )
}

function ClipInspector({
  project,
  track,
  clip: c,
  player,
  onSplit,
  onDelete,
}: {
  project: VideoProject
  track: { id: string; kind: string }
  clip: Clip
  player: Player | null
  onSplit: () => void
  onDelete: () => void
}) {
  const patch = (p: Partial<Clip>) => actions.setVideo((pr) => updateClip(pr, c.id, p), 'clip:' + c.id + ':' + Object.keys(p).join())
  const media = c.media ? project.media[c.media] : null
  const hasAudio = c.kind === 'video' || c.kind === 'audio'
  const visual = c.kind !== 'audio' && c.kind !== 'caption'
  const isText = c.kind === 'text'
  const maxIn = media && media.duration > 0 ? media.duration : 0
  return (
    <>
      <Section title={`${c.name}`} right={<span className="tag">{c.kind}</span>}>
        <input type="text" value={c.name} onChange={(e) => patch({ name: e.target.value })} aria-label={t('Clip name')} />
        <div className="grid2">
          <Num label={t('Start')} value={c.start} min={0} step={0.1} suffix="s" onChange={(v) => patch({ start: r3(v) })} />
          <Num label={t('Length')} value={c.dur} min={0.1} step={0.1} suffix="s" onChange={(v) => actions.setVideo((p) => trimClip(p, c.id, 'r', c, v - c.dur), 'len' + c.id)} />
        </div>
        {hasAudio && maxIn > 0 && <Num label={t('Source in-point')} value={c.inPoint} min={0} max={Math.max(0, maxIn - 0.1)} step={0.1} suffix="s" onChange={(v) => patch({ inPoint: r3(v) })} />}
        <div className="btn-row">
          <button onClick={onSplit} title="S">
            ✂ {t('Split at playhead')}
          </button>
          <button
            onClick={() => {
              const f = findClip(project, c.id)
              if (!f) return
              const copy = { ...c, id: c.id + 'd' + Date.now().toString(36), start: r3(clipEnd(c)), transition: null }
              actions.setVideo((p) => ({ ...p, tracks: p.tracks.map((tr) => (tr.id === track.id ? { ...tr, clips: [...tr.clips, copy] } : tr)) }))
            }}
          >
            ⧉ {t('Duplicate')}
          </button>
          <button className="danger" onClick={onDelete}>
            🗑
          </button>
        </div>
      </Section>
      {hasAudio && (
        <Section title={t('Audio')}>
          <Slider label={t('Volume')} value={c.volume} min={0} max={1} step={0.05} onChange={(v) => patch({ volume: v })} />
          <div className="grid2">
            <Num label={t('Fade in')} value={c.fadeIn} min={0} step={0.1} suffix="s" onChange={(v) => patch({ fadeIn: v })} />
            <Num label={t('Fade out')} value={c.fadeOut} min={0} step={0.1} suffix="s" onChange={(v) => patch({ fadeOut: v })} />
          </div>
        </Section>
      )}
      {(c.kind === 'video' || c.kind === 'image') && (
        <Section title={t('Transition into this clip')}>
          <Row label={t('Type')}>
            <select
              value={c.transition?.type ?? 'none'}
              onChange={(e) => actions.setVideo((p) => applyTransition(p, c.id, e.target.value as TransitionType, c.transition?.dur ?? 1), 'tr' + c.id)}
            >
              {TRANSITIONS.map((x) => (
                <option key={x} value={x}>
                  {transitionLabel(x)}
                </option>
              ))}
            </select>
          </Row>
          {c.transition && c.transition.type !== 'none' && (
            <Slider label={t('Duration')} value={c.transition.dur} min={0.2} max={3} step={0.1} suffix=" s" onChange={(v) => actions.setVideo((p) => applyTransition(p, c.id, c.transition!.type, v), 'trd' + c.id)} />
          )}
          <div className="subtle">{t('The clip overlaps the previous one on this track by the transition length.')}</div>
        </Section>
      )}
      {c.kind === 'caption' && (
        <Section title={t('Caption text')}>
          <textarea rows={3} value={c.text || ''} onChange={(e) => patch({ text: e.target.value })} aria-label={t('Caption text')} />
          <div className="subtle">{t('Style all captions in the project panel (click empty timeline space).')}</div>
        </Section>
      )}
      {isText && (
        <Section title={t('Text')}>
          <textarea rows={3} value={c.text || ''} onChange={(e) => patch({ text: e.target.value })} aria-label={t('Text')} />
          <Row label={t('Font')}>
            <select value={c.fontFamily} onChange={(e) => patch({ fontFamily: e.target.value })}>
              {FONT_CHOICES.map((f) => (
                <option key={f.label} value={f.css}>
                  {f.label}
                </option>
              ))}
            </select>
          </Row>
          <div className="grid2">
            <Num label={t('Size')} value={c.fontSize ?? 64} min={8} max={600} onChange={(v) => patch({ fontSize: v })} />
            <Num label={t('Weight')} value={c.fontWeight ?? 700} min={100} max={900} step={100} onChange={(v) => patch({ fontWeight: v })} />
          </div>
          <ColorField label={t('Colour')} value={c.color ?? '#ffffff'} onChange={(v) => v && patch({ color: v })} />
          <ColorField label={t('Background')} value={c.bg ?? null} allowNone onChange={(v) => patch({ bg: v })} />
          <Slider label={t('Outline')} value={c.strokeWidth ?? 0} min={0} max={20} step={0.5} suffix=" px" onChange={(v) => patch({ strokeWidth: v })} />
          <div className="btn-row">
            {(['left', 'center', 'right'] as const).map((a) => (
              <Toggle key={a} on={(c.align ?? 'center') === a} onClick={() => patch({ align: a })}>
                {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
              </Toggle>
            ))}
          </div>
        </Section>
      )}
      {(isText || c.kind === 'sticker' || c.kind === 'design') && (
        <Section title={t('Animation')}>
          <Row label={t('In')}>
            <select value={c.animIn} onChange={(e) => patch({ animIn: e.target.value as Anim })}>
              {ANIMS.map((a) => (
                <option key={a} value={a}>
                  {animLabel(a)}
                </option>
              ))}
            </select>
          </Row>
          <Row label={t('Out')}>
            <select value={c.animOut} onChange={(e) => patch({ animOut: e.target.value as Anim })}>
              {ANIMS.map((a) => (
                <option key={a} value={a}>
                  {animLabel(a)}
                </option>
              ))}
            </select>
          </Row>
          <Slider label={t('Animation length')} value={c.animDur} min={0.1} max={2} step={0.05} suffix=" s" onChange={(v) => patch({ animDur: v })} />
          <button className="wide small" onClick={() => player?.seek(c.start + c.animDur / 2)}>
            ▶ {t('Jump to animation')}
          </button>
        </Section>
      )}
      {visual && (
        <Section title={t('Position & size')}>
          <div className="grid2">
            <Num label="X" value={Math.round(c.x)} onChange={(v) => patch({ x: v })} />
            <Num label="Y" value={Math.round(c.y)} onChange={(v) => patch({ y: v })} />
            <Num label="W" value={Math.round(c.w || project.width)} min={1} onChange={(v) => patch({ w: v })} />
            <Num label="H" value={Math.round(c.h || project.height)} min={1} onChange={(v) => patch({ h: v })} />
          </div>
          <Slider label={t('Opacity')} value={c.opacity} min={0} max={1} step={0.05} onChange={(v) => patch({ opacity: v })} />
          <Slider label={t('Rotation')} value={c.rotation} min={-180} max={180} suffix="°" onChange={(v) => patch({ rotation: v })} />
          {(c.kind === 'video' || c.kind === 'image') && (
            <div className="btn-row">
              <Toggle on={c.fit === 'cover'} onClick={() => patch({ fit: 'cover' })}>
                {t('Fill')}
              </Toggle>
              <Toggle on={c.fit === 'contain'} onClick={() => patch({ fit: 'contain' })}>
                {t('Fit')}
              </Toggle>
              <button onClick={() => patch({ x: 0, y: 0, w: project.width, h: project.height })}>{t('Full frame')}</button>
            </div>
          )}
        </Section>
      )}
    </>
  )
}

const TRANSITION_LABELS: Record<string, string> = {
  none: 'None (cut)',
  crossfade: 'Cross-fade',
  'dip-black': 'Dip to black',
  'wipe-left': 'Wipe →',
  'wipe-right': 'Wipe ←',
  'slide-left': 'Push left',
  zoom: 'Zoom in',
}
const transitionLabel = (x: string) => t(TRANSITION_LABELS[x] || x)
const ANIM_LABELS: Record<string, string> = { none: 'None', fade: 'Fade', 'slide-up': 'Slide up', 'slide-left': 'Slide from right', pop: 'Pop', typewriter: 'Typewriter', bounce: 'Bounce' }
const animLabel = (x: string) => t(ANIM_LABELS[x] || x)

/* ================= export ================= */

function VideoExportDialog({ project, onClose }: { project: VideoProject; onClose: () => void }) {
  const doc = useStore((s) => s.doc)
  const [format, setFormat] = useState<'mp4' | 'webm'>('mp4')
  const [resH, setResH] = useState(Math.min(1080, project.height >= 2160 ? 2160 : project.height >= 1440 ? 1440 : project.height >= 1080 ? 1080 : 720))
  const [fps, setFps] = useState(project.fps)
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'very-high'>('high')
  const [audio, setAudio] = useState(true)
  const [busy, setBusy] = useState(false)
  const [prog, setProg] = useState({ f: 0, msg: '' })
  const [res, setRes] = useState<ExportResult | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const ctl = useRef<AbortController | null>(null)
  const aspect = project.width / project.height
  const outW = Math.round((resH * aspect) / 2) * 2
  const duration = projectDuration(project)

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )

  const run = async () => {
    setBusy(true)
    setErr('')
    setRes(null)
    setUrl(null)
    ctl.current = new AbortController()
    try {
      const r = await exportVideo(project, doc, {
        format,
        width: outW,
        height: resH,
        fps,
        quality,
        audio,
        signal: ctl.current.signal,
        onProgress: (f, msg) => setProg({ f, msg }),
      })
      setRes(r)
      setUrl(URL.createObjectURL(r.blob))
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const base = doc.name.replace(/[^\w\- ]+/g, '') || 'video'
  return (
    <Modal title={t('Export video')} onClose={() => { ctl.current?.abort(); onClose() }} wide>
      {!webCodecsAvailable() && <div className="notice">{t('This browser has no WebCodecs encoder – video export needs Chrome, Edge, Safari 17+ or Firefox 130+.')}</div>}
      <div className="grid2">
        <Row label={t('Format')}>
          <select value={format} onChange={(e) => setFormat(e.target.value as 'mp4' | 'webm')} aria-label={t('Format')}>
            <option value="mp4">MP4 (H.264 + AAC)</option>
            <option value="webm">WebM (VP9 + Opus)</option>
          </select>
        </Row>
        <Row label={t('Resolution')}>
          <select value={resH} onChange={(e) => setResH(Number(e.target.value))} aria-label={t('Resolution')}>
            {RESOLUTIONS.map((r) => (
              <option key={r.h} value={r.h}>
                {r.label} – {Math.round((r.h * aspect) / 2) * 2}×{r.h}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t('Frame rate')}>
          <select value={fps} onChange={(e) => setFps(Number(e.target.value))} aria-label={t('Frame rate')}>
            {[24, 25, 30, 50, 60].map((f) => (
              <option key={f} value={f}>
                {f} fps
              </option>
            ))}
          </select>
        </Row>
        <Row label={t('Quality')}>
          <select value={quality} onChange={(e) => setQuality(e.target.value as typeof quality)} aria-label={t('Quality')}>
            <option value="low">{t('Low')}</option>
            <option value="medium">{t('Medium')}</option>
            <option value="high">{t('High')}</option>
            <option value="very-high">{t('Very high')}</option>
          </select>
        </Row>
      </div>
      <label className="check">
        <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} /> {t('Include audio (offline mix of all audio tracks)')}
      </label>
      <div className="subtle">
        {outW}×{resH} · {fps} fps · {duration.toFixed(2)} s → {Math.round(duration * fps)} {t('frames')}
      </div>
      {busy && (
        <div className="vs-progress" role="progressbar" aria-valuenow={Math.round(prog.f * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${prog.f * 100}%` }} />
          <span>{prog.msg}</span>
        </div>
      )}
      {err && <div className="notice err" role="alert">{err}</div>}
      <div className="btn-row">
        <button className="primary" disabled={busy || duration <= 0} onClick={run}>
          {busy ? t('Rendering…') : t('Render video')}
        </button>
        {busy && <button onClick={() => ctl.current?.abort()}>{t('Cancel')}</button>}
      </div>
      {res && url && (
        <div className="vs-result" data-testid="video-result">
          <video src={url} controls style={{ width: '100%', maxHeight: 220, background: '#000' }} />
          <div className="subtle" id="video-export-info">
            {res.width}×{res.height} · {res.fps} fps · {res.frames} {t('frames')} · {res.videoCodec}
            {res.audioCodec ? ' + ' + res.audioCodec : ' (' + t('no audio') + ')'} · {(res.blob.size / 1024).toFixed(0)} KB · {res.seconds.toFixed(1)} s
          </div>
          {res.notes.map((n) => (
            <div key={n} className="notice">
              {n}
            </div>
          ))}
          <button className="primary" onClick={() => downloadBlob(res.blob, `${base}.${res.ext}`)}>
            ⬇ {t('Download {file}', { file: `${base}.${res.ext}` })}
          </button>
        </div>
      )}
    </Modal>
  )
}
