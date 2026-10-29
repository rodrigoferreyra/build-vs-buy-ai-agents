import type { Doc } from './types'
import { makeDoc, makeImage, makeShape, makeText } from './geometry'
import type { Template } from './store'

export interface Sticker {
  id: string
  name: string
  tags: string
  svg: string
}

const svg = (body: string) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${body}</svg>`)

export const STICKERS: Sticker[] = [
  {
    id: 'heart',
    name: 'Heart',
    tags: 'love valentine',
    svg: svg('<path d="M128 224C40 160 16 110 16 76a52 52 0 0 1 112-20 52 52 0 0 1 112 20c0 34-24 84-112 148z" fill="#ff4d6d"/>'),
  },
  {
    id: 'star',
    name: 'Star',
    tags: 'favorite rating',
    svg: svg('<path d="m128 16 34 76 82 8-62 56 18 82-72-42-72 42 18-82-62-56 82-8z" fill="#ffc933"/>'),
  },
  {
    id: 'sun',
    name: 'Sun',
    tags: 'summer weather',
    svg: svg('<circle cx="128" cy="128" r="52" fill="#ffb703"/><g stroke="#ffb703" stroke-width="12" stroke-linecap="round"><path d="M128 20v32M128 204v32M20 128h32M204 128h32M52 52l22 22M182 182l22 22M204 52l-22 22M74 182l-22 22"/></g>'),
  },
  {
    id: 'check',
    name: 'Check badge',
    tags: 'done ok success',
    svg: svg('<circle cx="128" cy="128" r="104" fill="#2ec27e"/><path d="m80 132 34 34 64-72" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>'),
  },
  {
    id: 'arrow',
    name: 'Arrow',
    tags: 'direction pointer',
    svg: svg('<path d="M24 100h120V56l88 72-88 72v-44H24z" fill="#6d5efc"/>'),
  },
  {
    id: 'bubble',
    name: 'Speech bubble',
    tags: 'chat talk comment',
    svg: svg('<path d="M48 40h160a24 24 0 0 1 24 24v88a24 24 0 0 1-24 24h-72l-48 44v-44H48a24 24 0 0 1-24-24V64a24 24 0 0 1 24-24z" fill="#4cc9f0"/>'),
  },
  {
    id: 'bolt',
    name: 'Lightning',
    tags: 'energy power sale',
    svg: svg('<path d="M148 16 52 148h64l-20 92 108-136h-68z" fill="#f77f00"/>'),
  },
  {
    id: 'burst',
    name: 'Sale burst',
    tags: 'sale discount price',
    svg: svg('<path d="m128 8 22 34 38-14 8 40 40 8-14 38 34 22-34 22 14 38-40 8-8 40-38-14-22 34-22-34-38 14-8-40-40-8 14-38-34-22 34-22-14-38 40-8 8-40 38 14z" fill="#e63946"/>'),
  },
]

function badge(): Doc {
  const d = makeDoc(1080, 1080, 'px', 'Name badge (variables)')
  d.pages[0].background = '#1a1a2e'
  d.variables = { name: 'Ada Lovelace', role: 'Mathematician' }
  const band = makeShape('rect', 0, 0, 1080, 360, {
    fillMode: 'gradient',
    gradient: { c1: '#6d5efc', c2: '#ff6aa2', angle: 120 },
    locked: true,
    name: 'Header band (locked)',
  })
  const logo = makeShape('star', 80, 80, 180, 180, { fill: '#ffffff', locked: true, name: 'Logo (locked)' })
  const hello = makeText(300, 120, 700, 'HELLO, MY NAME IS', {
    fontSize: 54,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: 4,
    locked: true,
    name: 'Label (locked)',
    valign: 'middle',
  })
  hello.h = 120
  const name = makeText(80, 440, 920, '{name}', { fontSize: 150, fontWeight: 800, color: '#ffffff', align: 'center', valign: 'middle', autoFit: true, name: 'Name' })
  name.h = 320
  const role = makeText(80, 790, 920, '{role}', { fontSize: 64, color: '#ff6aa2', align: 'center', fontWeight: 500, autoFit: true, name: 'Role' })
  role.h = 120
  d.pages[0].elements = [band, logo, hello, name, role]
  return d
}

function aiPromo(): Doc {
  const d = makeDoc(1080, 1350, 'px', 'Brand promo (AI slot)')
  d.pages[0].background = '#ffffff'
  d.brand = { colors: ['#0b7285', '#f59f00', '#102a43'], restrict: true }
  d.aiBrandOnly = true
  d.variables = { headline: 'Summer collection', tagline: 'Fresh looks for warm days' }
  const photo = makeImage(0, 0, 1080, 860, null, 0, 0, { name: 'AI photo slot', aiSlot: true })
  const band = makeShape('rect', 0, 860, 1080, 490, { fill: '#102a43', locked: true, name: 'Brand band (locked)' })
  const logo = makeShape('star', 900, 1180, 120, 120, { fill: '#f59f00', locked: true, name: 'Logo (locked)' })
  const head = makeText(70, 920, 940, '{headline}', { fontSize: 96, fontWeight: 800, color: '#ffffff', autoFit: true, locked: true, name: 'Headline (locked style)' })
  head.h = 200
  const tag = makeText(70, 1140, 780, '{tagline}', { fontSize: 44, color: '#f59f00', autoFit: true, locked: true, name: 'Tagline (locked style)' })
  tag.h = 120
  d.pages[0].elements = [photo, band, logo, head, tag]
  return d
}

function quote(): Doc {
  const d = makeDoc(1080, 1080, 'px', 'Quote card')
  d.pages[0].background = '#fff4e6'
  const circle = makeShape('ellipse', 640, -180, 700, 700, { fill: '#ffd8a8', name: 'Circle' })
  const mark = makeText(90, 120, 200, '“', { fontSize: 320, fontFamily: 'Georgia, serif', color: '#e8590c', fontWeight: 700, lineHeight: 1, name: 'Mark' })
  mark.h = 300
  const text = makeText(90, 380, 900, 'Design is thinking made visual.', { fontSize: 110, fontFamily: 'Georgia, serif', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.15, name: 'Quote' })
  text.h = 360
  const by = makeText(90, 860, 900, '— Saul Bass', { fontSize: 48, color: '#e8590c', fontWeight: 600, name: 'Author' })
  by.h = 80
  d.pages[0].elements = [circle, mark, text, by]
  return d
}

function poster(): Doc {
  const d = makeDoc(148, 210, 'mm', 'A5 poster')
  d.bleed = Math.round((3 * 96) / 25.4)
  d.pages[0].background = '#101828'
  const W = d.width
  const circle = makeShape('ellipse', -W * 0.25, 260, W * 1.5, W * 1.5, {
    fillMode: 'gradient',
    gradient: { c1: '#6d5efc', c2: '#12b886', angle: 160 },
    name: 'Planet',
  })
  const title = makeText(32, 60, W - 64, 'SUMMER\nFESTIVAL', {
    fontSize: 78,
    fontWeight: 900,
    color: '#ffffff',
    lineHeight: 1.0,
    letterSpacing: 2,
    name: 'Title',
  })
  title.h = 180
  const date = makeText(32, 270, W - 64, '14–16 AUGUST', { fontSize: 24, color: '#ffd43b', fontWeight: 700, letterSpacing: 6, name: 'Date' })
  date.h = 40
  d.pages[0].elements = [circle, title, date]
  return d
}

function photoCard(): Doc {
  const d = makeDoc(1080, 1350, 'px', 'Photo post 4:5')
  d.pages[0].background = '#f1f3f5'
  const ph = makeImage(60, 60, 960, 840, null, 0, 0, { name: 'Photo placeholder', radius: 40, mask: 'rounded' })
  const title = makeText(60, 950, 960, 'Your headline goes here', { fontSize: 88, fontWeight: 800, color: '#1a1a2e', autoFit: true, name: 'Headline' })
  title.h = 200
  const sub = makeText(60, 1180, 960, 'Add a short caption and drop a photo into the frame above.', { fontSize: 38, color: '#495057', name: 'Caption' })
  sub.h = 120
  d.pages[0].elements = [ph, title, sub]
  return d
}

function businessCard(): Doc {
  const d = makeDoc(90, 55, 'mm', 'Business card')
  d.pages[0].background = '#ffffff'
  const W = d.width
  const H = d.height
  const bar = makeShape('rect', 0, 0, 22, H, { fill: '#6d5efc', name: 'Accent bar' })
  const name = makeText(50, 48, W - 70, 'Alex Morgan', { fontSize: 34, fontWeight: 800, name: 'Name' })
  name.h = 48
  const role = makeText(50, 98, W - 70, 'Product Designer', { fontSize: 20, color: '#6d5efc', fontWeight: 600, name: 'Role' })
  role.h = 30
  const mail = makeText(50, H - 70, W - 70, 'alex@example.com\n+1 555 0100', { fontSize: 15, color: '#495057', name: 'Contact' })
  mail.h = 50
  d.pages[0].elements = [bar, name, role, mail]
  return d
}

export const BUILTIN_TEMPLATES: Template[] = [
  { id: 'b-badge', name: 'Name badge (variables + locked)', category: 'Marketing', doc: badge(), builtin: true },
  { id: 'b-aipromo', name: 'Brand promo (AI slot)', category: 'Marketing', doc: aiPromo(), builtin: true },
  { id: 'b-quote', name: 'Quote card', category: 'Social', doc: quote(), builtin: true },
  { id: 'b-photo', name: 'Photo post 4:5', category: 'Social', doc: photoCard(), builtin: true },
  { id: 'b-poster', name: 'A5 poster with bleed', category: 'Print', doc: poster(), builtin: true },
  { id: 'b-card', name: 'Business card 90×55 mm', category: 'Print', doc: businessCard(), builtin: true },
]

export const SIZE_PRESETS: { label: string; w: number; h: number; unit: 'px' | 'mm' | 'in'; group: string }[] = [
  { label: 'Instagram post', w: 1080, h: 1080, unit: 'px', group: 'Social' },
  { label: 'Instagram story', w: 1080, h: 1920, unit: 'px', group: 'Social' },
  { label: 'Facebook cover', w: 1640, h: 624, unit: 'px', group: 'Social' },
  { label: 'Presentation 16:9', w: 1920, h: 1080, unit: 'px', group: 'Screen' },
  { label: 'A6 (105 × 148 mm)', w: 105, h: 148, unit: 'mm', group: 'Print' },
  { label: 'A5 (148 × 210 mm)', w: 148, h: 210, unit: 'mm', group: 'Print' },
  { label: 'A4 (210 × 297 mm)', w: 210, h: 297, unit: 'mm', group: 'Print' },
  { label: 'Business card (90 × 55 mm)', w: 90, h: 55, unit: 'mm', group: 'Print' },
  { label: 'US Letter (8.5 × 11 in)', w: 8.5, h: 11, unit: 'in', group: 'Print' },
  { label: 'Postcard (6 × 4 in)', w: 6, h: 4, unit: 'in', group: 'Print' },
]
