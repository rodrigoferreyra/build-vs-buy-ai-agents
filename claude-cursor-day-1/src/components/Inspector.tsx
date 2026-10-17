import type { El, ImageEl, ShapeEl, TextEl, Unit, VectorEl } from '../types'
import { BLEND_MODES } from '../types'
import { actions, currentPage, toast, useStore } from '../store'
import { FILTER_PRESETS, findVariables, fromUnit, round, toUnit } from '../geometry'
import { BUILTIN_FONTS, FONT_WEIGHTS, fontFromFile, fontLabel } from '../fonts'
import { BUILTIN_LUT_LIST, parseCube } from '../lut'
import { parseData } from '../data'
import { removeBackground } from '../bgremove'
import { useState } from 'react'
import { openFilePicker, pickImageForElement } from '../upload'
import { ColorField, Num, Row, Section, Slider, Toggle } from './ui'

export function Inspector() {
  const selection = useStore((s) => s.selection)
  const doc = useStore((s) => s.doc)
  const pageIndex = useStore((s) => s.pageIndex)
  const role = useStore((s) => s.role)
  const page = doc.pages[pageIndex]
  const sel = page.elements.filter((e) => selection.includes(e.id))
  if (!sel.length) return <DocInspector />
  const single = sel.length === 1 ? sel[0] : null
  const types = new Set(sel.map((e) => e.type))
  const sameType = types.size === 1 ? sel[0].type : null
  const allLocked = sel.every((e) => e.locked)
  const frozen = role === 'adopter' && allLocked

  return (
    <div className="inspector">
      <div className="insp-head">
        <strong>{single ? single.name : `${sel.length} elements`}</strong>
        {single && <span className="tag">{single.type}</span>}
      </div>
      {frozen && <div className="notice">🔒 Locked by the template creator. This element can't be changed.</div>}
      {!frozen && (
        <>
          <ArrangeSection sel={sel} single={single} role={role} />
          {sameType === 'text' && <TextSection els={sel as TextEl[]} />}
          {sameType === 'shape' && <ShapeSection els={sel as ShapeEl[]} />}
          {sameType === 'image' && <ImageSection els={sel as ImageEl[]} />}
          {sameType === 'vector' && single && <VectorSection el={single as VectorEl} />}
          <AppearanceSection sel={sel} />
        </>
      )}
    </div>
  )
}

const patchSel = (p: Partial<El>, key?: string) => actions.patchSelection(p, key)

function ArrangeSection({ sel, single, role }: { sel: El[]; single: El | null; role: string }) {
  const grouped = sel.some((e) => e.groupId)
  const creator = role === 'creator'
  return (
    <>
      <Section title="Arrange">
        <div className="btn-row">
          <button onClick={() => actions.duplicateSelection()} disabled={!creator} title="Ctrl+D">
            Duplicate
          </button>
          <button onClick={() => actions.copy()} title="Ctrl+C">
            Copy
          </button>
          <button className="danger" onClick={() => actions.deleteSelection()} disabled={!creator} title="Delete">
            Delete
          </button>
        </div>
        <div className="btn-row">
          <button onClick={() => actions.group()} disabled={!creator || sel.length < 2} title="Ctrl+G">
            Group
          </button>
          <button onClick={() => actions.ungroup()} disabled={!creator || !grouped} title="Ctrl+Shift+G">
            Ungroup
          </button>
          <button onClick={() => actions.patchForce(sel.map((e) => e.id), { locked: !sel.every((e) => e.locked) })} disabled={!creator}>
            {sel.every((e) => e.locked) ? 'Unlock' : 'Lock'}
          </button>
        </div>
        <div className="btn-row">
          <button onClick={() => actions.reorder('front')} disabled={!creator} title="Bring to front">
            Front
          </button>
          <button onClick={() => actions.reorder('forward')} disabled={!creator}>
            Forward
          </button>
          <button onClick={() => actions.reorder('backward')} disabled={!creator}>
            Backward
          </button>
          <button onClick={() => actions.reorder('back')} disabled={!creator} title="Send to back">
            Back
          </button>
        </div>
        <div className="subtle">{sel.length === 1 ? 'Align to page' : 'Align selection'}</div>
        <div className="btn-row icons">
          <button onClick={() => actions.align('left')} title="Align left">⇤</button>
          <button onClick={() => actions.align('center')} title="Align horizontal centers">↔</button>
          <button onClick={() => actions.align('right')} title="Align right">⇥</button>
          <button onClick={() => actions.align('top')} title="Align top">⤒</button>
          <button onClick={() => actions.align('middle')} title="Align vertical middles">↕</button>
          <button onClick={() => actions.align('bottom')} title="Align bottom">⤓</button>
        </div>
        {sel.length >= 2 && sel.every((e) => e.type === 'shape' || e.type === 'vector') && (
          <>
            <div className="subtle">Boolean operations (bottom-most shape is the base)</div>
            <div className="btn-row">
              <button onClick={() => actions.booleanOp('union')} disabled={!creator} title="Union">Union</button>
              <button onClick={() => actions.booleanOp('subtract')} disabled={!creator} title="Subtract the upper shapes from the bottom one">Subtract</button>
              <button onClick={() => actions.booleanOp('intersect')} disabled={!creator} title="Intersect">Intersect</button>
              <button onClick={() => actions.booleanOp('exclude')} disabled={!creator} title="Exclude (XOR)">Exclude</button>
            </div>
          </>
        )}
        <div className="btn-row">
          <button onClick={() => actions.distribute('h')} disabled={sel.length < 3} title="Distribute horizontally">
            Distribute ↔
          </button>
          <button onClick={() => actions.distribute('v')} disabled={sel.length < 3} title="Distribute vertically">
            Distribute ↕
          </button>
        </div>
      </Section>
      {single && (
        <Section title="Position & size">
          <div className="grid2">
            <Num label="X" value={round(single.x)} onChange={(v) => patchSel({ x: v })} />
            <Num label="Y" value={round(single.y)} onChange={(v) => patchSel({ y: v })} />
            <Num label="W" value={round(single.w)} min={1} onChange={(v) => patchSel({ w: v })} />
            <Num label="H" value={round(single.h)} min={1} onChange={(v) => patchSel({ h: v })} />
            <Num label="∠" value={round(single.rotation, 1)} suffix="°" onChange={(v) => patchSel({ rotation: v })} />
          </div>
          <div className="btn-row">
            <button onClick={() => patchSel({ rotation: round(((single.rotation + 90 + 180) % 360) - 180) }, 'rot90')}>⟳ 90°</button>
            <Toggle on={single.flipX} onClick={() => patchSel({ flipX: !single.flipX })}>Flip ↔</Toggle>
            <Toggle on={single.flipY} onClick={() => patchSel({ flipY: !single.flipY })}>Flip ↕</Toggle>
          </div>
        </Section>
      )}
    </>
  )
}

function AppearanceSection({ sel }: { sel: El[] }) {
  const f = sel[0]
  return (
    <Section title="Layer">
      <Slider label="Opacity" value={Math.round(f.opacity * 100)} min={0} max={100} suffix="%" onChange={(v) => patchSel({ opacity: v / 100 })} />
      <Row label="Blend">
        <select value={f.blend} onChange={(e) => patchSel({ blend: e.target.value as El['blend'] })}>
          {BLEND_MODES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </Row>
    </Section>
  )
}

/* ---------------- text ---------------- */

function TextSection({ els }: { els: TextEl[] }) {
  const f = els[0]
  const doc = useStore((s) => s.doc)
  const set = (p: Partial<TextEl>) => patchSel(p as Partial<El>)
  const all = [
    ...BUILTIN_FONTS.map((b) => ({ label: b.label, css: b.css })),
    ...doc.fonts.map((c) => ({ label: c.family + ' (custom)', css: `"${c.family}", sans-serif` })),
  ]
  const brandFonts = doc.brand.fonts ?? []
  const restricted = !!doc.brand.restrictFonts && brandFonts.length > 0
  const stacks = restricted ? brandFonts.map((css) => ({ label: fontLabel(css, doc.fonts) + ' · brand', css })) : all
  const uploadFont = () =>
    openFilePicker('.ttf,.otf,.woff,.woff2,font/*', false, async (files) => {
      try {
        const font = await fontFromFile(files[0])
        actions.setDoc({ fonts: [...getFonts().filter((x) => x.family !== font.family), font] })
        set({ fontFamily: `"${font.family}", sans-serif` })
        toast(`Font "${font.family}" added`)
      } catch {
        toast('Could not read that font file')
      }
    })
  const getFonts = () => doc.fonts
  return (
    <>
      <Section title="Text">
        <Row label="Font">
          <select value={f.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })} style={{ fontFamily: f.fontFamily }}>
            {!stacks.some((s) => s.css === f.fontFamily) && <option value={f.fontFamily}>{fontLabel(f.fontFamily, doc.fonts)}</option>}
            {stacks.map((s) => (
              <option key={s.css} value={s.css} style={{ fontFamily: s.css }}>
                {s.label}
              </option>
            ))}
          </select>
        </Row>
        {restricted && <div className="subtle">Fonts are restricted to the brand kit (Brand tab).</div>}
        {!restricted && (
          <button className="wide" onClick={uploadFont}>
            ⬆ Upload font (TTF, OTF, WOFF, WOFF2)
          </button>
        )}
        <div className="grid2">
          <Num label="Size" value={f.fontSize} min={1} max={1000} onChange={(v) => set({ fontSize: v })} />
          <Row label="Weight">
            <select value={f.fontWeight} onChange={(e) => set({ fontWeight: Number(e.target.value) })}>
              {FONT_WEIGHTS.map((w) => (
                <option key={w.v} value={w.v}>
                  {w.l} ({w.v})
                </option>
              ))}
            </select>
          </Row>
        </div>
        <div className="btn-row">
          <Toggle on={f.fontWeight >= 700} onClick={() => set({ fontWeight: f.fontWeight >= 700 ? 400 : 700 })} title="Bold">
            <b>B</b>
          </Toggle>
          <Toggle on={f.italic} onClick={() => set({ italic: !f.italic })} title="Italic">
            <i>I</i>
          </Toggle>
          <Toggle on={f.underline} onClick={() => set({ underline: !f.underline })} title="Underline">
            <u>U</u>
          </Toggle>
          <span className="sep" />
          {(['left', 'center', 'right'] as const).map((a) => (
            <Toggle key={a} on={f.align === a} onClick={() => set({ align: a })} title={'Align ' + a}>
              {a === 'left' ? '⇤' : a === 'center' ? '≡' : '⇥'}
            </Toggle>
          ))}
          <span className="sep" />
          {(['top', 'middle', 'bottom'] as const).map((a) => (
            <Toggle key={a} on={f.valign === a} onClick={() => set({ valign: a })} title={'Vertical ' + a}>
              {a === 'top' ? '⤒' : a === 'middle' ? '↕' : '⤓'}
            </Toggle>
          ))}
        </div>
        <Row label="Direction">
          <div className="btn-row">
            {(['auto', 'ltr', 'rtl'] as const).map((d) => (
              <Toggle
                key={d}
                on={(f.direction ?? 'auto') === d}
                title={d === 'rtl' ? 'Right-to-left (Arabic, Hebrew)' : d === 'ltr' ? 'Left-to-right' : 'Detect from the first letter'}
                onClick={() => set({ direction: d, ...(d === 'rtl' && f.align === 'left' ? { align: 'right' as const } : {}), ...(d === 'ltr' && f.align === 'right' ? { align: 'left' as const } : {}) })}
              >
                {d === 'auto' ? 'Auto' : d.toUpperCase()}
              </Toggle>
            ))}
          </div>
        </Row>
        <ColorField label="Color" value={f.color} onChange={(c) => set({ color: c ?? '#000000' })} />
        <Slider label="Line height" value={f.lineHeight} min={0.6} max={3} step={0.05} onChange={(v) => set({ lineHeight: v })} />
        <Slider label="Letter spacing" value={f.letterSpacing} min={-10} max={60} step={0.5} suffix="px" onChange={(v) => set({ letterSpacing: v })} />
        <Slider label="Paragraph spacing" value={f.paragraphSpacing} min={0} max={120} step={1} suffix="px" onChange={(v) => set({ paragraphSpacing: v })} />
        <label className="check">
          <input type="checkbox" checked={f.autoFit} onChange={(e) => set({ autoFit: e.target.checked })} />
          Auto-fit text to box (shrinks to fit)
        </label>
      </Section>
      <Section title="Text effects">
        <Slider label="Outline width" value={f.strokeWidth} min={0} max={20} step={0.5} suffix="px" onChange={(v) => set({ strokeWidth: v })} />
        {f.strokeWidth > 0 && <ColorField label="Outline" value={f.strokeColor} onChange={(c) => set({ strokeColor: c ?? '#000000' })} />}
        <label className="check">
          <input type="checkbox" checked={f.shadow.on} onChange={(e) => set({ shadow: { ...f.shadow, on: e.target.checked } })} />
          Drop shadow
        </label>
        {f.shadow.on && (
          <>
            <div className="grid2">
              <Num label="X" value={f.shadow.x} onChange={(v) => set({ shadow: { ...f.shadow, x: v } })} />
              <Num label="Y" value={f.shadow.y} onChange={(v) => set({ shadow: { ...f.shadow, y: v } })} />
              <Num label="Blur" value={f.shadow.blur} min={0} onChange={(v) => set({ shadow: { ...f.shadow, blur: v } })} />
            </div>
            <ColorField label="Shadow" value={f.shadow.color} onChange={(c) => set({ shadow: { ...f.shadow, color: c ?? '#00000066' } })} />
          </>
        )}
        <ColorField label="Background" value={f.bg} allowNone onChange={(c) => set({ bg: c })} />
      </Section>
    </>
  )
}

