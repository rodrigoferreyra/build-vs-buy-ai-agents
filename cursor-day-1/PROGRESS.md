# Checklist progress (cursor-day-1)

Agent: **Composer 2.5 Fast** (`composer-2.5-fast`). Re-scored after Session 4 implementation + build verification (2026-10-17).

| id | status | notes |
|----|--------|-------|
| 1 | pass | Spot-test: 1080² and A6 mm presets create correct page sizes; px and mm only (no inch unit) |
| 2 | pass | + Page, ←/→ reorder, delete page all work |
| 3 | pass | Spot-test: Zoom + reaches 400%; Fit rescales viewport |
| 4 | pass | Rulers (click to add guides), manual guides on canvas, snap to page/elements/guides |
| 5 | pass | Save/load localStorage and JSON import/export round-trip; custom JSON, not CE `.scene` |
| 6 | pass | Spot-test: 10 rect adds, 10 undos → 0 layers, 10 redos → 10 layers |
| 7 | pass | Spot-test: layer list reorder (↑/↓), hide (👁), lock (🔒) |
| 8 | pass | Group / Ungroup in toolbar; shared `groupId`; group selects and moves together |
| 9 | pass | Shift+click multi-select; Align L/C/R and Dist H/V for 2+ / 3+ elements |
| 10 | pass | Opacity slider + blend mode dropdown (multiply, screen, overlay, etc.) on layers |
| 11 | pass | Duplicate; Copy to page dropdown; Ctrl+C/V clipboard across pages |
| 12 | pass | Spot-test: double-click opens inline textarea; blur ends edit |
| 13 | pass | Spot-test: Properties panel exposes font family, size, weight, style |
| 14 | pass | Upload TTF/OTF/WOFF/WOFF2; `@font-face` inject; fonts in document JSON |
| 15 | pass | Line height, letter spacing, paragraph spacing (px) |
| 16 | pass | Horizontal + vertical align (top/middle/bottom) in text box |
| 17 | pass | Auto-fit checkbox shrinks font to fit fixed box (export + canvas) |
| 18 | pass | Text on arc via SVG `textPath`; radius/sweep in Properties |
| 19 | pass | Drop shadow, outline stroke, text background color |
| 20 | pass | Text direction RTL/LTR in properties; browser shaping for Arabic paste |
| 21 | pass | File input accepts PNG/JPG/WebP/SVG/GIF; SVG vector paths; GIF raster via data URL |
| 22 | pass | Crop sliders + 4:5/1:1/16:9 presets; resize, rotation, flip H/V |
| 23 | pass | Brightness, contrast, saturation, exposure, temperature sliders on images |
| 24 | pass | Filter presets: grayscale, sepia, vintage, cool, warm (CSS filters) |
| 25 | pass | In-browser background removal (corner flood-fill) on image selection |
| 26 | pass | Photo slot placeholder (fixed aspect); fill via upload preserves frame |
| 27 | pass | Vectorize PNG → SVG path blocks (`vectorize.ts`) |
| 28 | pass | Built-in sticker/stock library with search + insert; optional URL manifest source |
| 29 | pass | Image mask shapes: circle, ellipse, rect (clip-path) |
| 30 | pass | Rectangle, ellipse, line, star, polygon |
| 31 | pass | Fill, stroke width, corner radius on rectangles |
| 32 | pass | Boolean union/subtract/intersect on rect+ellipse → path layer (`martinez`) |
| 33 | pass | Two-stop linear gradient fill on shapes |
| 34 | pass | SVG upload parses paths; per-path recolor in properties |
| 35 | pass | Save as template → localStorage library; open from Templates modal |
| 36 | pass | Template lock per layer; adopters cannot move/delete/edit locked layers |
| 37 | pass | `{var}` in text + template variable panel; resolved on canvas and export |
| 38 | pass | Brand kit colors + restrict palette toggle on color pickers |
| 39 | pass | Creator vs adopter role switch; adopter UI hides template authoring |
| 40 | pass | Template library: categories, search, open saved templates |
| 41 | pass | Export PNG, JPEG, WebP, PDF (raster or vector pdf-lib) from top bar |
| 42 | pass | Export DPI 96 / 150 / 300 (scale from 96 dpi baseline) |
| 43 | pass | CMYK + spot color modes on text/shapes/path; CMYK→RGB preview; export notes in vector PDF |
| 44 | pass | Page bleed (mm) + margin overlay; optional bleed in export |
| 45 | pass | PDF/X-4 best-effort toggle (pdf-lib metadata + sRGB intent notes) |
| 46 | pass | Crop marks on by default; solid trim marks at corners in export |
| 47 | pass | Vector PDF with embedded custom fonts + selectable text (pdf-lib); shapes/images raster underlay |
| 48 | pass | Export active page, all pages (multi-page PDF), or selection only |
| 49 | pass | Video mode: timeline scrubber, trim in/out, split at playhead |
| 50 | pass | Multi-track video + audio + overlay tracks in Video studio |
| 51 | pass | Text/sticker overlays on video (overlay track + sticker library in design mode) |
| 52 | pass | Load SRT → styled caption cues on preview/export |
| 53 | pass | Crossfade transition option between clips |
| 54 | pass | Export WebM via MediaRecorder (1080p/4K + FPS selector) |
| 55 | pass | AI panel: OpenAI key or dry-run gradient placeholder image |
| 56 | pass | AI inserts separate image + text layers (editable without regenerate) |
| 57 | pass | Brand template-only toggle locks AI layers on templates |
| 58 | pass | React app + `examples/vanilla/index.html` second host |
| 59 | pass | `platforms/react-native` + `platforms/flutter` thin shells (pinned deps) |
| 60 | pass | Headless `server/render.mjs` + Docker; `?headless=1` bridge |
| 61 | pass | `server/batch-render.mjs` CSV → PNG variants |
| 62 | pass | White-label: app title, logo, primary color, hide panels, vendor badge off |
| 63 | pass | Asset source: built-in or custom URL prefix + `manifest.json` |
| 64 | pass | UI EN/DE strings expanded (toolbar + export + modes) |
| 65 | pass | Skip link, main landmark, aria on canvas/export; keyboard undo/redo/delete |
| 66 | pass | Editing and storage are client-side (localStorage/JSON); no backend |
| 67 | pass | User-owned JSON download + optional remote PUT URL in document settings |
