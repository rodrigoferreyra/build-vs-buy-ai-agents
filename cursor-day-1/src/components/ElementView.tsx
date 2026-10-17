import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import type {
  DesignElement,
  TextElement,
  ShapeElement,
  ImageElement,
} from '../types/document'
import { shapeFillCss } from '../utils/shapeStyle'
import { imageFilterCss } from '../utils/imageFilters'
import { effectiveFontSize, resolveVariables } from '../utils/textLayout'

interface Props {
  element: DesignElement
  selected: boolean
  editingTextId: string | null
  templateVariables?: Record<string, string>
  onSelect: (id: string, additive: boolean) => void
  onStartEdit: (id: string) => void
  onTextChange: (id: string, content: string) => void
  onEndEdit: () => void
}

export function ElementView({
  element,
  selected,
  editingTextId,
  templateVariables = {},
  onSelect,
  onStartEdit,
  onTextChange,
  onEndEdit,
}: Props) {
  if (!element.visible) return null

  const style: CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation}deg)`,
    opacity: element.opacity,
    mixBlendMode: element.blendMode && element.blendMode !== 'normal' ? element.blendMode : undefined,
    pointerEvents: element.locked ? 'none' : 'auto',
    boxSizing: 'border-box',
    outline: selected ? '2px solid #2563eb' : undefined,
    outlineOffset: selected ? '1px' : undefined,
    cursor: element.locked ? 'not-allowed' : 'move',
  }

  const handlePointerDown = (e: PointerEvent) => {
    e.stopPropagation()
    if (element.locked) return
    onSelect(element.id, e.shiftKey)
  }

  const handleDoubleClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (element.type === 'text' && !element.locked) {
      onStartEdit(element.id)
    }
  }

  if (element.type === 'text') {
    return (
      <TextView
        el={element}
        vars={templateVariables}
        style={style}
        editing={editingTextId === element.id}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onTextChange={onTextChange}
        onEndEdit={onEndEdit}
      />
    )
  }

  if (
    element.type === 'rect' ||
    element.type === 'ellipse' ||
    element.type === 'line' ||
    element.type === 'star' ||
    element.type === 'polygon'
  ) {
    return (
      <ShapeView
        el={element}
        style={style}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
      />
    )
  }

  if (element.type !== 'image') return null

  return (
    <ImageView
      el={element}
      style={style}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    />
  )
}

function TextView({
  el,
  vars,
  style,
  editing,
  onPointerDown,
  onDoubleClick,
  onTextChange,
  onEndEdit,
}: {
  el: TextElement
  vars: Record<string, string>
  style: CSSProperties
  editing: boolean
  onPointerDown: (e: PointerEvent) => void
  onDoubleClick: (e: MouseEvent) => void
  onTextChange: (id: string, content: string) => void
  onEndEdit: () => void
}) {
  const displayContent = editing ? el.content : resolveVariables(el.content, vars)
  const fontSize = effectiveFontSize({ ...el, content: displayContent })
  const lh = fontSize * el.lineHeight
  const para = el.paragraphSpacing ?? 0
  const lines = displayContent.split('\n')
  const blockH = lines.length * lh + Math.max(0, lines.length - 1) * para
  let padTop = 4
  const vAlign = el.verticalAlign ?? 'top'
  if (vAlign === 'middle') padTop = Math.max(4, (el.height - blockH) / 2)
  if (vAlign === 'bottom') padTop = Math.max(4, el.height - blockH - 4)

  const textStyle: CSSProperties = {
    width: '100%',
    minHeight: '100%',
    fontFamily: el.fontFamily,
    fontSize,
    fontWeight: el.fontWeight,
    fontStyle: el.fontStyle,
    textAlign: el.textAlign,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    color: el.fill,
    textShadow: el.textShadow,
    WebkitTextStroke: el.WebkitTextStroke,
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
    margin: 0,
    padding: `${padTop}px 4px 4px`,
    border: 'none',
    background: el.textBackground ?? 'transparent',
    resize: 'none',
    outline: editing ? '1px dashed #93c5fd' : 'none',
    direction: el.direction ?? 'ltr',
    unicodeBidi: 'plaintext',
    boxSizing: 'border-box',
  }

  return (
    <div style={style} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
      {editing ? (
        <textarea
          autoFocus
          dir={el.direction ?? 'ltr'}
          value={el.content}
          style={textStyle}
          onChange={(e) => onTextChange(el.id, e.target.value)}
          onBlur={onEndEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onEndEdit()
          }}
        />
      ) : (
        <div dir={el.direction ?? 'ltr'} style={{ ...textStyle, pointerEvents: 'none' }}>
          {displayContent.split('\n').map((line, i) => (
            <span key={i} style={{ display: 'block', marginBottom: i < lines.length - 1 ? para : 0 }}>
              {line}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ShapeView({
  el,
  style,
  onPointerDown,
  onDoubleClick,
}: {
  el: ShapeElement
  style: CSSProperties
  onPointerDown: (e: PointerEvent) => void
  onDoubleClick: (e: MouseEvent) => void
}) {
  if (el.type === 'line') {
    return (
      <div style={style} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
        <svg width="100%" height="100%" style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <line
            x1="0"
            y1="50%"
            x2="100%"
            y2="50%"
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            strokeLinecap="round"
          />
        </svg>
      </div>
    )
  }

  if (el.type === 'star' || el.type === 'polygon') {
    const points =
      el.type === 'star' ? starPoints(el.width, el.height, el.starPoints) : polygonPoints(el.width, el.height, el.polygonSides)
    const fill = el.fillKind === 'gradient' ? 'url(#grad-' + el.id + ')' : el.fill
    return (
      <div style={style} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
        <svg width="100%" height="100%" style={{ pointerEvents: 'none' }}>
          {el.fillKind === 'gradient' && (
            <defs>
              <linearGradient id={`grad-${el.id}`} gradientTransform={`rotate(${el.gradientAngle - 90}, 0.5, 0.5)`}>
                <stop offset="0%" stopColor={el.fill} />
                <stop offset="100%" stopColor={el.gradientTo} />
              </linearGradient>
            </defs>
          )}
          <polygon
            points={points}
            fill={fill}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
          />
        </svg>
      </div>
    )
  }

  const inner: CSSProperties =
    el.type === 'rect'
      ? {
          width: '100%',
          height: '100%',
          background: shapeFillCss(el),
          border: `${el.strokeWidth}px solid ${el.stroke}`,
          borderRadius: el.cornerRadius,
          boxSizing: 'border-box',
        }
      : {
          width: '100%',
          height: '100%',
          background: shapeFillCss(el),
          border: `${el.strokeWidth}px solid ${el.stroke}`,
          borderRadius: '50%',
          boxSizing: 'border-box',
        }

  return (
    <div style={style} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
      <div style={inner} />
    </div>
  )
}

function starPoints(w: number, h: number, n: number): string {
  const cx = w / 2
  const cy = h / 2
  const outer = Math.min(w, h) / 2
  const inner = outer / 2
  const step = Math.PI / n
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + i * step
    pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`)
  }
  return pts.join(' ')
}

