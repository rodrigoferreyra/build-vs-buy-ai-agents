import { diff, intersection, union } from 'martinez-polygon-clipping'
import { newId, type DesignElement, type PathElement, type ShapeElement } from '../types/document'

type Polygon = [number, number][][]

export type BooleanOp = 'union' | 'intersect' | 'subtract'

function rectPolygon(el: ShapeElement): Polygon {
  return [
    [
      [el.x, el.y],
      [el.x + el.width, el.y],
      [el.x + el.width, el.y + el.height],
      [el.x, el.y + el.height],
      [el.x, el.y],
    ],
  ]
}

function ellipsePolygon(el: ShapeElement, segments = 48): Polygon {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rx = el.width / 2
  const ry = el.height / 2
  const ring: [number, number][] = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    ring.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
  }
  return [ring]
}

function shapeToPolygon(el: ShapeElement): Polygon {
  if (el.type === 'ellipse') return ellipsePolygon(el)
  return rectPolygon(el)
}

function polygonToPathD(poly: Polygon): string {
  return poly
    .map((ring) => {
      if (!ring.length) return ''
      return (
        ring
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
          .join(' ') + ' Z'
      )
    })
    .join(' ')
}

function boundsFromPolygon(poly: Polygon): { x: number; y: number; width: number; height: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const ring of poly) {
    for (const pt of ring) {
      minX = Math.min(minX, pt[0])
      minY = Math.min(minY, pt[1])
      maxX = Math.max(maxX, pt[0])
      maxY = Math.max(maxY, pt[1])
    }
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 100, height: 100 }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function booleanShapes(
  a: ShapeElement,
  b: ShapeElement,
  op: BooleanOp,
): PathElement | null {
  const pa = shapeToPolygon(a)
  const pb = shapeToPolygon(b)
  let result: Polygon | null = null
  try {
    if (op === 'union') result = union(pa, pb) as Polygon
    if (op === 'intersect') result = intersection(pa, pb) as Polygon
    if (op === 'subtract') result = diff(pa, pb) as Polygon
  } catch {
    return null
  }
  if (!result?.length) return null
  const box = boundsFromPolygon(result)
  const d = polygonToPathD(result)
  return {
    id: newId(),
    type: 'path',
    name: `Boolean ${op}`,
    x: box.x,
    y: box.y,
    width: Math.max(20, box.width),
    height: Math.max(20, box.height),
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    d,
    fill: a.fill,
    stroke: a.stroke,
    strokeWidth: a.strokeWidth,
    colorMode: a.colorMode,
    cmyk: a.cmyk,
    spotName: a.spotName,
  }
}

export function pickShapesForBoolean(selection: DesignElement[]): ShapeElement[] {
  return selection.filter((e): e is ShapeElement => e.type === 'rect' || e.type === 'ellipse')
}
