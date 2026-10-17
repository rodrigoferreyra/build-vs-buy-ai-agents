# Compliance summary — cursor-day-1

**Model:** Composer 2.5 Fast (`composer-2.5-fast`)  
**Audit date:** 2026-10-17 (post Session 3)  
**Method:** `shared/checklist.csv` + `shared/SCORING.md`; source review + build verification; no CE.SDK.

## Rollup

| Metric | Session 1 | Session 2 | Session 3 | Δ (2→3) |
|--------|----------:|----------:|----------:|--------:|
| pass | 10 | 18 | 40 | +22 |
| partial | 14 | 10 | 8 | −2 |
| fail | 43 | 39 | 19 | −20 |
| **Weighted pass** | **27** | **46** | **98** | **+52** |

(Weighted pass = sum of `weight` column for rows scored `pass`. Total checklist weight = 159.)

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
| 34 | **pass** — SVG path import + recolor |
| 41 | pass — PNG/JPEG/WebP/PDF export + DPI/scope |

**Spot-test set failures (not fully `pass`):** none.

## Verdict

Session 3 raised weighted compliance from **46 → 98 / 159** (~62%) by implementing templates/brand (35–40), image adjustments/filters/masks/stock (23–24, 26, 28–29, 34), text layout (15–17, 19), export print-adjacent options (42, 44, 48, partial 46), layers (10–11), and canvas rulers/guides (4). Video, AI, mobile, headless, and deep print (CMYK, PDF/X, font embedding) remain out of scope.
