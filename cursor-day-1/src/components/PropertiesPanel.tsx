import type { CustomFont, DesignElement, TextElement, ShapeElement, ImageElement } from '../types/document'
import { applyCropAspect } from '../utils/crop'
import { isShape } from '../types/document'

const FONT_FAMILIES = [
  'Inter, sans-serif',
  'Playfair Display, serif',
  'Georgia, serif',
  'Arial, sans-serif',
  'Courier New, monospace',
]

interface Props {
  selection: DesignElement[]
  customFonts: CustomFont[]
  onUpdate: (id: string, patch: Partial<DesignElement>) => void
  onUploadFont: (file: File) => void
}

export function PropertiesPanel({ selection, customFonts, onUpdate, onUploadFont }: Props) {
  if (selection.length === 0) {
    return (
      <aside className="panel props-panel">
        <h2>Properties</h2>
        <p className="muted">Select an element to edit properties.</p>
        <label className="file-btn" style={{ marginTop: 12 }}>
          Upload font
          <input
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUploadFont(f)
              e.target.value = ''
            }}
          />
        </label>
      </aside>
    )
  }

  const el = selection[0]
  const multi = selection.length > 1

  return (
    <aside className="panel props-panel">
      <h2>Properties</h2>
      {multi && <p className="muted">{selection.length} selected</p>}

      {!multi && (
        <>
          <label>
            Opacity
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={el.opacity}
              onChange={(e) => onUpdate(el.id, { opacity: parseFloat(e.target.value) })}
            />
          </label>
          <label>
            Rotation (°)
            <input
              type="number"
              value={Math.round(el.rotation)}
              onChange={(e) => onUpdate(el.id, { rotation: parseFloat(e.target.value) || 0 })}
            />
          </label>
        </>
      )}

      {el.type === 'text' && !multi && <TextProps el={el} customFonts={customFonts} onUpdate={onUpdate} onUploadFont={onUploadFont} />}
      {isShape(el) && !multi && <ShapeProps el={el} onUpdate={onUpdate} />}
      {el.type === 'image' && !multi && <ImageProps el={el} onUpdate={onUpdate} />}
    </aside>
  )
}

