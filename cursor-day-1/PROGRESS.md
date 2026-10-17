# Checklist progress (cursor-day-1)

Agent: **Composer 2.5 Fast** (`composer-2.5-fast`). Re-scored after Session 3 implementation + source review (2026-10-17).

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
| 18 | fail | No text on path / curved text |
| 19 | pass | Drop shadow, outline stroke, text background color |
| 20 | pass | Text direction RTL/LTR in properties; browser shaping for Arabic paste |
| 21 | partial | File input accepts PNG/JPG/WebP/SVG/GIF; SVG can import as vector paths or raster fallback |
| 22 | pass | Crop sliders + 4:5/1:1/16:9 presets; resize, rotation, flip H/V |
| 23 | pass | Brightness, contrast, saturation, exposure, temperature sliders on images |
| 24 | pass | Filter presets: grayscale, sepia, vintage, cool, warm (CSS filters) |
| 25 | fail | No in-browser background removal |
| 26 | pass | Photo slot placeholder (fixed aspect); fill via upload preserves frame |
| 27 | fail | No raster-to-vector |
| 28 | pass | Built-in sticker/stock library with search + insert |
| 29 | pass | Image mask shapes: circle, ellipse, rect (clip-path) |
| 30 | pass | Rectangle, ellipse, line, star, polygon |
| 31 | pass | Fill, stroke width, corner radius on rectangles |
| 32 | fail | No boolean path operations |
| 33 | pass | Two-stop linear gradient fill on shapes |
| 34 | pass | SVG upload parses paths; per-path recolor in properties |
| 35 | pass | Save as template → localStorage library; open from Templates modal |
| 36 | pass | Template lock per layer; adopters cannot move/delete/edit locked layers |
| 37 | pass | `{var}` in text + template variable panel; resolved on canvas and export |
| 38 | pass | Brand kit colors + restrict palette toggle on color pickers |
| 39 | pass | Creator vs adopter role switch; adopter UI hides template authoring |
| 40 | pass | Template library: categories, search, open saved templates |
| 41 | pass | Export PNG, JPEG, WebP, PDF (canvas + jspdf) from top bar |
| 42 | pass | Export DPI 96 / 150 / 300 (scale from 96 dpi baseline) |
| 43 | fail | No CMYK or spot colors |
| 44 | pass | Page bleed (mm) + margin overlay; optional bleed in export |
| 45 | fail | No PDF/X export |
| 46 | partial | Optional crop marks on export (trim marks at page corners) |
| 47 | partial | PDF is flattened JPEG image; no selectable/embedded vector text |
| 48 | pass | Export active page, all pages (multi-page PDF), or selection only |
| 49 | fail | No video timeline |
| 50 | fail | No multi-track video/audio |
| 51 | fail | No video overlays |
| 52 | fail | No captions / SRT |
| 53 | fail | No transitions |
| 54 | fail | No MP4 export |
| 55 | fail | No text-to-image |
| 56 | fail | No AI layer workflow |
| 57 | fail | No brand-scoped AI generation |
| 58 | partial | React + Vite web app only; not mounted in a second framework |
| 59 | fail | No mobile clients |
| 60 | fail | No headless Node/Docker render |
| 61 | fail | No CSV batch render |
| 62 | partial | Dark/light theme toggle; custom chrome, not full white-label API |
| 63 | fail | No pluggable asset sources (S3, etc.) |
| 64 | partial | English + partial German strings on key toolbar labels |
| 65 | partial | Basic aria-labels on primary actions; no full WCAG audit |
| 66 | pass | Editing and storage are client-side (localStorage/JSON); no backend |
| 67 | partial | JSON file + localStorage persistence; no user-owned cloud bucket |
