/** Built-in sticker / stock entries (no external API). */
export interface StockAsset {
  id: string
  label: string
  tags: string[]
  /** SVG markup or data URL */
  src: string
  kind: 'svg' | 'image'
}

export const STOCK_ASSETS: StockAsset[] = [
  {
    id: 'star-badge',
    label: 'Star badge',
    tags: ['star', 'badge', 'sticker'],
    kind: 'svg',
    src: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#fbbf24" d="M32 4l8.5 17.2L60 24l-14 13.6L49 56 32 46.8 15 56l3-18.4L4 24l19.5-2.8z"/></svg>`,
  },
  {
    id: 'heart',
    label: 'Heart',
    tags: ['heart', 'love', 'sticker'],
    kind: 'svg',
    src: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#ef4444" d="M32 54S6 36 6 22a10 10 0 0118-5 10 10 0 0118 5 10 10 0 0118 5c0 14-26 32-26 32z"/></svg>`,
  },
  {
    id: 'circle-frame',
    label: 'Circle frame',
    tags: ['circle', 'frame'],
    kind: 'svg',
    src: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="#6366f1" stroke-width="4"/></svg>`,
  },
  {
    id: 'arrow',
    label: 'Arrow',
    tags: ['arrow', 'pointer'],
    kind: 'svg',
    src: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#0ea5e9" d="M8 32h40l-8-8v6h14v4H40v6l8-8H8z"/></svg>`,
  },
]

export function searchStock(query: string): StockAsset[] {
  const q = query.trim().toLowerCase()
  if (!q) return STOCK_ASSETS
  return STOCK_ASSETS.filter(
    (a) => a.label.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)),
  )
}
