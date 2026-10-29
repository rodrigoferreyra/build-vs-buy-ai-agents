import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Doc, El, ImageEl, ShapeEl, TextEl, VectorEl } from '../types'
import { applyVariables, cssFilter, gradientLine, imageRect, maskPath, shapePath } from '../geometry'
import { arcLayout, effectiveDir, fitFontSize } from '../textLayout'
import { actions, useStore } from '../store'
import { imageDims, knownDims } from '../imageCache'
import { lutObjectUrl } from '../lut'
import { vectorSvg } from '../vector'

export function useFontTick() {
  const [t, setT] = useState(0)
  useEffect(() => {
    const f = () => setT((x) => x + 1)
    document.fonts?.addEventListener?.('loadingdone', f)
    return () => document.fonts?.removeEventListener?.('loadingdone', f)
  }, [])
  return t
}

function ShapeView({ el }: { el: ShapeEl }) {
  const d = shapePath(el)
  const gid = 'g_' + el.id
  const g = gradientLine(el.w, el.h, el.gradient.angle)
  const fill = el.fillMode === 'none' ? 'none' : el.fillMode === 'solid' ? el.fill : `url(#${gid})`
  return (
    <svg width={el.w} height={el.h} style={{ overflow: 'visible', display: 'block', pointerEvents: 'none' }}>
      {el.fillMode === 'gradient' && (
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
            <stop offset="0" stopColor={el.gradient.c1} />
            <stop offset="1" stopColor={el.gradient.c2} />
          </linearGradient>
        </defs>
      )}
      <path d={d} fill={fill} stroke={el.strokeWidth > 0 ? el.stroke : 'none'} strokeWidth={el.strokeWidth} strokeLinejoin="miter" />
    </svg>
  )
}

function TextView({ el, vars, editing }: { el: TextEl; vars: Record<string, string>; editing: boolean }) {
  const tick = useFontTick()
  const display = applyVariables(el.text, vars)
  const size = useMemo(
    () => fitFontSize(el, display),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [el.autoFit, el.w, el.h, el.fontSize, el.fontFamily, el.fontWeight, el.italic, el.letterSpacing, el.lineHeight, el.paragraphSpacing, display, tick],
  )
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!editing || !ref.current) return
    const node = ref.current
    node.innerText = el.text
    node.focus()
    const range = document.createRange()
    range.selectNodeContents(node)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const textStyle: CSSProperties = {
    fontFamily: el.fontFamily,
    fontSize: size,
    fontWeight: el.fontWeight,
    fontStyle: el.italic ? 'italic' : 'normal',
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    color: el.color,
    textAlign: el.align,
    direction: effectiveDir(el, display),
    textDecoration: el.underline ? 'underline' : 'none',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    WebkitTextStroke: el.strokeWidth > 0 ? `${el.strokeWidth}px ${el.strokeColor}` : undefined,
    textShadow: el.shadow.on ? `${el.shadow.x}px ${el.shadow.y}px ${el.shadow.blur}px ${el.shadow.color}` : undefined,
    width: '100%',
  }
  const outer: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: el.valign === 'top' ? 'flex-start' : el.valign === 'middle' ? 'center' : 'flex-end',
    background: el.bg ?? undefined,
    pointerEvents: 'none',
  }
  if (editing) {
    return (
      <div style={{ ...outer, pointerEvents: 'auto' }}>
        <div
          ref={ref}
          data-editing="1"
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          spellCheck={false}
          style={{ ...textStyle, outline: 'none', cursor: 'text', minHeight: size * el.lineHeight }}
          onBlur={(e) => {
            const t = e.currentTarget.innerText
            const patch: Partial<TextEl> = { text: t }
            // first strong RTL letters typed into an auto-direction, left-aligned box: switch to RTL + right align
            if ((el.direction ?? 'auto') === 'auto' && el.align === 'left' && effectiveDir(el, t) === 'rtl' && effectiveDir(el, el.text) !== 'rtl') patch.align = 'right'
            actions.patch([el.id], patch as Partial<TextEl>)
            actions.set({ editingId: null })
          }}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Escape') {
              const host = e.currentTarget.closest<HTMLElement>('[data-el-id]')
              e.currentTarget.blur()
              setTimeout(() => host?.focus({ preventScroll: true }), 0)
            }
          }}
        />
      </div>
    )
  }
  if (el.curve) {
    const glyphs = arcLayout(el, display, size)
    return (
      <svg width={el.w} height={el.h} style={{ overflow: 'visible', display: 'block', pointerEvents: 'none', background: el.bg ?? undefined }} data-tick={tick} aria-label={display} role="img">
        <g
          fill={el.color}
          stroke={el.strokeWidth > 0 ? el.strokeColor : 'none'}
          strokeWidth={el.strokeWidth}
          strokeLinejoin="round"
          paintOrder="fill"
          fontFamily={el.fontFamily}
          fontSize={size}
          fontWeight={el.fontWeight}
          fontStyle={el.italic ? 'italic' : 'normal'}
          textAnchor="middle"
          style={{ filter: el.shadow.on ? `drop-shadow(${el.shadow.x}px ${el.shadow.y}px ${el.shadow.blur / 2}px ${el.shadow.color})` : undefined }}
        >
          {glyphs.map((g, i) => (
            <text key={i} transform={`translate(${g.x} ${g.y}) rotate(${(g.angle * 180) / Math.PI})`} style={{ whiteSpace: 'pre' }}>
              {g.ch}
            </text>
          ))}
        </g>
      </svg>
    )
  }
  const paras = display.split('\n')
  return (
    <div style={outer}>
      {paras.map((p, i) => (
        <div key={i} style={{ ...textStyle, marginTop: i > 0 ? el.paragraphSpacing : 0, minHeight: size * el.lineHeight }}>
          {p || '\u200b'}
        </div>
      ))}
    </div>
  )
}

