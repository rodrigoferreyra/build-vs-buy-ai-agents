import { actions, currentPage, getState, history } from './store'
import { makeImage, makeShape, makeText, round } from './geometry'
import type { Doc, El, ImageEl } from './types'

/**
 * Text-to-image inside the editor with the user's own key (OpenAI or any OpenAI-compatible endpoint),
 * or an offline, clearly labelled dry run. Results land as editable layers, or – in brand mode – only inside
 * the open slots of a locked brand template.
 */
export interface AiSettings {
  provider: 'dryrun' | 'openai'
  apiKey: string
  baseUrl: string
  imageModel: string
  textModel: string
  rememberKey: boolean
}

const KEY = 'canvasly:ai'
export function loadAiSettings(): AiSettings {
  const def: AiSettings = { provider: 'dryrun', apiKey: '', baseUrl: 'https://api.openai.com/v1', imageModel: 'gpt-image-1', textModel: 'gpt-4o-mini', rememberKey: false }
  try {
    const s = { ...def, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
    s.apiKey = s.apiKey || sessionStorage.getItem(KEY + ':key') || ''
    return s
  } catch {
    return def
  }
}
export function saveAiSettings(s: AiSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, apiKey: s.rememberKey ? s.apiKey : '' }))
    sessionStorage.setItem(KEY + ':key', s.apiKey)
  } catch {
    /* ignore */
  }
}

export interface Copy {
  headline: string
  tagline: string
  cta: string
}

/* ---------- brand / template context ---------- */

export function brandContext(doc: Doc) {
  const colors = doc.brand.colors.length ? doc.brand.colors : ['#6d5efc', '#ff6aa2', '#1a1a2e']
  const fonts = doc.brand.fonts ?? []
  return { colors, fonts }
}

/** image frames an AI result may go into: empty placeholders, variable-bound frames, or frames marked as AI slots */
export function aiSlots(doc: Doc, pageIndex: number): ImageEl[] {
  return doc.pages[pageIndex].elements.filter((e): e is ImageEl => e.type === 'image' && !e.locked && (!e.src || !!e.variable || !!e.aiSlot))
}

export function isLockedTemplate(doc: Doc) {
  return doc.pages.some((p) => p.elements.some((e) => e.locked))
}

/** brand mode is enforced for adopters and when the creator switched it on for this design */
export function brandModeActive(doc: Doc, role: string) {
  return role === 'adopter' || !!doc.aiBrandOnly
}

/* ---------- generation ---------- */

async function openaiImage(s: AiSettings, prompt: string, w: number, h: number): Promise<string> {
  const size = w > h * 1.2 ? '1536x1024' : h > w * 1.2 ? '1024x1536' : '1024x1024'
  const body: Record<string, unknown> = { model: s.imageModel, prompt, size, n: 1 }
  if (/dall-e/.test(s.imageModel)) body.response_format = 'b64_json'
  const r = await fetch(s.baseUrl.replace(/\/$/, '') + '/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.apiKey}` },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`)
  const d = j.data?.[0]
  if (d?.b64_json) return 'data:image/png;base64,' + d.b64_json
  if (d?.url) return d.url
  throw new Error('No image in response')
}

async function openaiCopy(s: AiSettings, prompt: string): Promise<Copy> {
  const r = await fetch(s.baseUrl.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.apiKey}` },
    body: JSON.stringify({
      model: s.textModel,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You write short marketing copy. Reply as JSON {"headline": max 6 words, "tagline": max 12 words, "cta": max 3 words}.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`)
  return JSON.parse(j.choices[0].message.content)
}

function hash(s: string) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

/** offline placeholder "generation": deterministic abstract art in the brand colours, watermarked as a dry run */
function dryRunImage(prompt: string, colors: string[], w: number, h: number): string {
  const k = Math.min(1, 1024 / Math.max(w, h))
  const W = Math.round(w * k)
  const H = Math.round(h * k)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  let seed = hash(prompt)
  const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0), (seed % 10000) / 10000)
  const g = x.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, colors[0])
  g.addColorStop(1, colors[1 % colors.length])
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  for (let i = 0; i < 14; i++) {
    x.globalAlpha = 0.18 + rnd() * 0.3
    x.fillStyle = colors[i % colors.length]
    x.beginPath()
    x.arc(rnd() * W, rnd() * H, (0.08 + rnd() * 0.3) * Math.min(W, H), 0, Math.PI * 2)
    x.fill()
  }
  x.globalAlpha = 1
  x.fillStyle = 'rgba(0,0,0,0.55)'
  x.fillRect(0, H - 34, W, 34)
  x.fillStyle = '#fff'
  x.font = '600 15px Inter, sans-serif'
  x.fillText(`AI DRY RUN (no model called) · "${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}"`, 12, H - 12)
  return c.toDataURL('image/png')
}

