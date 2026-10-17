export interface SvgPathPart {
  id: string
  d: string
  fill: string
}

export function parseSvgPaths(svgText: string): { viewBox: string; paths: SvgPathPart[] } | null {
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg) return null
    const viewBox = svg.getAttribute('viewBox') ?? `0 0 ${svg.getAttribute('width') ?? 100} ${svg.getAttribute('height') ?? 100}`
    const paths: SvgPathPart[] = []
    svg.querySelectorAll('path').forEach((p, i) => {
      const d = p.getAttribute('d')
      if (!d) return
      paths.push({
        id: p.getAttribute('id') ?? `path-${i}`,
        d,
        fill: p.getAttribute('fill') ?? '#111827',
      })
    })
    if (paths.length === 0) return null
    return { viewBox, paths }
  } catch {
    return null
  }
}
