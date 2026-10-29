import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { El, Guide } from '../types'
import { actions, currentPage, fitToScreen, getState, history, useStore, zoomAt } from '../store'
import { elBounds, rad, round, rotatePoint, unionBounds, type Box } from '../geometry'
import { ElementView } from './ElementView'
import { RULER, Ruler } from './Ruler'
import { addImageFiles, imageAt, pickImageForElement, replaceImage } from '../upload'

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
const HANDLES: { id: HandleId; sx: number; sy: number; cursor: string }[] = [
  { id: 'nw', sx: -1, sy: -1, cursor: 'nwse-resize' },
  { id: 'n', sx: 0, sy: -1, cursor: 'ns-resize' },
  { id: 'ne', sx: 1, sy: -1, cursor: 'nesw-resize' },
  { id: 'e', sx: 1, sy: 0, cursor: 'ew-resize' },
  { id: 'se', sx: 1, sy: 1, cursor: 'nwse-resize' },
  { id: 's', sx: 0, sy: 1, cursor: 'ns-resize' },
  { id: 'sw', sx: -1, sy: 1, cursor: 'nesw-resize' },
  { id: 'w', sx: -1, sy: 0, cursor: 'ew-resize' },
]

function snapAxis(values: number[], cands: number[], thr: number) {
  let best = Infinity
  for (const v of values) for (const c of cands) if (Math.abs(c - v) < Math.abs(best) && Math.abs(c - v) <= thr) best = c - v
  return best === Infinity ? 0 : best
}

