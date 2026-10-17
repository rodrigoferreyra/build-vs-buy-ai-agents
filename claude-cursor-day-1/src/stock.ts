import { STICKERS } from './templates'

/** Built-in stock library: everything is generated SVG, imported as editable vectors (no network). */

export interface StockItem {
  id: string
  name: string
  tags: string
  category: 'Backgrounds' | 'Patterns' | 'Icons' | 'Stickers' | 'Shapes'
  svg: string // full svg markup
  cover?: boolean // insert covering the whole page
}

const wrap = (vb: string, body: string, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra}>${body}</svg>`
export const svgUrl = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

/* ---------- backgrounds: gradients ---------- */
const GRADS: [string, string, string, string, number][] = [
  ['Aurora', '#12b886', '#6d5efc', 'northern lights green purple', 135],
  ['Sunset', '#ff922b', '#e64980', 'sunset orange pink warm', 160],
  ['Ocean', '#22b8cf', '#1c4fd7', 'sea blue water cool', 120],
  ['Mint', '#d3f9d8', '#63e6be', 'fresh green soft', 100],
  ['Dusk', '#312e81', '#db2777', 'night purple magenta', 150],
  ['Peach', '#ffe3d3', '#ffa8a8', 'soft pink peach pastel', 90],
  ['Midnight', '#0b1020', '#233a6b', 'dark navy night', 135],
  ['Lemon', '#fff3bf', '#ffd43b', 'yellow sunny', 80],
  ['Slate', '#dee2e6', '#868e96', 'grey neutral minimal', 120],
  ['Candy', '#a5d8ff', '#fcc2d7', 'pastel blue pink', 45],
]

function grad([name, c1, c2, tags, angle]: (typeof GRADS)[number]): StockItem {
  const a = (angle * Math.PI) / 180
  const x1 = 0.5 - Math.sin(a) / 2
  const y1 = 0.5 + Math.cos(a) / 2
  const x2 = 0.5 + Math.sin(a) / 2
  const y2 = 0.5 - Math.cos(a) / 2
  return {
    id: 'bg-' + name.toLowerCase(),
    name: name + ' gradient',
    tags: 'background gradient ' + tags,
    category: 'Backgrounds',
    cover: true,
    svg: wrap(
      '0 0 1000 1000',
      `<defs><linearGradient id="g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="1000" height="1000" fill="url(#g)"/>`,
    ),
  }
}

function blobs(name: string, bg: string, cols: string[], seed: number): StockItem {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  let body = `<rect width="1000" height="1000" fill="${bg}"/>`
  for (let i = 0; i < 7; i++) {
    const cx = rnd() * 1000
    const cy = rnd() * 1000
    const r = 120 + rnd() * 260
    body += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="${cols[i % cols.length]}" opacity="0.55"/>`
  }
  return { id: 'bg-blobs-' + name.toLowerCase(), name: name + ' blobs', tags: 'background abstract bubbles circles', category: 'Backgrounds', cover: true, svg: wrap('0 0 1000 1000', body) }
}

/* ---------- patterns ---------- */
function dots(fg: string, bg: string, name: string): StockItem {
  let b = `<rect width="1000" height="1000" fill="${bg}"/>`
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) b += `<circle cx="${50 + x * 100 + (y % 2) * 50}" cy="${50 + y * 100}" r="18" fill="${fg}"/>`
  return { id: 'pat-dots-' + name, name: name + ' dots', tags: 'pattern polka dots', category: 'Patterns', cover: true, svg: wrap('0 0 1000 1000', b) }
}
function stripes(fg: string, bg: string, name: string): StockItem {
  let b = `<rect width="1000" height="1000" fill="${bg}"/>`
  for (let i = 0; i < 10; i++) b += `<rect x="${i * 100 + 50}" y="0" width="50" height="1000" fill="${fg}"/>`
  return { id: 'pat-stripes-' + name, name: name + ' stripes', tags: 'pattern stripes lines', category: 'Patterns', cover: true, svg: wrap('0 0 1000 1000', b) }
}
function gridPat(fg: string, bg: string, name: string): StockItem {
  let b = `<rect width="1000" height="1000" fill="${bg}"/>`
  for (let i = 0; i <= 10; i++) b += `<rect x="${i * 100 - 2}" y="0" width="4" height="1000" fill="${fg}"/><rect x="0" y="${i * 100 - 2}" width="1000" height="4" fill="${fg}"/>`
  return { id: 'pat-grid-' + name, name: name + ' grid', tags: 'pattern grid graph paper', category: 'Patterns', cover: true, svg: wrap('0 0 1000 1000', b) }
}
function checker(fg: string, bg: string, name: string): StockItem {
  let b = `<rect width="1000" height="1000" fill="${bg}"/>`
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 0) b += `<rect x="${x * 125}" y="${y * 125}" width="125" height="125" fill="${fg}"/>`
  return { id: 'pat-check-' + name, name: name + ' checker', tags: 'pattern checker chess', category: 'Patterns', cover: true, svg: wrap('0 0 1000 1000', b) }
}
function waves(fg: string, bg: string, name: string): StockItem {
  let b = `<rect width="1000" height="1000" fill="${bg}"/>`
  for (let r = 0; r < 8; r++) {
    const y = 80 + r * 120
    let d = `M0 ${y}`
    for (let x = 0; x < 1000; x += 250) d += `Q${x + 62} ${y - 50} ${x + 125} ${y}Q${x + 187} ${y + 50} ${x + 250} ${y}`
    b += `<path d="${d}" fill="none" stroke="${fg}" stroke-width="10" stroke-linecap="round"/>`
  }
  return { id: 'pat-waves-' + name, name: name + ' waves', tags: 'pattern waves sea', category: 'Patterns', cover: true, svg: wrap('0 0 1000 1000', b) }
}
function confetti(name: string, seed: number): StockItem {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const cols = ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c', '#da77f2', '#ff922b']
  let b = '<rect width="1000" height="1000" fill="#ffffff"/>'
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 1000
    const y = rnd() * 1000
    const a = rnd() * 180
    b += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(14 + rnd() * 14).toFixed(0)}" height="${(40 + rnd() * 30).toFixed(0)}" rx="6" fill="${cols[i % cols.length]}" transform="rotate(${a.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`
  }
  return { id: 'pat-confetti-' + name, name: 'Confetti ' + name, tags: 'pattern confetti party celebration', category: 'Patterns', cover: true, svg: wrap('0 0 1000 1000', b) }
}

