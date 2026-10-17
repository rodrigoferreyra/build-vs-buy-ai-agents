import { useEffect } from 'react'
import { actions, fitToScreen, getState, history, saveLocal, subscribe, useStore, zoomAt } from './store'
import { TopBar } from './components/TopBar'
import { LeftPanel } from './components/LeftPanel'
import { Canvas } from './components/Canvas'
import { Inspector } from './components/Inspector'
import { PagesBar } from './components/PagesBar'
import { Dialogs } from './components/Dialogs'
import { addImageFiles } from './upload'

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      const typing = isTyping(e.target)
      if (mod && key === 's') {
        e.preventDefault()
        saveLocal(true)
        return
      }
      if (typing) {
        // let inputs handle their own undo, but allow undo/redo when focus is on a range/select/etc.
        const t = e.target as HTMLInputElement
        if (!(t.tagName === 'INPUT' && (t.type === 'range' || t.type === 'checkbox' || t.type === 'color'))) return
      }
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) history.redo()
        else history.undo()
      } else if (mod && key === 'y') {
        e.preventDefault()
        history.redo()
      } else if (mod && key === 'c') {
        actions.copy()
      } else if (mod && key === 'x') {
        e.preventDefault()
        actions.cut()
      } else if (mod && key === 'd') {
        e.preventDefault()
        actions.duplicateSelection()
      } else if (mod && key === 'g') {
        e.preventDefault()
        if (e.shiftKey) actions.ungroup()
        else actions.group()
      } else if (mod && key === 'a') {
        e.preventDefault()
        actions.selectAll()
      } else if (mod && (key === '=' || key === '+')) {
        e.preventDefault()
        zoomAt(getState().zoom * 1.25)
      } else if (mod && key === '-') {
        e.preventDefault()
        zoomAt(getState().zoom / 1.25)
      } else if (mod && key === '0') {
        e.preventDefault()
        fitToScreen()
      } else if (mod && key === '1') {
        e.preventDefault()
        zoomAt(1)
      } else if (!mod && (key === 'delete' || key === 'backspace')) {
        if (getState().selection.length) {
          e.preventDefault()
          actions.deleteSelection()
        }
      } else if (!mod && key === 'escape') {
        actions.clearSelection()
      } else if (!mod && key === 'enter') {
        const s = getState()
        if (s.selection.length === 1) {
          const el = s.doc.pages[s.pageIndex].elements.find((x) => x.id === s.selection[0])
          if (el && el.type === 'text' && !el.locked) {
            e.preventDefault()
            actions.set({ editingId: el.id })
          }
        }
      } else if (!mod && key.startsWith('arrow')) {
        if (!getState().selection.length) return
        e.preventDefault()
        const d = e.shiftKey ? 10 : 1
        actions.nudge(key === 'arrowleft' ? -d : key === 'arrowright' ? d : 0, key === 'arrowup' ? -d : key === 'arrowdown' ? d : 0)
      }
    }
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return
      const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'))
      if (files.length) {
        e.preventDefault()
        addImageFiles(files)
      } else {
        e.preventDefault()
        actions.paste()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paste', onPaste)
    }
  }, [])
}

/** debounce autosave to localStorage (data never leaves the browser) */
function useAutosave() {
  useEffect(() => {
    let t: number | undefined
    let last = getState().doc
    const unsub = subscribe(() => {
      const d = getState().doc
      if (d === last) return
      last = d
      window.clearTimeout(t)
      t = window.setTimeout(() => saveLocal(false), 600)
    })
    return () => {
      unsub()
      window.clearTimeout(t)
    }
  }, [])
}

export default function App() {
  useHotkeys()
  useAutosave()
  const toastMsg = useStore((s) => s.toast)
  const role = useStore((s) => s.role)
  return (
    <div className={'app role-' + role}>
      <TopBar />
      <div className="main">
        <LeftPanel />
        <div className="center">
          <Canvas />
          <PagesBar />
        </div>
        <aside className="right">
          <Inspector />
        </aside>
      </div>
      <Dialogs />
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  )
}
