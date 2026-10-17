import { useMemo, useState } from 'react'
import {
  TEMPLATE_CATEGORIES,
  searchTemplates,
  type TemplateEntry,
} from '../utils/templates'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (entry: TemplateEntry) => void
}

export function TemplateLibraryModal({ open, onClose, onApply }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const items = useMemo(() => searchTemplates(query, category), [query, category])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Template library</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-toolbar">
          <input
            placeholder="Search templates…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <ul className="template-list">
          {items.length === 0 && <li className="muted">No templates yet — use Save as template.</li>}
          {items.map((t) => (
            <li key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <span className="muted"> · {t.category}</span>
                <p className="muted">{t.description}</p>
              </div>
              <button type="button" onClick={() => onApply(t)}>
                Open
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
