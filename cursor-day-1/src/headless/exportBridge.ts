import type { EditorState } from '../types/document'
import { exportProjectJson, importProjectJson } from '../utils/persistence'
import { renderPageToCanvas } from '../utils/exportPage'

declare global {
  interface Window {
    __cursorHeadless?: {
      renderPng: (json: string, pageIndex?: number) => Promise<string>
      ping: () => string
    }
  }
}

export function installHeadlessBridge(): void {
  window.__cursorHeadless = {
    ping: () => 'ok',
    renderPng: async (json: string, pageIndex = 0) => {
      const state = importProjectJson(json)
      if (!state) throw new Error('Invalid project JSON')
      const page = state.document.pages[pageIndex]
      if (!page) throw new Error('Page not found')
      const canvas = await renderPageToCanvas(page, 1, {
        templateVariables: state.document.templateVariables,
      })
      return canvas.toDataURL('image/png')
    },
  }
}

export function serializeForHeadless(state: EditorState): string {
  return exportProjectJson(state)
}
