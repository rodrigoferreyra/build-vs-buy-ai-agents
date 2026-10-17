# Compliance summary — cursor-day-1

**Model:** Composer 2.5 Fast (`composer-2.5-fast`)  
**Audit date:** 2026-10-16 (post Session 2)  
**Method:** `shared/checklist.csv` + `shared/SCORING.md`; source review + build verification; no CE.SDK.

## Rollup

| Metric | Session 1 | Session 2 | Δ |
|--------|----------:|----------:|--:|
| pass | 10 | 18 | +8 |
| partial | 14 | 10 | −4 |
| fail | 43 | 39 | −4 |
| **Weighted pass** | **27** | **46** | **+19** |

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
| 20 | **pass** — RTL direction control |
| 22 | **pass** — crop UI + 4:5 preset |
| 34 | **fail** — SVG not path-editable |
| 41 | **pass** — PNG/JPEG/WebP/PDF export |

**Spot-test set failures (not fully `pass`):** 34 only.

## Verdict

Session 2 raised weighted compliance from **27 → 46 / 159** (~29%) by closing high-weight gaps in export, image crop, typography (RTL, custom fonts), selection (group, align), and vector basics (extra shapes, gradients). The editor remains far from CE.SDK-class coverage on templates, print, video, AI, and platform depth, but core design workflows are materially stronger than the Session 1 MVP.
