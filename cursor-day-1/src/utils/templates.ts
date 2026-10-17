import type { EditorState } from '../types/document'
import { buildSocialTemplateState } from './sampleTemplate'

export interface TemplateEntry {
  id: string
  name: string
  category: string
  description: string
  savedAt: string
  state: EditorState
}

const LIB_KEY = 'cursor-day-1-template-library'

export function listTemplates(): TemplateEntry[] {
  try {
    const raw = localStorage.getItem(LIB_KEY)
    if (!raw) return getSeedTemplates()
    const parsed = JSON.parse(raw) as TemplateEntry[]
    return parsed.length ? parsed : getSeedTemplates()
  } catch {
    return getSeedTemplates()
  }
}

export function saveTemplateLibrary(entries: TemplateEntry[]): void {
  localStorage.setItem(LIB_KEY, JSON.stringify(entries))
}

export function saveAsTemplate(state: EditorState, name: string, category: string): TemplateEntry {
  const entry: TemplateEntry = {
    id: crypto.randomUUID(),
    name,
    category,
    description: `${state.document.pages.length} page(s)`,
    savedAt: new Date().toISOString(),
    state: structuredClone(state),
  }
  const all = listTemplates().filter((t) => t.id !== entry.id)
  all.unshift(entry)
  saveTemplateLibrary(all)
  return entry
}

function getSeedTemplates(): TemplateEntry[] {
  return [
    {
      id: 'seed-social',
      name: 'Social post (locked slots)',
      category: 'Social',
      description: 'Headline + photo slot with template locks',
      savedAt: '2026-01-01T00:00:00.000Z',
      state: buildSocialTemplateState(),
    },
  ]
}

export function searchTemplates(query: string, category?: string): TemplateEntry[] {
  const q = query.trim().toLowerCase()
  return listTemplates().filter((t) => {
    if (category && category !== 'All' && t.category !== category) return false
    if (!q) return true
    return (
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    )
  })
}

export const TEMPLATE_CATEGORIES = ['All', 'Social', 'Print', 'Marketing', 'Custom']
