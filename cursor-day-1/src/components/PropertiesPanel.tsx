import type {
  CustomFont,
  DesignElement,
  TextElement,
  ShapeElement,
  ImageElement,
  PathElement,
  BlendMode,
  EditorRole,
  BrandKit,
  Page,
  DocumentModel,
  ColorMode,
  CmykColor,
  EditorState,
} from '../types/document'
import { applyCropAspect } from '../utils/crop'
import { isShape } from '../types/document'
import type { FilterPreset } from '../utils/imageFilters'
import { cmykToRgb } from '../utils/colorModel'
import { removeBackgroundDataUrl } from '../utils/backgroundRemoval'
import { vectorizeImage } from '../utils/vectorize'
import { AIGeneratePanel } from './AIGeneratePanel'

const FONT_FAMILIES = [
  'Inter, sans-serif',
  'Playfair Display, serif',
  'Georgia, serif',
  'Arial, sans-serif',
  'Courier New, monospace',
]

const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
]

const FILTER_PRESETS: FilterPreset[] = ['none', 'grayscale', 'sepia', 'vintage', 'cool', 'warm']

interface Props {
  selection: DesignElement[]
  customFonts: CustomFont[]
  document: DocumentModel
  page: Page
  editorRole: EditorRole
  onUpdate: (id: string, patch: Partial<DesignElement>) => void
  onUploadFont: (file: File) => void
  onUpdatePage: (patch: Partial<Page>) => void
  onUpdateDocument: (patch: Partial<DocumentModel>) => void
  onFillPlaceholder: (id: string, file: File) => void
  onApplyState?: (mutate: (state: EditorState) => void) => void
}

