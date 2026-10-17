# claude-cursor-day-1 — session summary

- **Model:** Claude Sonnet 5.5 High (`claude-sonnet-5-5-high`) in Cursor, running as a subagent
- **Start:** 2026-10-16T01:37:20-03:00 · **End:** 2026-10-16T01:55:36-03:00 · **~18 min**, one continuous agent session (not a 6h human day)
- **Constraints kept:** worked only in `claude-cursor-day-1/` (plus this summary); no `.agents/` files read; no CE.SDK / IMG.LY packages; only React, ReactDOM, Vite, TypeScript.

## Timeline
| Time | What |
|------|------|
| 01:37 | Read `STARTING_PROMPT.md`, `checklist.csv`; planned data model, DOM editing + canvas export. |
| ~01:38–01:46 | Wrote Vite/React/TS scaffold, then `types`, `geometry`, `textLayout`, `render` (canvas export), `store` (history/actions), all components and CSS in one pass. `npm run build` passed on the first try. |
| ~01:47 | Started dev server (first failed on `localhost` DNS in sandbox; used `--host 127.0.0.1` outside the sandbox). |
| ~01:48–01:54 | Browser smoke tests via the in-IDE browser: added text, inline edit, shapes/gradients/blend/shadow, drag with snapping (1 history entry), handle resize, 10-edit undo/redo equality, image placeholder fill + masks + filter, canvas export compared against DOM render. |
| 01:54 | User said STOP adding features. |
| 01:55 | Final build OK, wrote TIME_LOG, PROGRESS, STOPPED, README, this file. |

## What was built
A Canva-like editor ("Canvasly"): multi-page documents in px/mm/in, zoom/pan, rulers+guides+snapping, text/shapes/images, layers panel, group/align/distribute, opacity/blend, undo/redo, localStorage + JSON save/load, PNG/JPEG/WebP export at chosen DPI with optional bleed, templates, variables, brand palette, creator/adopter roles.

Architecture: immutable document state with whole-doc history snapshots (`store.ts`); elements rendered as DOM for editing; a separate canvas renderer (`render.ts`) for export that shares geometry (SVG path strings reused as `Path2D`), text layout and filter-string code so output matches the screen.

## Result
Self-assessed vs 67 checklist rows: **22 pass / 19 partial / 26 fail** (see `claude-cursor-day-1/PROGRESS.md`). Failures are mostly out of scope for a short run: video (49–54), AI (55–57), PDF/CMYK/PDF-X (43, 45–47), headless/batch/platform/white-label (58–65), background removal, vectorize, boolean ops, text on path.

## Sticking points
- Synthetic key presses in the in-IDE browser did not insert text into the contentEditable; verified editing with `execCommand('insertText')` and blur instead.
- Page was not focused so `document.hasFocus()` was false; screenshots lagged one frame behind scripted changes.
- Browser snapshots were very large; switched to a `window.__ed` debug hook plus CDP evaluate for testing.
- Dev server failed on `localhost` resolution inside the sandbox.
- Last smoke test (templates tab / adopter role / layers panel) was interrupted by the stop instruction, so those UIs are unverified.

## Honest caveats
No human QA. Chromium only. Several "pass" ids were exercised by script only, not by hand.


## Session 2

**Start** 2026-10-16T13:37:05-03:00 · **End** 14:00:45 (≈24 min) · Claude Sonnet 5.5 High · same folder rules (no CE.SDK / `@cesdk/*` / `@imgly/*`, nothing read or copied from other builds).

### What I did
1. Added a client-side PDF writer on `pdf-lib` (id 41): real vector paths and text, embedded font subsets, ExtGState opacity/blend, TrimBox/BleedBox, crop marks (46), CMYK and spot colours (43), raster fallback for images/gradients/effects.
2. RTL (20): `direction` on text, `ctx.direction` in the canvas renderer, Auto detection.
3. SVG import as an editable vector model (34) driven by a live hidden DOM (`getComputedStyle` + `getScreenCTM`); boolean ops via `polygon-clipping` (32).
4. LUT filters (24): procedural built-in 3D LUTs, `.cube` upload, trilinear apply, cached baked canvas.
5. Brand kit fonts/logos (38); data-driven variables with CSV/JSON, image variables, and batch export to ZIP / multi-page PDF (37, 61).
6. Stock library (28): 72 generated SVG items + Openverse online photo search.
7. Background removal (25) by border-seeded flood fill + feather – deliberately not ML.
8. Docs: `PROGRESS.md`, `COMPLIANCE.md`, `STOPPED.md`, `TIME_LOG.md`.

### Result
Session 1: 35 pass / 6 partial / 26 fail (weighted 87/159) → Session 2: **45 / 3 / 19 (weighted 110/159)**. Improved to pass: 20, 24, 28, 32, 34, 37, 38, 41, 43, 46. Improved fail→partial: 25, 47, 61. Not attempted: 18 text on path, 27 vectorize, 45 PDF/X, video/AI/platform rows.

### Problems hit and fixes
- `Record<El['type'], string>` in the layers panel missed the new `vector` type (TS error) → added an icon.
- SVG parse said "no drawable shapes": the hidden host div had `visibility:hidden`, which `getComputedStyle` inherited → removed it.
- PDF image had a black border from transparent padding in the JPEG path → no padding for JPEG, only when no flips.
- Path parser bug: implicit lineto after `m` was relative to the wrong point → fixed.
- Test doc was tiny because `newDoc` takes px, not mm → re-ran with real px sizes.
- PDFs written with object streams couldn't be grepped; saved with `useObjectStreams:false`.
- Screenshots in the in-IDE browser lag a frame; re-captured before judging.

### Honest caveats
No human QA, Chromium only, PDFs checked with poppler but not Acrobat/preflight. PDF isn't PDF/X; system fonts aren't embedded; RTL/effects/gradients/images are rasterised in PDF. Background removal is a heuristic. Batch is main-thread. I verified most new panels through the store API, not by clicking each control.
