import { newId } from './document'

export type VideoTrackKind = 'video' | 'audio' | 'overlay'

export interface VideoClip {
  id: string
  name: string
  src: string
  trackId: string
  startTime: number
  duration: number
  trimIn: number
  trimOut: number
  transition?: 'none' | 'crossfade'
  transitionDuration?: number
}

export interface VideoTrack {
  id: string
  kind: VideoTrackKind
  label: string
}

export interface CaptionCue {
  id: string
  start: number
  end: number
  text: string
  style?: { color?: string; fontSize?: number }
}

export interface VideoProject {
  id: string
  name: string
  width: number
  height: number
  fps: number
  duration: number
  tracks: VideoTrack[]
  clips: VideoClip[]
  captions: CaptionCue[]
}

export function createDefaultVideoProject(): VideoProject {
  const v1 = newId()
  const v2 = newId()
  const a1 = newId()
  return {
    id: newId(),
    name: 'Untitled video',
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 12,
    tracks: [
      { id: v1, kind: 'video', label: 'Video 1' },
      { id: v2, kind: 'video', label: 'Video 2' },
      { id: a1, kind: 'audio', label: 'Music' },
      { id: newId(), kind: 'overlay', label: 'Overlays' },
    ],
    clips: [],
    captions: [],
  }
}