export function PropertiesPanel({
  selection,
  customFonts,
  document,
  page,
  editorRole,
  onUpdate,
  onUploadFont,
  onUpdatePage,
  onUpdateDocument,
  onFillPlaceholder,
  onApplyState,
}: Props) {
  const brand = document.brandKit ?? { colors: [], restrictPalette: false }
  const isCreator = editorRole === 'creator'

  if (selection.length === 0) {
    return (
      <aside className="panel props-panel">
        <h2>Document</h2>
        <label>
          Role
          <select
            value={editorRole}
            onChange={(e) => onUpdateDocument({ editorRole: e.target.value as EditorRole })}
          >
            <option value="creator">Creator</option>
            <option value="adopter">Adopter</option>
          </select>
        </label>
        <p className="muted">{isCreator ? 'Full template editing' : 'Locked layers stay fixed'}</p>
        <label>
          Bleed (mm)
          <input
            type="number"
            min={0}
            step={0.5}
            value={page.bleedMm ?? 0}
            disabled={!isCreator}
            onChange={(e) => onUpdatePage({ bleedMm: parseFloat(e.target.value) || 0 })}
          />
        </label>
        <label>
          Margin (mm)
          <input
            type="number"
            min={0}
            step={0.5}
            value={page.marginMm ?? 0}
            disabled={!isCreator}
            onChange={(e) => onUpdatePage({ marginMm: parseFloat(e.target.value) || 0 })}
          />
        </label>
        <h3 style={{ marginTop: 16 }}>Brand kit</h3>
        <label>
          <input
            type="checkbox"
            checked={brand.restrictPalette}
            disabled={!isCreator}
            onChange={(e) =>
              onUpdateDocument({
                brandKit: { ...brand, restrictPalette: e.target.checked },
              })
            }
          />
          Restrict palette to brand colors
        </label>
        <div className="brand-swatches">
          {brand.colors.map((c, i) => (
            <input
              key={i}
              type="color"
              value={c}
              disabled={!isCreator}
              onChange={(e) => {
                const colors = [...brand.colors]
                colors[i] = e.target.value
                onUpdateDocument({ brandKit: { ...brand, colors } })
              }}
            />
          ))}
        </div>
        <h3 style={{ marginTop: 16 }}>Template variables</h3>
        <VariableEditor
          vars={document.templateVariables ?? {}}
          onChange={(templateVariables) => onUpdateDocument({ templateVariables })}
        />
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
        <h3 style={{ marginTop: 16 }}>White-label</h3>
        <label>
          App title
          <input
            value={document.branding?.appTitle ?? ''}
            onChange={(e) =>
              onUpdateDocument({
                branding: { ...(document.branding ?? {}), appTitle: e.target.value, showVendorBadge: false },
              })
            }
          />
        </label>
        <label>
          Logo URL
          <input
            value={document.branding?.logoUrl ?? ''}
            onChange={(e) =>
              onUpdateDocument({ branding: { ...(document.branding ?? {}), logoUrl: e.target.value } })
            }
          />
        </label>
        <label>
          Primary color
          <input
            type="color"
            value={document.branding?.primaryColor ?? '#2563eb'}
            onChange={(e) =>
              onUpdateDocument({ branding: { ...(document.branding ?? {}), primaryColor: e.target.value } })
            }
          />
        </label>
        <label>
          Hide panels (comma-separated)
          <input
            value={(document.branding?.hiddenPanels ?? []).join(',')}
            onChange={(e) =>
              onUpdateDocument({
                branding: {
                  ...(document.branding ?? {}),
                  hiddenPanels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                },
              })
            }
            placeholder="layers, props"
          />
        </label>
        <h3 style={{ marginTop: 16 }}>Asset source</h3>
        <label>
          Source
          <select
            value={document.assetSource?.kind ?? 'builtin'}
            onChange={(e) =>
              onUpdateDocument({
                assetSource: {
                  kind: e.target.value as 'builtin' | 'urlPrefix',
                  baseUrl: document.assetSource?.baseUrl,
                },
              })
            }
          >
            <option value="builtin">Built-in library</option>
            <option value="urlPrefix">Custom URL prefix (S3/CDN manifest.json)</option>
          </select>
        </label>
        {document.assetSource?.kind === 'urlPrefix' && (
          <label>
            Base URL
            <input
              value={document.assetSource.baseUrl ?? ''}
              onChange={(e) =>
                onUpdateDocument({
                  assetSource: { kind: 'urlPrefix', baseUrl: e.target.value, label: 'Custom' },
                })
              }
              placeholder="https://bucket.example/assets"
            />
          </label>
        )}
        <h3 style={{ marginTop: 16 }}>User-owned storage</h3>
        <label>
          Remote save URL (optional)
          <input
            value={document.userStorage?.remoteUrl ?? ''}
            onChange={(e) =>
              onUpdateDocument({
                userStorage: { ...(document.userStorage ?? {}), remoteUrl: e.target.value },
              })
            }
          />
        </label>
        {onApplyState && <AIGeneratePanel document={document} onApply={onApplyState} />}
      </aside>
    )
  }

  const el = selection[0]
  const multi = selection.length > 1
  const adopterLocked = editorRole === 'adopter' && !!el.templateLock

  return (
    <aside className="panel props-panel">
      <h2>Properties</h2>
      {multi && <p className="muted">{selection.length} selected</p>}
      {adopterLocked && <p className="warn">Template-locked (adopter)</p>}

      {!multi && !adopterLocked && (
        <>
          <label>
            Blend mode
            <select
              value={el.blendMode ?? 'normal'}
              onChange={(e) => onUpdate(el.id, { blendMode: e.target.value as BlendMode })}
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
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
          {isCreator && (
            <label>
              <input
                type="checkbox"
                checked={!!el.templateLock}
                onChange={(e) => onUpdate(el.id, { templateLock: e.target.checked })}
              />
              Lock for adopters
            </label>
          )}
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

      {el.type === 'text' && !multi && !adopterLocked && (
        <TextProps
          el={el}
          customFonts={customFonts}
          brand={brand}
          onUpdate={onUpdate}
          onUploadFont={onUploadFont}
        />
      )}
      {isShape(el) && !multi && !adopterLocked && (
        <ShapeProps el={el} brand={brand} onUpdate={onUpdate} />
      )}
      {el.type === 'image' && !multi && !adopterLocked && (
        <ImageProps el={el} onUpdate={onUpdate} onFillPlaceholder={onFillPlaceholder} />
      )}
      {el.type === 'path' && !multi && !adopterLocked && (
        <PathProps el={el} brand={brand} onUpdate={onUpdate} />
      )}
    </aside>
  )
}

function ColorModeFields({
  el,
  onUpdate,
}: {
  el: { id: string; fill: string; colorMode?: ColorMode; cmyk?: CmykColor; spotName?: string }
  onUpdate: (id: string, patch: Partial<DesignElement>) => void
}) {
  return (
    <>
      <label>
        Color mode
        <select
          value={el.colorMode ?? 'rgb'}
          onChange={(e) => {
            const colorMode = e.target.value as ColorMode
            const patch: Partial<DesignElement> = { colorMode } as Partial<DesignElement>
            if (colorMode === 'cmyk' && !el.cmyk) {
              ;(patch as { cmyk: CmykColor }).cmyk = { c: 0, m: 0, y: 0, k: 100 }
              ;(patch as { fill: string }).fill = cmykToRgb({ c: 0, m: 0, y: 0, k: 100 })
            }
            if (colorMode === 'spot') {
              ;(patch as { spotName: string }).spotName = el.spotName ?? 'PANTONE 185 C'
            }
            onUpdate(el.id, patch)
          }}
        >
          <option value="rgb">RGB</option>
          <option value="cmyk">CMYK</option>
          <option value="spot">Spot color</option>
        </select>
      </label>
      {el.colorMode === 'cmyk' && (
        <div className="cmyk-grid">
          {(['c', 'm', 'y', 'k'] as const).map((ch) => (
            <label key={ch}>
              {ch.toUpperCase()}
              <input
                type="number"
                min={0}
                max={100}
                value={el.cmyk?.[ch] ?? 0}
                onChange={(e) => {
                  const cmyk = { c: 0, m: 0, y: 0, k: 0, ...el.cmyk, [ch]: parseFloat(e.target.value) || 0 }
                  onUpdate(el.id, { cmyk, fill: cmykToRgb(cmyk) } as Partial<DesignElement>)
                }}
              />
            </label>
          ))}
        </div>
      )}
      {el.colorMode === 'spot' && (
        <label>
          Spot name
          <input
            value={el.spotName ?? ''}
            onChange={(e) => onUpdate(el.id, { spotName: e.target.value } as Partial<DesignElement>)}
          />
        </label>
      )}
    </>
  )
}

function PathProps({
  el,
  brand,
  onUpdate,
}: {
  el: PathElement
  brand: BrandKit
  onUpdate: (id: string, patch: Partial<DesignElement>) => void
}) {
  return (
    <>
      <ColorModeFields el={el} onUpdate={onUpdate} />
      <label>
        Fill
        <ColorInput value={el.fill} brand={brand} onChange={(fill) => onUpdate(el.id, { fill } as Partial<PathElement>)} />
      </label>
    </>
  )
}

function VariableEditor({
  vars,
  onChange,
}: {
  vars: Record<string, string>
  onChange: (v: Record<string, string>) => void
}) {
  const entries = Object.entries(vars)
  return (
    <div className="var-editor">
      {entries.map(([k, v]) => (
        <div key={k} className="var-row">
          <span>{`{${k}}`}</span>
          <input
            value={v}
            onChange={(e) => onChange({ ...vars, [k]: e.target.value })}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...vars, name: vars.name ?? 'Sample' })}
      >
        + Add name
      </button>
    </div>
  )
}

function ColorInput({
  value,
  onChange,
  brand,
}: {
  value: string
  onChange: (c: string) => void
  brand: BrandKit
}) {
  if (brand.restrictPalette && brand.colors.length) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {brand.colors.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    )
  }
  return <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
}

function TextProps({
  el,
  customFonts,
  brand,
  onUpdate,
  onUploadFont,
}: {
  el: TextElement
  customFonts: CustomFont[]
  brand: BrandKit
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
        Variable key
        <input
          placeholder="e.g. name for {name}"
          value={el.variableKey ?? ''}
          onChange={(e) =>
            onUpdate(el.id, { variableKey: e.target.value || undefined } as Partial<TextElement>)
          }
        />
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
        <input
          type="checkbox"
          checked={!!el.autoFit}
          onChange={(e) => onUpdate(el.id, { autoFit: e.target.checked } as Partial<TextElement>)}
        />
        Auto-fit to box
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
        Horizontal align
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
        Vertical align
        <select
          value={el.verticalAlign ?? 'top'}
          onChange={(e) =>
            onUpdate(el.id, {
              verticalAlign: e.target.value as TextElement['verticalAlign'],
            } as Partial<TextElement>)
          }
        >
          <option value="top">Top</option>
          <option value="middle">Middle</option>
          <option value="bottom">Bottom</option>
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
        Paragraph spacing (px)
        <input
          type="number"
          min={0}
          step={2}
          value={el.paragraphSpacing ?? 0}
          onChange={(e) =>
            onUpdate(el.id, { paragraphSpacing: parseFloat(e.target.value) || 0 } as Partial<TextElement>)
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
        Text on path
        <select
          value={el.textPath ?? 'none'}
          onChange={(e) =>
            onUpdate(el.id, { textPath: e.target.value as TextElement['textPath'] } as Partial<TextElement>)
          }
        >
          <option value="none">Straight</option>
          <option value="arc">Arc</option>
        </select>
      </label>
      {el.textPath === 'arc' && (
        <>
          <label>
            Arc radius
            <input
              type="number"
              min={20}
              value={el.pathRadius ?? 120}
              onChange={(e) =>
                onUpdate(el.id, { pathRadius: parseFloat(e.target.value) || 120 } as Partial<TextElement>)
              }
            />
          </label>
          <label>
            Arc sweep (°)
            <input
              type="number"
              min={30}
              max={360}
              value={el.pathSweep ?? 180}
              onChange={(e) =>
                onUpdate(el.id, { pathSweep: parseFloat(e.target.value) || 180 } as Partial<TextElement>)
              }
            />
          </label>
        </>
      )}
      <ColorModeFields el={el} onUpdate={onUpdate} />
      <label>
        Color
        <ColorInput
          value={el.fill}
          brand={brand}
          onChange={(fill) => onUpdate(el.id, { fill } as Partial<TextElement>)}
        />
      </label>
      <label>
        Text background
        <input
          type="color"
          value={el.textBackground ?? '#ffffff'}
          onChange={(e) =>
            onUpdate(el.id, { textBackground: e.target.value } as Partial<TextElement>)
          }
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
  brand,
  onUpdate,
}: {
  el: ShapeElement
  brand: BrandKit
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
      <ColorModeFields el={el} onUpdate={onUpdate} />
      <label>
        {el.fillKind === 'gradient' ? 'Gradient start' : 'Fill'}
        <ColorInput
          value={el.fill}
          brand={brand}
          onChange={(fill) => onUpdate(el.id, { fill } as Partial<ShapeElement>)}
        />
      </label>
      {el.fillKind === 'gradient' && (
        <>
          <label>
            Gradient end
            <ColorInput
              value={el.gradientTo}
              brand={brand}
              onChange={(gradientTo) => onUpdate(el.id, { gradientTo } as Partial<ShapeElement>)}
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
        <ColorInput
          value={el.stroke}
          brand={brand}
          onChange={(stroke) => onUpdate(el.id, { stroke } as Partial<ShapeElement>)}
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
  onFillPlaceholder,
}: {
  el: ImageElement
  onUpdate: (id: string, patch: Partial<DesignElement>) => void
  onFillPlaceholder: (id: string, file: File) => void
}) {
  const setCrop = (patch: Partial<ImageElement>) => onUpdate(el.id, patch as Partial<DesignElement>)

  const applyRatio = (aspect: number) => {
    const next = applyCropAspect(el.cropX, el.cropY, el.cropW, el.cropH, aspect)
    setCrop(next)
  }

  return (
    <>
      {el.isPlaceholder && (
        <label className="file-btn">
          Fill placeholder
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFillPlaceholder(el.id, f)
              e.target.value = ''
            }}
          />
        </label>
      )}
      {el.vectorPaths?.length && (
        <>
          <p className="muted">SVG paths (recolor)</p>
          {el.vectorPaths.map((p, i) => (
            <label key={p.id}>
              Path {i + 1}
              <input
                type="color"
                value={p.fill}
                onChange={(e) => {
                  const vectorPaths = el.vectorPaths!.map((vp, j) =>
                    j === i ? { ...vp, fill: e.target.value } : vp,
                  )
                  onUpdate(el.id, { vectorPaths } as Partial<ImageElement>)
                }}
              />
            </label>
          ))}
        </>
      )}
      {el.src && !el.vectorPaths?.length && (
        <>
          <button
            type="button"
            onClick={() => {
              void removeBackgroundDataUrl(el.src).then((src) => onUpdate(el.id, { src } as Partial<ImageElement>))
            }}
          >
            Remove background
          </button>
          <button
            type="button"
            onClick={() => {
              void vectorizeImage(el.src).then(({ paths, viewBox }) =>
                onUpdate(el.id, { vectorPaths: paths, vectorViewBox: viewBox, src: '' } as Partial<ImageElement>),
              )
            }}
          >
            Vectorize logo
          </button>
        </>
      )}
      <label>
        Mask shape
        <select
          value={el.maskShape ?? 'none'}
          onChange={(e) =>
            onUpdate(el.id, { maskShape: e.target.value as ImageElement['maskShape'] } as Partial<ImageElement>)
          }
        >
          <option value="none">None</option>
          <option value="circle">Circle</option>
          <option value="ellipse">Ellipse</option>
          <option value="rect">Rectangle</option>
        </select>
      </label>
      <label>
        Filter preset
        <select
          value={el.filterPreset ?? 'none'}
          onChange={(e) =>
            onUpdate(el.id, { filterPreset: e.target.value as FilterPreset } as Partial<ImageElement>)
          }
        >
          {FILTER_PRESETS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label>
        Brightness
        <input
          type="range"
          min={0.2}
          max={2}
          step={0.05}
          value={el.brightness ?? 1}
          onChange={(e) => setCrop({ brightness: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Contrast
        <input
          type="range"
          min={0.2}
          max={2}
          step={0.05}
          value={el.contrast ?? 1}
          onChange={(e) => setCrop({ contrast: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Saturation
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={el.saturation ?? 1}
          onChange={(e) => setCrop({ saturation: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Exposure
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={el.exposure ?? 0}
          onChange={(e) => setCrop({ exposure: parseFloat(e.target.value) })}
        />
      </label>
      <label>
        Temperature
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={el.temperature ?? 0}
          onChange={(e) => setCrop({ temperature: parseFloat(e.target.value) })}
        />
      </label>
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
