import { useEffect, useMemo, useState } from 'react'
import { searchStock, type StockAsset } from '../utils/stockAssets'
import { fetchAssetsFromSource } from '../utils/assetSources'
import type { AssetSourceConfig } from '../types/document'

interface Props {
  open: boolean
  onClose: () => void
  onInsert: (asset: StockAsset) => void
  assetSource?: AssetSourceConfig
}

export function StockLibraryModal({ open, onClose, onInsert, assetSource }: Props) {
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<StockAsset[]>([])
  useEffect(() => {
    if (!open) return
    void fetchAssetsFromSource(assetSource).then(setCatalog)
  }, [open, assetSource])
  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = catalog.length ? catalog : searchStock('')
    if (!q) return base
    return base.filter(
      (a) => a.label.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [catalog, query])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Stickers & stock</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <input
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
        />
        <ul className="stock-grid">
          {items.map((a) => (
            <li key={a.id}>
              <div
                className="stock-thumb"
                dangerouslySetInnerHTML={{ __html: a.kind === 'svg' ? a.src : '' }}
              />
              <span>{a.label}</span>
              <button type="button" onClick={() => onInsert(a)}>
                Insert
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
