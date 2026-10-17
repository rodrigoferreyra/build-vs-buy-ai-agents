export type Unit = 'px' | 'mm'

export type ElementType = 'text' | 'rect' | 'ellipse' | 'line' | 'star' | 'polygon' | 'image'

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'

export type EditorRole = 'creator' | 'adopter'

export interface CustomFont {
  id: string
  label: string
  family: string
  dataUrl: string
}

export interface BrandKit {
  colors: string[]
  restrictPalette: boolean
}

export interface ManualGuide {
  id: string
  orientation: 'h' | 'v'
  /** Position in page px from top-left */
  position: number
}

export interface SvgPathPart {
  id: string
  d: string
  fill: string
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
  blendMode?: BlendMode
  /** When true, adopters cannot move/delete/edit (creator can). */
  templateLock?: boolean
}

export interface TextElement extends BaseElement {
  type: 'text'
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  lineHeight: number
  letterSpacing: number
  paragraphSpacing?: number
  fill: string
  direction: 'ltr' | 'rtl'
  textShadow?: string
  WebkitTextStroke?: string
  textBackground?: string
  autoFit?: boolean
  /** Variable key for template fill, e.g. "name" for {name} */
  variableKey?: string
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

export type ImageMaskShape = 'none' | 'circle' | 'ellipse' | 'rect'

export type FilterPreset = 'none' | 'grayscale' | 'sepia' | 'vintage' | 'cool' | 'warm'

export interface ImageElement extends BaseElement {
  type: 'image'
  src: string
  flipX: boolean
  flipY: boolean
  cropX: number
  cropY: number
  cropW: number
  cropH: number
  brightness?: number
  contrast?: number
  saturation?: number
  exposure?: number
  temperature?: number
  filterPreset?: FilterPreset
  isPlaceholder?: boolean
  placeholderAspect?: number
  maskShape?: ImageMaskShape
  vectorPaths?: SvgPathPart[]
  vectorViewBox?: string
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
  bleedMm?: number
  marginMm?: number
  guides?: ManualGuide[]
}

export interface DocumentModel {
  id: string
  name: string
  pages: Page[]
  activePageIndex: number
  customFonts: CustomFont[]
  editorRole?: EditorRole
  brandKit?: BrandKit
  /** Values for {key} substitution in text */
  templateVariables?: Record<string, string>
  isTemplate?: boolean
  uiLocale?: 'en' | 'de'
  uiTheme?: 'dark' | 'light'
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

export function bleedPx(page: Page): number {
  return (page.bleedMm ?? 0) * MM_TO_PX
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

export function isAdopterLocked(el: DesignElement, role: EditorRole): boolean {
  return role === 'adopter' && !!el.templateLock
}
