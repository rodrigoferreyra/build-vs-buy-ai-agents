import { createDocument, SIZE_PRESETS } from './presets'
import { createImagePlaceholder, createText } from './elements'
import type { EditorState } from '../types/document'

/** Starter template for library demos (social post with headline + photo slot). */
export function buildSocialTemplateState(): EditorState {
  const doc = createDocument(SIZE_PRESETS[0])
  doc.name = 'Social template'
  doc.isTemplate = true
  doc.templateVariables = { name: 'Alex', headline: 'Hello world' }
  const page = doc.pages[0]
  page.bleedMm = 3
  page.marginMm = 5

  const headline = createText(80, 72)
  headline.content = '{headline}'
  headline.variableKey = 'headline'
  headline.fontSize = 48
  headline.width = 920
  headline.height = 120
  headline.autoFit = true
  headline.templateLock = true

  const name = createText(80, 920)
  name.content = 'By {name}'
  name.variableKey = 'name'
  name.fontSize = 28
  name.width = 400
  name.height = 60

  const slot = createImagePlaceholder(1, 80, 220, 920)
  slot.height = 920
  slot.templateLock = true

  page.elements = [slot, headline, name]
  return {
    document: doc,
    viewport: { zoom: 0.45, panX: 80, panY: 80 },
    selectedIds: [],
  }
}
