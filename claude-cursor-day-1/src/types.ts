import type { VideoProject } from './video/types'

export type Blend =
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

export const BLEND_MODES: Blend[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
]

export interface Gradient {
  c1: string
  c2: string
  angle: number
}

export interface Shadow {
  on: boolean
  x: number
  y: number
  blur: number
  color: string
}

export interface BaseEl {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  rotation: number
  opacity: number
  blend: Blend
  hidden: boolean
  locked: boolean
  flipX: boolean
  flipY: boolean
  groupId?: string
}

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'polygon' | 'star'

export interface ShapeEl extends BaseEl {
  type: 'shape'
  shape: ShapeKind
  fillMode: 'solid' | 'gradient' | 'none'
  fill: string
  gradient: Gradient
  stroke: string
  strokeWidth: number
  radius: number
  sides: number
  innerRatio: number
  /** print colour model for the solid fill (hex `fill` is always the sRGB preview) */
  colorModel?: 'rgb' | 'cmyk' | 'spot'
  cmyk?: [number, number, number, number] // 0..100
  spotName?: string
}

export type TextAlign = 'left' | 'center' | 'right'
export type TextDir = 'auto' | 'ltr' | 'rtl'
export type VAlign = 'top' | 'middle' | 'bottom'

export interface TextEl extends BaseEl {
  type: 'text'
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  italic: boolean
  underline: boolean
  color: string
  align: TextAlign
  valign: VAlign
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  autoFit: boolean
  strokeColor: string
  strokeWidth: number
  shadow: Shadow
  bg: string | null
  direction?: TextDir
  /** text on an arc: -100..100 (% of a half circle), 0 = straight */
  curve?: number
}

export type Mask = 'none' | 'circle' | 'rounded' | 'star' | 'triangle' | 'hexagon'

export interface ImageEl extends BaseEl {
  type: 'image'
  src: string | null
  nw: number
  nh: number
  fit: 'cover' | 'contain'
  zoom: number
  offX: number
  offY: number
  mask: Mask
  radius: number
  brightness: number
  contrast: number
  saturation: number
  exposure: number
  temperature: number
  blur: number
  preset: string
  /** id of a 3D LUT (`builtin:*` or a doc.luts id) and its strength 0..100 */
  lut?: string | null
  lutAmount?: number
  /** name of an image variable that replaces `src` at render time */
  variable?: string | null
  /** original pixels kept after background removal so it can be undone */
  origSrc?: string | null
  /** frame that AI generation may fill in brand-template mode */
  aiSlot?: boolean
}

export interface VPart {
  id: string
  name: string
  tag: string // path | rect | circle | ellipse | line | polyline | polygon
  geom: Record<string, string> // geometry attributes (d, x, y, cx, ...)
  fill: string // #hex | none | url(#id)
  stroke: string
  strokeWidth: number
  opacity: number
  fillRule?: 'evenodd' | 'nonzero'
  linecap?: string
  linejoin?: string
  transform?: string | null // matrix(a b c d e f) in viewBox user space
  hidden?: boolean
}

/** Imported / boolean-op vector artwork whose parts stay editable. */
export interface VectorEl extends BaseEl {
  type: 'vector'
  viewBox: [number, number, number, number]
  defs: string
  parts: VPart[]
}

export type El = ShapeEl | TextEl | ImageEl | VectorEl

export interface Page {
  id: string
  name: string
  background: string
  elements: El[]
}

export type Unit = 'px' | 'mm' | 'in'

export interface CustomFont {
  family: string
  dataUrl: string
}

export interface Guide {
  axis: 'x' | 'y'
  pos: number
}

export interface LutAsset {
  id: string
  name: string
  cube: string
}

export interface BrandLogo {
  id: string
  name: string
  src: string
  nw: number
  nh: number
}

export interface BrandKit {
  colors: string[]
  restrict: boolean
  /** css font stacks that belong to the brand */
  fonts?: string[]
  restrictFonts?: boolean
  logos?: BrandLogo[]
}

export interface DataSource {
  columns: string[]
  rows: Record<string, string>[]
  index: number
}

export interface Doc {
  version: 1
  id: string
  name: string
  width: number // px (96 dpi)
  height: number
  unit: Unit
  bleed: number // px
  pages: Page[]
  fonts: CustomFont[]
  variables: Record<string, string>
  brand: BrandKit
  guides: Guide[]
  luts?: LutAsset[]
  data?: DataSource | null
  /** AI may only fill the open slots of this (locked) template */
  aiBrandOnly?: boolean
  /** video studio project (timeline) */
  video?: VideoProject
}

export type Role = 'creator' | 'adopter'