function TextProps({
  el,
  customFonts,
  onUpdate,
  onUploadFont,
}: {
  el: TextElement
  customFonts: CustomFont[]
  onUpdate: (id: string, patch: Partial<DesignElement>) => void
  onUploadFont: (file: File) => void
}) {
  const families = [...FONT_FAMILIES, ...customFonts.map((f) => f.family)]

  return (
    <>
      <label className="file-btn">
        Upload font (TTF/OTF/WOFF)
        <input
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUploadFont(f)
            e.target.value = ''
          }}
        />
      </label>
      <label>
        Font
        <select
          value={el.fontFamily}
          onChange={(e) => onUpdate(el.id, { fontFamily: e.target.value } as Partial<TextElement>)}
        >
          {families.map((f) => (
            <option key={f} value={f}>
              {f.split(',')[0]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Text direction
        <select
          value={el.direction ?? 'ltr'}
          onChange={(e) =>
            onUpdate(el.id, { direction: e.target.value as 'ltr' | 'rtl' } as Partial<TextElement>)
          }
        >
          <option value="ltr">LTR</option>
          <option value="rtl">RTL (Arabic, etc.)</option>
        </select>
      </label>
      <label>
        Size (px)
        <input
          type="number"
          min={8}
          value={el.fontSize}
          onChange={(e) =>
            onUpdate(el.id, { fontSize: parseFloat(e.target.value) || 16 } as Partial<TextElement>)
          }
        />
      </label>
      <label>
        Weight
        <select
          value={el.fontWeight}
          onChange={(e) =>
            onUpdate(el.id, { fontWeight: parseInt(e.target.value, 10) } as Partial<TextElement>)
          }
        >
          <option value={400}>Regular</option>
          <option value={600}>Semi-bold</option>
          <option value={700}>Bold</option>
        </select>
      </label>
      <label>
        Style
        <select
          value={el.fontStyle}
          onChange={(e) =>
            onUpdate(el.id, { fontStyle: e.target.value as 'normal' | 'italic' } as Partial<TextElement>)
          }
        >
          <option value="normal">Normal</option>
          <option value="italic">Italic</option>
        </select>
      </label>
      <label>
        Align
        <select
          value={el.textAlign}
          onChange={(e) =>
            onUpdate(el.id, { textAlign: e.target.value as TextElement['textAlign'] } as Partial<TextElement>)
          }
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
      <label>
        Line height
        <input
          type="number"
          min={0.8}
          step={0.1}
          value={el.lineHeight}
          onChange={(e) =>
            onUpdate(el.id, { lineHeight: parseFloat(e.target.value) || 1.2 } as Partial<TextElement>)
          }
        />
      </label>
      <label>
        Letter spacing (px)
        <input
          type="number"
          step={0.5}
          value={el.letterSpacing}
          onChange={(e) =>
            onUpdate(el.id, { letterSpacing: parseFloat(e.target.value) || 0 } as Partial<TextElement>)
          }
        />
      </label>
      <label>
        Color
        <input
          type="color"
          value={el.fill}
          onChange={(e) => onUpdate(el.id, { fill: e.target.value } as Partial<TextElement>)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={!!el.textShadow}
          onChange={(e) =>
            onUpdate(el.id, {
              textShadow: e.target.checked ? '2px 2px 4px rgba(0,0,0,0.35)' : undefined,
            } as Partial<TextElement>)
          }
        />
        Drop shadow
      </label>
      <label>
        <input
          type="checkbox"
          checked={!!el.WebkitTextStroke}
          onChange={(e) =>
            onUpdate(el.id, {
              WebkitTextStroke: e.target.checked ? '1px #111827' : undefined,
            } as Partial<TextElement>)
          }
        />
        Outline stroke
      </label>
    </>
  )
}

function ShapeProps({
  el,
  onUpdate,
}: {
  el: ShapeElement
  onUpdate: (id: string, patch: Partial<DesignElement>) => void
}) {
  return (
    <>
      <label>
        Fill type
        <select
          value={el.fillKind}
          onChange={(e) =>
            onUpdate(el.id, { fillKind: e.target.value as ShapeElement['fillKind'] } as Partial<ShapeElement>)
          }
        >
          <option value="solid">Solid</option>
          <option value="gradient">Linear gradient</option>
        </select>
      </label>
      <label>
        {el.fillKind === 'gradient' ? 'Gradient start' : 'Fill'}
        <input
          type="color"
          value={el.fill}
          onChange={(e) => onUpdate(el.id, { fill: e.target.value } as Partial<ShapeElement>)}
        />
      </label>
      {el.fillKind === 'gradient' && (
        <>
          <label>
            Gradient end
            <input
              type="color"
              value={el.gradientTo}
              onChange={(e) => onUpdate(el.id, { gradientTo: e.target.value } as Partial<ShapeElement>)}
            />
          </label>
          <label>
            Gradient angle (°)
            <input
              type="number"
              value={el.gradientAngle}
              onChange={(e) =>
                onUpdate(el.id, { gradientAngle: parseFloat(e.target.value) || 0 } as Partial<ShapeElement>)
              }
            />
          </label>
        </>
      )}
      <label>
        Stroke
        <input
          type="color"
          value={el.stroke}
          onChange={(e) => onUpdate(el.id, { stroke: e.target.value } as Partial<ShapeElement>)}
        />
      </label>
      <label>
        Stroke width
        <input
          type="number"
          min={0}
          value={el.strokeWidth}
          onChange={(e) =>
            onUpdate(el.id, { strokeWidth: parseFloat(e.target.value) || 0 } as Partial<ShapeElement>)
          }
        />
      </label>
      {el.type === 'rect' && (
        <label>
          Corner radius
          <input
            type="number"
            min={0}
            value={el.cornerRadius}
            onChange={(e) =>
              onUpdate(el.id, { cornerRadius: parseFloat(e.target.value) || 0 } as Partial<ShapeElement>)
            }
          />
        </label>
      )}
      {el.type === 'star' && (
        <label>
          Star points
          <input
            type="number"
            min={3}
            max={12}
            value={el.starPoints}
            onChange={(e) =>
              onUpdate(el.id, { starPoints: parseInt(e.target.value, 10) || 5 } as Partial<ShapeElement>)
            }
          />
        </label>
      )}
      {el.type === 'polygon' && (
        <label>
          Sides
          <input
            type="number"
            min={3}
            max={12}
            value={el.polygonSides}
            onChange={(e) =>
              onUpdate(el.id, { polygonSides: parseInt(e.target.value, 10) || 6 } as Partial<ShapeElement>)
            }
          />
        </label>
      )}
    </>
  )
}

function ImageProps({
  el,
  onUpdate,
}: {
  el: ImageElement
  onUpdate: (id: string, patch: Partial<DesignElement>) => void
}) {
  const setCrop = (patch: Partial<ImageElement>) => onUpdate(el.id, patch as Partial<DesignElement>)

  const applyRatio = (aspect: number) => {
    const next = applyCropAspect(el.cropX, el.cropY, el.cropW, el.cropH, aspect)
    setCrop(next)
  }

  return (
    <>
      <p className="muted" style={{ margin: '8px 0' }}>
        Crop (normalized)
      </p>
      <label>
        Crop X
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={el.cropX}
          onChange={(e) => setCrop({ cropX: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Crop Y
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={el.cropY}
          onChange={(e) => setCrop({ cropY: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Crop width
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={el.cropW}
          onChange={(e) => setCrop({ cropW: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Crop height
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={el.cropH}
          onChange={(e) => setCrop({ cropH: parseFloat(e.target.value) })}
        />
      </label>
      <div className="crop-presets">
        <button type="button" onClick={() => applyRatio(4 / 5)}>
          4:5
        </button>
        <button type="button" onClick={() => applyRatio(1)}>
          1:1
        </button>
        <button type="button" onClick={() => applyRatio(16 / 9)}>
          16:9
        </button>
        <button type="button" onClick={() => setCrop({ cropX: 0, cropY: 0, cropW: 1, cropH: 1 })}>
          Reset
        </button>
      </div>
      <label>
        <input
          type="checkbox"
          checked={el.flipX}
          onChange={(e) => onUpdate(el.id, { flipX: e.target.checked } as Partial<ImageElement>)}
        />
        Flip horizontal
      </label>
      <label>
        <input
          type="checkbox"
          checked={el.flipY}
          onChange={(e) => onUpdate(el.id, { flipY: e.target.checked } as Partial<ImageElement>)}
        />
        Flip vertical
      </label>
    </>
  )
}
