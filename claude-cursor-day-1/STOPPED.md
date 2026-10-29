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

---

# Session 4 (2026-10-29) – toward 159

Ran as **Claude Opus 5.5** in Cursor (Claude Sonnet 5.5 High was requested; recorded honestly in `TIME_LOG.md`). No CE.SDK / `@cesdk/*` / `@imgly/*`, no IMG.LY skills or docs MCP, no code from sibling repos. `npm run build` (`tsc --noEmit && vite build -c vite.lib.config.ts && vite build`) passes; only the chunk-size warning remains.

## Added (all re-scored in `PROGRESS.md`, notes start with "Session 4")
- **PDF/X-4** (row 45): `%PDF-1.6`, GTS_PDFX output intent with an sRGB ICC profile generated in code (`src/icc.ts`), XMP, trailer ID, every font embedded (system fonts → bundled substitutes), CMYK → RGB in X mode. Checked with `pdfinfo`/`pdffonts`/`pdftotext` + LittleCMS.
- **Effect text stays searchable** in PDF (invisible text layer over rasterised shadow/flip/curved text).
- **White-label** (row 58): ⚙ dialog / config JSON – title, logo, 6 colours, presets, 14 hide switches; CSS variables on the editor root.
- **Embedding** (row 60): `mount()` API + `<canvasly-editor>` custom element, library build in `public/lib`, plain-JS and web-component host pages.
- **Headless renderer + Docker** (rows 61/62): same renderer in Node via `@napi-rs/canvas` (`npm run build:headless`, `canvasly-render` CLI; PNG/JPEG/WebP/PDF/PDF-X, CSV batch); multi-stage Docker image (267 MB), 100 badges in 3.8 s.
- **ML background removal** (row 25): U²-Net-p via onnxruntime-web WASM, on-device, IoU 0.99 on a busy background.
- **Custom asset sources** (row 63): JSON manifest or S3/GCS bucket listing URL + programmatic `search()` sources; SVG, images and fonts.
- **German UI** (row 64): language switcher, ~330 strings + patterns; canvas content untouched.
- **AI** (rows 55–57): ✦ AI tab – dry-run or any OpenAI-compatible API with the user's key; result as separate editable layers (one undo step); brand mode only fills "AI slot" images + `{headline}`/`{tagline}` in locked templates. Built-in template "Brand promo (AI slot)".
- **Vectorize** (row 27): imagetracerjs + k-means palette → editable vector parts, vector-only PDF.
- **Text on an arc** (row 18): "Curve (arc)" slider, identical in editor, PNG, PDF and headless.
- **Accessibility** (row 65): focusable canvas elements with spoken names, keyboard move/edit/delete, live announcements, skip link, landmarks, contrast + labels fixed; axe-core WCAG 2.1 AA = 0 violations in 10 states.
- **Mobile / Android** (row 59): WebView app in `mobile/android/` (no Gradle; `npm run build:android` → signed APK) bundling the same editor, opening `.json` designs via Share / Open with, saving exports to the app's Downloads; phone layout for ≤ 760 px. Verified on an Android 14 emulator: the same badge design opened, was edited, and exported a PNG on the device.

## Score
**Weighted pass = 159 / 159** (67 pass / 0 partial / 0 fail). **Remaining weight: 0.** (Session start: 123 / 159.)

## Still open / be skeptical
- Android: verified only in an emulator (Android 14, WebView Chrome 113), not on a physical phone; the design was handed over via the Share intent. "Open with" from the Files app was not exercised. No iOS / React Native / Flutter build. The Android SDK used for the build lives in `~/Android/Sdk` (emulator) and `/tmp/asdk` (build tools); `build.sh` reads `ANDROID_HOME`.
- Phone layout is usable but desktop-first: the top bar scrolls horizontally, there is no pinch-zoom, and handles are small for touch.
- AI: only verified against a local OpenAI-compatible mock server and the dry-run generator – not against the real OpenAI service. Generated copy quality depends on the provider.
- Accessibility: keyboard flow was verified with DOM focus + key events because the automation browser had no OS focus; no real screen reader (NVDA/VoiceOver/TalkBack) was used.
- Curved text: single line only; rasterised in PDF (with invisible searchable text); kerning pairs are not applied per glyph.
- Vectorize: anti-aliased edges become thin extra parts; photos produce many paths.
- German: Video Studio only partly translated.
- Headless: Node/Skia text metrics differ slightly from Chromium (< 1 % pixel diff on the test badge).
- `window.__ed` / `window.__lib` debug hooks are still exposed in `main.tsx`.
