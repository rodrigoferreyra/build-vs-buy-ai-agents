# Stopped

Stopped by user request (~19 min into a single continuous agent session; hard stop honored). `npm install` and `npm run build` (`tsc --noEmit && vite build`) both succeed.

## What works (as far as I verified)
- Blank documents in px / mm / in, presets (1080×1080, A6, A4, …); multi-page with add/duplicate/delete/reorder.
- Canvas: zoom (wheel+Ctrl, menu up to 800 %, Fit), pan (wheel, Space, hand tool), rulers, drag-out guides, snapping to page/elements/guides.
- Elements: text (inline edit, fonts, weight/italic/underline, align, line/letter/paragraph spacing, auto-fit, outline, shadow, background), shapes (rect, ellipse, line, polygon, star; fill/gradient/stroke/radius), images (upload/drop/paste, placeholder frames, cover crop with zoom/pan, masks, adjustments, 9 filter presets, stickers).
- Selection / move / resize (8 handles, Shift = keep aspect) / rotate, marquee, multi-select, group/ungroup, align/distribute, flip, opacity + blend modes, lock/hide, layers panel with reorder.
- Undo/redo for every document change; save to localStorage (autosave), download/open `.json`, optional PUT/GET to your own URL.
- Export PNG / JPEG / WebP at chosen DPI, page / all pages / selection, optional bleed. The export canvas renderer matched the DOM render in screenshots (gradients, blend, shadow, masks, auto-fit).
- Templates (built-in + user), `{variables}`, brand palette with restriction, creator/adopter roles.

## What does not work / not done
- No PDF / PDF/X, crop marks, CMYK/spot, embedded fonts.
- No video, audio, captions, AI, background removal, vectorize, boolean ops, text on path, SVG part editing, LUTs.
- No headless/batch rendering, multi-framework embedding, localization, accessibility work, white-label theming, custom asset sources.
- Group resize (multi-select only moves), snapping during resize, interactive crop handles.

## Not verified (be skeptical)
- Layers panel and adopter-role UI were seen in a screenshot after the badge template was loaded (auto-fit + variables + save/reload worked). Templates tab list, brand tab and dialogs were not visually inspected.
- Real keyboard typing in the text editor (I verified commit via scripted `insertText` + blur).
- Custom font upload with a real font file; SVG/GIF/WebP uploads; cloud PUT/GET; bleed export; RTL export.
- Only Chromium was exercised. Canvas export uses `ctx.filter` and `ctx.letterSpacing` (not in Safari).
- Inspector button rows wrap awkwardly in a few places (cosmetic).

## Known quirks
- Undo coalesces repeated edits to the same property within 500 ms (slider drags).
- DOM vs. canvas text wrapping can differ by a pixel or two.
- `window.__ed` is exposed in `main.tsx` as a debug/test hook.
- In the Cursor sandbox `npm run dev` failed resolving `localhost`; `npx vite --host 127.0.0.1` worked.


---

# Session 2 (2026-10-16, ~24 min) – what was added
`npm run build` passes (JS bundle ≈1.3 MB; chunk-size warning only). New runtime deps: `pdf-lib`, `@pdf-lib/fontkit`, `polygon-clipping`, `@fontsource/*` (6 families, bundled as local woff files).

## Added
- **PDF export** (client-side, pdf-lib): vector shapes/paths, real text, embedded font subsets (bundled + uploaded fonts), opacity/blend modes, multi-page, TrimBox/BleedBox, optional crop marks, CMYK and spot (Separation) colours on shape fills. Raster fallback for images, gradients, effects, RTL text.
- **RTL**: per-text Direction (Auto/LTR/RTL), correct in DOM, canvas export and PDF; auto right-align when typing RTL.
- **Editable SVG**: SVG imports become vector elements with a parts list (recolour, replace colour, hide/delete part, edit path data). Same element is used by the stock library and brand logos.
- **Boolean ops**: union / subtract / intersect / exclude → one editable vector.
- **LUT filters**: 8 built-in 3D LUTs + `.cube` upload, strength slider; applied in editor, PNG/JPEG/WebP and PDF.
- **Brand kit**: fonts (with "restrict to brand fonts") and logos, besides colours.
- **Variables / data**: image variables, CSV/JSON data source with row stepper, "Export every row" to ZIP (PNG/JPEG/WebP/PDF) or one multi-page PDF.
- **Stock library**: 72 built-in vector items with search/categories; optional Openverse CC photo search.
- **Background removal**: colour-based flood fill (no ML) with tolerance/feather and restore.

## Still not done
- PDF/X, ICC output intent (PDF is RGB for everything except CMYK/spot shape fills), colour bars.
- Text on path, vectorize, video/audio/captions, AI features, headless/server renderer, multi-framework embedding, localization UI, accessibility work, white-label theming, pluggable asset-source API.
- Group resize, snapping during resize, interactive crop handles (unchanged from Session 1).

## Not verified / be skeptical
- Only Chromium. No human QA; checked by scripted calls and poppler (`pdfinfo`, `pdftotext`, `pdffonts`, `pdftoppm`). Acrobat / print-shop preflight not tried.
- System fonts (Arial, Georgia, …) are not embedded in PDFs (base-14 substitutes); RTL, gradient, effect, image and gradient-vector elements are rasterised in PDF.
- Background removal only works for fairly uniform backgrounds; it is not segmentation.
- SVG import drops `<use>`, masks, clip-paths, filters. Boolean ops flatten curves to polylines.
- Batch export runs on the main thread (100 rows ≈ 10 s) and was only tried with synthetic rows; large data sets will freeze the tab.
- Openverse: search and one thumbnail download worked in my environment; the licence/attribution is shown only as the item title, not inserted into the design.
- `window.__lib = { pdf, render }` is exposed in `main.tsx` as a debug hook (like `window.__ed`).
- The new Inspector panels (Variables, Vector parts, Remove background, LUT picker) were checked mostly through the store API rather than by hand-clicking every control.

## Wrap (after Session 2)

Earlier note: experiment paused after session 2 on Other-models budget. Session 3 continued later.

---

# Session 3 (2026-10-17, ~18 min) – video

Claude Sonnet 5.5 High built the Video Studio; Other Models usage limit hit during wrap. Parent finished rescore/docs. `npm run build` passes (JS bundle ≈1.65 MB).

## Added
- **Video Studio** (Design ↔ Video tabs): multi-track timeline, trim/split, sample + file import (IndexedDB persistence), text/sticker/design overlays, SRT/VTT captions, transitions (crossfade and others), mediabunny WebCodecs export (MP4/WebM, resolution + fps).
- Deps staged for later work (not wired this session): imagetracerjs, onnxruntime-web, axe-core, @napi-rs/canvas, esbuild; empty German locale dict.

## Still not done
- PDF/X, text on path, vectorize, AI generation, headless/Docker, multi-framework / mobile shells, white-label, pluggable asset sources, WCAG pass, real i18n strings, ML background removal.
- Remaining checklist weight ≈ **36 / 159**.

## Wrap
Session 3 stopped on user wrap + model quota. Score **123 / 159**. Further sessions optional.
