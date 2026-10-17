# Progress vs `checklist.csv` (re-audited)

Re-scored by Claude Sonnet 5.5 High (`claude-sonnet-5-5-high`) on 2026-10-16 against `shared/checklist.csv` / `shared/SCORING.md`. Statuses were verified against the **running app** (`npm run dev -- --host 127.0.0.1 --port 5183`) using real UI button clicks, simulated pointer drags and DOM/state inspection through the browser. Earlier self-assessment was not trusted. Not verified: OS-level key typing and native file-picker dialogs (the browser here cannot drive them); in those cases the same code path was called programmatically and is noted.

**Tally after Session 2: 45 pass / 3 partial / 19 fail (of 67). Weighted pass = 110 of 159.** (Session 1: 35 / 6 / 26, weighted 87.) Rows changed in Session 2: 20, 24, 25, 28, 32, 34, 37, 38, 41, 43, 46, 47, 61 – their notes begin with "Session 2". Session-2 rows were checked in the running app (in-IDE browser, scripted via `window.__ed` / `window.__lib`) and PDFs with poppler (`pdfinfo`, `pdftotext`, `pdffonts`, `pdftoppm`); no human click-through of every new panel.

| id | status | notes |
|----|--------|-------|
| 1 | pass | New design dialog: preset "Instagram post" gave 1080×1080 px; preset "A6" gave 105×148 mm (=396.85×559.37 px @96 dpi, unit stored as mm). Custom size with px/mm/in also present. |
| 2 | pass | Added 2 pages via "＋ Page" (3 total), reordered with ◀ (order changed), deleted with 🗑 (back to 2). |
| 3 | pass | Zoom menu set 400 % (zoom=4) and "Fit" (0.76 for 1080 px doc). Ctrl+wheel and pan implemented. |
| 4 | pass | Rulers (px/mm/in) and drag-out guides present. Simulated drag snapped the element to page centre (x=540, guide shown) and to another element's edge (y=700). Snapping is move-only (not resize/rotate). |
| 5 | pass | Save button wrote to localStorage; full page reload restored a byte-identical document (2 pages, 3+2 elements). Also JSON download/open. |
| 6 | pass | 10 UI edits (add heading, 5 shapes, duplicate, rotate 90°, flip, delete, add page; 11 history entries): undo-all returned the exact initial document JSON, redo-all the exact final JSON. |
| 7 | pass | Layers tab: three layers reordered with ↑ (order changed in doc), one hidden (DOM `display:none`), one locked (adopter drag/nudge/delete did not move or remove it). Drag-to-reorder (HTML5 DnD) not exercised, button reorder is. |
| 8 | pass | Grouped two shapes, dragged one member: both moved by the same delta (120,80); Ungroup cleared `groupId`. |
| 9 | pass | Align left put three elements at x=100; Distribute horizontally spaced them at x=100/500/900 (equal gaps). |
| 10 | pass | Opacity 0.5 + blend `multiply` applied; DOM computed `mix-blend-mode: multiply`, opacity 0.5. 12 blend modes in list. |
| 11 | pass | Copy on page 1 → switch to page 2 → paste (via the real `paste` event handler) added the element to page 2. Only keyboard/clipboard path; no "paste to page" menu entry. |
| 12 | pass | Add heading enters contentEditable edit mode; double-click on a text element also enters edit mode (verified). `insertText` + blur committed the new text to the document. OS-level typed keystrokes could not be sent from this browser harness. |
| 13 | pass | Inspector changes on one text block: font family (Georgia), size (120), weight (300), italic (on). State and computed CSS all matched. |
| 14 | pass | `fontFromFile` loaded a real TTF (136 KB) under a unique family; `document.fonts` registered it, it appears in the font dropdown, glyph widths differ from fallback, and it is stored in the doc. Native picker button exists but was not clicked. TTF only tested (OTF/WOFF/WOFF2 same code path). |
| 15 | pass | Line height, letter spacing, paragraph spacing sliders present and wired into DOM and canvas render. |
| 16 | pass | Left/center/right plus top/middle/bottom alignment in a fixed-size text box. |
| 17 | pass | Long name in a 300×80 box with auto-fit on shrank font from 60 to 21.7 px and fit inside the box in DOM. Never grows text above set size. |
| 18 | fail | No text-on-path / curved text. |
| 19 | pass | Text outline (2 px, red), drop shadow (4,4,6) and background colour verified in computed CSS (`-webkit-text-stroke`, `text-shadow`) and implemented in export render. |
| 20 | pass | **Session 2.** Text gets a Direction control (Auto / LTR / RTL). DOM uses `direction`, canvas export uses `ctx.direction`; Auto detects the first strong letter and typing Arabic into a left-aligned auto box switches it to right-aligned. Arabic sample rendered correctly in editor, PNG path and PDF (PDF rasterises RTL text instead of writing real text). Per-box direction only (no per-paragraph bidi). |
| 21 | pass | PNG, JPG, WebP, SVG and GIF files all uploaded via the upload code path and rendered. GIF is static first frame only (no animation). Native picker not clicked. |
| 22 | pass | Image frame set to 4:5 (648×810) with cover crop, rotation set to 15°, flip-horizontal toggled; DOM transform `rotate(15deg)` + `scale(-1,1)`. No interactive crop handles (crop is by aspect-ratio presets + zoom/pan sliders). |
| 23 | pass | Brightness, contrast, saturation, exposure, temperature, blur sliders; applied as CSS/canvas filter (`brightness(2.27) contrast(1.3) saturate(.5) …`). Exposure/temperature are approximations. |
| 24 | pass | **Session 2.** 9 CSS presets plus 8 built-in 3D LUT looks (procedural 17³ tables) and `.cube` upload; strength slider. Verified: an uploaded invert LUT turned a red pixel to cyan (0,255,255) in the export render. Trilinear lookup on the CPU, image downscaled to 2048 px for the LUT bake. |
| 25 | partial | **Session 2.** Inspector → Remove background: no ML model, colour-based flood fill from the image border (corner/edge sampled, tolerance + feather, restore original). Verified on a synthetic product shot on a gradient (corner/bottom alpha 0, subject and enclosed hole alpha 255). Fails on busy or same-colour backgrounds; this is not a segmentation network. |
| 26 | pass | Image placeholder frame 200×400 given a 600×300 landscape image: filled and cover-cropped (image scaled to 800×400 and centred). |
| 27 | fail | No vectorizer. |
| 28 | pass | **Session 2.** Add tab: 72 built-in items (10 gradient + 2 blob backgrounds, 9 patterns, 34 icons, 8 shapes, 8 stickers) with search and category chips, all inserted as editable vectors; plus optional Openverse (CC) photo search with insert (search and 600×400 thumbnail download verified live; only the query leaves the browser, on button press). No bundled photographs. |
| 29 | pass | Circle mask applied (CSS `clip-path` ellipse path); export render left corner pixel transparent and centre opaque. Also rounded/star/triangle/hexagon masks. |
| 30 | pass | Rectangle, ellipse, line, polygon and star each added. |
| 31 | pass | Rectangle with 2 px stroke and 12 px corner radius verified in SVG path (`A12 12` corners, stroke-width 2). Stroke unit is px, not pt. |
| 32 | pass | **Session 2.** Union / Subtract / Intersect / Exclude on two or more shapes or vectors (polygon-clipping on flattened paths). Verified rect/ellipse: union 150×120, intersect 50×80, exclude 150×120, subtract 100×100; result is one editable vector with holes; undo restores both shapes. Curves are flattened to polylines (0.5 px tolerance). |
| 33 | pass | Two-stop linear gradient with angle; SVG `linearGradient` with 2 stops in DOM, `createLinearGradient` in export. |
| 34 | pass | **Session 2.** SVG upload / drop / stock / brand logos import as a vector element with editable parts (computed style resolves classes, `<style>`, inheritance, group transforms; gradients kept). Inspector lists parts: recolour fill/stroke, replace a colour everywhere, hide/delete a part, edit path data. Verified on a 4-part SVG (recoloured circle to #00aa00). `<use>`, masks, clip-paths and filters are dropped. |
| 35 | pass | "Save current design as template…" stored a template under My templates; after starting a new blank design, opening the template loaded the design as a new document (5 elements). localStorage only. |
| 36 | pass | Built-in badge template has locked logo/header; in Adopter role, pointer drag of the locked logo moved it 0 px, inspector showed locked notice, delete was ignored. Creator can lock/unlock. |
| 37 | pass | **Session 2.** Text `{vars}` and image variables (bind an image frame to a name) are filled from the Variables panel, an uploaded image/URL, or a loaded CSV/JSON data source (row stepper, matching column names). Verified: row 2 switched `{name}`/`{city}` to Grace/NYC and a data-URL image variable rendered in the bound frame. Export dialog can render every row. |
| 38 | pass | **Session 2.** Brand tab now manages colours, fonts (existing, bundled or uploaded; optional restriction so the font menu shows only brand fonts) and logos (upload, click to insert, SVG logos become editable vectors). Verified font menu shows only the two brand fonts when restricted; palette restriction unchanged. |
| 39 | pass | Role switch Creator ↔ Adopter on the same template: adopter loses Add/Templates tabs and structural controls, keeps text/variables editing. |
| 40 | pass | Template tab with category chips (All/Marketing/Social/Print), search ("badge" → 1 hit), Print filter shows 2; opening works. Only 5 built-in templates. |
| 41 | pass | **Session 2.** PDF added next to PNG/JPEG/WebP (pdf-lib, client-side). Verified with poppler: `pdfinfo` page/trim/bleed boxes, `pdftotext` text, `pdftoppm` render matching the editor. Multi-page and one-page-per-data-row PDFs work. |
| 42 | pass | 300 DPI on 1080 px doc rendered 3375×3375 px (scale = dpi/96). No DPI metadata embedded in the file. |
| 43 | pass | **Session 2.** Shape solid fills can be RGB / CMYK / Spot (name + CMYK alternate). PDF writes `k` DeviceCMYK or a `/Separation /PANTONE#20185#20C` colour space (verified in the PDF source and rendered). Screen is an sRGB preview. Only shape fills (not text, strokes or images). |
| 44 | pass | Bleed field in mm (3 mm = 11.34 px); export with "include bleed" rendered 1103×1103 for a 1080 doc; dashed trim line on canvas. No crop marks. |
| 45 | fail | No PDF/PDF-X. |
| 46 | pass | **Session 2.** PDF export option "Crop marks" adds a slug, draws registration-colour marks at the trim corners beyond the bleed and sets TrimBox/BleedBox (verified: MediaBox 645.8×892.4 pt, TrimBox inset 25.26 pt). No colour bars or page info. |
| 47 | partial | **Session 2.** PDF text is real text (`pdftotext` extracts it) with embedded subsets for bundled (Inter, Playfair, Oswald, Lora, Roboto Mono, Pacifico) and uploaded fonts (`pdffonts`: emb yes). System fonts (Arial, Georgia…) map to non-embedded base-14 faces; RTL, outlined or shadowed text is rasterised. Not PDF/X. |
| 48 | pass | Export dialog has "This page", "All pages" and "Selection"; selection export ran and produced the file `…-selection.png`. Page-scoped export uses the current page. |
| 49 | fail | No video. |
| 50 | fail | No video/audio tracks. |
| 51 | fail | No video. |
| 52 | fail | No captions/SRT. |
| 53 | fail | No transitions. |
| 54 | fail | No MP4 export. |
| 55 | fail | No AI generation. |
| 56 | fail | No AI result layers. |
| 57 | fail | No AI. |
| 58 | fail | Single React app, not an embeddable component mounted in multiple frameworks. |
| 59 | fail | Web only. |
| 60 | fail | No headless/Node rendering; renderer depends on DOM canvas. |
| 61 | partial | **Session 2.** Export → "Every data row" renders one design per CSV/JSON row to a ZIP of PNG/JPEG/WebP, one ZIP of PDFs, or one multi-page PDF. Verified 100 rows → PNG ZIP in ~10 s in the tab. Browser/main-thread only; no headless Node/Docker renderer. |
| 62 | fail | Fixed "Canvasly" branding; no theming/panel-hiding/white-label API. |
| 63 | fail | No pluggable asset sources (stickers are hard-coded). |
| 64 | fail | English only. |
| 65 | fail | Native buttons only; canvas elements not keyboard-selectable, no ARIA design, no WCAG audit. |
| 66 | pass | No network calls in the code except user-triggered PUT/GET in "Cloud…"; editing is fully client-side. No external requests at load. |
| 67 | pass | "Cloud…" dialog PUT the design to a local HTTP endpoint (CORS-enabled) and GET restored a byte-identical document into a fresh blank design. Works with pre-signed S3 URLs in principle; no auth/SDK integration. |
