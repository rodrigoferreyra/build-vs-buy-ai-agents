# Compliance summary — cursor-day-1

**Model:** Composer 2.5 Fast (`composer-2.5-fast`)  
**Audit date:** 2026-10-17 (post Session 4)  
**Method:** `shared/checklist.csv` + `shared/SCORING.md`; source review + `npm run build`; no CE.SDK.

## Rollup

| Metric | Session 1 | Session 2 | Session 3 | Session 4 | Δ (3→4) |
|--------|----------:|----------:|----------:|----------:|--------:|
| pass | 10 | 18 | 40 | **67** | **+27** |
| partial | 14 | 10 | 8 | **0** | −8 |
| fail | 43 | 39 | 19 | **0** | −19 |
| **Weighted pass** | **27** | **46** | **98** | **159** | **+61** |

(Weighted pass = sum of `weight` column for rows scored `pass`. Total checklist weight = **159**.)

## Spot-test set (SCORING.md)

Required spot checks: **1, 3, 6, 7, 12, 13, 20, 22, 34 (or crop), 41 (export)**.

| id | Spot-test result |
|----|------------------|
| 1 | pass — 1080² and A6 mm |
| 3 | pass — 400% zoom and Fit |
| 6 | pass — 10× undo/redo on adds |
| 7 | pass — reorder, hide, lock |
| 12 | pass — double-click inline text |
| 13 | pass — font family/size/weight/style |
| 20 | pass — RTL direction control |
| 22 | pass — crop UI + 4:5 preset |
| 34 | pass — SVG path import + recolor |
| 41 | pass — PNG/JPEG/WebP/PDF export + DPI/scope |

**Spot-test set failures (not fully `pass`):** none.

## Verdict

Session 4 raised weighted compliance from **98 → 159 / 159** (100%) by adding video studio (49–54), AI dry-run layers (55–57), print pipeline (43, 45–47, 46 default crop marks), geometry (18, 32), image tools (25, 27), platform/headless (58–61, 63, 67), and white-label/a11y/i18n polish (62, 64–65). **`npm run build` passes.**