function useImgDims(src: string | null) {
  const [, setT] = useState(0)
  useEffect(() => {
    if (!src || knownDims(src)) return
    let alive = true
    imageDims(src).then(() => alive && setT((x) => x + 1)).catch(() => {})
    return () => {
      alive = false
    }
  }, [src])
  return src ? knownDims(src) : undefined
}

function useLutSrc(src: string | null, lut: string | null | undefined, amount: number, luts: Doc['luts']) {
  const [url, setUrl] = useState<{ key: string; url: string } | null>(null)
  const key = `${src?.length}:${src?.slice(-40)}|${lut}|${amount}|${luts?.length}`
  useEffect(() => {
    if (!src || !lut) return
    let alive = true
    lutObjectUrl(src, lut, amount, luts)
      .then((u) => alive && setUrl({ key, url: u }))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [src, lut, amount, luts, key])
  return src && lut && url && url.key === key ? url.url : src
}

function ImageView({ el, vars }: { el: ImageEl; vars: Record<string, string> }) {
  const luts = useStore((s) => s.doc.luts)
  const src = el.variable && vars[el.variable] ? vars[el.variable] : el.src
  const dims = useImgDims(src)
  const shown = useLutSrc(src, el.lut, (el.lutAmount ?? 100) / 100, luts)
  const mp = maskPath(el.mask, el.w, el.h, el.radius)
  const clip: CSSProperties = mp ? { clipPath: `path('${mp}')` } : {}
  if (!src) {
    return (
      <div
        className="img-placeholder"
        style={{ width: '100%', height: '100%', ...clip }}
        data-placeholder="1"
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m4 18 5-5 4 4 3-3 4 4" />
        </svg>
        <span>{el.variable ? `Image variable {${el.variable}}` : 'Drop an image or double-click'}</span>
      </div>
    )
  }
  const r = imageRect(el.variable && dims ? { ...el, nw: dims.w, nh: dims.h } : el)
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', ...clip }}>
      <img
        src={shown ?? src}
        draggable={false}
        alt=""
        style={{
          position: 'absolute',
          left: r.x,
          top: r.y,
          width: r.w,
          height: r.h,
          maxWidth: 'none',
          filter: cssFilter(el),
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  )
}

function VectorView({ el }: { el: VectorEl }) {
  const hover = useStore((s) => (s.hoverPart && s.hoverPart.elId === el.id ? s.hoverPart.partId : null))
  const html = useMemo(() => vectorSvg(el, hover), [el, hover])
  return <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: html }} />
}

interface Props {
  el: El
  vars: Record<string, string>
  editing: boolean
}

const TYPE_LABEL: Record<El['type'], string> = { text: 'Text', image: 'Image', shape: 'Shape', vector: 'Vector graphic' }

export function describeEl(el: El, vars: Record<string, string>) {
  const what = el.type === 'text' ? `“${applyVariables(el.text, vars).slice(0, 80)}”` : el.name
  const shape = el.type === 'shape' ? ` ${el.shape}` : ''
  return `${TYPE_LABEL[el.type]}${shape}: ${what}${el.locked ? ', locked' : ''}`
}

export const ElementView = memo(function ElementView({ el, vars, editing }: Props) {
  const selected = useStore((s) => s.selection.includes(el.id))
  const style: CSSProperties = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity,
    mixBlendMode: el.blend === 'normal' ? undefined : el.blend,
    display: el.hidden ? 'none' : undefined,
    cursor: el.locked ? 'default' : 'move',
  }
  const inner: CSSProperties = {
    width: '100%',
    height: '100%',
    transform: el.flipX || el.flipY ? `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})` : undefined,
  }
  return (
    <div
      style={style}
      data-el-id={el.id}
      data-type={el.type}
      className="el"
      tabIndex={el.hidden ? -1 : 0}
      role="button"
      aria-pressed={selected}
      aria-label={describeEl(el, vars)}
      onFocus={(e) => {
        if (e.target === e.currentTarget && !selected) actions.select([el.id])
      }}
    >
      <div style={inner} aria-hidden={!editing}>
        {el.type === 'shape' && <ShapeView el={el} />}
        {el.type === 'text' && <TextView el={el} vars={vars} editing={editing} />}
        {el.type === 'image' && <ImageView el={el} vars={vars} />}
        {el.type === 'vector' && <VectorView el={el} />}
      </div>
    </div>
  )
})