export function Canvas() {
  const doc = useStore((s) => s.doc)
  const pageIndex = useStore((s) => s.pageIndex)
  const selection = useStore((s) => s.selection)
  const editingId = useStore((s) => s.editingId)
  const zoom = useStore((s) => s.zoom)
  const panX = useStore((s) => s.panX)
  const panY = useStore((s) => s.panY)
  const viewW = useStore((s) => s.viewW)
  const viewH = useStore((s) => s.viewH)
  const tool = useStore((s) => s.tool)
  const snapGuides = useStore((s) => s.snapGuides)
  const role = useStore((s) => s.role)
  const page = doc.pages[pageIndex]

  const vpRef = useRef<HTMLDivElement>(null)
  const [space, setSpace] = useState(false)
  const [marquee, setMarquee] = useState<Box | null>(null)
  const [ghost, setGhost] = useState<{ axis: 'x' | 'y'; pos: number; index: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [panning, setPanning] = useState(false)

  const toWorld = useCallback((cx: number, cy: number) => {
    const r = vpRef.current!.getBoundingClientRect()
    const s = getState()
    return { x: (cx - r.left - s.panX) / s.zoom, y: (cy - r.top - s.panY) / s.zoom }
  }, [])

  /* viewport size */
  useEffect(() => {
    const el = vpRef.current!
    let first = true
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      actions.set({ viewW: r.width, viewH: r.height })
      if (first && r.width > 0) {
        first = false
        fitToScreen()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* wheel: ctrl/meta = zoom, otherwise pan */
  useEffect(() => {
    const el = vpRef.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const s = getState()
      if (e.ctrlKey || e.metaKey) {
        zoomAt(s.zoom * Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top)
      } else {
        actions.set({ panX: s.panX - (e.shiftKey ? e.deltaY : e.deltaX), panY: s.panY - (e.shiftKey ? 0 : e.deltaY) })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  /* space = temporary hand tool */
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
    }
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        e.preventDefault()
        setSpace(true)
      }
    }
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpace(false)
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])

  const selEls = useMemo(() => page.elements.filter((e) => selection.includes(e.id)), [page, selection])

  /* generic window-level drag helper */
  const track = (onMove: (e: PointerEvent) => void, onUp: (e: PointerEvent) => void) => {
    const move = (e: PointerEvent) => onMove(e)
    const up = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      onUp(e)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const startPan = (e: React.PointerEvent) => {
    const sx = e.clientX
    const sy = e.clientY
    const s = getState()
    const px = s.panX
    const py = s.panY
    setPanning(true)
    track(
      (m) => actions.set({ panX: px + m.clientX - sx, panY: py + m.clientY - sy }),
      () => setPanning(false),
    )
  }

  const startMove = (e: React.PointerEvent, ids: string[], clickedId: string, shift: boolean) => {
    const els = currentPage().elements.filter((x) => ids.includes(x.id) && !x.locked)
    if (!els.length) return
    const starts = new Map(els.map((x) => [x.id, { x: x.x, y: x.y }]))
    const bbox = unionBounds(els)!
    const origin = toWorld(e.clientX, e.clientY)
    const sx = e.clientX
    const sy = e.clientY
    let moved = false
    const others = currentPage().elements.filter((x) => !ids.includes(x.id) && !x.hidden)
    const W = getState().doc.width
    const H = getState().doc.height
    const guides = getState().doc.guides
    const candX = [0, W / 2, W, ...guides.filter((g) => g.axis === 'x').map((g) => g.pos)]
    const candY = [0, H / 2, H, ...guides.filter((g) => g.axis === 'y').map((g) => g.pos)]
    for (const o of others) {
      const b = elBounds(o)
      candX.push(b.x, b.x + b.w / 2, b.x + b.w)
      candY.push(b.y, b.y + b.h / 2, b.y + b.h)
    }
    track(
      (m) => {
        if (!moved && Math.hypot(m.clientX - sx, m.clientY - sy) < 3) return
        if (!moved) {
          moved = true
          history.begin()
        }
        const p = toWorld(m.clientX, m.clientY)
        let dx = p.x - origin.x
        let dy = p.y - origin.y
        if (m.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0
          else dx = 0
        }
        const thr = 6 / getState().zoom
        const sg: Guide[] = []
        if (!m.altKey) {
          const bx = bbox.x + dx
          const by = bbox.y + dy
          const ax = snapAxis([bx, bx + bbox.w / 2, bx + bbox.w], candX, thr)
          const ay = snapAxis([by, by + bbox.h / 2, by + bbox.h], candY, thr)
          if (!m.shiftKey || ax !== 0) dx += ax
          if (!m.shiftKey || ay !== 0) dy += ay
          const fx = [bbox.x + dx, bbox.x + dx + bbox.w / 2, bbox.x + dx + bbox.w]
          const fy = [bbox.y + dy, bbox.y + dy + bbox.h / 2, bbox.y + dy + bbox.h]
          for (const c of candX) if (fx.some((v) => Math.abs(v - c) < 0.01)) sg.push({ axis: 'x', pos: c })
          for (const c of candY) if (fy.some((v) => Math.abs(v - c) < 0.01)) sg.push({ axis: 'y', pos: c })
        }
        actions.set({ snapGuides: sg })
        actions.patch(
          [...starts.keys()],
          (x) => ({ x: round(starts.get(x.id)!.x + dx), y: round(starts.get(x.id)!.y + dy) }),
          'move',
        )
      },
      () => {
        actions.set({ snapGuides: [] })
        if (moved) history.end()
        else if (!shift && ids.length > 1) actions.select([clickedId])
      },
    )
  }

  const startResize = (e: React.PointerEvent, el: El, h: (typeof HANDLES)[number]) => {
    if (el.locked) return
    const orig = { ...el }
    const origin = toWorld(e.clientX, e.clientY)
    const cx0 = orig.x + orig.w / 2
    const cy0 = orig.y + orig.h / 2
    history.begin()
    track(
      (m) => {
        const p = toWorld(m.clientX, m.clientY)
        // pointer delta in the element's local axes
        const d = rotatePoint(p.x - origin.x + cx0, p.y - origin.y + cy0, cx0, cy0, -orig.rotation)
        const ldx = d.x - cx0
        const ldy = d.y - cy0
        let nw = Math.max(8, orig.w + h.sx * ldx)
        let nh = Math.max(8, orig.h + h.sy * ldy)
        if (m.shiftKey && h.sx !== 0 && h.sy !== 0) {
          const ratio = orig.w / orig.h
          if (nw / nh > ratio) nh = nw / ratio
          else nw = nh * ratio
        }
        if (orig.type === 'shape' && orig.shape === 'line' && h.sy !== 0) nh = orig.h
        const shift = rotatePoint(cx0 + (h.sx * (nw - orig.w)) / 2, cy0 + (h.sy * (nh - orig.h)) / 2, cx0, cy0, orig.rotation)
        actions.patch(
          [orig.id],
          { x: round(shift.x - nw / 2), y: round(shift.y - nh / 2), w: round(nw), h: round(nh) },
          'resize',
        )
      },
      () => history.end(),
    )
  }

  const startRotate = (e: React.PointerEvent, el: El) => {
    if (el.locked) return
    const cx = el.x + el.w / 2
    const cy = el.y + el.h / 2
    const startA = Math.atan2(toWorld(e.clientX, e.clientY).y - cy, toWorld(e.clientX, e.clientY).x - cx)
    const startRot = el.rotation
    history.begin()
    track(
      (m) => {
        const p = toWorld(m.clientX, m.clientY)
        const a = Math.atan2(p.y - cy, p.x - cx)
        let r = startRot + ((a - startA) * 180) / Math.PI
        if (m.shiftKey) r = Math.round(r / 15) * 15
        r = ((((r + 180) % 360) + 360) % 360) - 180
        actions.patch([el.id], { rotation: round(r, 1) }, 'rotate')
      },
      () => history.end(),
    )
  }

  const startMarquee = (e: React.PointerEvent, additive: boolean) => {
    const origin = toWorld(e.clientX, e.clientY)
    const base = additive ? getState().selection : []
    track(
      (m) => {
        const p = toWorld(m.clientX, m.clientY)
        const b: Box = { x: Math.min(origin.x, p.x), y: Math.min(origin.y, p.y), w: Math.abs(p.x - origin.x), h: Math.abs(p.y - origin.y) }
        setMarquee(b)
        const hit = currentPage().elements
          .filter((x) => !x.hidden)
          .filter((x) => {
            const eb = elBounds(x)
            return eb.x < b.x + b.w && eb.x + eb.w > b.x && eb.y < b.y + b.h && eb.y + eb.h > b.y
          })
          .map((x) => x.id)
        actions.select([...new Set([...base, ...hit])])
      },
      () => setMarquee(null),
    )
  }

  const startGuide = (axis: 'x' | 'y', e: React.PointerEvent, index = -1) => {
    e.preventDefault()
    e.stopPropagation()
    const vp = vpRef.current!
    const update = (m: PointerEvent) => {
      const p = toWorld(m.clientX, m.clientY)
      setGhost({ axis, pos: round(axis === 'x' ? p.x : p.y, 1), index })
    }
    update(e.nativeEvent)
    track(update, (m) => {
      setGhost(null)
      const r = vp.getBoundingClientRect()
      const inside = m.clientX >= r.left && m.clientX <= r.right && m.clientY >= r.top && m.clientY <= r.bottom
      const p = toWorld(m.clientX, m.clientY)
      const pos = round(axis === 'x' ? p.x : p.y, 1)
      const cur = getState().doc.guides
      if (index >= 0) {
        actions.setGuides(inside ? cur.map((g, i) => (i === index ? { axis, pos } : g)) : cur.filter((_, i) => i !== index))
      } else if (inside) actions.setGuides([...cur, { axis, pos }])
    })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-editing]')) return
    const active = document.activeElement as HTMLElement | null
    if (active && active.isContentEditable) active.blur() // commit inline text edit first
    if (e.button === 1 || space || tool === 'hand') {
      e.preventDefault()
      startPan(e)
      return
    }
    if (e.button !== 0) return
    const handle = target.closest('[data-handle]') as HTMLElement | null
    if (handle) {
      const el = currentPage().elements.find((x) => x.id === handle.dataset.elid)
      if (!el) return
      e.preventDefault()
      if (handle.dataset.handle === 'rot') startRotate(e, el)
      else startResize(e, el, HANDLES.find((h) => h.id === handle.dataset.handle)!)
      return
    }
    const guideEl = target.closest('[data-guide]') as HTMLElement | null
    if (guideEl) {
      const i = Number(guideEl.dataset.guide)
      startGuide(doc.guides[i].axis, e, i)
      return
    }
    const elNode = target.closest('[data-el-id]') as HTMLElement | null
    if (elNode) {
      const id = elNode.dataset.elId!
      const el = currentPage().elements.find((x) => x.id === id)
      if (!el) return
      if (e.shiftKey) {
        actions.toggleSelect(id)
        return
      }
      const sel = getState().selection
      let ids = sel
      if (!sel.includes(id)) {
        actions.select([id])
        ids = getState().selection
      }
      startMove(e, ids, id, e.shiftKey)
      return
    }
    // empty space
    if (!e.shiftKey) actions.clearSelection()
    startMarquee(e, e.shiftKey)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const node = (e.target as HTMLElement).closest('[data-el-id]') as HTMLElement | null
    if (!node) return
    const el = currentPage().elements.find((x) => x.id === node.dataset.elId)
    if (!el || el.locked) return
    if (el.type === 'text') {
      actions.select([el.id])
      actions.set({ editingId: el.id })
    } else if (el.type === 'image') pickImageForElement(el.id)
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    const p = toWorld(e.clientX, e.clientY)
    const target = imageAt(p.x, p.y)
    if (target && files[0].type.startsWith('image/') && !target.locked) {
      await replaceImage(target.id, files[0])
      actions.select([target.id])
    } else if (role === 'creator') await addImageFiles(files)
  }

  const stroke = 1.5 / zoom
  const hs = 10 / zoom
  const single = selEls.length === 1 ? selEls[0] : null
  const multiBox = selEls.length > 1 ? unionBounds(selEls) : null
  const bleed = doc.bleed
  const cursor = panning ? 'grabbing' : space || tool === 'hand' ? 'grab' : 'default'

  const bleedBoxes = bleed > 0

  return (
    <div className="canvas-area">
      <div className="ruler-corner" />
      <Ruler axis="x" length={viewW} zoom={zoom} pan={panX} unit={doc.unit} onStartGuide={(a, e) => startGuide(a, e)} />
      <Ruler axis="y" length={viewH} zoom={zoom} pan={panY} unit={doc.unit} onStartGuide={(a, e) => startGuide(a, e)} />
      <div
        className={'viewport' + (dragOver ? ' drag-over' : '')}
        ref={vpRef}
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="world" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}>
          <div
            className="page-clip"
            style={{
              left: -bleed,
              top: -bleed,
              width: doc.width + 2 * bleed,
              height: doc.height + 2 * bleed,
              background: page.background,
              boxShadow: `0 ${4 / zoom}px ${24 / zoom}px rgba(20,20,50,.25)`,
            }}
            data-page="1"
          >
            <div
              id="canvas-elements"
              role="group"
              aria-label={`Page ${pageIndex + 1}: ${page.elements.length} elements. Tab moves between elements; arrow keys move the selected element, Shift for 10 px; Enter edits text; Delete removes; Escape deselects.`}
              style={{ position: 'absolute', left: bleed, top: bleed }}
            >
              {page.elements.map((el) => (
                <ElementView key={el.id} el={el} vars={doc.variables} editing={editingId === el.id} />
              ))}
            </div>
          </div>
          {bleedBoxes && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: doc.width,
                height: doc.height,
                outline: `${1.5 / zoom}px dashed #ff3b6b`,
                pointerEvents: 'none',
              }}
              title="Trim line"
            />
          )}

          {/* user guides */}
          {doc.guides.map((g, i) =>
            ghost && ghost.index === i ? null : (
              <div
                key={i}
                data-guide={i}
                className={'guide guide-' + g.axis}
                style={
                  g.axis === 'x'
                    ? { left: g.pos - 4 / zoom, top: -4000, width: 8 / zoom, height: 8000 + doc.height }
                    : { top: g.pos - 4 / zoom, left: -4000, height: 8 / zoom, width: 8000 + doc.width }
                }
              >
                <div style={g.axis === 'x' ? { left: 4 / zoom - 0.5 / zoom, width: 1 / zoom } : { top: 4 / zoom - 0.5 / zoom, height: 1 / zoom }} />
              </div>
            ),
          )}
          {ghost && (
            <div
              className="guide-ghost"
              style={
                ghost.axis === 'x'
                  ? { left: ghost.pos, top: -4000, width: 1 / zoom, height: 8000 + doc.height }
                  : { top: ghost.pos, left: -4000, height: 1 / zoom, width: 8000 + doc.width }
              }
            />
          )}

          {/* snap guides */}
          {snapGuides.map((g, i) => (
            <div
              key={i}
              className="snap-line"
              style={
                g.axis === 'x'
                  ? { left: g.pos, top: -20 / zoom, width: 1 / zoom, height: doc.height + 40 / zoom }
                  : { top: g.pos, left: -20 / zoom, height: 1 / zoom, width: doc.width + 40 / zoom }
              }
            />
          ))}

          {/* selection overlay */}
          {selEls.map((el) => (
            <div
              key={'sel' + el.id}
              className={'sel-box' + (el.locked ? ' locked' : '')}
              style={{
                left: el.x,
                top: el.y,
                width: el.w,
                height: el.h,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                borderWidth: stroke,
                display: editingId === el.id ? 'none' : undefined,
              }}
            >
              {single && !el.locked &&
                HANDLES.map((h) => (
                  <div
                    key={h.id}
                    data-handle={h.id}
                    data-elid={el.id}
                    className="handle"
                    style={{
                      width: hs,
                      height: hs,
                      left: `calc(${(h.sx + 1) * 50}% - ${hs / 2}px)`,
                      top: `calc(${(h.sy + 1) * 50}% - ${hs / 2}px)`,
                      cursor: h.cursor,
                      borderWidth: stroke,
                    }}
                  />
                ))}
              {single && !el.locked && (
                <>
                  <div className="rot-stem" style={{ height: 22 / zoom, width: stroke, top: -22 / zoom, left: `calc(50% - ${stroke / 2}px)` }} />
                  <div
                    data-handle="rot"
                    data-elid={el.id}
                    className="handle rot"
                    style={{ width: hs * 1.2, height: hs * 1.2, left: `calc(50% - ${(hs * 1.2) / 2}px)`, top: -22 / zoom - (hs * 1.2) / 2, borderWidth: stroke }}
                  />
                </>
              )}
              {single && el.locked && <div className="lock-badge" style={{ fontSize: 12 / zoom, padding: `${2 / zoom}px ${5 / zoom}px` }}>🔒</div>}
            </div>
          ))}
          {multiBox && (
            <div className="multi-box" style={{ left: multiBox.x, top: multiBox.y, width: multiBox.w, height: multiBox.h, borderWidth: stroke }} />
          )}
          {marquee && (
            <div className="marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, borderWidth: 1 / zoom }} />
          )}
          {/* size badge */}
          {single && !editingId && (
            <div
              className="size-badge"
              style={{
                left: single.x + single.w / 2,
                top: single.y + single.h + 16 / zoom,
                transform: `translateX(-50%) scale(${1 / zoom})`,
                transformOrigin: 'top center',
              }}
            >
              {Math.round(single.w)} × {Math.round(single.h)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { rad }
