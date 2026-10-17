# claude-cursor-day-1 — compliance audit summary

- **Auditor model:** Claude Sonnet 5.5 High (`claude-sonnet-5-5-high`), in Cursor, as a subagent
- **Date:** 2026-10-16
- **Scope:** `claude-cursor-day-1/` against `shared/checklist.csv` (67 rows) using `shared/SCORING.md`. CE.SDK not used.
- **Method:** read the checklist and the app source (`store.ts`, `render.ts`, `Canvas.tsx`, `Inspector.tsx`, `Dialogs.tsx`, `LeftPanel.tsx`, `LayersPanel.tsx`, `fonts.ts`, `upload.ts`, `templates.ts`), ran `npm run dev -- --host 127.0.0.1 --port 5183`, and re-tested in the in-IDE browser with real button clicks, simulated pointer drags (move/snap/group), file uploads of generated PNG/JPG/WebP/SVG/GIF, a real TTF through the font loader, export dialog downloads (intercepted), template/role flows, and a PUT/GET round trip to a local CORS HTTP endpoint. Prior PROGRESS.md claims were not trusted.

## Result

```json
{ "pass": 35, "partial": 6, "fail": 26, "weighted_pass": 87 }
```

- Weighted pass 87 of 159 total weight. Partial ids: 20, 24, 28, 37, 38, 41. 
- Spot-test set: 1, 3, 6, 7, 12, 13, 22 pass; 20 partial (no RTL direction), 34 fail (SVG not editable), 41 partial (no PDF).

## Changes vs the earlier self-assessment (22 pass / 19 partial / 26 fail)

Promoted to pass after exercising them: 4, 7, 11, 12, 14, 21, 22, 23, 35, 36, 39, 40, 42, 44, 67 (plus 5, 6, 8, 9 re-confirmed). Kept partial: 20, 24, 28, 37, 38, 41. 26 fails unchanged in substance (video, AI, PDF/CMYK/crop marks, platform rows, background removal, vectorize, boolean, text on path, SVG parts).

## Caveats

- OS-level keystroke typing and native file-picker dialogs could not be driven from the browser harness; text commit used `insertText` + blur, and uploads/fonts used the same code path programmatically.
- Screenshots timed out in the shared browser, so verification is DOM/state/pixel based rather than visual.
- Test-only artifacts: a temporary copy of a system TTF was added to `public/` and removed; a throwaway Python CORS server in `/tmp` and the vite dev server on 5183 were started and could not be killed from the sandbox.
- Files written: `claude-cursor-day-1/PROGRESS.md`, `claude-cursor-day-1/COMPLIANCE.md`, this file.
