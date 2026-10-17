import { actions, getState, history, parseDoc, saveLocal, toast, useStore } from '../store'
import { downloadBlob } from '../render'
import { openFilePicker } from '../upload'

export function TopBar() {
  const name = useStore((s) => s.doc.name)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const role = useStore((s) => s.role)
  const status = useStore((s) => s.saveStatus)
  const creator = role === 'creator'

  const download = () => {
    const d = getState().doc
    downloadBlob(new Blob([JSON.stringify(d)], { type: 'application/json' }), `${d.name.replace(/[^\w\- ]+/g, '') || 'design'}.canvasly.json`)
  }
  const open = () =>
    openFilePicker('.json,application/json', false, async (files) => {
      try {
        const doc = parseDoc(await files[0].text())
        actions.loadDoc(doc)
        toast('Design opened')
      } catch (e) {
        toast('Could not open file: ' + (e as Error).message)
      }
    })

  return (
    <header className="topbar">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="#6d5efc" />
          <path d="M9 22 16 8l7 14z" fill="#fff" />
        </svg>
        <strong>Canvasly</strong>
      </div>
      <input className="doc-name" value={name} onChange={(e) => actions.setName(e.target.value)} aria-label="Design name" />
      <div className="group">
        <button onClick={() => actions.set({ dialog: 'new' })} disabled={!creator} title="New design">
          New
        </button>
        <button onClick={open} title="Open a .json design file">
          Open
        </button>
        <button onClick={() => saveLocal(true)} title="Ctrl+S – save to browser storage">
          Save
        </button>
        <button onClick={download} title="Download the design as JSON">
          Download .json
        </button>
        <button onClick={() => actions.set({ dialog: 'storage' })} title="Save/load to your own URL">
          Cloud…
        </button>
      </div>
      <div className="group">
        <button onClick={() => history.undo()} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button onClick={() => history.redo()} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          ↷ Redo
        </button>
      </div>
      <div className="spacer" />
      <span className="status">{status}</span>
      <label className="role">
        Role
        <select value={role} onChange={(e) => actions.set({ role: e.target.value as 'creator' | 'adopter', selection: [], editingId: null })}>
          <option value="creator">Creator</option>
          <option value="adopter">Adopter</option>
        </select>
      </label>
      <button className="primary" onClick={() => actions.set({ dialog: 'export' })}>
        Export
      </button>
    </header>
  )
}
