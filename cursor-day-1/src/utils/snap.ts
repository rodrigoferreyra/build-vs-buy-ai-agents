const SNAP_THRESHOLD = 8

export interface SnapGuide {
  orientation: 'h' | 'v'
  position: number
}

export function snapValue(
  value: number,
  targets: number[],
  threshold = SNAP_THRESHOLD,
): { value: number; guide: SnapGuide | null } {
  for (const t of targets) {
    if (Math.abs(value - t) <= threshold) {
      return {
        value: t,
        guide: { orientation: 'v', position: t },
      }
    }
  }
  return { value, guide: null }
}

export function snapPoint(
  x: number,
  y: number,
  pageW: number,
  pageH: number,
  otherBounds: { x: number; y: number; w: number; h: number }[],
  manualGuides: { orientation: 'h' | 'v'; position: number }[] = [],
): { x: number; y: number; guides: SnapGuide[] } {
  const guides: SnapGuide[] = []
  const xTargets = [0, pageW / 2, pageW]
  const yTargets = [0, pageH / 2, pageH]
  for (const g of manualGuides) {
    if (g.orientation === 'v') xTargets.push(g.position)
    else yTargets.push(g.position)
  }

  for (const b of otherBounds) {
    xTargets.push(b.x, b.x + b.w / 2, b.x + b.w)
    yTargets.push(b.y, b.y + b.h / 2, b.y + b.h)
  }

  let nx = x
  let ny = y

  for (const t of xTargets) {
    if (Math.abs(x - t) <= SNAP_THRESHOLD) {
      nx = t
      guides.push({ orientation: 'v', position: t })
      break
    }
  }
  for (const t of yTargets) {
    if (Math.abs(y - t) <= SNAP_THRESHOLD) {
      ny = t
      guides.push({ orientation: 'h', position: t })
      break
    }
  }

  return { x: nx, y: ny, guides }
}
