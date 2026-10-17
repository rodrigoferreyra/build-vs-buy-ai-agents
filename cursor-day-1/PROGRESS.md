# Checklist progress (cursor-day-1)

Agent: **Composer 2.5 Fast** (`composer-2.5-fast`). Re-scored after Session 2 implementation + source review (2026-10-16).

| id | status | notes |
|----|--------|-------|
| 1 | pass | Spot-test: 1080² and A6 mm presets create correct page sizes; px and mm only (no inch unit) |
| 2 | pass | + Page, ←/→ reorder, delete page all work |
| 3 | pass | Spot-test: Zoom + reaches 400%; Fit rescales viewport |
| 4 | partial | Snap to page center/edges and element bounds on drag; no rulers, manual guides, or drag-to-guide |
| 5 | pass | Save/load localStorage and JSON import/export round-trip; custom JSON, not CE `.scene` |
| 6 | pass | Spot-test: 10 rect adds, 10 undos → 0 layers, 10 redos → 10 layers |
| 7 | pass | Spot-test: layer list reorder (↑/↓), hide (👁), lock (🔒) |
| 8 | pass | Group / Ungroup in toolbar; shared `groupId`; group selects and moves together |
| 9 | pass | Shift+click multi-select; Align L/C/R and Dist H/V for 2+ / 3+ elements |
| 10 | partial | Opacity slider per layer; no blend modes |
| 11 | partial | Duplicate offsets selection on same page; no copy/paste to another page |
| 12 | pass | Spot-test: double-click opens inline textarea; blur ends edit |
| 13 | pass | Spot-test: Properties panel exposes font family, size, weight, style |
| 14 | pass | Upload TTF/OTF/WOFF/WOFF2; `@font-face` inject; fonts in document JSON |
| 15 | partial | Line height and letter spacing; no paragraph spacing control |
| 16 | partial | Horizontal text align only; no vertical alignment in box |
| 17 | fail | No auto-fit / shrink-to-box |
| 18 | fail | No text on path / curved text |
| 19 | partial | Toggle drop shadow and WebKit outline stroke; no text background effect |
| 20 | pass | Text direction RTL/LTR in properties; browser shaping for Arabic paste |
| 21 | partial | File input accepts PNG/JPG/WebP/SVG/GIF; SVG stored as raster `<img>`; not all formats exercised in QA |
| 22 | pass | Crop sliders + 4:5/1:1/16:9 presets; resize, rotation, flip H/V |
| 23 | fail | No brightness/contrast/saturation/exposure/temperature sliders |
| 24 | fail | No filters or LUTs |
| 25 | fail | No in-browser background removal |
| 26 | fail | No fixed-ratio image placeholder frames |
| 27 | fail | No raster-to-vector |
| 28 | fail | No stock/sticker library |
| 29 | fail | No shape masks / image frames |
| 30 | pass | Rectangle, ellipse, line, star, polygon |
| 31 | pass | Fill, stroke width, corner radius on rectangles |
| 32 | fail | No boolean path operations |
| 33 | pass | Two-stop linear gradient fill on shapes |
| 34 | fail | Spot-test: SVG uploads as flat image; paths not editable/recolorable |
| 35 | fail | No save-as-template flow |
| 36 | fail | Layer lock only; no creator/adopter template locks |
| 37 | fail | No `{variable}` text/data fill at render |
| 38 | fail | No brand kit / palette restriction |
| 39 | fail | No creator vs adopter roles |
| 40 | fail | No template library |
| 41 | pass | Export PNG, JPEG, WebP, PDF (canvas + jspdf) from top bar |
| 42 | fail | No DPI/resolution export option |
| 43 | fail | No CMYK or spot colors |
| 44 | fail | No bleed/margin |
| 45 | fail | No PDF/X export |
| 46 | fail | No crop marks |
| 47 | fail | No PDF export / embedded-font verification |
| 48 | fail | No export selection or single-page picker (exports active page only) |
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
| 62 | partial | Custom dark chrome; no theming API or vendor-branding removal story |
| 63 | fail | No pluggable asset sources (S3, etc.) |
| 64 | fail | English UI only |
| 65 | fail | No WCAG keyboard/screen-reader pass |
| 66 | pass | Editing and storage are client-side (localStorage/JSON); no backend |
| 67 | partial | JSON file + localStorage persistence; no user-owned cloud bucket |
