import type { CSSProperties, PointerEvent } from 'react'
import type { DesignElement } from '../types/document'

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

interface Props {
  element: DesignElement
  onResizeStart: (handle: Handle, e: PointerEvent) => void
}

const HANDLES: { id: Handle; style: CSSProperties }[] = [
  { id: 'nw', style: { left: -5, top: -5, cursor: 'nwse-resize' } },
  { id: 'n', style: { left: '50%', top: -5, marginLeft: -5, cursor: 'ns-resize' } },
  { id: 'ne', style: { right: -5, top: -5, cursor: 'nesw-resize' } },
  { id: 'e', style: { right: -5, top: '50%', marginTop: -5, cursor: 'ew-resize' } },
  { id: 'se', style: { right: -5, bottom: -5, cursor: 'nwse-resize' } },
  { id: 's', style: { left: '50%', bottom: -5, marginLeft: -5, cursor: 'ns-resize' } },
  { id: 'sw', style: { left: -5, bottom: -5, cursor: 'nesw-resize' } },
  { id: 'w', style: { left: -5, top: '50%', marginTop: -5, cursor: 'ew-resize' } },
]

export function ResizeHandles({ element, onResizeStart }: Props) {
  if (element.locked) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {HANDLES.map((h) => (
        <div
          key={h.id}
          onPointerDown={(e) => {
            e.stopPropagation()
            onResizeStart(h.id, e)
          }}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            background: '#fff',
            border: '2px solid #2563eb',
            borderRadius: 2,
            pointerEvents: 'auto',
            ...h.style,
          }}
        />
      ))}
    </div>
  )
}

export type { Handle }
