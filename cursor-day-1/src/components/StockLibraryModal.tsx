import { useMemo, useState } from 'react'
import { searchStock, type StockAsset } from '../utils/stockAssets'

interface Props {
  open: boolean
  onClose: () => void
  onInsert: (asset: StockAsset) => void
}

export function StockLibraryModal({ open, onClose, onInsert }: Props) {
  const [query, setQuery] = useState('')
  const items = useMemo(() => searchStock(query), [query])

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