function polygonPoints(w: number, h: number, sides: number): string {
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) / 2
  const pts: string[] = []
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides
    pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`)
  }
  return pts.join(' ')
}

function maskClip(mask: ImageElement['maskShape']): string | undefined {
  if (mask === 'circle' || mask === 'ellipse') return 'ellipse(50% 50% at 50% 50%)'
  if (mask === 'rect') return 'inset(0 round 4px)'
  return undefined
}

function ImageView({
  el,
  style,
  onPointerDown,
  onDoubleClick,
}: {
  el: ImageElement
  style: CSSProperties
  onPointerDown: (e: PointerEvent) => void
  onDoubleClick: (e: MouseEvent) => void
}) {
  if (el.vectorPaths?.length) {
    const vb = el.vectorViewBox ?? '0 0 100 100'
    return (
      <div style={style} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
        <svg width="100%" height="100%" viewBox={vb} style={{ pointerEvents: 'none' }}>
          {el.vectorPaths.map((p) => (
            <path key={p.id} d={p.d} fill={p.fill} />
          ))}
        </svg>
      </div>
    )
  }

  if (el.isPlaceholder && !el.src) {
    return (
      <div
        style={{
          ...style,
          border: '2px dashed #64748b',
          background: 'rgba(148,163,184,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 12,
        }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        Drop image
      </div>
    )
  }

  const flip = `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})`
  const imgW = 100 / el.cropW
  const imgH = 100 / el.cropH
  const imgX = (-el.cropX / el.cropW) * 100
  const imgY = (-el.cropY / el.cropH) * 100
  const clip = maskClip(el.maskShape)

  return (
    <div
      style={{ ...style, overflow: 'hidden', clipPath: clip }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <img
        src={el.src}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          width: `${imgW}%`,
          height: `${imgH}%`,
          left: `${imgX}%`,
          top: `${imgY}%`,
          transform: flip,
          pointerEvents: 'none',
          userSelect: 'none',
          maxWidth: 'none',
          filter: imageFilterCss(el),
        }}
      />
    </div>
  )
}