/* ---------------- shapes ---------------- */

function ShapeSection({ els }: { els: ShapeEl[] }) {
  const f = els[0]
  const set = (p: Partial<ShapeEl>) => patchSel(p as Partial<El>)
  return (
    <Section title="Shape">
      {f.shape !== 'line' && (
        <>
          <div className="btn-row">
            {(['solid', 'gradient', 'none'] as const).map((m) => (
              <Toggle key={m} on={f.fillMode === m} onClick={() => set({ fillMode: m })}>
                {m === 'solid' ? 'Solid' : m === 'gradient' ? 'Gradient' : 'No fill'}
              </Toggle>
            ))}
          </div>
          {f.fillMode === 'solid' && <ColorField label="Fill" value={f.fill} onChange={(c) => set({ fill: c ?? '#000000', ...(f.colorModel && f.colorModel !== 'rgb' ? { colorModel: 'rgb' as const } : {}) })} />}
          {f.fillMode === 'solid' && <PrintColor f={f} set={set} />}
          {f.fillMode === 'gradient' && (
            <>
              <ColorField label="From" value={f.gradient.c1} onChange={(c) => set({ gradient: { ...f.gradient, c1: c ?? '#000000' } })} />
              <ColorField label="To" value={f.gradient.c2} onChange={(c) => set({ gradient: { ...f.gradient, c2: c ?? '#ffffff' } })} />
              <Slider label="Angle" value={f.gradient.angle} min={0} max={360} suffix="°" onChange={(v) => set({ gradient: { ...f.gradient, angle: v } })} />
            </>
          )}
        </>
      )}
      <Slider label="Stroke width" value={f.strokeWidth} min={0} max={60} step={0.5} suffix="px" onChange={(v) => set({ strokeWidth: v })} />
      {(f.strokeWidth > 0 || f.shape === 'line') && <ColorField label="Stroke" value={f.stroke} onChange={(c) => set({ stroke: c ?? '#000000' })} />}
      {f.shape === 'rect' && <Slider label="Corner radius" value={f.radius} min={0} max={Math.round(Math.min(f.w, f.h) / 2)} suffix="px" onChange={(v) => set({ radius: v })} />}
      {(f.shape === 'polygon' || f.shape === 'star') && <Slider label={f.shape === 'star' ? 'Points' : 'Sides'} value={f.sides} min={3} max={16} onChange={(v) => set({ sides: v })} />}
      {f.shape === 'star' && <Slider label="Inner radius" value={f.innerRatio} min={0.1} max={0.95} step={0.01} onChange={(v) => set({ innerRatio: v })} />}
    </Section>
  )
}

