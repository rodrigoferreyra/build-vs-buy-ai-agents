import type { DocumentModel, UserStorageConfig } from '../types/document'
import { exportProjectJson, importProjectJson } from './persistence'
import type { EditorState } from '../types/document'

/** User-owned storage: always download JSON; optionally POST to user endpoint. */
export async function saveToUserStorage(state: EditorState, config?: UserStorageConfig): Promise<void> {
  const json = exportProjectJson(state)
  const blob = new Blob([json], { type: 'application/json' })
  const filename = `${state.document.name.replace(/\s+/g, '-') || 'design'}.json`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)

  if (config?.remoteUrl) {
    try {
      await fetch(config.remoteUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(config.remoteToken ? { Authorization: `Bearer ${config.remoteToken}` } : {}),
        },
        body: json,
        mode: 'cors',
      })
    } catch {
      /* offline / CORS — file export still succeeded */
    }
  }
}

export async function loadFromUserStorage(file: File): Promise<EditorState | null> {
  const text = await file.text()
  return importProjectJson(text)
}

export async function loadFromRemoteStorage(config: UserStorageConfig): Promise<DocumentModel | null> {
  if (!config.remoteUrl) return null
  try {
    const res = await fetch(config.remoteUrl, {
      headers: config.remoteToken ? { Authorization: `Bearer ${config.remoteToken}` } : {},
    })
    if (!res.ok) return null
    const text = await res.text()
    return importProjectJson(text)?.document ?? null
  } catch {
    return null
  }
}
