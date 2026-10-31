# claude-cursor-day-1 — "Canvasly" design editor

A from-scratch Canva-style design editor built in Cursor for the IMG.LY build-vs-buy experiment. Sessions 1–3: **Claude Sonnet 5.5 High**. Session 4: **Claude Opus 5.5** (Sonnet was requested; see `TIME_LOG.md`). Stack: **React + TypeScript + Vite** (no CE.SDK, no `@cesdk/*`, no `@imgly/*`). Open-source libraries are allowed.

Self-scored **159 / 159** after Session 4 (Sessions 1–3 were 123 / 159).

## Install & run

```bash
npm install
npm run dev        # http://localhost:5173 (Vite does not pin a port)
```

If `localhost` does not resolve in your environment: `npx vite --host 127.0.0.1 --port 5173`.

```bash
npm run build      # type-check (tsc --noEmit) + library build + production build into dist/
npm run preview    # serve the production build
npm run build:headless
npm run build:android   # needs ANDROID_HOME
```

## Using it

- **Add** tab: text, shapes, image upload, image placeholder, stickers, asset sources. **Layers**, **Templates**, **Brand**, **AI** tabs.
- Nothing selected → right panel shows document size (px/mm/in), background, bleed, variables.
- Ctrl+scroll zoom, scroll / Space+drag pan, Ctrl+0 fit, drag from rulers for guides.
- Double-click text to edit, double-click an image frame to upload; drop image files on the canvas.
- Shortcuts: Ctrl+Z / Ctrl+Shift+Z, Ctrl+C/X/V/D, Ctrl+G / Ctrl+Shift+G, Ctrl+A, Ctrl+S, arrows (Shift = 10 px), Delete.
- Export (top right): PNG / JPEG / WebP / PDF / PDF/X-4, DPI, page / all pages / selection, optional bleed.
- Save: autosaves to browser localStorage; **Download .json** / **Open** for files; **Cloud…** for PUT/GET to your own URL. Data stays in the browser unless you use that dialog.

## Docs for the experiment

- `PROGRESS.md` — per-checklist-id status (67 pass / 0 partial / 0 fail)
- `STOPPED.md` — what works / what doesn't, including Session 4
- `TIME_LOG.md` — timestamps (four sessions; S4 ~5 h wall-clock)

## Layout

`src/store.ts` (state, history, actions) · `src/geometry.ts` (shapes, math, factories) · `src/render.ts` (canvas export) · `src/textLayout.ts` · `src/pdf.ts` · `src/embed.tsx` · `src/components/*` (Canvas, Inspector, panels, dialogs) · `headless/` · `mobile/android/`.
