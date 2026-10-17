# claude-cursor-day-1 — "Canvasly" design editor

A from-scratch Canva-style design editor built by Claude Sonnet 5.5 High (`claude-sonnet-5-5-high`) in Cursor for the IMG.LY build-vs-buy experiment. Stack: **React + TypeScript + Vite only** (no CE.SDK, no `@cesdk/*`, no `@imgly/*`, no other runtime dependencies).

## Install & run

```bash
npm install
npm run dev        # http://localhost:5173
```

If `localhost` does not resolve in your environment: `npx vite --host 127.0.0.1`.

```bash
npm run build      # type-check (tsc --noEmit) + production build into dist/
npm run preview    # serve the production build
```

## Using it

- **Add** tab: text, shapes, image upload, image placeholder, stickers. **Layers**, **Templates**, **Brand** tabs.
- Nothing selected → right panel shows document size (px/mm/in), background, bleed, variables.
- Ctrl+scroll zoom, scroll / Space+drag pan, Ctrl+0 fit, drag from rulers for guides.
- Double-click text to edit, double-click an image frame to upload; drop image files on the canvas.
- Shortcuts: Ctrl+Z / Ctrl+Shift+Z, Ctrl+C/X/V/D, Ctrl+G / Ctrl+Shift+G, Ctrl+A, Ctrl+S, arrows (Shift = 10 px), Delete.
- Export (top right): PNG / JPEG / WebP, DPI, page / all pages / selection, optional bleed.
- Save: autosaves to browser localStorage; **Download .json** / **Open** for files; **Cloud…** for PUT/GET to your own URL. Data stays in the browser unless you use that dialog.

## Docs for the experiment

- `PROGRESS.md` — per-checklist-id status guesses (22 pass / 19 partial / 26 fail)
- `STOPPED.md` — what works / what doesn't
- `TIME_LOG.md` — timestamps (single ~19 min agent session, not a 6h human day)

## Layout

`src/store.ts` (state, history, actions) · `src/geometry.ts` (shapes, math, factories) · `src/render.ts` (canvas export) · `src/textLayout.ts` · `src/components/*` (Canvas, Inspector, panels, dialogs).
