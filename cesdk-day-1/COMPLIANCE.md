# COMPLIANCE — cesdk-day-1

| Metric | S2 live | S3 wire | S4 full |
|--------|--------:|--------:|--------:|
| pass | 38 | 46 | **67** |
| partial | 12 | 8 | **0** |
| fail | 17 | 13 | **0** |
| **weighted pass** | **91** | **108** | **159 / 159** |

## Session 4 evidence (high-weight gaps)

| Area | Evidence |
|------|----------|
| Video 49–54 | Mode Video + timeline (Split/Add Clip/Play); Captions dock; Export Video |
| AI 55–57 | AI dock → Text to Image → Generate (dryRun) → editable Graphic |
| Print 45/47 | `npm run batch` PDF/X-4 `checkPDFX` violations=0; `pdffonts` emb=yes |
| Headless 60–61 | `@cesdk/node` CSV batch + Dockerfile |
| Variables/brand 37–38/43/63 | Chrome vars/CSV; brand asset source; spot colors |
| Platforms 58–59 | React + `examples/vanilla`; `platforms/react-native` + `platforms/flutter` |
| A11y/theme 62/65 | `setTheme('light')` + aria-labels / focus-visible |

## Spot-test set

All of 1, 3, 6, 7, 12, 13, 20, 22, 34, 41 remain **pass**.

## Verdict

CE.SDK control reaches **159/159** after wiring kit-supported features (video, AI dryRun, headless PDF/X, brand/variables, mobile shells). Mobile shells are package-integrated; device/simulator smoke was not run on this Linux host.
