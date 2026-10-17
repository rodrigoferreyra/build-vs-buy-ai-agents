import { useMemo, useState } from 'react'
import {
  actions,
  cloneDocForUse,
  currentPage,
  deleteUserTemplate,
  loadUserTemplates,
  templateTick,
  toast,
  useStore,
  type LeftTab,
} from '../store'
import { BUILTIN_TEMPLATES } from '../templates'
import { STOCK, STOCK_CATEGORIES, fetchAsDataUrl, searchOpenverse, svgUrl, type OnlinePhoto } from '../stock'
import { BUILTIN_FONTS, fontFromFile, fontLabel } from '../fonts'
import { readImageFile } from '../upload'
import { makeShape } from '../geometry'
import { addImageFiles, openFilePicker } from '../upload'
import type { El } from '../types'
import { Section, Toggle } from './ui'
import { LayersPanel } from './LayersPanel'

export function LeftPanel() {
  const tab = useStore((s) => s.leftTab)
  const role = useStore((s) => s.role)
  const tabs: { id: LeftTab; label: string; icon: string }[] = [
    { id: 'add', label: 'Add', icon: '＋' },
    { id: 'layers', label: 'Layers', icon: '☰' },
    { id: 'templates', label: 'Templates', icon: '▦' },
    { id: 'brand', label: 'Brand', icon: '◆' },
  ]
  const visible = role === 'adopter' ? tabs.filter((t) => t.id !== 'add' && t.id !== 'templates') : tabs
  const active = visible.some((t) => t.id === tab) ? tab : visible[0].id
  return (
    <div className="left">
      <div className="tabs">
        {visible.map((t) => (
          <button key={t.id} className={active === t.id ? 'on' : ''} onClick={() => actions.set({ leftTab: t.id })}>
            <span className="ti">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="left-body">
        {active === 'add' && <AddTab />}
        {active === 'layers' && <LayersPanel />}
        {active === 'templates' && <TemplatesTab />}
        {active === 'brand' && <BrandTab />}
      </div>
    </div>
  )
}

function StockLibrary() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<(typeof STOCK_CATEGORIES)[number]>('All')
  const [oq, setOq] = useState('')
  const [online, setOnline] = useState<OnlinePhoto[] | null>(null)
  const [busy, setBusy] = useState(false)
  const items = STOCK.filter((s) => (cat === 'All' || s.category === cat) && (s.name + ' ' + s.tags + ' ' + s.category).toLowerCase().includes(q.toLowerCase()))
  const insert = (it: (typeof STOCK)[number]) => {
    try {
      actions.addSvgText(it.svg, it.name, { cover: it.cover, maxFrac: it.category === 'Icons' ? 0.2 : 0.35 })
    } catch (e) {
      toast((e as Error).message)
    }
  }
  const search = async () => {
    if (!oq.trim()) return
    setBusy(true)
    try {
      setOnline(await searchOpenverse(oq.trim()))
    } catch (e) {
      toast('Online search unavailable: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const insertOnline = async (p: OnlinePhoto) => {
    try {
      const im = await fetchAsDataUrl(p.url)
      actions.addImageFromSrc(im.src, im.w, im.h, `${p.title} (${p.creator}, ${p.license.trim()})`)
    } catch (e) {
      toast((e as Error).message)
    }
  }
  return (
    <>
      <Section title={`Stock library (${STOCK.length})`}>
        <input className="search" placeholder="Search backgrounds, icons, patterns…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {STOCK_CATEGORIES.map((c) => (
            <Toggle key={c} on={cat === c} onClick={() => setCat(c)}>
              {c}
            </Toggle>
          ))}
        </div>
        <div className="sticker-grid">
          {items.map((s) => (
            <button key={s.id} title={`${s.name} · ${s.category} (editable vector)`} onClick={() => insert(s)}>
              <img src={svgUrl(s.svg)} alt={s.name} loading="lazy" />
            </button>
          ))}
          {!items.length && <div className="subtle">Nothing matches “{q}”.</div>}
        </div>
      </Section>
      <Section title="Stock photos (online, optional)">
        <div className="subtle">Searches Openverse (CC-licensed). Only the search words leave your browser, and only when you press Search.</div>
        <div className="btn-row">
          <input className="search" placeholder="e.g. mountain lake" value={oq} onChange={(e) => setOq(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
          <button disabled={busy || !oq.trim()} onClick={search}>
            {busy ? '…' : 'Search'}
          </button>
        </div>
        {online && (
          <div className="sticker-grid photos">
            {online.map((p) => (
              <button key={p.id} title={`${p.title} — ${p.creator} (${p.license})`} onClick={() => insertOnline(p)}>
                <img src={p.thumb} alt={p.title} loading="lazy" />
              </button>
            ))}
            {!online.length && <div className="subtle">No results.</div>}
          </div>
        )}
      </Section>
    </>
  )
}

function AddTab() {
  return (
    <>
      <Section title="Text">
        <button className="wide big" onClick={() => actions.addText('heading')}>
          <b>Add a heading</b>
        </button>
        <button className="wide" onClick={() => actions.addText('subheading')}>
          Add a subheading
        </button>
        <button className="wide small" onClick={() => actions.addText('body')}>
          Add body text
        </button>
      </Section>
      <Section title="Shapes">
        <div className="shape-grid">
          <button onClick={() => actions.addShape('rect')} title="Rectangle">
            <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1" /></svg>
          </button>
          <button onClick={() => actions.addShape('ellipse')} title="Ellipse">
            <svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="7" /></svg>
          </button>
          <button onClick={() => actions.addShape('line')} title="Line">
            <svg viewBox="0 0 24 24"><path d="M3 18 21 6" /></svg>
          </button>
          <button onClick={() => actions.addShape('polygon')} title="Polygon">
            <svg viewBox="0 0 24 24"><path d="m12 3 8 5v8l-8 5-8-5V8z" /></svg>
          </button>
          <button onClick={() => actions.addShape('star')} title="Star">
            <svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z" /></svg>
          </button>
        </div>
      </Section>
      <Section title="Images">
        <button className="wide" onClick={() => openFilePicker('image/*,.svg', true, addImageFiles)}>
          ⬆ Upload images (PNG, JPG, WebP, SVG, GIF)
        </button>
        <button className="wide" onClick={() => actions.addPlaceholder()}>
          ▨ Image placeholder (fills &amp; crops)
        </button>
        <div className="subtle">Tip: drop files on the canvas — dropping onto a frame fills it.</div>
      </Section>
      <StockLibrary />
    </>
  )
}

function TemplatesTab() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const tick = useStore(() => templateTick)
  const mine = useMemo(() => loadUserTemplates().map((t) => ({ ...t, category: t.category || 'My templates', mine: true })), [tick])
  const all = [...BUILTIN_TEMPLATES.map((t) => ({ ...t, mine: false })), ...mine]
  const cats = ['All', ...new Set(all.map((t) => t.category))]
  const list = all.filter((t) => (cat === 'All' || t.category === cat) && t.name.toLowerCase().includes(q.toLowerCase()))
  const open = (doc: typeof all[number]['doc']) => {
    const has = currentPage().elements.length > 0
    if (has && !window.confirm('Open this template as a new design? Unsaved changes to the current design will be replaced.')) return
    actions.loadDoc(cloneDocForUse(doc))
    toast('Opened template as a new design')
  }
  return (
    <>
      <Section title="Template library">
        <input className="search" placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {cats.map((c) => (
            <Toggle key={c} on={cat === c} onClick={() => setCat(c)}>
              {c}
            </Toggle>
          ))}
        </div>
        <div className="tpl-list">
          {list.map((t) => (
            <div key={t.id} className="tpl">
              <button className="tpl-open" onClick={() => open(t.doc)}>
                <TemplateThumb doc={t.doc} />
                <div>
                  <strong>{t.name}</strong>
                  <span>
                    {t.category} · {Math.round(t.doc.width)}×{Math.round(t.doc.height)} px
                  </span>
                </div>
              </button>
              {t.mine && (
                <button className="mini" title="Delete template" onClick={() => deleteUserTemplate(t.id)}>
                  ✕
                </button>
              )}
            </div>
          ))}
          {!list.length && <div className="subtle">No templates found.</div>}
        </div>
      </Section>
      <Section title="Create template">
        <button className="wide" onClick={() => actions.set({ dialog: 'saveTemplate' })}>
          Save current design as template…
        </button>
        <div className="subtle">Lock elements (Arrange → Lock), then switch the top-bar role to “Adopter” to see the restricted UI.</div>
      </Section>
    </>
  )
}

export function TemplateThumb({ doc, size = 56 }: { doc: { width: number; height: number; pages: { background: string; elements: El[] }[] }; size?: number }) {
  const page = doc.pages[0]
  const k = size / Math.max(doc.width, doc.height)
  return (
    <div className="thumb" style={{ width: doc.width * k, height: doc.height * k, background: page.background }}>
      {page.elements.slice(0, 12).map((e) => (
        <div
          key={e.id}
          style={{
            position: 'absolute',
            left: e.x * k,
            top: e.y * k,
            width: e.w * k,
            height: e.h * k,
            transform: `rotate(${e.rotation}deg)`,
            background:
              e.type === 'shape'
                ? e.fillMode === 'gradient'
                  ? `linear-gradient(${e.gradient.angle}deg, ${e.gradient.c1}, ${e.gradient.c2})`
                  : e.fill
                : e.type === 'text'
                  ? e.color
                  : '#c9ccd9',
            opacity: e.type === 'text' ? 0.35 : 0.9,
            borderRadius: e.type === 'shape' && e.shape === 'ellipse' ? '50%' : 1,
          }}
        />
      ))}
    </div>
  )
}

function BrandTab() {
  const brand = useStore((s) => s.doc.brand)
  const role = useStore((s) => s.role)
  const selection = useStore((s) => s.selection)
  const creator = role === 'creator'
  const [newColor, setNewColor] = useState('#12b886')
  const set = (b: typeof brand) => actions.setDoc({ brand: b })
  const apply = (c: string) => {
    const els = currentPage().elements.filter((e) => selection.includes(e.id))
    if (!els.length) return toast('Select an element first')
    actions.patch(
      els.map((e) => e.id),
      (e) => (e.type === 'text' ? { color: c } : e.type === 'shape' ? { fill: c, fillMode: 'solid' } : {}) as Partial<El>,
      'brand-apply',
    )
  }
  return (
    <>
      <Section title="Brand colors">
        <div className="brand-grid">
          {brand.colors.map((c) => (
            <div key={c} className="brand-chip">
              <button className="swatch big" style={{ background: c }} title="Apply to selection" onClick={() => apply(c)} />
              <span>{c}</span>
              {creator && (
                <button className="mini" onClick={() => set({ ...brand, colors: brand.colors.filter((x) => x !== c) })}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {creator && (
          <div className="btn-row">
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
            <button onClick={() => !brand.colors.includes(newColor) && set({ ...brand, colors: [...brand.colors, newColor] })}>Add color</button>
          </div>
        )}
      </Section>
      <Section title="Restrictions">
        <label className="check">
          <input type="checkbox" disabled={!creator} checked={brand.restrict} onChange={(e) => set({ ...brand, restrict: e.target.checked })} />
          Restrict color pickers to the brand palette
        </label>
        <div className="subtle">When on, every color control only offers the brand colors above.</div>
      </Section>
      <BrandFonts creator={creator} />
      <BrandLogos creator={creator} />
    </>
  )
}

export { makeShape }


function BrandFonts({ creator }: { creator: boolean }) {
  const doc = useStore((s) => s.doc)
  const selection = useStore((s) => s.selection)
  const brand = doc.brand
  const fonts = brand.fonts ?? []
  const [pick, setPick] = useState('')
  const options = [
    ...BUILTIN_FONTS.map((b) => ({ label: b.label, css: b.css })),
    ...doc.fonts.map((c) => ({ label: c.family + ' (custom)', css: `"${c.family}", sans-serif` })),
  ].filter((o) => !fonts.includes(o.css))
  const set = (b: typeof brand) => actions.setDoc({ brand: b })
  const apply = (css: string) => {
    const els = currentPage().elements.filter((e) => selection.includes(e.id) && e.type === 'text')
    if (!els.length) return toast('Select a text element first')
    actions.patch(els.map((e) => e.id), { fontFamily: css } as Partial<El>, 'brand-font')
  }
  const upload = () =>
    openFilePicker('.ttf,.otf,.woff,.woff2,font/*', false, async (files) => {
      try {
        const font = await fontFromFile(files[0])
        const css = `"${font.family}", sans-serif`
        actions.setDoc({ fonts: [...doc.fonts.filter((x) => x.family !== font.family), font], brand: { ...brand, fonts: [...new Set([...fonts, css])] } })
        toast(`Brand font "${font.family}" added`)
      } catch {
        toast('Could not read that font file')
      }
    })
  return (
    <Section title="Brand fonts">
      <div className="brand-fonts">
        {fonts.map((css) => (
          <div key={css} className="brand-font">
            <button className="bf-name" style={{ fontFamily: css }} title="Apply to selected text" onClick={() => apply(css)}>
              {fontLabel(css, doc.fonts)} <span>Aa</span>
            </button>
            {creator && (
              <button className="mini" onClick={() => set({ ...brand, fonts: fonts.filter((x) => x !== css) })}>
                ✕
              </button>
            )}
          </div>
        ))}
        {!fonts.length && <div className="subtle">No brand fonts yet.</div>}
      </div>
      {creator && (
        <>
          <div className="btn-row">
            <select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Add an existing font…</option>
              {options.map((o) => (
                <option key={o.css} value={o.css}>
                  {o.label}
                </option>
              ))}
            </select>
            <button disabled={!pick} onClick={() => { set({ ...brand, fonts: [...fonts, pick] }); setPick('') }}>
              Add
            </button>
          </div>
          <button className="wide" onClick={upload}>
            ⬆ Upload brand font (TTF, OTF, WOFF, WOFF2)
          </button>
          <label className="check">
            <input type="checkbox" checked={!!brand.restrictFonts} disabled={!fonts.length} onChange={(e) => set({ ...brand, restrictFonts: e.target.checked })} />
            Restrict text fonts to the brand fonts
          </label>
        </>
      )}
    </Section>
  )
}

function BrandLogos({ creator }: { creator: boolean }) {
  const brand = useStore((s) => s.doc.brand)
  const logos = brand.logos ?? []
  const upload = () =>
    openFilePicker('image/*,.svg', true, async (files) => {
      const added = []
      for (const f of files) {
        const im = await readImageFile(f)
        added.push({ id: Math.random().toString(36).slice(2, 9), name: im.name, src: im.src, nw: im.nw, nh: im.nh })
      }
      actions.setDoc({ brand: { ...brand, logos: [...logos, ...added] } })
      toast(`${added.length} logo(s) added to the brand kit`)
    })
  const insert = async (l: (typeof logos)[number]) => {
    try {
      if (/^data:image\/svg\+xml/.test(l.src)) {
        const body = l.src.slice(l.src.indexOf(',') + 1)
        const text = /;base64,/.test(l.src.slice(0, l.src.indexOf(',') + 1)) ? atob(body) : decodeURIComponent(body)
        actions.addSvgText(text, l.name, { maxFrac: 0.3 })
      } else actions.addImageFromSrc(l.src, l.nw, l.nh, l.name)
    } catch {
      actions.addImageFromSrc(l.src, l.nw, l.nh, l.name)
    }
  }
  return (
    <Section title="Brand logos">
      <div className="logo-grid">
        {logos.map((l) => (
          <div key={l.id} className="logo">
            <button title={`Insert ${l.name}`} onClick={() => insert(l)}>
              <img src={l.src} alt={l.name} />
            </button>
            {creator && (
              <button className="mini x" onClick={() => actions.setDoc({ brand: { ...brand, logos: logos.filter((x) => x.id !== l.id) } })}>
                ✕
              </button>
            )}
          </div>
        ))}
        {!logos.length && <div className="subtle">No logos yet.</div>}
      </div>
      {creator && (
        <button className="wide" onClick={upload}>
          ⬆ Upload logos (SVG, PNG, JPG…)
        </button>
      )}
      <div className="subtle">Click a logo to insert it (SVG logos become editable vectors). Logos are saved with the design.</div>
    </Section>
  )
}