/* ---------------- images ---------------- */

function ImageSection({ els }: { els: ImageEl[] }) {
  const f = els[0]
  const set = (p: Partial<ImageEl>) => patchSel(p as Partial<El>)
  const ratio = (r: number) => {
    const nh = round(f.w / r)
    set({ h: nh, y: round(f.y + (f.h - nh) / 2) })
  }
  const adjusted = !!f.lut || f.brightness !== 100 || f.contrast !== 100 || f.saturation !== 100 || f.exposure !== 0 || f.temperature !== 0 || f.blur !== 0 || f.preset !== 'none'
  return (
    <>
      <Section title="Image">
        <div className="btn-row">
          <button onClick={() => pickImageForElement(f.id)}>{f.src ? 'Replace image…' : '⬆ Upload image…'}</button>
        </div>
        {!f.src && <div className="subtle">Placeholder: any image you drop in will fill and crop to this frame.</div>}
        <div className="subtle">Frame aspect ratio (crop)</div>
        <div className="btn-row">
          {[
            ['1:1', 1],
            ['4:5', 4 / 5],
            ['3:2', 3 / 2],
            ['16:9', 16 / 9],
            ['9:16', 9 / 16],
          ].map(([l, r]) => (
            <button key={l as string} onClick={() => ratio(r as number)}>
              {l as string}
            </button>
          ))}
          {f.nw > 0 && <button onClick={() => ratio(f.nw / f.nh)}>Orig</button>}
        </div>
        <div className="btn-row">
          <Toggle on={f.fit === 'cover'} onClick={() => set({ fit: 'cover' })}>Fill & crop</Toggle>
          <Toggle on={f.fit === 'contain'} onClick={() => set({ fit: 'contain' })}>Fit</Toggle>
        </div>
        <Slider label="Zoom" value={f.zoom} min={1} max={5} step={0.01} suffix="×" onChange={(v) => set({ zoom: v })} />
        <Slider label="Pan X" value={f.offX} min={-1} max={1} step={0.01} onChange={(v) => set({ offX: v })} />
        <Slider label="Pan Y" value={f.offY} min={-1} max={1} step={0.01} onChange={(v) => set({ offY: v })} />
        <Row label="Mask">
          <select value={f.mask} onChange={(e) => set({ mask: e.target.value as ImageEl['mask'] })}>
            {['none', 'circle', 'rounded', 'star', 'triangle', 'hexagon'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Row>
        {f.mask === 'rounded' && <Slider label="Mask radius" value={f.radius} min={0} max={Math.round(Math.min(f.w, f.h) / 2)} suffix="px" onChange={(v) => set({ radius: v })} />}
      </Section>
      <Section
        title="Adjustments & filters"
        right={
          adjusted ? (
            <button className="mini" onClick={() => set({ brightness: 100, contrast: 100, saturation: 100, exposure: 0, temperature: 0, blur: 0, preset: 'none', lut: null })}>
              Reset
            </button>
          ) : undefined
        }
      >
        <Slider label="Brightness" value={f.brightness} min={0} max={200} suffix="%" onChange={(v) => set({ brightness: v })} />
        <Slider label="Contrast" value={f.contrast} min={0} max={200} suffix="%" onChange={(v) => set({ contrast: v })} />
        <Slider label="Saturation" value={f.saturation} min={0} max={250} suffix="%" onChange={(v) => set({ saturation: v })} />
        <Slider label="Exposure" value={f.exposure} min={-100} max={100} onChange={(v) => set({ exposure: v })} />
        <Slider label="Temperature" value={f.temperature} min={-100} max={100} onChange={(v) => set({ temperature: v })} />
        <Slider label="Blur" value={f.blur} min={0} max={30} step={0.5} suffix="px" onChange={(v) => set({ blur: v })} />
        <div className="subtle">Filter preset</div>
        <div className="preset-grid">
          {FILTER_PRESETS.map((p) => (
            <button key={p} className={f.preset === p ? 'on' : ''} onClick={() => set({ preset: p })}>
              {p}
            </button>
          ))}
        </div>
        <LutPicker f={f} set={set} />
      </Section>
      <BgRemoval f={f} />
      <Section title="Variable (template data)">
        <Row label="Image var">
          <input
            type="text"
            placeholder="e.g. photo"
            value={f.variable ?? ''}
            onChange={(e) => set({ variable: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') || null })}
          />
        </Row>
        <div className="subtle">Bind this frame to a variable; fill it in Design → Variables (upload, URL, or a data column).</div>
      </Section>
    </>
  )
}

/* ---------------- document (nothing selected) ---------------- */

function DocInspector() {
  const doc = useStore((s) => s.doc)
  const pageIndex = useStore((s) => s.pageIndex)
  const role = useStore((s) => s.role)
  const page = doc.pages[pageIndex]
  const u = doc.unit
  const dec = u === 'px' ? 0 : 2
  const creator = role === 'creator'
  const setSize = (w: number, h: number, unit: Unit) => actions.resizeDoc(fromUnit(w, unit), fromUnit(h, unit), unit)
  return (
    <div className="inspector">
      <div className="insp-head">
        <strong>Design</strong>
        <span className="tag">{page.name}</span>
      </div>
      <Section title="Document">
        <Row label="Name">
          <input type="text" value={doc.name} onChange={(e) => actions.setName(e.target.value)} />
        </Row>
        <Row label="Unit">
          <select value={u} disabled={!creator} onChange={(e) => actions.setDoc({ unit: e.target.value as Unit })}>
            <option value="px">px</option>
            <option value="mm">mm</option>
            <option value="in">in</option>
          </select>
        </Row>
        <div className="grid2">
          <Num label="W" value={round(toUnit(doc.width, u), dec)} min={0.1} disabled={!creator} suffix={u} onChange={(v) => setSize(v, toUnit(doc.height, u), u)} />
          <Num label="H" value={round(toUnit(doc.height, u), dec)} min={0.1} disabled={!creator} suffix={u} onChange={(v) => setSize(toUnit(doc.width, u), v, u)} />
        </div>
        <div className="subtle">
          = {Math.round(doc.width)} × {Math.round(doc.height)} px @ 96 dpi
        </div>
        <button className="wide" onClick={() => actions.set({ dialog: 'new' })} disabled={!creator}>
          New design… (sizes & presets)
        </button>
      </Section>
      <Section title="Page">
        <ColorField label="Background" value={page.background} onChange={(c) => actions.setBackground(c ?? '#ffffff')} />
        <Num label="Bleed" value={round(toUnit(doc.bleed, 'mm'), 2)} min={0} max={50} step={0.5} suffix="mm" disabled={!creator} onChange={(v) => actions.setDoc({ bleed: round(fromUnit(v, 'mm')) }, 'bleed')} />
        <div className="subtle">Bleed is shown as a dashed trim line and can be included in export.</div>
        <div className="btn-row">
          <span className="subtle">{doc.guides.length} guide(s)</span>
          <button className="mini" disabled={!doc.guides.length} onClick={() => actions.setGuides([])}>
            Clear guides
          </button>
        </div>
      </Section>
      <VariablesSection />
      <Section title="Tips">
        <ul className="tips">
          <li>Ctrl + scroll = zoom, scroll = pan, Space + drag = pan</li>
          <li>Double-click text to edit, double-click an image frame to upload</li>
          <li>Drag from the rulers to create guides</li>
          <li>Drop image files on the canvas</li>
        </ul>
      </Section>
    </div>
  )
}

export { currentPage }


/* ---------------- print colour (CMYK / spot) ---------------- */

function cmykToHex(c: number, m: number, y: number, k: number) {
  const r = 255 * (1 - c / 100) * (1 - k / 100)
  const g = 255 * (1 - m / 100) * (1 - k / 100)
  const b = 255 * (1 - y / 100) * (1 - k / 100)
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

function PrintColor({ f, set }: { f: ShapeEl; set: (p: Partial<ShapeEl>) => void }) {
  const model = f.colorModel ?? 'rgb'
  const cmyk = f.cmyk ?? [0, 0, 0, 0]
  const setModel = (m: 'rgb' | 'cmyk' | 'spot') => {
    if (m === 'rgb') return set({ colorModel: 'rgb' })
    const c = f.cmyk ?? [80, 65, 0, 0]
    set({ colorModel: m, cmyk: c, spotName: f.spotName ?? 'PANTONE Brand 1', fill: cmykToHex(c[0], c[1], c[2], c[3]) })
  }
  const setC = (i: number, v: number) => {
    const c = [...cmyk] as [number, number, number, number]
    c[i] = v
    set({ cmyk: c, fill: cmykToHex(c[0], c[1], c[2], c[3]) })
  }
  return (
    <>
      <div className="btn-row">
        <span className="subtle">Print model</span>
        {(['rgb', 'cmyk', 'spot'] as const).map((m) => (
          <Toggle key={m} on={model === m} onClick={() => setModel(m)} title={m === 'spot' ? 'Spot colour (Separation) with a CMYK alternate' : undefined}>
            {m.toUpperCase()}
          </Toggle>
        ))}
      </div>
      {model !== 'rgb' && (
        <>
          {model === 'spot' && (
            <Row label="Spot name">
              <input type="text" value={f.spotName ?? ''} onChange={(e) => set({ spotName: e.target.value })} />
            </Row>
          )}
          {(['C', 'M', 'Y', 'K'] as const).map((l, i) => (
            <Slider key={l} label={model === 'spot' ? `Alt ${l}` : l} value={cmyk[i]} min={0} max={100} suffix="%" onChange={(v) => setC(i, v)} />
          ))}
          <div className="subtle">Screen shows an sRGB preview ({f.fill}); PDF export writes {model === 'cmyk' ? 'DeviceCMYK' : `a Separation “${f.spotName}” spot colour`}.</div>
        </>
      )}
    </>
  )
}

/* ---------------- LUT ---------------- */

function LutPicker({ f, set }: { f: ImageEl; set: (p: Partial<ImageEl>) => void }) {
  const luts = useStore((s) => s.doc.luts) ?? []
  const upload = () =>
    openFilePicker('.cube', false, async (files) => {
      try {
        const text = await files[0].text()
        parseCube(text)
        const id = actions.addLut(files[0].name.replace(/\.cube$/i, ''), text)
        set({ lut: id, lutAmount: 100 })
        toast('LUT loaded')
      } catch (e) {
        toast((e as Error).message)
      }
    })
  return (
    <>
      <div className="subtle">Colour LUT (3D)</div>
      <Row label="LUT">
        <select value={f.lut ?? ''} onChange={(e) => set({ lut: e.target.value || null, lutAmount: f.lutAmount ?? 100 })}>
          <option value="">None</option>
          <optgroup label="Built-in">
            {BUILTIN_LUT_LIST.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </optgroup>
          {luts.length > 0 && (
            <optgroup label="Uploaded">
              {luts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </Row>
      {f.lut && <Slider label="LUT strength" value={f.lutAmount ?? 100} min={0} max={100} suffix="%" onChange={(v) => set({ lutAmount: v })} />}
      <button className="wide" onClick={upload}>
        ⬆ Upload .cube LUT
      </button>
    </>
  )
}

/* ---------------- vector parts ---------------- */

function VectorSection({ el }: { el: VectorEl }) {
  const [open, setOpen] = useState<string | null>(null)
  const colors = [...new Set(el.parts.flatMap((p) => [p.fill, p.stroke]).filter((c) => /^#[0-9a-f]{6}$/i.test(c)))]
  return (
    <Section title={`Vector parts (${el.parts.length})`}>
      <div className="subtle">Recolour all uses of a colour:</div>
      <div className="vcolors">
        {colors.map((c) => (
          <label key={c} className="vc" title={`Replace ${c}`}>
            <input type="color" value={c} onChange={(e) => actions.recolorVector(el.id, c, e.target.value)} />
            <span>{c}</span>
          </label>
        ))}
      </div>
      <div className="parts">
        {el.parts.map((p) => (
          <div
            key={p.id}
            className={'part' + (open === p.id ? ' open' : '')}
            onMouseEnter={() => actions.set({ hoverPart: { elId: el.id, partId: p.id } })}
            onMouseLeave={() => actions.set({ hoverPart: null })}
          >
            <div className="part-head" onClick={() => setOpen(open === p.id ? null : p.id)}>
              <span className="chip" style={{ background: p.fill.startsWith('#') ? p.fill : 'transparent', borderColor: p.stroke.startsWith('#') ? p.stroke : '#ccc' }} />
              <span className="pname">{p.name}</span>
              <button
                className="mini"
                title="Show / hide"
                onClick={(e) => {
                  e.stopPropagation()
                  actions.patchPart(el.id, p.id, { hidden: !p.hidden })
                }}
              >
                {p.hidden ? '◌' : '●'}
              </button>
            </div>
            {open === p.id && (
              <div className="part-body">
                <ColorField label="Fill" value={p.fill.startsWith('#') ? p.fill : null} allowNone onChange={(c) => actions.patchPart(el.id, p.id, { fill: c ?? 'none' })} />
                <ColorField
                  label="Stroke"
                  value={p.stroke.startsWith('#') ? p.stroke : null}
                  allowNone
                  onChange={(c) => actions.patchPart(el.id, p.id, { stroke: c ?? 'none', strokeWidth: c && !p.strokeWidth ? 2 : p.strokeWidth })}
                />
                {p.stroke !== 'none' && <Slider label="Stroke width" value={p.strokeWidth} min={0} max={Math.max(20, el.viewBox[2] / 10)} step={0.5} onChange={(v) => actions.patchPart(el.id, p.id, { strokeWidth: v })} />}
                <Slider label="Opacity" value={Math.round(p.opacity * 100)} min={0} max={100} suffix="%" onChange={(v) => actions.patchPart(el.id, p.id, { opacity: v / 100 })} />
                {p.tag === 'path' && (
                  <label className="row">
                    <span className="row-label">Path data</span>
                    <textarea
                      className="pathd"
                      rows={3}
                      spellCheck={false}
                      value={p.geom.d || ''}
                      onChange={(e) => actions.patchPart(el.id, p.id, { geom: { ...p.geom, d: e.target.value } })}
                    />
                  </label>
                )}
                <button className="danger wide" disabled={el.parts.length < 2} onClick={() => actions.deletePart(el.id, p.id)}>
                  Delete part
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ---------------- variables & data ---------------- */

function VariablesSection() {
  const doc = useStore((s) => s.doc)
  const [paste, setPaste] = useState('')
  const vars = findVariables(doc)
  const imageVars = [...new Set(doc.pages.flatMap((p) => p.elements.filter((e): e is ImageEl => e.type === 'image' && !!e.variable).map((e) => e.variable as string)))]
  const data = doc.data
  const load = (text: string, name = '') => {
    try {
      actions.setData(parseData(text, name))
      setPaste('')
      toast('Data loaded')
    } catch (e) {
      toast('Could not read data: ' + (e as Error).message)
    }
  }
  const matched = data ? [...vars, ...imageVars].filter((v) => data.columns.includes(v)) : []
  return (
    <Section title="Variables (template data)">
      {vars.length === 0 && imageVars.length === 0 && (
        <div className="subtle">
          Type <code>{'{name}'}</code> inside any text, or bind an image frame to a variable name, to create a variable. It is filled at render time and in exports.
        </div>
      )}
      {vars.map((v) => (
        <Row key={v} label={`{${v}}`}>
          <input type="text" value={doc.variables[v] ?? ''} placeholder="value…" onChange={(e) => actions.setVariable(v, e.target.value)} />
        </Row>
      ))}
      {imageVars.map((v) => (
        <Row key={v} label={`🖼 ${v}`}>
          <div className="btn-row">
            <input type="text" value={doc.variables[v]?.startsWith('data:') ? '(uploaded image)' : doc.variables[v] ?? ''} placeholder="https://… or upload" onChange={(e) => actions.setVariable(v, e.target.value)} />
            <button
              className="mini"
              onClick={() =>
                openFilePicker('image/*', false, async (files) => {
                  const { readImageFile } = await import('../upload')
                  const im = await readImageFile(files[0])
                  actions.setVariable(v, im.src)
                })
              }
            >
              ⬆
            </button>
          </div>
        </Row>
      ))}
      <div className="subtle">Data source (CSV / JSON): column names that match a variable fill it.</div>
      <div className="btn-row">
        <button onClick={() => openFilePicker('.csv,.tsv,.json,text/csv,application/json', false, async (files) => load(await files[0].text(), files[0].name))}>⬆ Load CSV / JSON…</button>
        {data && (
          <button className="mini" onClick={() => actions.setData(null)}>
            Remove
          </button>
        )}
      </div>
      {!data && (
        <>
          <textarea className="pathd" rows={3} placeholder={'name,role\nAda,Engineer\nGrace,Admiral'} value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button disabled={!paste.trim()} onClick={() => load(paste)}>
            Use pasted data
          </button>
        </>
      )}
      {data && (
        <>
          <div className="subtle">
            {data.rows.length} rows · columns: {data.columns.join(', ')}
            {matched.length ? ` · filling: ${matched.join(', ')}` : ' · no column matches a variable yet'}
          </div>
          <div className="btn-row">
            <button onClick={() => actions.setDataIndex(data.index - 1)} disabled={data.index <= 0}>
              ◀
            </button>
            <span className="subtle">
              Row {data.index + 1} / {data.rows.length}
            </span>
            <button onClick={() => actions.setDataIndex(data.index + 1)} disabled={data.index >= data.rows.length - 1}>
              ▶
            </button>
          </div>
          <button className="primary wide" onClick={() => actions.set({ dialog: 'export' })}>
            Export every row…
          </button>
        </>
      )}
    </Section>
  )
}


/* ---------------- background removal (no ML) ---------------- */

function BgRemoval({ f }: { f: ImageEl }) {
  const [tol, setTol] = useState(40)
  const [feather, setFeather] = useState(1)
  const [busy, setBusy] = useState(false)
  if (!f.src) return null
  const run = async () => {
    setBusy(true)
    try {
      const base = f.origSrc ?? f.src!
      const r = await removeBackground(base, { tolerance: tol, feather })
      if (r.removed < 0.005) toast('Nothing matched the background – raise the tolerance')
      else if (r.removed > 0.98) toast('That removed almost everything – lower the tolerance')
      actions.patch([f.id], { src: r.src, nw: r.nw, nh: r.nh, origSrc: base } as Partial<El>)
    } catch (e) {
      toast('Background removal failed: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Section title="Remove background">
      <Slider label="Tolerance" value={tol} min={6} max={120} onChange={setTol} />
      <Slider label="Edge feather" value={feather} min={0} max={4} suffix="px" onChange={setFeather} />
      <div className="btn-row">
        <button className="primary" disabled={busy} onClick={run}>
          {busy ? 'Working…' : f.origSrc ? 'Re-run on original' : 'Remove background'}
        </button>
        {f.origSrc && (
          <button onClick={() => actions.patch([f.id], { src: f.origSrc, origSrc: null } as Partial<El>)}>Restore</button>
        )}
      </div>
      <div className="subtle">Runs in your browser (no upload, no model): it clears the colour connected to the image border. Best on plain or softly shaded backgrounds.</div>
    </Section>
  )
}
