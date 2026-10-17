import type { EditorState } from '../types/document'
import { normalizeElement } from './elements'

const STORAGE_KEY = 'cursor-day-1-design'

function normalizeState(state: EditorState): EditorState {
  const doc = state.document
  doc.customFonts = doc.customFonts ?? []
  doc.editorRole = doc.editorRole ?? 'creator'
  doc.brandKit = doc.brandKit ?? { colors: ['#2563eb', '#f97316', '#111827'], restrictPalette: false }
  doc.templateVariables = doc.templateVariables ?? {}
  doc.isTemplate = doc.isTemplate ?? false
  doc.uiLocale = doc.uiLocale ?? 'en'
  doc.uiTheme = doc.uiTheme ?? 'dark'
  for (const page of doc.pages) {
    page.elements = page.elements.map(normalizeElement)
    page.guides = page.guides ?? []
    page.bleedMm = page.bleedMm ?? 0
    page.marginMm = page.marginMm ?? 0
  }
  return state
}

export function saveToLocalStorage(state: EditorState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function loadFromLocalStorage(): EditorState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return normalizeState(JSON.parse(raw) as EditorState)
  } catch {
    return null
  }
}

export function exportProjectJson(state: EditorState): string {
  return JSON.stringify(state, null, 2)
}

export function importProjectJson(json: string): EditorState | null {
  try {
    return normalizeState(JSON.parse(json) as EditorState)
  } catch {
    return null
  }
}
