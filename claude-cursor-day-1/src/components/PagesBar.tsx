import { actions, fitToScreen, useStore, zoomAt } from '../store'
import { TemplateThumb } from './LeftPanel'

export function PagesBar() {
  const doc = useStore((s) => s.doc)
  const pageIndex = useStore((s) => s.pageIndex)
  const role = useStore((s) => s.role)
  const zoom = useStore((s) => s.zoom)
  const tool = useStore((s) => s.tool)
  const creator = role === 'creator'
  const presets = [0.25, 0.5, 1, 2, 4, 8]
  const pct = Math.round(zoom * 100)
  return (
    <footer className="pagesbar">
      <div className="pages">
        {doc.pages.map((p, i) => (
          <button key={p.id} className={'page-card' + (i === pageIndex ? ' on' : '')} onClick={() => actions.setPage(i)} title={p.name}>
            <TemplateThumb doc={{ width: doc.width, height: doc.height, pages: [p] }} size={34} />
            <span>{i + 1}</span>
          </button>
        ))}
        {creator && (
          <>
            <button className="mini add" onClick={() => actions.addPage()} title="Add page">
              ＋ Page
            </button>
            <button className="mini" onClick={() => actions.duplicatePage()} title="Duplicate this page">
              ⧉
            </button>
            <button className="mini" onClick={() => actions.movePage(pageIndex, pageIndex - 1)} disabled={pageIndex === 0} title="Move page left">
              ◀
            </button>
            <button className="mini" onClick={() => actions.movePage(pageIndex, pageIndex + 1)} disabled={pageIndex >= doc.pages.length - 1} title="Move page right">
              ▶
            </button>
            <button className="mini danger" onClick={() => actions.deletePage()} disabled={doc.pages.length < 2} title="Delete this page">
              🗑
            </button>
          </>
        )}
        <span className="page-label">
          Page {pageIndex + 1} / {doc.pages.length}
        </span>
      </div>
      <div className="zoomctl">
        <button className={'mini' + (tool === 'hand' ? ' on' : '')} onClick={() => actions.set({ tool: tool === 'hand' ? 'select' : 'hand' })} title="Hand tool (or hold Space)">
          ✋
        </button>
        <button className="mini" onClick={() => zoomAt(zoom / 1.25)} title="Zoom out">
          −
        </button>
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value
            if (v === 'fit') fitToScreen()
            else if (v) zoomAt(Number(v))
          }}
          title="Zoom"
        >
          <option value="">{pct}%</option>
          <option value="fit">Fit to screen</option>
          {presets.map((z) => (
            <option key={z} value={z}>
              {z * 100}%
            </option>
          ))}
        </select>
        <button className="mini" onClick={() => zoomAt(zoom * 1.25)} title="Zoom in">
          ＋
        </button>
        <button className="mini" onClick={() => fitToScreen()} title="Fit to screen (Ctrl+0)">
          Fit
        </button>
      </div>
    </footer>
  )
}
