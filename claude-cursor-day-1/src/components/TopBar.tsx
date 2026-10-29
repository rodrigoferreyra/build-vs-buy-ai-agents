import { actions, getState, history, parseDoc, saveLocal, toast, useStore } from '../store'
import { downloadBlob } from '../render'
import { openFilePicker } from '../upload'
import { LOCALES, switchLocale } from '../i18n'

export function TopBar() {
  const name = useStore((s) => s.doc.name)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const role = useStore((s) => s.role)
  const status = useStore((s) => s.saveStatus)
  const mode = useStore((s) => s.mode)
  const creator = role === 'creator'
  const wl = useStore((s) => s.wl)
  const hide = wl.hide
  const locale = useStore((s) => s.locale)

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
        {wl.logoUrl ? (
          <img className="brand-logo" src={wl.logoUrl} alt="" />
        ) : (
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--accent)" />
            <path d="M9 22 16 8l7 14z" fill="var(--on-accent)" />
          </svg>
        )}
        {wl.title && <strong>{wl.title}</strong>}
      </div>
      <input className="doc-name" value={name} onChange={(e) => actions.setName(e.target.value)} aria-label="Design name" />
      {!hide.file && <div className="group">
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
        {!hide.cloud && (
          <button onClick={() => actions.set({ dialog: 'storage' })} title="Save/load to your own URL">
            Cloud…
          </button>
        )}
      </div>}
      <div className="group">
        <button onClick={() => history.undo()} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button onClick={() => history.redo()} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          ↷ Redo
        </button>
      </div>
      {!hide.video && <div className="group mode-switch" role="tablist" aria-label="Editor mode">
        <button role="tab" aria-selected={mode === 'design'} className={mode === 'design' ? 'on' : ''} onClick={() => actions.setMode('design')}>
          🎨 Design
        </button>
        <button role="tab" aria-selected={mode === 'video'} className={mode === 'video' ? 'on' : ''} onClick={() => actions.setMode('video')}>
          🎬 Video
        </button>
      </div>}
      <div className="spacer" />
      <span className="status">{status}</span>
      {!hide.settings && (
        <button onClick={() => actions.set({ dialog: 'theme' })} title="White-label: title, logo, colours, panels" aria-label="White-label settings">
          ⚙
        </button>
      )}
      <label className="role">
        <span className="sr-only">Language</span>
        <select
          value={locale}
          aria-label="Language"
          onChange={(e) => {
            switchLocale(e.target.value)
            actions.set({ locale: e.target.value })
          }}
        >
          {LOCALES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.id.toUpperCase()} · {l.label}
            </option>
          ))}
        </select>
      </label>
      {!hide.role && <label className="role">
        Role
        <select value={role} onChange={(e) => actions.set({ role: e.target.value as 'creator' | 'adopter', selection: [], editingId: null })}>
          <option value="creator">Creator</option>
          <option value="adopter">Adopter</option>
        </select>
      </label>}
      {mode === 'design' && !hide.export && (
        <button className="primary" onClick={() => actions.set({ dialog: 'export' })}>
          Export
        </button>
      )}
    </header>
  )
}
