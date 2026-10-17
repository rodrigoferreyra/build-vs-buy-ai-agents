import { useState } from 'react'
import { actions, useStore } from '../store'
import type { El } from '../types'

const ICON: Record<El['type'], string> = { text: 'T', shape: '◼', image: '▨', vector: '✎' }

export function LayersPanel() {
  const doc = useStore((s) => s.doc)
  const pageIndex = useStore((s) => s.pageIndex)
  const selection = useStore((s) => s.selection)
  const role = useStore((s) => s.role)
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const els = doc.pages[pageIndex].elements
  const creator = role === 'creator'
  // top-most first
  const rows = [...els].map((e, i) => ({ e, i })).reverse()

  const onClick = (e: React.MouseEvent, el: El) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) actions.toggleSelect(el.id)
    else actions.select([el.id])
  }

  return (
    <div className="layers">
      <div className="layers-head">
        <span>{els.length} layer(s) · drag to reorder</span>
      </div>
      {rows.length === 0 && <div className="subtle pad">This page is empty. Add something from the “Add” tab.</div>}
      {rows.map(({ e, i }) => (
        <div
          key={e.id}
          className={'layer' + (selection.includes(e.id) ? ' sel' : '') + (over === i && drag !== null && drag !== i ? ' over' : '') + (e.hidden ? ' hid' : '')}
          draggable={creator && renaming !== e.id}
          onDragStart={(ev) => {
            setDrag(i)
            ev.dataTransfer.effectAllowed = 'move'
            ev.dataTransfer.setData('text/plain', e.id)
          }}
          onDragOver={(ev) => {
            if (drag === null) return
            ev.preventDefault()
            setOver(i)
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(ev) => {
            ev.preventDefault()
            if (drag !== null) actions.moveLayer(drag, i)
            setDrag(null)
            setOver(null)
          }}
          onDragEnd={() => {
            setDrag(null)
            setOver(null)
          }}
          onClick={(ev) => onClick(ev, e)}
        >
          <span className="l-icon">{ICON[e.type]}</span>
          <span className="l-name" onDoubleClick={() => creator && setRenaming(e.id)}>
            {renaming === e.id ? (
              <input
                autoFocus
                defaultValue={e.name}
                onClick={(ev) => ev.stopPropagation()}
                onBlur={(ev) => {
                  actions.patchForce([e.id], { name: ev.target.value || e.name })
                  setRenaming(null)
                }}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === 'Escape') (ev.target as HTMLInputElement).blur()
                }}
              />
            ) : (
              <>
                {e.groupId && <span className="grp" title="Grouped">⛓</span>}
                {e.name}
                {e.type === 'text' && <em> – {e.text.slice(0, 18)}</em>}
              </>
            )}
          </span>
          <span className="l-actions" onClick={(ev) => ev.stopPropagation()}>
            <button title="Bring forward" disabled={!creator || i === els.length - 1} onClick={() => actions.moveLayer(i, i + 1)}>
              ↑
            </button>
            <button title="Send backward" disabled={!creator || i === 0} onClick={() => actions.moveLayer(i, i - 1)}>
              ↓
            </button>
            <button
              title={e.hidden ? 'Show' : 'Hide'}
              className={e.hidden ? 'active' : ''}
              onClick={() => actions.patchForce([e.id], { hidden: !e.hidden })}
            >
              {e.hidden ? '🚫' : '👁'}
            </button>
            <button
              title={e.locked ? 'Unlock' : 'Lock'}
              className={e.locked ? 'active' : ''}
              disabled={!creator}
              onClick={() => actions.patchForce([e.id], { locked: !e.locked })}
            >
              {e.locked ? '🔒' : '🔓'}
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}
