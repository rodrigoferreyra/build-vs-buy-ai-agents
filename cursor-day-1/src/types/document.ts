export type Unit = 'px' | 'mm'

export type ElementType = 'text' | 'rect' | 'ellipse' | 'line' | 'star' | 'polygon' | 'image'

export interface CustomFont {
  id: string
  label: string
  family: string
  dataUrl: string
}

export interface BaseElement {
  id: string
  type: ElementType
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  locked: boolean
  visible: boolean
  groupId?: string
}

export interface TextElement extends BaseElement {
  type: 'text'
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  lineHeight: number
  letterSpacing: number
  fill: string
  direction: 'ltr' | 'rtl'
  textShadow?: string
  WebkitTextStroke?: string
}

export type FillKind = 'solid' | 'gradient'

export interface ShapeElement extends BaseElement {
  type: 'rect' | 'ellipse' | 'line' | 'star' | 'polygon'
  fillKind: FillKind
  fill: string
  gradientTo: string
  gradientAngle: number
  stroke: string
  strokeWidth: number
  cornerRadius: number
  starPoints: number
  polygonSides: number
}

export interface ImageElement extends BaseElement {
  type: 'image'
  src: string
  flipX: boolean
  flipY: boolean
  cropX: number
  cropY: number
  cropW: number
  cropH: number
}

export type DesignElement = TextElement | ShapeElement | ImageElement

export interface Page {
  id: string
  name: string
  width: number
  height: number
  unit: Unit
  background: string
  elements: DesignElement[]
}

export interface DocumentModel {
  id: string
  name: string
  pages: Page[]
  activePageIndex: number
  customFonts: CustomFont[]
}

export interface Viewport {
  zoom: number
  panX: number
  panY: number
}

export interface EditorState {
  document: DocumentModel
  viewport: Viewport
  selectedIds: string[]
}

export const MM_TO_PX = 96 / 25.4

export function pageSizePx(page: Page): { width: number; height: number } {
  if (page.unit === 'mm') {
    return {
      width: page.width * MM_TO_PX,
      height: page.height * MM_TO_PX,
    }
  }
  return { width: page.width, height: page.height }
}

export function newId(): string {
  return crypto.randomUUID()
}

export function isShape(el: DesignElement): el is ShapeElement {
  return (
    el.type === 'rect' ||
    el.type === 'ellipse' ||
    el.type === 'line' ||
    el.type === 'star' ||
    el.type === 'polygon'
  )
}
