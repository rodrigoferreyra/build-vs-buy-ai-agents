/**
 * Builds a small ICC v2 display profile for sRGB (IEC 61966-2.1 primaries and tone curve, D50 PCS).
 * Used as the PDF/X-4 output intent and for ICCBased colour spaces; generated so no third-party profile is shipped.
 */

function s15(v: number) {
  return Math.round(v * 65536) | 0
}

export function srgbIccProfile(): Uint8Array {
  const tags: { sig: string; data: Uint8Array }[] = []
  const ascii = (s: string) => new TextEncoder().encode(s)

  const desc = (() => {
    const t = ascii('sRGB IEC61966-2.1 (Canvasly)')
    const b = new Uint8Array(12 + t.length + 1 + 8 + 3 + 67)
    const v = new DataView(b.buffer)
    b.set(ascii('desc'), 0)
    v.setUint32(8, t.length + 1)
    b.set(t, 12)
    return b
  })()
  const text = (s: string) => {
    const t = ascii(s)
    const b = new Uint8Array(8 + t.length + 1)
    b.set(ascii('text'), 0)
    b.set(t, 8)
    return b
  }
  const xyz = (x: number, y: number, z: number) => {
    const b = new Uint8Array(20)
    const v = new DataView(b.buffer)
    b.set(ascii('XYZ '), 0)
    v.setInt32(8, s15(x))
    v.setInt32(12, s15(y))
    v.setInt32(16, s15(z))
    return b
  }
  const curve = (() => {
    const n = 1024
    const b = new Uint8Array(12 + n * 2)
    const v = new DataView(b.buffer)
    b.set(ascii('curv'), 0)
    v.setUint32(8, n)
    for (let i = 0; i < n; i++) {
      const c = i / (n - 1)
      const lin = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      v.setUint16(12 + i * 2, Math.round(lin * 65535))
    }
    return b
  })()

  tags.push({ sig: 'desc', data: desc })
  tags.push({ sig: 'cprt', data: text('No copyright, use freely') })
  tags.push({ sig: 'wtpt', data: xyz(0.9642, 1.0, 0.8249) })
  tags.push({ sig: 'rXYZ', data: xyz(0.4360747, 0.2225045, 0.0139322) })
  tags.push({ sig: 'gXYZ', data: xyz(0.3850649, 0.7168786, 0.0971045) })
  tags.push({ sig: 'bXYZ', data: xyz(0.1430804, 0.0606169, 0.7141733) })
  tags.push({ sig: 'rTRC', data: curve })
  tags.push({ sig: 'gTRC', data: curve })
  tags.push({ sig: 'bTRC', data: curve })

  const pad4 = (n: number) => (n + 3) & ~3
  const tableSize = 4 + tags.length * 12
  let offset = 128 + tableSize
  // tone curves share one data block
  const placed = new Map<Uint8Array, number>()
  const entries: { sig: string; off: number; size: number }[] = []
  const blocks: { off: number; data: Uint8Array }[] = []
  for (const t of tags) {
    let off = placed.get(t.data)
    if (off === undefined) {
      off = offset
      placed.set(t.data, off)
      blocks.push({ off, data: t.data })
      offset = pad4(offset + t.data.length)
    }
    entries.push({ sig: t.sig, off, size: t.data.length })
  }
  const total = offset
  const out = new Uint8Array(total)
  const v = new DataView(out.buffer)
  v.setUint32(0, total)
  out.set(ascii('none'), 4)
  v.setUint32(8, 0x02100000)
  out.set(ascii('mntr'), 12)
  out.set(ascii('RGB '), 16)
  out.set(ascii('XYZ '), 20)
  const d = new Date()
  ;[d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].forEach((n, i) => v.setUint16(24 + i * 2, n))
  out.set(ascii('acsp'), 36)
  v.setUint32(64, 0) // perceptual
  v.setInt32(68, s15(0.9642))
  v.setInt32(72, s15(1.0))
  v.setInt32(76, s15(0.8249))
  v.setUint32(128, tags.length)
  entries.forEach((e, i) => {
    out.set(ascii(e.sig), 132 + i * 12)
    v.setUint32(136 + i * 12, e.off)
    v.setUint32(140 + i * 12, e.size)
  })
  for (const b of blocks) out.set(b.data, b.off)
  return out
}
