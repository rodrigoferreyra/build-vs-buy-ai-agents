import type { DesignElement } from '../types/document'

export type AlignKind = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'

export function alignElements(elements: DesignElement[], kind: AlignKind): Map<string, Partial<DesignElement>> {
  const patches = new Map<string, Partial<DesignElement>>()
  if (elements.length < 2) return patches

  const minX = Math.min(...elements.map((e) => e.x))
  const maxX = Math.max(...elements.map((e) => e.x + e.width))
  const minY = Math.min(...elements.map((e) => e.y))
  const maxY = Math.max(...elements.map((e) => e.y + e.height))
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2

  for (const el of elements) {
    switch (kind) {
      case 'left':
        patches.set(el.id, { x: minX })
        break
      case 'right':
        patches.set(el.id, { x: maxX - el.width })
        break
      case 'center-h':
        patches.set(el.id, { x: midX - el.width / 2 })
        break
      case 'top':
        patches.set(el.id, { y: minY })
        break
      case 'bottom':
        patches.set(el.id, { y: maxY - el.height })
        break
      case 'center-v':
        patches.set(el.id, { y: midY - el.height / 2 })
        break
    }
  }
  return patches
}

export function distributeHorizontally(elements: DesignElement[]): Map<string, Partial<DesignElement>> {
  const patches = new Map<string, Partial<DesignElement>>()
  if (elements.length < 3) return patches

  const sorted = [...elements].sort((a, b) => a.x - b.x)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const totalSpan = last.x + last.width - first.x
  const totalWidth = sorted.reduce((s, e) => s + e.width, 0)
  const gap = (totalSpan - totalWidth) / (sorted.length - 1)

  let x = first.x
  for (const el of sorted) {
    patches.set(el.id, { x })
    x += el.width + gap
  }
  return patches
}

export function distributeVertically(elements: DesignElement[]): Map<string, Partial<DesignElement>> {
  const patches = new Map<string, Partial<DesignElement>>()
  if (elements.length < 3) return patches

  const sorted = [...elements].sort((a, b) => a.y - b.y)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const totalSpan = last.y + last.height - first.y
  const totalHeight = sorted.reduce((s, e) => s + e.height, 0)
  const gap = (totalSpan - totalHeight) / (sorted.length - 1)

  let y = first.y
  for (const el of sorted) {
    patches.set(el.id, { y })
    y += el.height + gap
  }
  return patches
}
