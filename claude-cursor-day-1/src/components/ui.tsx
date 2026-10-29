import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useStore } from '../store'

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section">
      <div className="section-title">
        <span>{title}</span>
        {right}
      </div>
      <div className="section-body">{children}</div>
    </div>
  )
}

export function Row({ children, label }: { children: ReactNode; label?: string }) {
  const id = useId()
  const body = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!label) return
    body.current?.querySelectorAll('input, select, textarea').forEach((c) => {
      if (!c.getAttribute('aria-label') && !c.getAttribute('aria-labelledby')) c.setAttribute('aria-labelledby', id)
    })
  })
  return (
    <div className="row">
      {label && (
        <label className="row-label" id={id}>
          {label}
        </label>
      )}
      <div className="row-body" ref={body}>
        {children}
      </div>
    </div>
  )
}

export function Num({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  suffix,
}: {
  label?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  suffix?: string
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const commit = (t: string) => {
    let v = parseFloat(t)
    if (Number.isNaN(v)) {
      setText(String(value))
      return
    }
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    onChange(v)
  }
  return (
    <label className="num">
      {label && <span>{label}</span>}
      <input
        type="number"
        value={text}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value)
          const v = parseFloat(e.target.value)
          if (!Number.isNaN(v) && (min === undefined || v >= min) && (max === undefined || v <= max)) onChange(v)
        }}
        onBlur={(e) => commit(e.target.value)}
      />
      {suffix && <em>{suffix}</em>}
    </label>
  )
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="slider">
      <div className="slider-head">
        <span>{label}</span>
        <span>
          {Math.round(value * 100) / 100}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={`${Math.round(value * 100) / 100}${suffix}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

export function ColorField({
  value,
  onChange,
  label,
  allowNone,
}: {
  value: string | null
  onChange: (c: string | null) => void
  label?: string
  allowNone?: boolean
}) {
  const brand = useStore((s) => s.doc.brand)
  const v = value ?? '#ffffff'
  const norm = /^#[0-9a-f]{6}$/i.test(v) ? v : v.length === 9 ? v.slice(0, 7) : '#000000'
  return (
    <div className="colorfield">
      {label && <span className="cf-label">{label}</span>}
      {brand.restrict ? (
        <div className="swatches" title="Palette restricted to brand colors">
          {brand.colors.map((c) => (
            <button
              key={c}
              className={'swatch' + (c.toLowerCase() === v.toLowerCase() ? ' on' : '')}
              style={{ background: c }}
              onClick={() => onChange(c)}
              title={c}
            />
          ))}
          {allowNone && (
            <button className={'swatch none' + (value === null ? ' on' : '')} onClick={() => onChange(null)} title="None">
              ∅
            </button>
          )}
        </div>
      ) : (
        <div className="cf-inputs">
          <input type="color" aria-label={`${label ?? 'Colour'} picker`} value={norm} onChange={(e) => onChange(e.target.value)} />
          <input
            type="text"
            aria-label={`${label ?? 'Colour'} hex value`}
            className="hex"
            value={value ?? ''}
            placeholder="none"
            onChange={(e) => {
              const t = e.target.value
              if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(t)) onChange(t)
            }}
          />
          {allowNone && (
            <button className="mini" onClick={() => onChange(null)} title="Remove">
              ✕
            </button>
          )}
          <div className="swatches small">
            {brand.colors.map((c) => (
              <button key={c} className="swatch" style={{ background: c }} onClick={() => onChange(c)} title={'Brand ' + c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Toggle({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button className={'tog' + (on ? ' on' : '')} onClick={onClick} title={title}>
      {children}
    </button>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className={'modal' + (wide ? ' wide' : '')} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="mini" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
