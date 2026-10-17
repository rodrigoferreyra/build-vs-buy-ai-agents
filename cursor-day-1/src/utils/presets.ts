import { newId, type DocumentModel, type Page } from '../types/document'

export interface SizePreset {
  label: string
  width: number
  height: number
  unit: 'px' | 'mm'
}

export const SIZE_PRESETS: SizePreset[] = [
  { label: '1080 × 1080 px', width: 1080, height: 1080, unit: 'px' },
  { label: '1920 × 1080 px', width: 1920, height: 1080, unit: 'px' },
  { label: 'A6 (105 × 148 mm)', width: 105, height: 148, unit: 'mm' },
  { label: 'A4 (210 × 297 mm)', width: 210, height: 297, unit: 'mm' },
]

export function createPage(
  width: number,
  height: number,
  unit: 'px' | 'mm',
  name?: string,
): Page {
  return {
    id: newId(),
    name: name ?? `Page`,
    width,
    height,
    unit,
    background: '#ffffff',
    elements: [],
  }
}

export function createDocument(preset: SizePreset): DocumentModel {
  return {
    id: newId(),
    name: 'Untitled design',
    activePageIndex: 0,
    pages: [createPage(preset.width, preset.height, preset.unit, 'Page 1')],
    customFonts: [],
  }
}
