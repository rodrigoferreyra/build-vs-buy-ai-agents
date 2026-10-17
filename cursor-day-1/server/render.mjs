#!/usr/bin/env node
/**
 * Headless PNG render via Playwright + built app (?headless=1 bridge).
 * Usage: node server/render.mjs path/to/design.json [pageIndex] [out.png]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const jsonPath = process.argv[2]
const pageIndex = parseInt(process.argv[3] ?? '0', 10)
const outPath = process.argv[4] ?? 'render-out.png'

if (!jsonPath) {
  console.error('Usage: node server/render.mjs design.json [pageIndex] [out.png]')
  process.exit(1)
}

const projectJson = readFileSync(jsonPath, 'utf8')
const distIndex = join(root, 'dist', 'index.html')
const url = `file://${distIndex}?headless=1`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(url)
await page.waitForFunction(() => window.__cursorHeadless?.ping?.() === 'ok', null, { timeout: 15000 })
const dataUrl = await page.evaluate(
  async ({ json, idx }) => window.__cursorHeadless.renderPng(json, idx),
  { json: projectJson, idx: pageIndex },
)
const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
writeFileSync(outPath, Buffer.from(base64, 'base64'))
await browser.close()
console.log(`Wrote ${outPath}`)
