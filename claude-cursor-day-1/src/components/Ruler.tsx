import { useEffect, useRef } from 'react'
import type { Unit } from '../types'
import { unitPx } from '../geometry'

interface Props {
  axis: 'x' | 'y'
  length: number
  zoom: number
  pan: number
  unit: Unit
  onStartGuide: (axis: 'x' | 'y', e: React.PointerEvent) => void
}

export const RULER = 22

const STEPS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]

export function Ruler({ axis, length, zoom, pan, unit, onStartGuide }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c || !length) return
    const dpr = window.devicePixelRatio || 1
    const thick = RULER
    const w = axis === 'x' ? length : thick
    const h = axis === 'x' ? thick : length
    c.width = w * dpr
    c.height = h * dpr
    c.style.width = w + 'px'
    c.style.height = h + 'px'
    const ctx = c.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#f4f4f8'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#b9bbc9'
    ctx.fillStyle = '#6b6e85'
    ctx.font = '10px system-ui, sans-serif'
    const upx = unitPx(unit)
    const pxPerUnit = upx * zoom
    const step = STEPS.find((s) => s * pxPerUnit >= 60) ?? 10000
    const minor = step / 5
    const startUnits = Math.floor((-pan / zoom) / upx / minor) * minor
    const endUnits = (length - pan) / zoom / upx
    ctx.beginPath()
    for (let u = startUnits; u <= endUnits; u += minor) {
      const pos = pan + u * pxPerUnit
      const isMajor = Math.abs(u / step - Math.round(u / step)) < 1e-6
      const len = isMajor ? thick : thick * 0.35
      if (axis === 'x') {
        ctx.moveTo(Math.round(pos) + 0.5, thick)
        ctx.lineTo(Math.round(pos) + 0.5, thick - len)
      } else {
        ctx.moveTo(thick, Math.round(pos) + 0.5)
        ctx.lineTo(thick - len, Math.round(pos) + 0.5)
      }
    }
    ctx.stroke()
    for (let u = Math.ceil(startUnits / step) * step; u <= endUnits; u += step) {
      const pos = pan + u * pxPerUnit
      const label = String(Math.round(u * 1000) / 1000)
      if (axis === 'x') ctx.fillText(label, pos + 3, 10)
      else {
        ctx.save()
        ctx.translate(10, pos - 3)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(label, 0, 0)
        ctx.restore()
      }
    }
  }, [axis, length, zoom, pan, unit])
  return (
    <canvas
      ref={ref}
      className={'ruler ruler-' + axis}
      title={axis === 'x' ? 'Drag down to create a horizontal guide' : 'Drag right to create a vertical guide'}
      onPointerDown={(e) => onStartGuide(axis === 'x' ? 'y' : 'x', e)}
    />
  )
}
