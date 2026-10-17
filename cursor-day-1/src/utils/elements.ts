import {
  newId,
  type DesignElement,
  type TextElement,
  type ShapeElement,
  type ImageElement,
} from '../types/document'

function baseShape(
  type: ShapeElement['type'],
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Partial<ShapeElement> = {},
): ShapeElement {
  return {
    id: newId(),
    type,
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fillKind: 'solid',
    fill: '#6366f1',
    gradientTo: '#a855f7',
    gradientAngle: 135,
    stroke: '#312e81',
    strokeWidth: 2,
    cornerRadius: type === 'rect' ? 12 : 0,
    starPoints: 5,
    polygonSides: 6,
    ...extra,
  }
}

export function createText(x = 100, y = 100): TextElement {
  return {
    id: newId(),
    type: 'text',
    name: 'Text',
    x,
    y,
    width: 280,
    height: 80,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: 'Double-click to edit',
    fontFamily: 'Inter, sans-serif',
    fontSize: 32,
    fontWeight: 600,
    fontStyle: 'normal',
    textAlign: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
    fill: '#111827',
    direction: 'ltr',
  }
}

export function createRect(x = 120, y = 120): ShapeElement {
  return baseShape('rect', 'Rectangle', x, y, 200, 140, {
    fill: '#6366f1',
    stroke: '#312e81',
  })
}

export function createEllipse(x = 140, y = 140): ShapeElement {
  return baseShape('ellipse', 'Ellipse', x, y, 160, 160, {
    fill: '#f97316',
    stroke: '#9a3412',
  })
}

export function createLine(x = 100, y = 200): ShapeElement {
  return baseShape('line', 'Line', x, y, 220, 8, {
    fill: 'transparent',
    fillKind: 'solid',
    stroke: '#111827',
    strokeWidth: 4,
  })
}

export function createStar(x = 160, y = 160): ShapeElement {
  return baseShape('star', 'Star', x, y, 140, 140, {
    fill: '#eab308',
    stroke: '#854d0e',
    starPoints: 5,
  })
}

export function createPolygon(x = 160, y = 160): ShapeElement {
  return baseShape('polygon', 'Polygon', x, y, 140, 140, {
    fill: '#14b8a6',
    stroke: '#0f766e',
    polygonSides: 6,
  })
}

export function createImageFromFile(
  src: string,
  naturalWidth: number,
  naturalHeight: number,
  x = 80,
  y = 80,
): ImageElement {
  const max = 400
  const scale = Math.min(1, max / Math.max(naturalWidth, naturalHeight))
  const w = naturalWidth * scale
  const h = naturalHeight * scale
  return {
    id: newId(),
    type: 'image',
    name: 'Image',
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    src,
    flipX: false,
    flipY: false,
    cropX: 0,
    cropY: 0,
    cropW: 1,
    cropH: 1,
  }
}

export function elementLabel(el: DesignElement): string {
  if (el.type === 'text') return el.content.slice(0, 24) || el.name
  return el.name
}

/** Default shape fields for JSON import of older projects. */
export function normalizeElement(el: DesignElement): DesignElement {
  if (el.type === 'text') {
    const t = el as TextElement
    return { ...t, direction: t.direction ?? 'ltr' }
  }
  if (
    el.type === 'rect' ||
    el.type === 'ellipse' ||
    el.type === 'line' ||
    el.type === 'star' ||
    el.type === 'polygon'
  ) {
    const s = el as ShapeElement
    return {
      ...s,
      fillKind: s.fillKind ?? 'solid',
      gradientTo: s.gradientTo ?? '#a855f7',
      gradientAngle: s.gradientAngle ?? 135,
      starPoints: s.starPoints ?? 5,
      polygonSides: s.polygonSides ?? 6,
    }
  }
  return el
}