function dryRunCopy(prompt: string): Copy {
  const words = prompt.replace(/[^\p{L}\p{N}\s-]/gu, '').split(/\s+/).filter((w) => w.length > 2)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const head = words.slice(0, 4).map(cap).join(' ') || 'Your Headline'
  return { headline: head, tagline: `Made for ${words.slice(4, 8).join(' ') || 'you'} – dry-run copy`, cta: 'Learn more' }
}

export async function generate(s: AiSettings, prompt: string, w: number, h: number, withCopy: boolean): Promise<{ src: string; copy: Copy | null; dry: boolean }> {
  const { colors } = brandContext(getState().doc)
  const styled = `${prompt}. Use the brand colour palette ${colors.join(', ')}. No text in the image.`
  if (s.provider === 'dryrun' || !s.apiKey) {
    await new Promise((r) => setTimeout(r, 300))
    return { src: dryRunImage(prompt, colors, w, h), copy: withCopy ? dryRunCopy(prompt) : null, dry: true }
  }
  const [src, copy] = await Promise.all([openaiImage(s, styled, w, h), withCopy ? openaiCopy(s, prompt) : Promise.resolve(null)])
  return { src, copy, dry: false }
}

/* ---------- placing results ---------- */

async function dims(src: string) {
  const im = new Image()
  im.src = src
  await im.decode()
  return { w: im.naturalWidth, h: im.naturalHeight }
}

/** free mode: background image + headline + tagline + CTA as separate, editable layers (one undo step) */
export async function placeAsLayers(src: string, copy: Copy | null, prompt: string) {
  const { doc } = getState()
  const { colors, fonts } = brandContext(doc)
  const W = doc.width
  const H = doc.height
  const d = await dims(src)
  const els: El[] = [makeImage(0, 0, W, H, src, d.w, d.h, { name: `AI image – ${prompt.slice(0, 30)}` })]
  if (copy) {
    const font = fonts[0] ?? '"Inter", sans-serif'
    const head = makeText(W * 0.08, H * 0.12, round(W * 0.84), copy.headline, { fontSize: Math.round(W * 0.085), fontWeight: 700, color: '#ffffff', fontFamily: font, name: 'AI headline', autoFit: true })
    head.h = round(W * 0.085 * 1.25 * 2)
    head.shadow = { on: true, x: 0, y: 2, blur: 12, color: 'rgba(0,0,0,0.45)' }
    const tag = makeText(W * 0.08, head.y + head.h + H * 0.02, round(W * 0.84), copy.tagline, { fontSize: Math.round(W * 0.035), color: '#ffffff', fontFamily: font, name: 'AI tagline' })
    tag.h = round(W * 0.035 * 1.3 * 2)
    const bw = round(W * 0.32)
    const bh = round(H * 0.08)
    const btn = makeShape('rect', W * 0.08, H * 0.8, bw, bh, { fill: colors[0], radius: bh / 2, name: 'AI CTA button' })
    const label = makeText(W * 0.08, H * 0.8 + bh * 0.22, bw, copy.cta, { fontSize: Math.round(bh * 0.42), fontWeight: 700, color: '#ffffff', align: 'center', fontFamily: font, name: 'AI CTA label' })
    label.h = round(bh * 0.6)
    els.push(head, tag, btn, label)
  }
  history.begin()
  actions.addElements(els)
  history.end()
  return els.length
}

/** brand mode: fill an open slot of a locked template (and {headline}/{tagline}/{cta} variables) – nothing else changes */
export async function placeInTemplate(src: string, copy: Copy | null, targetId?: string): Promise<string> {
  const s = getState()
  if (!isLockedTemplate(s.doc)) throw new Error('AI is limited to brand templates: open a template with locked elements first.')
  const slots = aiSlots(s.doc, s.pageIndex)
  const target = slots.find((e) => e.id === targetId) ?? slots.find((e) => s.selection.includes(e.id)) ?? slots[0]
  if (!target) throw new Error('This template has no open image slot for AI (empty placeholder, image variable or AI slot).')
  const d = await dims(src)
  history.begin()
  if (target.variable) actions.setVariable(target.variable, src)
  else actions.patch([target.id], { src, nw: d.w, nh: d.h, zoom: 1, offX: 0, offY: 0, aiSlot: true } as Partial<El>)
  if (copy) {
    const used = new Set(currentPage().elements.flatMap((e) => (e.type === 'text' ? [...e.text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]) : [])))
    for (const k of ['headline', 'tagline', 'cta'] as const) if (used.has(k)) actions.setVariable(k, copy[k])
  }
  history.end()
  return target.name
}
