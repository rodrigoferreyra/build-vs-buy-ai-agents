import { useState } from 'react'
import type { DocumentModel, EditorState } from '../types/document'
import { createImageFromFile, createText } from '../utils/elements'

interface Props {
  document: DocumentModel
  onApply: (mutate: (state: EditorState) => void) => void
}

/** Dry-run text-to-image: gradient placeholder + editable text layer (or OpenAI if key set). */
export async function generateAiLayers(
  prompt: string,
  apiKey?: string,
): Promise<{ imageSrc: string; headline: string }> {
  const headline = prompt.split(/\s+/).slice(0, 6).join(' ') || 'Brand headline'
  if (apiKey?.startsWith('sk-')) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          size: '1024x1024',
          n: 1,
        }),
      })
      if (res.ok) {
        const data = (await res.json()) as { data?: { url?: string }[] }
        const url = data.data?.[0]?.url
        if (url) {
          const imgRes = await fetch(url)
          const blob = await imgRes.blob()
          const reader = new FileReader()
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
          return { imageSrc: dataUrl, headline }
        }
      }
    } catch {
      /* fall through to dry-run */
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 512, 512)
  g.addColorStop(0, '#6366f1')
  g.addColorStop(1, '#ec4899')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 512)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 28px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('AI dry-run', 256, 240)
  ctx.font = '16px Inter, sans-serif'
  ctx.fillText(prompt.slice(0, 48), 256, 280)
  return { imageSrc: canvas.toDataURL('image/png'), headline }
}

export function AIGeneratePanel({ document, onApply }: Props) {
  const [prompt, setPrompt] = useState('Summer sale hero banner')
  const [busy, setBusy] = useState(false)
  const brandOnly = document.aiBrandTemplateOnly ?? false
  const lockedTemplate = document.isTemplate && brandOnly

  const run = async () => {
    if (brandOnly && !document.isTemplate) {
      alert('Enable “Save as template” or turn off brand-scoped AI.')
      return
    }
    setBusy(true)
    try {
      const { imageSrc, headline } = await generateAiLayers(prompt, document.openAiApiKey)
      onApply((state) => {
        const page = state.document.pages[state.document.activePageIndex]
        const img = createImageFromFile(imageSrc, 320, 320)
        img.name = 'AI image'
        img.x = 80
        img.y = 80
        const text = createText(80, 420)
        text.content = headline
        text.name = 'AI headline'
        text.fontSize = 36
        if (lockedTemplate) {
          text.templateLock = true
          img.templateLock = true
        }
        page.elements.push(img, text)
        state.selectedIds = [text.id]
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ai-panel" aria-labelledby="ai-heading">
      <h2 id="ai-heading">AI generate</h2>
      <label>
        Prompt
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
      </label>
      <label>
        OpenAI API key (optional)
        <input
          type="password"
          value={document.openAiApiKey ?? ''}
          onChange={(e) =>
            onApply((s) => {
              s.document.openAiApiKey = e.target.value
            })
          }
          placeholder="sk-… or leave empty for dry-run"
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={brandOnly}
          onChange={(e) =>
            onApply((s) => {
              s.document.aiBrandTemplateOnly = e.target.checked
            })
          }
        />
        Brand template only (locked layers)
      </label>
      <button type="button" disabled={busy} onClick={() => void run()}>
        {busy ? 'Generating…' : 'Generate layers'}
      </button>
      <p className="muted">Inserts editable image + text layers (not a flat regenerate).</p>
    </section>
  )
}
