import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  bleedPx,
  isAdopterLocked,
  newId,
  pageSizePx,
  type CustomFont,
  type DesignElement,
  type EditorState,
  type Page,
} from '../types/document'
import { SIZE_PRESETS, createDocument, createPage } from '../utils/presets'
import { cloneState, initHistory, pushHistory, redo, undo, type HistoryStack } from '../utils/history'
import {
  exportProjectJson,
  importProjectJson,
  loadFromLocalStorage,
  saveToLocalStorage,
} from '../utils/persistence'
import { exportPages, type ExportFormat } from '../utils/exportPage'
import {
  createEllipse,
  createImageFromFile,
  createImagePlaceholder,
  createLine,
  createPolygon,
  createRect,
  createStar,
  createText,
} from '../utils/elements'
import { parseSvgPaths } from '../utils/svgImport'
import { saveAsTemplate } from '../utils/templates'
import type { StockAsset } from '../utils/stockAssets'
import { TemplateLibraryModal } from './TemplateLibraryModal'
import { StockLibraryModal } from './StockLibraryModal'
import { t, type UiLocale } from '../utils/i18n'
import {
  alignElements,
  distributeHorizontally,
  distributeVertically,
  type AlignKind,
} from '../utils/align'
import { fontFamilyFromUpload, injectAllCustomFonts } from '../utils/fonts'
import { snapPoint, type SnapGuide } from '../utils/snap'
import { ElementView } from './ElementView'
import { LayerPanel } from './LayerPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { ResizeHandles, type Handle } from './ResizeHandles'

function getInitialState(): EditorState {
  const saved = loadFromLocalStorage()
  if (saved) return saved
  return {
    document: createDocument(SIZE_PRESETS[0]),
    viewport: { zoom: 0.45, panX: 80, panY: 80 },
    selectedIds: [],
  }
}

function activePage(state: EditorState): Page {
  return state.document.pages[state.document.activePageIndex]
}

