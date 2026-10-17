# cursor-day-1 agent transcript notes

## Session 1

- Thin MVP: Vite + React editor, pages, layers, text/shapes/images, PNG export, localStorage/JSON.
- ~2 min wall clock; weighted pass 27/159.

## Session 2

- **Export (41):** PNG, JPEG, WebP, and PDF via canvas render + `jspdf`; format picker in top bar.
- **Image crop (22):** Normalized crop sliders, 4:5 / 1:1 / 16:9 presets, live preview with crop rect; export respects crop.
- **RTL (20):** Text `direction` ltr/rtl in properties; `dir` + `unicode-bidi` on canvas and export.
- **Group / ungroup (8):** Shared `groupId`; select group as one; multi-element drag.
- **Align / distribute (9):** Align L/C/R and distribute H/V for 2+ / 3+ selection.
- **Custom fonts (14):** TTF/OTF/WOFF upload, `@font-face` inject, persisted on document, font dropdown.
- **Shapes (30):** Line, star, polygon tools added alongside rect/ellipse.
- **Gradients (33):** Linear two-stop gradient on shapes (solid vs gradient fill type).
- Dependency: `jspdf` for PDF.
- `npm run build` succeeded at session end.
