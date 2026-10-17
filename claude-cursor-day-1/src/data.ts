import type { DataSource } from './types'

/** RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF, auto-detect , ; or tab). */
export function parseCsv(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const src = text.replace(/^\uFEFF/, '')
  const first = src.split(/\r?\n/)[0] || ''
  const delim = [',', ';', '\t'].map((d) => ({ d, n: first.split(d).length })).sort((a, b) => b.n - a.n)[0].d
  const table: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else q = false
      } else cell += c
    } else if (c === '"') q = true
    else if (c === delim) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((x) => x !== '')) table.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x !== '')) table.push(row)
  if (table.length < 2) throw new Error('Need a header row and at least one data row')
  const columns = table[0].map((h, i) => h.trim().replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || `col${i + 1}`)
  const rows = table.slice(1).map((r) => Object.fromEntries(columns.map((c, i) => [c, (r[i] ?? '').trim()])))
  return { columns, rows }
}

export function parseData(text: string, filename = ''): DataSource {
  const t = text.trim()
  if (filename.endsWith('.json') || t.startsWith('[') || t.startsWith('{')) {
    const j = JSON.parse(t)
    const arr: Record<string, unknown>[] = Array.isArray(j) ? j : Array.isArray(j.rows) ? j.rows : [j]
    if (!arr.length) throw new Error('JSON has no rows')
    const columns = [...new Set(arr.flatMap((o) => Object.keys(o)))]
    return { columns, rows: arr.map((o) => Object.fromEntries(columns.map((c) => [c, String(o[c] ?? '')]))), index: 0 }
  }
  const { columns, rows } = parseCsv(t)
  return { columns, rows, index: 0 }
}