export function DesignEditor() {
  const [history, setHistory] = useState<HistoryStack>(() => initHistory(getInitialState()))
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([])
  const workspaceRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    kind: 'pan' | 'move' | 'resize'
    pointerId: number
    startX: number
    startY: number
    originPan?: { panX: number; panY: number }
    elementId?: string
    startEl?: DesignElement
    handle?: Handle
    moveIds?: string[]
    startPositions?: Map<string, { x: number; y: number }>
  } | null>(null)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png')
  const [exportDpi, setExportDpi] = useState(96)
  const [exportBleed, setExportBleed] = useState(false)
  const [exportCropMarks, setExportCropMarks] = useState(false)
  const [exportScope, setExportScope] = useState<'page' | 'all' | 'selection'>('page')
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const clipboardRef = useRef<DesignElement[] | null>(null)

  const state = history.present
  const page = activePage(state)
  const pagePx = pageSizePx(page)
  const editorRole = state.document.editorRole ?? 'creator'
  const isCreator = editorRole === 'creator'
  const templateVars = state.document.templateVariables ?? {}

  const commit = useCallback((next: EditorState) => {
    setHistory((h) => pushHistory(h, cloneState(next)))
  }, [])

  const updatePresent = useCallback((mutate: (s: EditorState) => void) => {
    setHistory((h) => {
      const next = cloneState(h.present)
      mutate(next)
      return pushHistory(h, next)
    })
  }, [])

  const selectedElements = useMemo(
    () => page.elements.filter((e) => state.selectedIds.includes(e.id)),
    [page.elements, state.selectedIds],
  )

  useEffect(() => {
    injectAllCustomFonts(state.document.customFonts ?? [])
  }, [state.document.customFonts])

  const uiLocale = (state.document.uiLocale ?? 'en') as UiLocale
  const uiTheme = state.document.uiTheme ?? 'dark'

  useEffect(() => {
    document.documentElement.dataset.theme = uiTheme
  }, [uiTheme])

  const resolveSelection = (id: string, additive: boolean): string[] => {
    const el = page.elements.find((e) => e.id === id)
    if (!el) return []
    if (additive) {
      return state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id]
    }
    if (el.groupId) {
      return page.elements.filter((e) => e.groupId === el.groupId).map((e) => e.id)
    }
    return [id]
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = -e.deltaY * 0.001
      updatePresent((s) => {
        s.viewport.zoom = Math.min(4, Math.max(0.1, s.viewport.zoom + delta))
      })
    } else {
      updatePresent((s) => {
        s.viewport.panX -= e.deltaX
        s.viewport.panY -= e.deltaY
      })
    }
  }

  const fitToScreen = () => {
    const ws = workspaceRef.current
    if (!ws) return
    const pad = 48
    const zw = (ws.clientWidth - pad * 2) / pagePx.width
    const zh = (ws.clientHeight - pad * 2) / pagePx.height
    const zoom = Math.min(1, zw, zh)
    updatePresent((s) => {
      s.viewport.zoom = zoom
      s.viewport.panX = (ws.clientWidth - pagePx.width * zoom) / 2
      s.viewport.panY = (ws.clientHeight - pagePx.height * zoom) / 2
    })
  }

  useEffect(() => {
    fitToScreen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.document.activePageIndex, pagePx.width, pagePx.height])

  const addElement = (el: DesignElement) => {
    updatePresent((s) => {
      const p = activePage(s)
      p.elements.push(el)
      s.selectedIds = [el.id]
    })
  }

  const pasteElementsToActivePage = useCallback(
    (source: DesignElement[], targetPageIndex?: number) => {
      updatePresent((s) => {
        const idx = targetPageIndex ?? s.document.activePageIndex
        const p = s.document.pages[idx]
        const clones: DesignElement[] = source.map((el) => {
          const c = structuredClone(el)
          c.id = newId()
          c.x += 24
          c.y += 24
          return c
        })
        p.elements.push(...clones)
        s.document.activePageIndex = idx
        s.selectedIds = clones.map((c) => c.id)
      })
    },
    [updatePresent],
  )

  const handleImageUpload = (file: File, targetId?: string) => {
    const applyImage = (el: DesignElement) => {
      if (targetId) {
        updateElement(targetId, el as Partial<DesignElement>)
      } else {
        addElement(el)
      }
    }

    if (file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg')) {
      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        const parsed = parseSvgPaths(text)
        if (parsed) {
          const base = createImageFromFile('', 120, 120)
          applyImage({
            ...base,
            src: '',
            name: file.name.replace(/\.svg$/i, ''),
            vectorPaths: parsed.paths,
            vectorViewBox: parsed.viewBox,
            width: 160,
            height: 160,
          })
          return
        }
        const blobReader = new FileReader()
        blobReader.onload = () => {
          const src = blobReader.result as string
          const img = new Image()
          img.onload = () => applyImage(createImageFromFile(src, img.naturalWidth, img.naturalHeight))
          img.src = src
        }
        blobReader.readAsDataURL(file)
      }
      reader.readAsText(file)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const img = new Image()
      img.onload = () => {
        const created = createImageFromFile(src, img.naturalWidth, img.naturalHeight)
        if (targetId) {
          updateElement(targetId, {
            ...created,
            id: targetId,
            x: page.elements.find((e) => e.id === targetId)?.x ?? created.x,
            y: page.elements.find((e) => e.id === targetId)?.y ?? created.y,
            width: page.elements.find((e) => e.id === targetId)?.width ?? created.width,
            height: page.elements.find((e) => e.id === targetId)?.height ?? created.height,
            isPlaceholder: false,
          } as Partial<DesignElement>)
        } else {
          addElement(created)
        }
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  const updateElement = (id: string, patch: Partial<DesignElement>) => {
    const el = page.elements.find((e) => e.id === id)
    if (el && isAdopterLocked(el, editorRole)) return
    updatePresent((s) => {
      const p = activePage(s)
      const idx = p.elements.findIndex((e) => e.id === id)
      if (idx >= 0) {
        p.elements[idx] = { ...p.elements[idx], ...patch } as DesignElement
        const next = p.elements[idx]
        if (next.type === 'text' && next.variableKey) {
          s.document.templateVariables = {
            ...(s.document.templateVariables ?? {}),
            [next.variableKey]: next.content.replace(/\{|\}/g, '') || 'Sample',
          }
        }
      }
    })
  }

  const updatePage = (patch: Partial<Page>) => {
    if (!isCreator) return
    updatePresent((s) => {
      const p = activePage(s)
      Object.assign(p, patch)
    })
  }

  const updateDocument = (patch: Partial<typeof state.document>) => {
    updatePresent((s) => {
      Object.assign(s.document, patch)
    })
  }

  const addGuide = (orientation: 'h' | 'v', position: number) => {
    if (!isCreator) return
    updatePresent((s) => {
      const p = activePage(s)
      p.guides = [...(p.guides ?? []), { id: newId(), orientation, position }]
    })
  }

  const runExport = async () => {
    const opts = {
      format: exportFormat,
      dpi: exportDpi,
      includeBleed: exportBleed,
      cropMarks: exportCropMarks,
      templateVariables: templateVars,
      selectionIds: exportScope === 'selection' ? state.selectedIds : undefined,
    }
    if (exportScope === 'all') {
      await exportPages(
        state.document,
        state.document.pages.map((_, i) => i),
        opts,
      )
      return
    }
    if (exportScope === 'selection' && state.selectedIds.length) {
      await exportPages(state.document, [state.document.activePageIndex], opts)
      return
    }
    await exportPages(state.document, [state.document.activePageIndex], opts)
  }

  const insertStockAsset = (asset: StockAsset) => {
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(asset.src)}`
    const parsed = parseSvgPaths(asset.src)
    if (parsed) {
      addElement({
        ...createImageFromFile('', 64, 64),
        src: '',
        name: asset.label,
        vectorPaths: parsed.paths,
        vectorViewBox: parsed.viewBox,
        width: 96,
        height: 96,
      })
    } else {
      addElement(createImageFromFile(dataUrl, 64, 64))
    }
    setStockModalOpen(false)
  }

  const saveTemplate = () => {
    const name = window.prompt('Template name', state.document.name) ?? 'Template'
    const category = window.prompt('Category', 'Custom') ?? 'Custom'
    saveAsTemplate(state, name, category)
    updateDocument({ isTemplate: true })
    alert('Saved to template library.')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        setHistory((h) => undo(h))
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        setHistory((h) => redo(h))
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editingTextId) return
        if (state.selectedIds.length === 0) return
        const role = history.present.document.editorRole ?? 'creator'
        const p = activePage(history.present)
        const blocked = state.selectedIds.some((id) => {
          const el = p.elements.find((x) => x.id === id)
          return el && isAdopterLocked(el, role)
        })
        if (blocked) return
        e.preventDefault()
        updatePresent((s) => {
          const pg = activePage(s)
          pg.elements = pg.elements.filter((el) => !s.selectedIds.includes(el.id))
          s.selectedIds = []
        })
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !editingTextId) {
        const p = activePage(history.present)
        const els = p.elements.filter((el) => state.selectedIds.includes(el.id))
        if (els.length) clipboardRef.current = structuredClone(els)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !editingTextId && clipboardRef.current?.length) {
        e.preventDefault()
        pasteElementsToActivePage(clipboardRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingTextId, state.selectedIds, updatePresent, history.present, pasteElementsToActivePage])

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return

    if (drag.kind === 'pan' && drag.originPan) {
      updatePresent((s) => {
        s.viewport.panX = drag.originPan!.panX + (e.clientX - drag.startX)
        s.viewport.panY = drag.originPan!.panY + (e.clientY - drag.startY)
      })
      return
    }

    const dx = (e.clientX - drag.startX) / state.viewport.zoom
    const dy = (e.clientY - drag.startY) / state.viewport.zoom

    if (drag.kind === 'move' && drag.startEl && drag.moveIds && drag.startPositions) {
      const leadId = drag.elementId!
      const leadStart = drag.startPositions.get(leadId)!
      const others = page.elements
        .filter((el) => !drag.moveIds!.includes(el.id) && el.visible)
        .map((el) => ({ x: el.x, y: el.y, w: el.width, h: el.height }))
      const rawX = leadStart.x + dx
      const rawY = leadStart.y + dy
      const manual = (page.guides ?? []).map((g) => ({ orientation: g.orientation, position: g.position }))
      const snapped = snapPoint(rawX, rawY, pagePx.width, pagePx.height, others, manual)
      setSnapGuides(snapped.guides)
      const deltaX = snapped.x - leadStart.x
      const deltaY = snapped.y - leadStart.y
      updatePresent((s) => {
        const p = activePage(s)
        for (const mid of drag.moveIds!) {
          const start = drag.startPositions!.get(mid)
          if (!start) continue
          const idx = p.elements.findIndex((e) => e.id === mid)
          if (idx >= 0) {
            p.elements[idx] = {
              ...p.elements[idx],
              x: start.x + deltaX,
              y: start.y + deltaY,
            }
          }
        }
      })
    }

    if (drag.kind === 'resize' && drag.startEl && drag.handle) {
      const el = drag.startEl
      let { x, y, width, height } = el
      const min = 20
      if (drag.handle.includes('e')) width = Math.max(min, el.width + dx)
      if (drag.handle.includes('s')) height = Math.max(min, el.height + dy)
      if (drag.handle.includes('w')) {
        width = Math.max(min, el.width - dx)
        x = el.x + el.width - width
      }
      if (drag.handle.includes('n')) {
        height = Math.max(min, el.height - dy)
        y = el.y + el.height - height
      }
      updateElement(drag.elementId!, { x, y, width, height })
    }
  }

  const endDrag = () => {
    dragRef.current = null
    setSnapGuides([])
  }

  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 1 && !(e.button === 0 && e.altKey)) return
    e.preventDefault()
    dragRef.current = {
      kind: 'pan',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originPan: { ...state.viewport },
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const startMove = (id: string, e: React.PointerEvent) => {
    const el = page.elements.find((x) => x.id === id)
    if (!el || el.locked || isAdopterLocked(el, editorRole)) return
    const moveIds = state.selectedIds.includes(id) ? [...state.selectedIds] : [id]
    const startPositions = new Map<string, { x: number; y: number }>()
    for (const mid of moveIds) {
      const m = page.elements.find((x) => x.id === mid)
      if (m) startPositions.set(mid, { x: m.x, y: m.y })
    }
    dragRef.current = {
      kind: 'move',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      elementId: id,
      startEl: { ...el },
      moveIds,
      startPositions,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const startResize = (id: string, handle: Handle, e: React.PointerEvent) => {
    const el = page.elements.find((x) => x.id === id)
    if (!el) return
    dragRef.current = {
      kind: 'resize',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      elementId: id,
      startEl: { ...el },
      handle,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const newDocument = (presetIndex: number) => {
    commit({
      document: createDocument(SIZE_PRESETS[presetIndex]),
      viewport: state.viewport,
      selectedIds: [],
    })
  }

  const saveProject = () => {
    saveToLocalStorage(state)
    alert('Saved to localStorage.')
  }

  const loadProject = () => {
    const loaded = loadFromLocalStorage()
    if (loaded) commit(loaded)
  }

  const downloadJson = () => {
    const blob = new Blob([exportProjectJson(state)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'design-project.json'
    a.click()
  }

  const uploadJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = importProjectJson(reader.result as string)
      if (parsed) commit(parsed)
    }
    reader.readAsText(file)
  }

  const addPage = () => {
    updatePresent((s) => {
      const cur = activePage(s)
      const np = createPage(cur.width, cur.height, cur.unit, `Page ${s.document.pages.length + 1}`)
      s.document.pages.push(np)
      s.document.activePageIndex = s.document.pages.length - 1
      s.selectedIds = []
    })
  }

  const deletePage = () => {
    if (state.document.pages.length <= 1) return
    updatePresent((s) => {
      s.document.pages.splice(s.document.activePageIndex, 1)
      s.document.activePageIndex = Math.max(0, s.document.activePageIndex - 1)
      s.selectedIds = []
    })
  }

  const movePage = (dir: -1 | 1) => {
    updatePresent((s) => {
      const i = s.document.activePageIndex
      const j = i + dir
      if (j < 0 || j >= s.document.pages.length) return
      const pages = s.document.pages
      ;[pages[i], pages[j]] = [pages[j], pages[i]]
      s.document.activePageIndex = j
    })
  }

  const groupSelection = () => {
    if (state.selectedIds.length < 2) return
    const gid = newId()
    updatePresent((s) => {
      const p = activePage(s)
      for (const id of s.selectedIds) {
        const idx = p.elements.findIndex((e) => e.id === id)
        if (idx >= 0) p.elements[idx] = { ...p.elements[idx], groupId: gid }
      }
    })
  }

  const ungroupSelection = () => {
    if (state.selectedIds.length === 0) return
    updatePresent((s) => {
      const p = activePage(s)
      for (const id of s.selectedIds) {
        const idx = p.elements.findIndex((e) => e.id === id)
        if (idx >= 0) {
          const { groupId: _g, ...rest } = p.elements[idx]
          p.elements[idx] = rest as DesignElement
        }
      }
    })
  }

  const runAlign = (kind: AlignKind) => {
    const els = page.elements.filter((e) => state.selectedIds.includes(e.id))
    const patches = alignElements(els, kind)
    updatePresent((s) => {
      const p = activePage(s)
      for (const [id, patch] of patches) {
        const idx = p.elements.findIndex((e) => e.id === id)
        if (idx >= 0) p.elements[idx] = { ...p.elements[idx], ...patch } as DesignElement
      }
    })
  }

  const runDistributeH = () => {
    const els = page.elements.filter((e) => state.selectedIds.includes(e.id))
    const patches = distributeHorizontally(els)
    updatePresent((s) => {
      const p = activePage(s)
      for (const [id, patch] of patches) {
        const idx = p.elements.findIndex((e) => e.id === id)
        if (idx >= 0) p.elements[idx] = { ...p.elements[idx], ...patch } as DesignElement
      }
    })
  }

  const runDistributeV = () => {
    const els = page.elements.filter((e) => state.selectedIds.includes(e.id))
    const patches = distributeVertically(els)
    updatePresent((s) => {
      const p = activePage(s)
      for (const [id, patch] of patches) {
        const idx = p.elements.findIndex((e) => e.id === id)
        if (idx >= 0) p.elements[idx] = { ...p.elements[idx], ...patch } as DesignElement
      }
    })
  }

  const handleFontUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const family = fontFamilyFromUpload(file.name)
      const font: CustomFont = {
        id: newId(),
        label: file.name.replace(/\.[^.]+$/, ''),
        family,
        dataUrl,
      }
      injectAllCustomFonts([font])
      updatePresent((s) => {
        s.document.customFonts = [...(s.document.customFonts ?? []), font]
      })
    }
    reader.readAsDataURL(file)
  }

  const duplicateSelection = () => {
    if (state.selectedIds.length === 0) return
    updatePresent((s) => {
      const p = activePage(s)
      const clones: DesignElement[] = []
      for (const id of s.selectedIds) {
        const el = p.elements.find((e) => e.id === id)
        if (!el) continue
        const c = structuredClone(el)
        c.id = crypto.randomUUID()
        c.x += 20
        c.y += 20
        c.name = `${el.name} copy`
        clones.push(c)
      }
      p.elements.push(...clones)
      s.selectedIds = clones.map((c) => c.id)
    })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Design Editor · cursor-day-1</div>
        <div className="topbar-group">
          <label>
            New doc
            <select
              defaultValue={0}
              onChange={(e) => newDocument(parseInt(e.target.value, 10))}
            >
              {SIZE_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => newDocument(0)}>
            1080²
          </button>
          <button type="button" onClick={() => newDocument(2)}>
            A6 mm
          </button>
        </div>
        <div className="topbar-group">
          <button type="button" aria-label="Add text" onClick={() => addElement(createText())}>
            {t(uiLocale, 'text')}
          </button>
          <button type="button" onClick={() => addElement(createRect())}>
            Rect
          </button>
          <button type="button" onClick={() => addElement(createEllipse())}>
            Ellipse
          </button>
          <button type="button" onClick={() => addElement(createLine())}>
            Line
          </button>
          <button type="button" onClick={() => addElement(createStar())}>
            Star
          </button>
          <button type="button" onClick={() => addElement(createPolygon())}>
            Polygon
          </button>
          <label className="file-btn">
            Image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImageUpload(f)
                e.target.value = ''
              }}
            />
          </label>
          <button type="button" onClick={() => addElement(createImagePlaceholder(4 / 5))}>
            Photo slot
          </button>
          <button type="button" onClick={() => setStockModalOpen(true)}>
            Stock
          </button>
        </div>
        <div className="topbar-group">
          <button type="button" onClick={() => setHistory((h) => undo(h))} title="Undo">
            Undo
          </button>
          <button type="button" onClick={() => setHistory((h) => redo(h))} title="Redo">
            Redo
          </button>
          <button type="button" onClick={duplicateSelection}>
            Duplicate
          </button>
          {state.document.pages.length > 1 && (
            <label>
              Copy to page
              <select
                defaultValue=""
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10)
                  if (Number.isNaN(idx)) return
                  const els = page.elements.filter((el) => state.selectedIds.includes(el.id))
                  if (els.length) pasteElementsToActivePage(structuredClone(els), idx)
                  e.target.value = ''
                }}
              >
                <option value="">—</option>
                {state.document.pages.map((pg, i) =>
                  i === state.document.activePageIndex ? null : (
                    <option key={pg.id} value={i}>
                      {pg.name}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
          <button type="button" onClick={groupSelection} disabled={state.selectedIds.length < 2}>
            Group
          </button>
          <button type="button" onClick={ungroupSelection} disabled={state.selectedIds.length === 0}>
            Ungroup
          </button>
        </div>
        <div className="topbar-group">
          <button type="button" disabled={state.selectedIds.length < 2} onClick={() => runAlign('left')}>
            Align L
          </button>
          <button type="button" disabled={state.selectedIds.length < 2} onClick={() => runAlign('center-h')}>
            Align C
          </button>
          <button type="button" disabled={state.selectedIds.length < 2} onClick={() => runAlign('right')}>
            Align R
          </button>
          <button type="button" disabled={state.selectedIds.length < 3} onClick={runDistributeH}>
            Dist H
          </button>
          <button type="button" disabled={state.selectedIds.length < 3} onClick={runDistributeV}>
            Dist V
          </button>
        </div>
        <div className="topbar-group">
          <label>
            UI
            <select
              value={uiLocale}
              onChange={(e) => updateDocument({ uiLocale: e.target.value as UiLocale })}
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </label>
          <label>
            Theme
            <select
              value={uiTheme}
              onChange={(e) => updateDocument({ uiTheme: e.target.value as 'dark' | 'light' })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <button type="button" aria-label="Fit page to screen" onClick={fitToScreen}>
            {t(uiLocale, 'fit')}
          </button>
          <button
            type="button"
            onClick={() =>
              updatePresent((s) => {
                s.viewport.zoom = Math.min(4, s.viewport.zoom * 1.25)
              })
            }
          >
            Zoom +
          </button>
          <span className="zoom-label">{Math.round(state.viewport.zoom * 100)}%</span>
          <label>
            {t(uiLocale, 'export')}
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as ExportFormat)}>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <label>
            DPI
            <select value={exportDpi} onChange={(e) => setExportDpi(parseInt(e.target.value, 10))}>
              <option value={96}>96 (screen)</option>
              <option value={150}>150</option>
              <option value={300}>300 (print)</option>
            </select>
          </label>
          <label>
            Scope
            <select value={exportScope} onChange={(e) => setExportScope(e.target.value as typeof exportScope)}>
              <option value="page">Active page</option>
              <option value="all">All pages</option>
              <option value="selection">Selection</option>
            </select>
          </label>
          <label title="Include bleed area from page settings">
            <input type="checkbox" checked={exportBleed} onChange={(e) => setExportBleed(e.target.checked)} />
            Bleed
          </label>
          <label>
            <input
              type="checkbox"
              checked={exportCropMarks}
              onChange={(e) => setExportCropMarks(e.target.checked)}
            />
            Crop marks
          </label>
          <button type="button" aria-label="Download export" onClick={() => void runExport()}>
            {t(uiLocale, 'download')}
          </button>
          {isCreator && (
            <>
              <button type="button" onClick={saveTemplate}>
                {t(uiLocale, 'saveTemplate')}
              </button>
              <button type="button" onClick={() => setTemplateModalOpen(true)}>
                {t(uiLocale, 'templates')}
              </button>
            </>
          )}
          <button type="button" onClick={saveProject}>
            Save
          </button>
          <button type="button" onClick={loadProject}>
            Load
          </button>
          <button type="button" onClick={downloadJson}>
            JSON ↓
          </button>
          <label className="file-btn">
            JSON ↑
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadJson(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </header>

      <div className="page-tabs">
        {state.document.pages.map((pg, i) => (
          <button
            key={pg.id}
            type="button"
            className={i === state.document.activePageIndex ? 'tab active' : 'tab'}
            onClick={() =>
              updatePresent((s) => {
                s.document.activePageIndex = i
                s.selectedIds = []
              })
            }
          >
            {pg.name}
          </button>
        ))}
        <button type="button" onClick={addPage}>
          + Page
        </button>
        <button type="button" onClick={() => movePage(-1)} disabled={state.document.activePageIndex === 0}>
          ← Reorder
        </button>
        <button
          type="button"
          onClick={() => movePage(1)}
          disabled={state.document.activePageIndex >= state.document.pages.length - 1}
        >
          Reorder →
        </button>
        <button type="button" onClick={deletePage} disabled={state.document.pages.length <= 1}>
          Delete page
        </button>
      </div>

      <div className="main-layout">
        <LayerPanel
          elements={page.elements}
          selectedIds={state.selectedIds}
          onSelect={(id) =>
            updatePresent((s) => {
              s.selectedIds = resolveSelection(id, false)
            })
          }
          onReorder={(from, to) =>
            updatePresent((s) => {
              const p = activePage(s)
              const [item] = p.elements.splice(from, 1)
              p.elements.splice(to, 0, item)
            })
          }
          onToggleVisible={(id) => {
            const el = page.elements.find((e) => e.id === id)
            if (el) updateElement(id, { visible: !el.visible })
          }}
          onToggleLocked={(id) => {
            const el = page.elements.find((e) => e.id === id)
            if (el) updateElement(id, { locked: !el.locked })
          }}
        />

        <div
          ref={workspaceRef}
          className="workspace workspace-with-rulers"
          onWheel={handleWheel}
          onPointerDown={startPan}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={() =>
            updatePresent((s) => {
              s.selectedIds = []
            })
          }
        >
          <Ruler
            orientation="h"
            length={pagePx.width}
            zoom={state.viewport.zoom}
            onAddGuide={(pos) => addGuide('v', pos)}
          />
          <Ruler
            orientation="v"
            length={pagePx.height}
            zoom={state.viewport.zoom}
            onAddGuide={(pos) => addGuide('h', pos)}
          />
          <div
            className="page-stage"
            style={{
              transform: `translate(${state.viewport.panX}px, ${state.viewport.panY}px) scale(${state.viewport.zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <div
              className="page-canvas"
              style={{
                width: pagePx.width,
                height: pagePx.height,
                background: page.background,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {(page.bleedMm ?? 0) > 0 && (
                <div
                  className="bleed-overlay"
                  style={{
                    left: -bleedPx(page),
                    top: -bleedPx(page),
                    width: pagePx.width + bleedPx(page) * 2,
                    height: pagePx.height + bleedPx(page) * 2,
                  }}
                />
              )}
              {(page.marginMm ?? 0) > 0 && (
                <div
                  className="margin-overlay"
                  style={{
                    inset: (page.marginMm ?? 0) * (96 / 25.4),
                  }}
                />
              )}
              {(page.guides ?? []).map((g) =>
                g.orientation === 'v' ? (
                  <div
                    key={g.id}
                    className="guide manual v"
                    style={{ left: g.position, height: pagePx.height }}
                  />
                ) : (
                  <div
                    key={g.id}
                    className="guide manual h"
                    style={{ top: g.position, width: pagePx.width }}
                  />
                ),
              )}
              {snapGuides.map((g, i) =>
                g.orientation === 'v' ? (
                  <div
                    key={`g${i}`}
                    className="guide v"
                    style={{ left: g.position, height: pagePx.height }}
                  />
                ) : (
                  <div
                    key={`g${i}`}
                    className="guide h"
                    style={{ top: g.position, width: pagePx.width }}
                  />
                ),
              )}
              {page.elements.map((el) => (
                <div
                  key={el.id}
                  onPointerDown={(e) => {
                    if (state.selectedIds.includes(el.id) && !el.locked) {
                      startMove(el.id, e)
                    }
                  }}
                >
                  <ElementView
                    element={el}
                    selected={state.selectedIds.includes(el.id)}
                    editingTextId={editingTextId}
                    templateVariables={templateVars}
                    onSelect={(id, additive) =>
                      updatePresent((s) => {
                        s.selectedIds = resolveSelection(id, additive)
                      })
                    }
                    onStartEdit={setEditingTextId}
                    onTextChange={(id, content) => {
                      updateElement(id, { content } as Partial<DesignElement>)
                      const keys = [...content.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
                      if (keys.length) {
                        updatePresent((s) => {
                          const vars = { ...(s.document.templateVariables ?? {}) }
                          for (const k of keys) {
                            if (!(k in vars)) vars[k] = 'Sample'
                          }
                          s.document.templateVariables = vars
                        })
                      }
                    }}
                    onEndEdit={() => setEditingTextId(null)}
                  />
                </div>
              ))}
              {selectedElements.length === 1 &&
                selectedElements.map((el) => (
                  <ResizeHandles
                    key={`rh-${el.id}`}
                    element={el}
                    onResizeStart={(handle, e) => startResize(el.id, handle, e)}
                  />
                ))}
            </div>
            <div className="page-meta">
              {Math.round(pagePx.width)} × {Math.round(pagePx.height)} px
              {page.unit === 'mm' && ` (${page.width}×${page.height} mm)`}
            </div>
          </div>
          <p className="workspace-hint">Scroll to pan · Ctrl+scroll to zoom · Alt+drag to pan · Middle-click drag</p>
        </div>

        <PropertiesPanel
          selection={selectedElements}
          customFonts={state.document.customFonts ?? []}
          document={state.document}
          page={page}
          editorRole={editorRole}
          onUpdate={updateElement}
          onUploadFont={handleFontUpload}
          onUpdatePage={updatePage}
          onUpdateDocument={updateDocument}
          onFillPlaceholder={(id, file) => handleImageUpload(file, id)}
        />
      </div>
      <TemplateLibraryModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onApply={(entry) => {
          if (entry.state) commit(entry.state)
          setTemplateModalOpen(false)
        }}
      />
      <StockLibraryModal
        open={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        onInsert={insertStockAsset}
      />
    </div>
  )
}

function Ruler({
  orientation,
  length,
  zoom,
  onAddGuide,
}: {
  orientation: 'h' | 'v'
  length: number
  zoom: number
  onAddGuide: (pos: number) => void
}) {
  const ticks = Math.min(40, Math.ceil(length / 50))
  const step = length / ticks
  return (
    <div
      className={`ruler ruler-${orientation}`}
      style={orientation === 'h' ? { width: length * zoom } : { height: length * zoom }}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const pos =
          orientation === 'h'
            ? (e.clientX - rect.left) / zoom
            : (e.clientY - rect.top) / zoom
        onAddGuide(Math.max(0, Math.min(length, pos)))
      }}
    >
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const pos = i * step
        return (
          <span
            key={i}
            className="ruler-tick"
            style={
              orientation === 'h'
                ? { left: pos * zoom }
                : { top: pos * zoom }
            }
          >
            {Math.round(pos)}
          </span>
        )
      })}
    </div>
  )
}