/* ---------- icons (24x24 outline) ---------- */
const ICONS: [string, string, string][] = [
  ['Home', 'house building', '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'],
  ['User', 'person profile account', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'],
  ['Mail', 'email envelope message', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'],
  ['Phone', 'call telephone', '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>'],
  ['Camera', 'photo picture', '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>'],
  ['Cart', 'shopping store buy', '<path d="M3 4h2l2.5 11h10l2-8H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>'],
  ['Bell', 'notification alert', '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>'],
  ['Search', 'magnifier find', '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>'],
  ['Sliders', 'settings controls options', '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'],
  ['Pin', 'location map place', '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'],
  ['Calendar', 'date schedule event', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'],
  ['Clock', 'time watch', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
  ['Cloud', 'weather sky', '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>'],
  ['Leaf', 'nature eco plant', '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15z"/><path d="M5 19l8-8"/>'],
  ['Music', 'note audio song', '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'],
  ['Play', 'video start media', '<path d="M7 4l13 8-13 8z"/>'],
  ['Lock', 'secure privacy password', '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'],
  ['Gift', 'present birthday', '<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13M12 8S10 3 7.5 4 8 8 12 8zm0 0s2-5 4.5-4S16 8 12 8z"/>'],
  ['Coffee', 'cup drink cafe', '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h2a2 2 0 0 1 0 5h-2M8 2v3M12 2v3"/>'],
  ['Globe', 'world earth international', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'],
  ['Bookmark', 'save favorite', '<path d="M6 3h12v18l-6-4-6 4z"/>'],
  ['Chat', 'comment message bubble', '<path d="M4 5h16v11H9l-5 4z"/>'],
  ['Thumbs up', 'like approve', '<path d="M7 11v9H3v-9zM7 11l4-8c2 0 3 1.5 2.5 3.5L13 9h6a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/>'],
  ['Flame', 'fire hot trending', '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 2 4-5z"/>'],
  ['Flag', 'goal milestone', '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>'],
  ['Check', 'done ok tick', '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'],
  ['Close', 'cancel x remove', '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'],
  ['Plus', 'add new', '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'],
  ['Download', 'save arrow', '<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>'],
  ['Share', 'send network', '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>'],
  ['Heart outline', 'love like favorite', '<path d="M12 21C4 15 3 10 3 8a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 2-1 7-9 13z"/>'],
  ['Star outline', 'rating favorite', '<path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2L3 9.5l6.3-.7z"/>'],
  ['Briefcase', 'work business job', '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>'],
  ['Rocket', 'launch startup', '<path d="M12 2c4 2 6 6 5 11l-3 3h-4l-3-3C6 8 8 4 12 2zM9 16l-3 5 5-3M15 16l3 5-5-3"/><circle cx="12" cy="9" r="1.5"/>'],
  ['Bulb', 'idea light', '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>'],
]

function icon([name, tags, body]: (typeof ICONS)[number]): StockItem {
  return {
    id: 'ic-' + name.toLowerCase().replace(/\s+/g, '-'),
    name,
    tags: 'icon ' + tags,
    category: 'Icons',
    svg: wrap('0 0 24 24', `<g fill="none" stroke="#1a1a2e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</g>`),
  }
}

/* ---------- shapes / stickers ---------- */
const SHAPES: [string, string, string][] = [
  ['Blob', 'organic shape amoeba', '<path d="M45 8c14-6 36 4 40 22s-8 30-24 38S28 90 16 76 4 46 20 24c5-7 14-13 25-16z" fill="#ff8787"/>'],
  ['Ribbon', 'banner label', '<path d="M4 20h92v36H4l12-18zM20 56v20l14-8 14 8V56" fill="#6d5efc"/>'],
  ['Badge', 'seal award quality', '<circle cx="50" cy="42" r="30" fill="#ffd43b"/><circle cx="50" cy="42" r="22" fill="none" stroke="#e67700" stroke-width="3"/><path d="M34 70l-8 24 24-8 24 8-8-24" fill="#fa5252"/>'],
  ['Arrow curved', 'direction swoosh', '<path d="M10 70C20 20 60 10 82 28M82 28l-4-18M82 28l-18 2" fill="none" stroke="#212529" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'],
  ['Squiggle', 'line wave underline', '<path d="M5 50q10-30 20 0t20 0 20 0 20 0 10-10" fill="none" stroke="#e64980" stroke-width="6" stroke-linecap="round"/>'],
  ['Burst', 'explosion pop', '<path d="M50 4l9 20 21-9-4 22 22 3-17 15 17 14-22 3 4 22-21-9-9 20-9-20-21 9 4-22-22-3 17-14L3 40l22-3-4-22 21 9z" fill="#ff6b6b"/>'],
  ['Cloud shape', 'sky speech', '<path d="M25 70a18 18 0 0 1-2-36 24 24 0 0 1 46-4 20 20 0 0 1 4 40z" fill="#74c0fc"/>'],
  ['Tag', 'price label sale', '<path d="M8 8h38l46 46-34 34L8 42z" fill="#51cf66"/><circle cx="24" cy="24" r="6" fill="#fff"/>'],
]

function shape([name, tags, body]: (typeof SHAPES)[number]): StockItem {
  return { id: 'sh-' + name.toLowerCase().replace(/\s+/g, '-'), name, tags: 'shape sticker ' + tags, category: 'Shapes', svg: wrap('0 0 100 100', body) }
}

function stickers(): StockItem[] {
  return STICKERS.map((s) => ({
    id: 'st-' + s.id,
    name: s.name,
    tags: 'sticker ' + s.tags,
    category: 'Stickers' as const,
    svg: decodeURIComponent(s.svg.slice(s.svg.indexOf(',') + 1)),
  }))
}

export const STOCK: StockItem[] = [
  ...GRADS.map(grad),
  blobs('Pastel', '#fff5f5', ['#ffa8a8', '#a5d8ff', '#ffe066', '#b2f2bb'], 11),
  blobs('Deep', '#101828', ['#6d5efc', '#12b886', '#e64980', '#22b8cf'], 5),
  dots('#6d5efc', '#f3f0ff', 'violet'),
  dots('#ffffff', '#1a1a2e', 'night'),
  stripes('#ffd43b', '#1a1a2e', 'warning'),
  stripes('#e7f5ff', '#ffffff', 'sky'),
  gridPat('#ced4da', '#ffffff', 'paper'),
  gridPat('#364fc7', '#1c2b6b', 'blueprint'),
  checker('#212529', '#f8f9fa', 'classic'),
  waves('#22b8cf', '#e3fafc', 'sea'),
  confetti('party', 7),
  ...ICONS.map(icon),
  ...SHAPES.map(shape),
  ...stickers(),
]

export const STOCK_CATEGORIES = ['All', 'Backgrounds', 'Patterns', 'Icons', 'Shapes', 'Stickers'] as const

/* ---------- optional online stock (Openverse, CC-licensed) ---------- */
export interface OnlinePhoto {
  id: string
  title: string
  creator: string
  license: string
  thumb: string
  url: string
  w: number
  h: number
}

export async function searchOpenverse(q: string): Promise<OnlinePhoto[]> {
  const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=18&mature=false&license_type=commercial`)
  if (!r.ok) throw new Error('Search failed (HTTP ' + r.status + ')')
  const j = await r.json()
  return (j.results || []).map((x: Record<string, unknown>) => ({
    id: String(x.id),
    title: String(x.title || 'Untitled'),
    creator: String(x.creator || 'unknown'),
    license: String(x.license || '').toUpperCase() + ' ' + String(x.license_version || ''),
    thumb: String(x.thumbnail || x.url),
    url: String(x.thumbnail || x.url),
    w: Number(x.width) || 800,
    h: Number(x.height) || 600,
  }))
}

export async function fetchAsDataUrl(url: string): Promise<{ src: string; w: number; h: number }> {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Download failed (HTTP ' + r.status + ')')
  const blob = await r.blob()
  const src: string = await new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(fr.result as string)
    fr.onerror = () => rej(fr.error)
    fr.readAsDataURL(blob)
  })
  const dims = await new Promise<{ w: number; h: number }>((res) => {
    const im = new Image()
    im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight })
    im.onerror = () => res({ w: 800, h: 600 })
    im.src = src
  })
  return { src, ...dims }
}
