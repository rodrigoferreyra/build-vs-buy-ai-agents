#!/usr/bin/env node
/**
 * Batch render from CSV: columns are template variable keys; one PNG per row.
 * Usage: node server/batch-render.mjs template.json vars.csv out-dir/
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const templatePath = process.argv[2]
const csvPath = process.argv[3]
const outDir = process.argv[4] ?? 'batch-out'

if (!templatePath || !csvPath) {
  console.error('Usage: node server/batch-render.mjs template.json vars.csv [out-dir]')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

const baseState = JSON.parse(readFileSync(templatePath, 'utf8'))
const lines = readFileSync(csvPath, 'utf8').trim().split('\n')
const headers = lines[0].split(',').map((h) => h.trim())
const rows = lines.slice(1).filter(Boolean)

const distIndex = join(root, 'dist', 'index.html')
const url = `file://${distIndex}?headless=1`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(url)
await page.waitForFunction(() => window.__cursorHeadless?.ping?.() === 'ok', null, { timeout: 15000 })

let n = 0
for (const row of rows) {
  const vals = row.split(',').map((c) => c.trim())
  const vars = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  const state = structuredClone(baseState)
  state.document.templateVariables = { ...(state.document.templateVariables ?? {}), ...vars }
  const json = JSON.stringify(state)
  const dataUrl = await page.evaluate(
    async ({ j }) => window.__cursorHeadless.renderPng(j, 0),
    { j: json },
  )
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  writeFileSync(join(outDir, `variant-${String(n).padStart(3, '0')}.png`), Buffer.from(base64, 'base64'))
  n++
}

await browser.close()
console.log(`Rendered ${n} variants to ${outDir}`)
