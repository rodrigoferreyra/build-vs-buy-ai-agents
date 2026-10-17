# Spot-test notes

Date: 2026-10-16 · Ports 5173 (Claude), 5174 (Composer), 5176 (CE.SDK)

Shared ids: **1, 3, 6, 7, 12, 13, 20, 22, 34, 41**

## claude-cursor-day-1

| id | Result |
|----|--------|
| 1 | pass — 1080×1080 UI |
| 3 | pass — zoom 76% / Fit / 400% option |
| 6 | pass — Undo enabled after add text |
| 7 | pass — Layers tab |
| 12 | pass — Add heading on canvas |
| 13 | pass — font/size/weight inspector |
| 20 | pass (session 2) — RTL control |
| 22 | pass (session 2) — crop |
| 34 | pass (session 2) — editable SVG parts (self-scored) |
| 41 | pass (session 2) — PNG/JPEG/WebP/PDF |

Screenshot: `screenshots/claude-cursor-day-1-editor.png`

## cursor-day-1

| id | Result |
|----|--------|
| 1 | pass — 1080² / A6 mm |
| 3 | pass — Fit / Zoom |
| 6 | pass — Undo |
| 7 | pass — Layers list |
| 12 | pass — Text on canvas |
| 13 | pass — Inter / size / weight |
| 20 | pass (session 2) — LTR/RTL |
| 22 | pass (session 2) — crop |
| 34 | fail — SVG not path-editable |
| 41 | pass (session 2) — PNG/JPEG/WebP/PDF dropdown |

Screenshot: `screenshots/cursor-day-1-editor.png`

## cesdk-day-1

| id | Result |
|----|--------|
| 1–7,12,13,22,41 | pass — licensed design editor + demo scene + dock/export (live) |
| 20 | pass — engine RTL (not Arabic-harnessed this pass) |
| 34 | pass — vector/SVG library path |

Screenshot: `screenshots/cesdk-day-1-editor.png`

## Rollup after live CE.SDK re-score

| Build | pass | partial | fail | weighted |
|-------|-----:|--------:|-----:|---------:|
| Claude | 45 | 3 | 19 | 110 |
| Composer | 18 | 10 | 39 | 46 |
| CE.SDK | 38 | 12 | 17 | 91 |
