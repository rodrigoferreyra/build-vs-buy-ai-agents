# Checklist compliance: claude-cursor-day-1

Auditor: Claude Sonnet 5.5 High (`claude-sonnet-5-5-high`) · 2026-10-16 · against `shared/checklist.csv` (67 rows) with `shared/SCORING.md`. Scores come from the running app (dev server on port 5183, UI clicks, simulated pointer drags, DOM/state inspection). CE.SDK was not used. Per-row evidence is in `PROGRESS.md`.

## Counts

| status | count |
|--------|-------|
| pass | 51 |
| partial | 3 |
| fail | 13 |
| n/a | 0 |
| **total** | **67** |

- **Weighted pass** (sum of `weight` where status = pass): **123** of 159 possible (about 77 %). *(Session 2: 110; Session 1: 87.)*
- Weight of partials (not counted): 9. Weight of fails: 27.
- Partial ids: 25, 47, 61.
- Fail ids: 18, 27, 45, 55–60, 62–65.
- **Updated after Session 3:** video rows 49–54 → pass (+13 weight). Session 2 improved 20, 24, 28, 32, 34, 37, 38, 41, 43, 46 → pass; 25, 47, 61 → partial. Spot-test table below is still the Session 1 snapshot. See `PROGRESS.md` for evidence.

## Spot-test set (1, 3, 6, 7, 12, 13, 20, 22, 34, 41-export)

| id | status | result |
|----|--------|--------|
| 1 | pass | 1080×1080 px and A6 105×148 mm both created |
| 3 | pass | 400 % zoom and Fit work |
| 6 | pass | 10 edits undone to exact base JSON, redone to exact final JSON |
| 7 | pass | reorder, hide, lock verified |
| 12 | pass | inline contentEditable, commit on blur (OS typing not drivable in harness) |
| 13 | pass | family/size/weight/style changed on one block |
| 20 | **partial** | Arabic shapes correctly (browser), but no RTL direction/alignment handling |
| 22 | pass | 4:5 crop, 15° rotate, flip (no interactive crop handles) |
| 34 | **fail** | SVG imported as flat image; no editable parts, cannot recolour a path |
| 41 | **partial** | PNG, JPEG, WebP export; PDF missing, so "all four" not met |

**Ids that do not fully pass the spot-test set: 20 (partial), 34 (fail), 41 (partial).** 7 of 10 pass.

## Verdict

The build is a credible 2D raster-design editor and passes most of the core image-editor rows: custom-size documents, pages, zoom/pan, snapping, undo/redo, layers, grouping, align/distribute, blend/opacity, inline text with fonts and effects, custom font upload, image placeholders and masks, shapes with gradients, templates with locked elements and creator/adopter roles, local save/reload, and client-side PNG/JPEG/WebP export at chosen DPI with bleed. It does not meet the checklist beyond that: there is no PDF/PDF-X, CMYK/spot colour, crop marks, or embedded-font output (print rows 43, 45–47), no video, audio or AI (49–57), no background removal, vectorizing, boolean ops, text-on-path or editable SVG parts (18, 25, 27, 32, 34), and none of the platform rows except client-only data handling and a simple PUT/GET to a user URL (58–65). Weaknesses inside passed rows are minor but real: RTL has no direction support, GIFs are first-frame only, snapping is move-only, brand kit covers colours only, and variables are manual text only. Overall compliance is about 52 % by row count and 55 % by weight, and it fails the print-ready and video/AI/platform tiers entirely.
