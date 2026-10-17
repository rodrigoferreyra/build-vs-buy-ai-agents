import { newId } from '../types/document'
import type { CaptionCue } from '../types/video'

export function parseSrt(text: string): CaptionCue[] {
  const blocks = text.trim().split(/\n\s*\n/)
  const cues: CaptionCue[] = []
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim())
    if (lines.length < 2) continue
    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) continue
    const [a, b] = timeLine.split('-->').map((s) => s.trim())
    const start = parseSrtTime(a)
    const end = parseSrtTime(b)
    const textLines = lines.slice(lines.indexOf(timeLine) + 1)
    cues.push({
      id: newId(),
      start,
      end,
      text: textLines.join('\n'),
      style: { color: '#ffffff', fontSize: 28 },
    })
  }
  return cues
}

function parseSrtTime(raw: string): number {
  const m = raw.match(/(\d+):(\d+):(\d+)[,.](\d+)/)
  if (!m) return 0
  const h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const s = parseInt(m[3], 10)
  const ms = parseInt(m[4].padEnd(3, '0').slice(0, 3), 10)
  return h * 3600 + min * 60 + s + ms / 1000
}
