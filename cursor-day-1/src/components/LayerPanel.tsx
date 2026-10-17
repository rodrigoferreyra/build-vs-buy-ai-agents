import type { DesignElement } from '../types/document'
import { elementLabel } from '../utils/elements'

interface Props {
  elements: DesignElement[]
  selectedIds: string[]
  onSelect: (id: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onToggleVisible: (id: string) => void
  onToggleLocked: (id: string) => void
}

export function LayerPanel({
  elements,
  selectedIds,
  onSelect,
  onReorder,
  onToggleVisible,
  onToggleLocked,
}: Props) {
  const reversed = [...elements].reverse()

  return (
    <aside className="panel layers-panel">
      <h2>Layers</h2>
      <ul className="layer-list">
        {reversed.map((el) => {
          const index = elements.indexOf(el)
          const selected = selectedIds.includes(el.id)
          return (
            <li
              key={el.id}
              className={selected ? 'layer-item selected' : 'layer-item'}
              onClick={() => onSelect(el.id)}
            >
              <span className="layer-type">{el.type[0].toUpperCase()}</span>
              <span className="layer-name">
                {elementLabel(el)}
                {el.templateLock ? ' 🔐' : ''}
              </span>
              <div className="layer-actions">
                <button
                  type="button"
                  title={el.visible ? 'Hide' : 'Show'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleVisible(el.id)
                  }}
                >
                  {el.visible ? '👁' : '🚫'}
                </button>
                <button
                  type="button"
                  title={el.locked ? 'Unlock' : 'Lock'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleLocked(el.id)
                  }}
                >
                  {el.locked ? '🔒' : '🔓'}
                </button>
                <button
                  type="button"
                  title="Move up"
                  disabled={index >= elements.length - 1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onReorder(index, index + 1)
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  title="Move down"
                  disabled={index <= 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onReorder(index, index - 1)
                  }}
                >
                  ↓
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
