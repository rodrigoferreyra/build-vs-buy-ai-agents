import { useMemo, useState } from 'react'
import {
  actions,
  getState,
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
import { addUrlSource, insertAsset, removeAssetSource, searchSource, useAssetSources, type Asset } from '../assetSources'
import { useEffect } from 'react'
import { aiSlots, brandModeActive, generate, isLockedTemplate, loadAiSettings, placeAsLayers, placeInTemplate, saveAiSettings, type AiSettings } from '../ai'

export function LeftPanel() {
  const tab = useStore((s) => s.leftTab)
  const role = useStore((s) => s.role)
  const tabs: { id: LeftTab; label: string; icon: string }[] = [
    { id: 'add', label: 'Add', icon: '＋' },
    { id: 'layers', label: 'Layers', icon: '☰' },
    { id: 'templates', label: 'Templates', icon: '▦' },
    { id: 'brand', label: 'Brand', icon: '◆' },
    { id: 'ai', label: 'AI', icon: '✦' },
  ]
  const hide = useStore((s) => s.wl.hide)
  const visible = (role === 'adopter' ? tabs.filter((t) => t.id !== 'add' && t.id !== 'templates') : tabs).filter((t) => !hide[t.id])
  if (!visible.length) return null
  const active = visible.some((t) => t.id === tab) ? tab : visible[0].id
  return (
    <div className="left" role="complementary" aria-label="Add, layers and assets">
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
        {active === 'ai' && <AiTab />}
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
        <input className="search" aria-label="Search stock library" placeholder="Search backgrounds, icons, patterns…" value={q} onChange={(e) => setQ(e.target.value)} />
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
          <input className="search" aria-label="Search Openverse photos" placeholder="e.g. mountain lake" value={oq} onChange={(e) => setOq(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
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
      <AssetSourcesPanel />
      <StockLibrary />
    </>
  )
}

const DEMO_SOURCE = '/asset-sources/demo/manifest.json'

function AssetSourcesPanel() {
  const sources = useAssetSources()
  const [url, setUrl] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Record<string, Asset[]>>({})
  useEffect(() => {
    let alive = true
    Promise.all(sources.map(async (s) => [s.id, await searchSource(s, q).catch(() => [])] as const)).then((r) => alive && setResults(Object.fromEntries(r)))
    return () => {
      alive = false
    }
  }, [sources, q])
  return (
    <Section title="Your asset sources">
      <div className="subtle">Plug in your own stock, stickers and fonts: a JSON manifest URL or a public S3/GCS bucket listing URL. Assets are fetched only from the URLs you add.</div>
      <div className="btn-row">
        <input className="search" type="url" placeholder="https://bucket.s3.amazonaws.com/ or …/manifest.json" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Asset source URL" />
        <button disabled={!url.trim()} onClick={() => { addUrlSource(url.trim()); setUrl('') }}>
          Add
        </button>
      </div>
      {!sources.length && (
        <div className="btn-row">
          <button onClick={() => addUrlSource(DEMO_SOURCE, 'Acme brand assets (demo)')}>Add demo manifest</button>
          <button onClick={() => addUrlSource('/asset-sources/demo/bucket-listing.xml', 'acme-assets (S3 listing demo)')}>Add demo bucket</button>
        </div>
      )}
      {sources.length > 0 && <input className="search" placeholder="Search your assets…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search your assets" />}
      {sources.map((s) => (
        <div key={s.id} className="asset-source">
          <div className="asset-source-head">
            <strong>{s.name}</strong>
            <span className="subtle">{s.loading ? 'loading…' : s.error ? 'error: ' + s.error : `${results[s.id]?.length ?? 0} assets`}</span>
            <button className="mini" title="Remove source" aria-label={`Remove source ${s.name}`} onClick={() => removeAssetSource(s.id)}>
              ✕
            </button>
          </div>
          <div className="sticker-grid">
            {(results[s.id] || []).map((a) => (
              <button key={a.id} title={`${a.name} · ${a.type}`} onClick={() => insertAsset(a)} className={'asset asset-' + a.type}>
                {a.type === 'font' ? <span className="asset-font">Aa<small>{a.family || a.name}</small></span> : <img src={a.thumb || a.url} alt={a.name} loading="lazy" />}
              </button>
            ))}
          </div>
        </div>
      ))}
    </Section>
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
        <input className="search" aria-label="Search templates" placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} />
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
            <input type="color" aria-label="New brand colour" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
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
            <select aria-label="Font to add to the brand kit" value={pick} onChange={(e) => setPick(e.target.value)}>
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

function AiTab() {
  const doc = useStore((s) => s.doc)
  const role = useStore((s) => s.role)
  const pageIndex = useStore((s) => s.pageIndex)
  const [cfg, setCfg] = useState<AiSettings>(loadAiSettings)
  const [prompt, setPrompt] = useState('')
  const [withCopy, setWithCopy] = useState(true)
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState('')
  const brandMode = brandModeActive(doc, role)
  const locked = isLockedTemplate(doc)
  const slots = aiSlots(doc, pageIndex)
  const blocked = brandMode && (!locked || !slots.length)
  const upd = (p: Partial<AiSettings>) => {
    const n = { ...cfg, ...p }
    setCfg(n)
    saveAiSettings(n)
  }
  const run = async () => {
    if (!prompt.trim()) return
    setBusy(true)
    try {
      const target = brandMode ? slots.find((e) => useSel().includes(e.id)) ?? slots[0] : null
      const w = target ? target.w : doc.width
      const h = target ? target.h : doc.height
      const r = await generate(cfg, prompt.trim(), w, h, withCopy)
      if (brandMode) {
        const name = await placeInTemplate(r.src, r.copy, target?.id)
        setLast(`Filled “${name}”${r.copy ? ' and the {headline}/{tagline} variables' : ''} inside the locked template.`)
      } else {
        const n = await placeAsLayers(r.src, r.copy, prompt.trim())
        setLast(`Added ${n} editable layer${n > 1 ? 's' : ''} – move or edit them in Layers; no new generation needed.`)
      }
      toast(r.dry ? 'AI dry run: placeholder image generated offline (no model was called)' : 'AI image generated')
    } catch (e) {
      toast('AI generation failed: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Section title="Generate with AI">
        <label className="row">
          <span className="row-label">Provider</span>
          <select value={cfg.provider} onChange={(e) => upd({ provider: e.target.value as AiSettings['provider'] })}>
            <option value="dryrun">Dry run (offline placeholder, no key)</option>
            <option value="openai">OpenAI-compatible API (your key)</option>
          </select>
        </label>
        {cfg.provider === 'openai' && (
          <>
            <label className="row">
              <span className="row-label">API key</span>
              <input type="password" autoComplete="off" value={cfg.apiKey} placeholder="sk-…" onChange={(e) => upd({ apiKey: e.target.value })} />
            </label>
            <label className="row">
              <span className="row-label">Endpoint</span>
              <input type="url" value={cfg.baseUrl} onChange={(e) => upd({ baseUrl: e.target.value })} />
            </label>
            <div className="grid2">
              <label className="row">
                <span className="row-label">Image model</span>
                <input type="text" value={cfg.imageModel} onChange={(e) => upd({ imageModel: e.target.value })} />
              </label>
              <label className="row">
                <span className="row-label">Text model</span>
                <input type="text" value={cfg.textModel} onChange={(e) => upd({ textModel: e.target.value })} />
              </label>
            </div>
            <label className="check">
              <input type="checkbox" checked={cfg.rememberKey} onChange={(e) => upd({ rememberKey: e.target.checked })} />
              Remember key in this browser (otherwise only for this tab session)
            </label>
            <div className="subtle">The prompt goes straight from your browser to this endpoint with your key; nothing else is sent.</div>
          </>
        )}
        <textarea aria-label="Prompt" placeholder="e.g. sunlit lemon grove, product shot of a glass bottle, soft morning light" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
        <label className="check">
          <input type="checkbox" checked={withCopy} onChange={(e) => setWithCopy(e.target.checked)} />
          Also write headline, tagline and button text
        </label>
        <div className="subtle">Brand colours {brandContextLabel(doc)} are added to every prompt.</div>
        <button className="primary wide" disabled={busy || !prompt.trim() || blocked} onClick={run}>
          {busy ? 'Generating…' : brandMode ? 'Generate into template slot' : 'Generate as editable layers'}
        </button>
        {last && <div className="notice">{last}</div>}
        {cfg.provider === 'dryrun' && <div className="notice">Dry run: images are drawn locally and stamped “AI DRY RUN”. Pick the OpenAI-compatible provider and paste your key for real generations.</div>}
      </Section>
      <Section title="Brand guardrails">
        <label className="check">
          <input type="checkbox" checked={!!doc.aiBrandOnly} disabled={role !== 'creator'} onChange={(e) => actions.setDoc({ aiBrandOnly: e.target.checked })} />
          Limit AI to this brand template (fill open slots only)
        </label>
        <div className="subtle">
          {role === 'adopter' ? 'Adopters can only use AI inside locked brand templates. ' : ''}
          {brandMode
            ? locked
              ? slots.length
                ? `AI may fill ${slots.length} slot${slots.length > 1 ? 's' : ''}: ${slots.map((s) => s.name).join(', ')}. Locked elements, layout and fonts stay untouched.`
                : 'This template has no open image slot (empty placeholder, image variable or AI slot).'
              : 'Open a brand template with locked elements (e.g. Templates → “Brand promo (AI slot)”) to generate.'
            : 'Free mode: results are added as new layers on the current page.'}
        </div>
      </Section>
    </>
  )
}

const useSel = () => getStateSel()
function getStateSel() {
  return getState().selection
}
function brandContextLabel(doc: { brand: { colors: string[] } }) {
  return doc.brand.colors.length ? `(${doc.brand.colors.join(', ')})` : '(defaults)'
}
