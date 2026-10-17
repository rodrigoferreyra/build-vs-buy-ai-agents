# cursor-day-1 — Browser design editor MVP

Canva-like design editor built from scratch with **React + TypeScript + Vite** (no CE.SDK). Built during the IMG.LY build-vs-buy agent day experiment.

**Model:** Composer 2.5 Fast (`composer-2.5-fast`)

## Quick start

```bash
cd cursor-day-1
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

## Features (MVP)

- New documents: **1080×1080 px**, **A6 mm** (and other presets in the dropdown)
- **Zoom / pan** (Ctrl+scroll, scroll, Alt+drag, middle-click drag), **fit to screen**
- **Text** (double-click inline edit), **rectangles**, **ellipses**, **image upload** (PNG/JPG/WebP/SVG/GIF)
- **Select**, **drag**, **resize** (handles), **opacity**, **rotation**
- **Layers** panel: reorder, hide, lock
- **Undo / redo** (Ctrl+Z / Ctrl+Shift+Z), delete selection
- **Multiple pages**: add, delete, reorder tabs
- **Snapping** to page center/edges and other elements (basic)
- **Export PNG** (canvas render of active page)
- **Save / load** to `localStorage`; **import / export** project JSON file
- **Text styling**: font family, size, weight, style, align, line height, letter spacing, shadow, outline
- **Shape styling**: fill, stroke, corner radius

## Project layout

| Path | Purpose |
|------|---------|
| `src/components/DesignEditor.tsx` | Main editor shell and interactions |
| `src/types/document.ts` | Document / element model |
| `src/utils/exportPng.ts` | PNG export via canvas |
| `checklist.csv` | Build-vs-buy requirement checklist |
| `PROGRESS.md` | Checklist id status guesses |
| `STOPPED.md` | What works / what does not |
| `TIME_LOG.md` | Session timestamps |

## Notes

- All editing stays in the browser; projects can be saved locally only (no cloud backend).
- See `../shared/PROTOCOL.md` for the wider experiment protocol.
