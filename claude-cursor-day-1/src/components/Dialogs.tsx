import { useState } from 'react'
import { actions, getState, saveUserTemplate, toast, useStore, parseDoc } from '../store'
import { SIZE_PRESETS } from '../templates'
import { fromUnit, round, toUnit } from '../geometry'
import { canvasToBlob, downloadBlob, renderPage } from '../render'
import { buildPdf } from '../pdf'
import { makeZip } from '../zip'
import type { Unit } from '../types'
import { Modal, Num } from './ui'
import { DEFAULT_WL, HIDE_LABELS, WL_KEY, type HideKey, type WhiteLabel } from '../whitelabel'
import { openFilePicker } from '../upload'

export function Dialogs() {
  const dialog = useStore((s) => s.dialog)
  const close = () => actions.set({ dialog: null })
  if (dialog === 'new') return <NewDesign onClose={close} />
  if (dialog === 'export') return <ExportDialog onClose={close} />
  if (dialog === 'storage') return <StorageDialog onClose={close} />
  if (dialog === 'saveTemplate') return <SaveTemplateDialog onClose={close} />
  if (dialog === 'theme') return <WhiteLabelDialog onClose={close} />
  return null
}

function NewDesign({ onClose }: { onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>('px')
  const [w, setW] = useState(1080)
  const [h, setH] = useState(1080)
  const [name, setName] = useState('Untitled design')
  const create = (w: number, h: number, u: Unit) => {
    const has = getState().doc.pages.some((p) => p.elements.length > 0)
    if (has && !window.confirm('Start a new blank design? The current design is kept in browser storage only until it is replaced by autosave.')) return
    actions.newDoc(fromUnit(w, u), fromUnit(h, u), u, name)
    onClose()
  }
  const groups = [...new Set(SIZE_PRESETS.map((p) => p.group))]
  return (
    <Modal title="New design" onClose={onClose} wide>
      <div className="newdesign">
        <div>
          <h4>Presets</h4>
          {groups.map((g) => (
            <div key={g}>
              <div className="subtle">{g}</div>
              <div className="preset-list">
                {SIZE_PRESETS.filter((p) => p.group === g).map((p) => (
                  <button key={p.label} onClick={() => create(p.w, p.h, p.unit)}>
                    <strong>{p.label}</strong>
                    <span>
                      {p.w} × {p.h} {p.unit}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <h4>Custom size</h4>
          <label className="row">
            <span className="row-label">Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="row">
            <span className="row-label">Unit</span>
            <select
              value={unit}
              onChange={(e) => {
                const nu = e.target.value as Unit
                setW(round(toUnit(fromUnit(w, unit), nu), nu === 'px' ? 0 : 2))
                setH(round(toUnit(fromUnit(h, unit), nu), nu === 'px' ? 0 : 2))
                setUnit(nu)
              }}
            >
              <option value="px">Pixels (px)</option>
              <option value="mm">Millimetres (mm)</option>
              <option value="in">Inches (in)</option>
            </select>
          </label>
          <div className="grid2">
            <Num label="Width" value={w} min={1} suffix={unit} onChange={setW} />
            <Num label="Height" value={h} min={1} suffix={unit} onChange={setH} />
          </div>
          <div className="subtle">
            = {Math.round(fromUnit(w, unit))} × {Math.round(fromUnit(h, unit))} px (96 dpi)
          </div>
          <button className="primary wide" onClick={() => create(w, h, unit)}>
            Create blank design
          </button>
        </div>
      </div>
    </Modal>
  )
}

type Fmt = 'png' | 'jpeg' | 'webp' | 'pdf'

function ExportDialog({ onClose }: { onClose: () => void }) {
  const doc = useStore((s) => s.doc)
  const selection = useStore((s) => s.selection)
  const rowCount = doc.data?.rows.length ?? 0
  const [fmt, setFmt] = useState<Fmt>('png')
  const [dpi, setDpi] = useState(96)
  const [scope, setScope] = useState<'page' | 'all' | 'selection' | 'rows'>(selection.length ? 'selection' : 'page')
  const [bleed, setBleed] = useState(false)
  const [marks, setMarks] = useState(false)
  const [pdfx, setPdfx] = useState(false)
  const [oneFile, setOneFile] = useState(true)
  const [quality, setQuality] = useState(92)
  const [busy, setBusy] = useState('')
  const [info, setInfo] = useState('')
  const pdf = fmt === 'pdf'
  const effScope = pdf && scope === 'selection' ? 'page' : scope
  const scale = dpi / 96
  const b = bleed ? doc.bleed : 0
  const pw = Math.round((doc.width + 2 * b) * scale)
  const ph = Math.round((doc.height + 2 * b) * scale)
  const base = doc.name.replace(/[^\w\- ]+/g, '') || 'design'

  const run = async () => {
    if (!pdf && (pw > 16000 || ph > 16000)) return toast('That resolution is too large for a browser canvas (max ~16000 px)')
    setBusy('Rendering…')
    setInfo('')
    try {
      const s = getState()
      // what to render: [{ doc (with row variables), page, pageNo, label }]
      type Job = { d: typeof s.doc; p: (typeof s.doc.pages)[number]; no: number; label: string }
      const jobs: Job[] = []
      if (effScope === 'rows' && s.doc.data) {
        const rows = s.doc.data.rows
        rows.forEach((row, ri) => {
          const d = { ...s.doc, variables: { ...s.doc.variables, ...row } }
          const lab = String(Object.values(row)[0] ?? '').replace(/[^\w\-]+/g, '_').slice(0, 24)
          d.pages.forEach((p, pi) => jobs.push({ d, p, no: pi + 1, label: `${String(ri + 1).padStart(3, '0')}${lab ? '-' + lab : ''}${d.pages.length > 1 ? `-p${pi + 1}` : ''}` }))
        })
      } else if (effScope === 'all') s.doc.pages.forEach((p, i) => jobs.push({ d: s.doc, p, no: i + 1, label: `page${i + 1}` }))
      else jobs.push({ d: s.doc, p: s.doc.pages[s.pageIndex], no: s.pageIndex + 1, label: s.doc.pages.length > 1 ? `page${s.pageIndex + 1}` : '' })

      if (pdf) {
        const zipEach = effScope === 'rows' && !oneFile
        const dl = (bytes: Uint8Array, name: string) => downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), name)
        if (zipEach) {
          const files: { name: string; data: Uint8Array }[] = []
          for (let i = 0; i < jobs.length; i++) {
            setBusy(`PDF ${i + 1}/${jobs.length}…`)
            const r = await buildPdf([{ doc: jobs[i].d, page: jobs[i].p }], { dpi: Math.max(dpi, 150), bleed, cropMarks: marks, title: base, pdfx })
            files.push({ name: `${base}-${jobs[i].label}.pdf`, data: r.bytes })
          }
          downloadBlob(makeZip(files), `${base}-pdfs.zip`)
          toast(`Exported ${files.length} PDFs (ZIP)`)
        } else {
          const r = await buildPdf(jobs.map((j) => ({ doc: j.d, page: j.p })), {
            dpi: Math.max(dpi, 150),
            bleed,
            cropMarks: marks,
            title: base,
            pdfx,
            onProgress: (d, t) => setBusy(`Page ${d}/${t}…`),
          })
          dl(r.bytes, `${base}.pdf`)
          const rep = r.report
          setInfo(`PDF: ${rep.vectorText} text blocks as real text, ${rep.rasterText} rasterised, ${rep.vectorShapes} vector shapes, ${rep.rasterElements} raster layers. ${rep.textLayers} effect text blocks kept selectable. Embedded fonts: ${rep.embeddedFonts.join(', ') || 'none'}${rep.substitutes.length ? ` (system fonts substituted: ${rep.substitutes.join(', ')})` : ''}.${rep.pdfx ? ' PDF/X-4 with sRGB output intent.' : ''}`)
          toast(`PDF exported (${(r.bytes.length / 1024).toFixed(0)} KB)`)
        }
        if (effScope !== 'rows') return
        onClose()
        return
      }

      const mime = fmt === 'png' ? 'image/png' : fmt === 'jpeg' ? 'image/jpeg' : 'image/webp'
      const ext = fmt === 'jpeg' ? 'jpg' : fmt
      const zipFiles: { name: string; data: Uint8Array }[] = []
      for (let i = 0; i < jobs.length; i++) {
        const j = jobs[i]
        setBusy(`Rendering ${i + 1}/${jobs.length}…`)
        let canvas = await renderPage(j.d, j.p, {
          scale,
          includeBleed: bleed,
          onlyIds: effScope === 'selection' ? s.selection : undefined,
        })
        if (fmt === 'jpeg') {
          const flat = document.createElement('canvas')
          flat.width = canvas.width
          flat.height = canvas.height
          const c = flat.getContext('2d')!
          c.fillStyle = '#ffffff'
          c.fillRect(0, 0, flat.width, flat.height)
          c.drawImage(canvas, 0, 0)
          canvas = flat
        }
        const blob = await canvasToBlob(canvas, mime, quality / 100)
        const suffix = effScope === 'selection' ? '-selection' : j.label ? '-' + j.label : ''
        if (effScope === 'rows') zipFiles.push({ name: `${base}${suffix}.${ext}`, data: new Uint8Array(await blob.arrayBuffer()) })
        else downloadBlob(blob, `${base}${suffix}.${ext}`)
      }
      if (effScope === 'rows') {
        downloadBlob(makeZip(zipFiles), `${base}-${fmt}.zip`)
        toast(`Exported ${zipFiles.length} files (ZIP)`)
      } else toast('Export complete')
      onClose()
    } catch (e) {
      console.error(e)
      toast('Export failed: ' + (e as Error).message)
    } finally {
      setBusy('')
    }
  }
  return (
    <Modal title="Export" onClose={onClose}>
      <div className="form">
        <div className="row">
          <span className="row-label">Format</span>
          <div className="seg">
            {(['png', 'jpeg', 'webp', 'pdf'] as const).map((f) => (
              <button key={f} className={fmt === f ? 'on' : ''} onClick={() => setFmt(f)}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {(fmt === 'jpeg' || fmt === 'webp') && (
          <label className="row">
            <span className="row-label">Quality</span>
            <input type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
            <span>{quality}%</span>
          </label>
        )}
        <div className="row">
          <span className="row-label">{pdf ? 'Image DPI' : 'Resolution'}</span>
          <div className="seg">
            {[72, 96, 150, 300, 600].map((d) => (
              <button key={d} className={dpi === d ? 'on' : ''} onClick={() => setDpi(d)}>
                {d} DPI
              </button>
            ))}
          </div>
        </div>
        <Num label="Custom DPI" value={dpi} min={20} max={1200} onChange={setDpi} />
        <div className="row">
          <span className="row-label">What</span>
          <div className="seg">
            <button className={scope === 'page' ? 'on' : ''} onClick={() => setScope('page')}>
              This page
            </button>
            <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')} disabled={doc.pages.length < 2}>
              All pages
            </button>
            <button className={scope === 'selection' ? 'on' : ''} onClick={() => setScope('selection')} disabled={!selection.length || pdf}>
              Selection
            </button>
            <button className={scope === 'rows' ? 'on' : ''} onClick={() => setScope('rows')} disabled={!rowCount} title="Render one design per data row (Design → Variables → data source)">
              Every data row{rowCount ? ` (${rowCount})` : ''}
            </button>
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={bleed} disabled={doc.bleed <= 0 || effScope === 'selection'} onChange={(e) => setBleed(e.target.checked)} />
          Include bleed ({round(toUnit(doc.bleed, 'mm'), 1)} mm){doc.bleed <= 0 && ' – set a bleed in Design → Page'}
        </label>
        {pdf && (
          <label className="check">
            <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} />
            Crop marks (adds a slug area; sets TrimBox / BleedBox)
          </label>
        )}
        {pdf && (
          <label className="check">
            <input type="checkbox" checked={pdfx} onChange={(e) => setPdfx(e.target.checked)} />
            PDF/X-4 (print standard: sRGB output intent, XMP, all fonts embedded)
          </label>
        )}
        {pdf && effScope === 'rows' && (
          <label className="check">
            <input type="checkbox" checked={oneFile} onChange={(e) => setOneFile(e.target.checked)} />
            One multi-page PDF (untick for a ZIP with one PDF per row)
          </label>
        )}
        <div className="subtle">
          {pdf
            ? pdfx
              ? 'PDF/X-4: PDF 1.6, GTS_PDFXVersion in Info + XMP, embedded sRGB ICC output intent, TrimBox/BleedBox, every font embedded. CMYK fills are converted to RGB; spot colours stay as Separations (DeviceRGB alternate).'
              : 'PDF: vector shapes and paths, real selectable text with every font embedded (system fonts get a bundled substitute), CMYK / spot fills, raster only for images and effects.'
            : `Output: ${effScope === 'selection' ? 'selection bounds' : `${pw} × ${ph} px`} · everything is rendered locally in your browser.`}
        </div>
        {info && <div className="notice">{info}</div>}
        <button className="primary wide" disabled={!!busy} onClick={run}>
          {busy || `Export ${fmt.toUpperCase()}`}
        </button>
      </div>
    </Modal>
  )
}

function StorageDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(localStorage.getItem('canvasly:remote') || '')
  const [busy, setBusy] = useState(false)
  const remember = () => localStorage.setItem('canvasly:remote', url)
  const save = async () => {
    setBusy(true)
    try {
      remember()
      const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getState().doc) })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      toast('Saved to your storage endpoint')
    } catch (e) {
      toast('Save failed: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const load = async () => {
    setBusy(true)
    try {
      remember()
      const r = await fetch(url)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      actions.loadDoc(parseDoc(await r.text()))
      toast('Loaded from your storage endpoint')
      onClose()
    } catch (e) {
      toast('Load failed: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Your own storage" onClose={onClose}>
      <div className="form">
        <p className="subtle">
          By default nothing leaves your browser. If you choose, enter a URL (e.g. a pre-signed S3 PUT/GET URL or your own API). The design JSON is sent only when you press the buttons below.
        </p>
        <input type="url" placeholder="https://my-bucket.s3.amazonaws.com/designs/one.json?..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="btn-row">
          <button disabled={!url || busy} onClick={save}>
            PUT current design
          </button>
          <button disabled={!url || busy} onClick={load}>
            GET &amp; open
          </button>
        </div>
      </div>
    </Modal>
  )
}

function SaveTemplateDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState(getState().doc.name + ' template')
  const [cat, setCat] = useState('My templates')
  return (
    <Modal title="Save as template" onClose={onClose}>
      <div className="form">
        <label className="row">
          <span className="row-label">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="row">
          <span className="row-label">Category</span>
          <input type="text" list="cats" value={cat} onChange={(e) => setCat(e.target.value)} />
          <datalist id="cats">
            <option value="My templates" />
            <option value="Social" />
            <option value="Print" />
            <option value="Marketing" />
          </datalist>
        </label>
        <button
          className="primary wide"
          onClick={() => {
            saveUserTemplate(name, cat)
            onClose()
          }}
        >
          Save template
        </button>
      </div>
    </Modal>
  )
}

function WhiteLabelDialog({ onClose }: { onClose: () => void }) {
  const wl = useStore((s) => s.wl)
  const [json, setJson] = useState('')
  const set = (p: Parameters<typeof actions.setWhiteLabel>[0]) => actions.setWhiteLabel(p)
  const colorKeys = Object.keys(wl.colors) as (keyof WhiteLabel['colors'])[]
  const uploadLogo = () =>
    openFilePicker('image/*,.svg', false, (files) => {
      const r = new FileReader()
      r.onload = () => set({ logoUrl: String(r.result) })
      r.readAsDataURL(files[0])
    })
  return (
    <Modal title="White-label the editor" onClose={onClose} wide>
      <div className="form wl-form">
        <p className="subtle">
          Rebrand the editor UI for your product: title, logo, colours and which panels are shown. Saved in this browser; embedders pass the same object to <code>mount(el, {'{ whiteLabel }'})</code>.
        </p>
        <label className="row">
          <span className="row-label">Title</span>
          <input type="text" value={wl.title} onChange={(e) => set({ title: e.target.value })} placeholder="(no title)" />
        </label>
        <div className="row">
          <span className="row-label">Logo</span>
          <div className="btn-row">
            {wl.logoUrl && <img src={wl.logoUrl} alt="Current logo" style={{ height: 28, maxWidth: 120, objectFit: 'contain' }} />}
            <button onClick={uploadLogo}>Upload logo…</button>
            <input type="url" placeholder="or logo URL" value={wl.logoUrl && !wl.logoUrl.startsWith('data:') ? wl.logoUrl : ''} onChange={(e) => set({ logoUrl: e.target.value || null })} />
            {wl.logoUrl && <button onClick={() => set({ logoUrl: null })}>Remove</button>}
          </div>
        </div>
        <h4>Colours</h4>
        <div className="color-grid">
          {colorKeys.map((k) => (
            <label key={k}>
              {k}
              <input type="color" value={wl.colors[k]} onChange={(e) => set({ colors: { [k]: e.target.value } })} />
            </label>
          ))}
        </div>
        <div className="btn-row">
          <button onClick={() => set({ colors: { accent: '#0b7285', bg: '#e6f2f4', panel: '#ffffff', text: '#0b2a31', line: '#c9e1e5', muted: '#5c7c83' } })}>Teal preset</button>
          <button onClick={() => set({ colors: { accent: '#f59f00', bg: '#1b1d23', panel: '#25282f', text: '#eceef3', line: '#3a3e48', muted: '#9aa0ad' } })}>Dark preset</button>
          <button onClick={() => set({ colors: DEFAULT_WL.colors })}>Default colours</button>
        </div>
        <h4>Hide panels and controls</h4>
        <div className="hide-grid">
          {(Object.keys(HIDE_LABELS) as HideKey[]).map((k) => (
            <label key={k} className="check">
              <input type="checkbox" checked={wl.hide[k]} onChange={(e) => set({ hide: { [k]: e.target.checked } })} />
              {HIDE_LABELS[k]}
            </label>
          ))}
        </div>
        {wl.hide.settings && <div className="notice">The ⚙ button is hidden. Re-open this dialog with the URL parameter <code>?whitelabel</code> or reset via the embed API.</div>}
        <h4>Config JSON</h4>
        <textarea value={json || JSON.stringify(wl, null, 1)} onChange={(e) => setJson(e.target.value)} aria-label="White-label configuration JSON" />
        <div className="btn-row">
          <button
            disabled={!json}
            onClick={() => {
              try {
                set(JSON.parse(json))
                setJson('')
                toast('White-label config applied')
              } catch {
                toast('Invalid JSON')
              }
            }}
          >
            Apply JSON
          </button>
          <button
            onClick={() => {
              localStorage.removeItem(WL_KEY)
              actions.setWhiteLabel(DEFAULT_WL, false)
              setJson('')
            }}
          >
            Reset to default
          </button>
          <button className="primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
