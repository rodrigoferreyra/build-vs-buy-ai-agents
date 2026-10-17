/** Video studio data model. Stored inside the design document (`doc.video`) so it is saved / undone like everything else. */

export type TrackKind = 'video' | 'audio' | 'overlay' | 'caption'
export type ClipKind = 'video' | 'image' | 'audio' | 'text' | 'sticker' | 'caption' | 'design'
export type Anim = 'none' | 'fade' | 'slide-up' | 'slide-left' | 'pop' | 'typewriter' | 'bounce'
export type TransitionType = 'none' | 'crossfade' | 'dip-black' | 'wipe-left' | 'wipe-right' | 'slide-left' | 'zoom'

export const ANIMS: Anim[] = ['none', 'fade', 'slide-up', 'slide-left', 'pop', 'typewriter', 'bounce']
export const TRANSITIONS: TransitionType[] = ['none', 'crossfade', 'dip-black', 'wipe-left', 'wipe-right', 'slide-left', 'zoom']

export interface MediaRef {
  id: string
  name: string
  kind: 'video' | 'audio' | 'image'
  /** built-in / remote url; user files are kept in IndexedDB under `id` */
  url?: string
  mime?: string
  duration: number // seconds (0 for images)
  w?: number
  h?: number
  hasAudio?: boolean
}

export interface Clip {
  id: string
  kind: ClipKind
  name: string
  start: number // seconds on the timeline
  dur: number // seconds on the timeline
  inPoint: number // seconds into the source media
  media?: string // MediaRef id
  volume: number // 0..2
  fadeIn: number
  fadeOut: number
  // visual box in project pixels
  x: number
  y: number
  w: number
  h: number
  rotation: number
  opacity: number
  fit: 'cover' | 'contain'
  // text / caption
  text?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  bg?: string | null
  align?: 'left' | 'center' | 'right'
  strokeColor?: string
  strokeWidth?: number
  // sticker (svg markup)
  svg?: string
  // "design" overlay: a rendered page of the design
  pageIndex?: number
  designKey?: number
  animIn: Anim
  animOut: Anim
  animDur: number
  /** transition INTO this clip from the previous clip on the same track (clips overlap by the transition length) */
  transition?: { type: TransitionType; dur: number } | null
}

export interface Track {
  id: string
  kind: TrackKind
  name: string
  clips: Clip[]
  muted: boolean
  hidden: boolean
}

export interface CaptionStyle {
  fontFamily: string
  fontSize: number
  fontWeight: number
  color: string
  bg: string
  bgOpacity: number
  strokeColor: string
  strokeWidth: number
  position: 'top' | 'middle' | 'bottom'
  uppercase: boolean
  maxWidthPct: number
}

export interface VideoProject {
  width: number
  height: number
  fps: number
  tracks: Track[]
  media: Record<string, MediaRef>
  captionStyle: CaptionStyle
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontFamily: '"Inter", sans-serif',
  fontSize: 44,
  fontWeight: 700,
  color: '#ffffff',
  bg: '#000000',
  bgOpacity: 0.55,
  strokeColor: '#000000',
  strokeWidth: 0,
  position: 'bottom',
  uppercase: false,
  maxWidthPct: 80,
}
