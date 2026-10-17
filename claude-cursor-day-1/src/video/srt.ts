export interface Cue {
  start: number
  end: number
  text: string
}

function parseTs(s: string): number {
  const m = /(?:(\d+):)?(\d+):(\d+)[,.](\d{1,3})/.exec(s.trim())
  if (!m) return NaN
  return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, '0')) / 1000
}

/** SubRip (.srt) and WebVTT (.vtt) parser */
export function parseSrt(text: string): Cue[] {
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/^WEBVTT[^\n]*\n/, '')
  const cues: Cue[] = []
  for (const block of src.split(/\n{2,}/)) {
    const lines = block.split('\n').map((l) => l.trimEnd())
    const ti = lines.findIndex((l) => l.includes('-->'))
    if (ti < 0) continue
    const [a, b] = lines[ti].split('-->')
    const start = parseTs(a)
    const end = parseTs(b.trim().split(/\s+/)[0])
    if (!isFinite(start) || !isFinite(end) || end <= start) continue
    const body = lines
      .slice(ti + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\{\\[^}]*\}/g, '')
      .trim()
    if (body) cues.push({ start, end, text: body })
  }
  if (!cues.length) throw new Error('No subtitle cues found – is this an .srt or .vtt file?')
  return cues
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')
function fmt(t: number) {
  const ms = Math.round(t * 1000)
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`
}

export function stringifySrt(cues: Cue[]): string {
  return cues.map((c, i) => `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n`).join('\n')
}

export const SAMPLE_SRT = `1
00:00:00,300 --> 00:00:02,200
Welcome to the Canvasly video studio

2
00:00:02,400 --> 00:00:04,600
Trim, split and layer clips on the timeline

3
00:00:04,800 --> 00:00:07,000
Captions come straight from an SRT file
`
