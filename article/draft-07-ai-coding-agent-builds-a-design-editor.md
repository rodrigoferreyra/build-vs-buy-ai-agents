# We Asked an AI Coding Agent to Build a Design Editor. Here Is What It Built and What Was Missing

**Subtitle:** Claude (in Cursor) and Composer each got the same checklist in continuous sessions. The same checklist built with CE.SDK is the control. Transcripts, scores, and builds are in the companion repo.

**Status:** Draft for IMG.LY review · Experiment updated 2026-10-17 (Composer session 3) · Not a literal 6-hour wall-clock day (see time logs).

## The build-vs-buy question in 2026

This write-up contains three runnable builds, one shared feature checklist (67 requirements, weight sum 159), session transcripts, and scored results.

| Build | Approach | Model |
|-------|----------|-------|
| `claude-cursor-day-1` | From scratch, no CE.SDK | Claude Sonnet 5.5 High |
| `cursor-day-1` | From scratch, no CE.SDK | Composer 2.5 Fast |
| `cesdk-day-1` | CE.SDK design editor + agent skills | Parent agent + `/cesdk:build` workflow |

Local run:

```bash
cd claude-cursor-day-1 && npm i && npm run dev
cd cursor-day-1 && npm i && npm run dev
cd cesdk-day-1  # set VITE_CESDK_LICENSE in .env
npm i && npm run dev
```

Screenshots: `results/screenshots/`.

## The setup: sessions, one checklist, three builds

- Checklist: `shared/checklist.csv` (from IMG.LY).
- Agent starting prompt: `shared/STARTING_PROMPT.md` (identical for both agent builds).
- Protocol: `shared/PROTOCOL.md` — multi-session accumulation; durations in each `TIME_LOG.md`.
- Scoring: `shared/SCORING.md` — pass / partial / fail.

**Logged agent time (not 6h wall-clock):** Claude ~43 minutes across 2 sessions; Composer ~8 minutes across 3 sessions (session 3 ~4 min); CE.SDK scaffold plus licensed live spot-test.

## Results

| | Claude | Composer | CE.SDK |
|--|-------:|---------:|-------:|
| **Pass count (of 67)** | 45 | 40 | 38 |
| **Weighted pass (of 159)** | **110** | **98** | **91** |

Full table: `results/checklist-scored.csv`.

### How to read this

After three short sessions, Composer reached **98** weighted — close to Claude’s **110** and above this CE.SDK kit’s **91**. Claude still leads on depth (LUTs, boolean ops, CMYK/spot, stronger PDF paths). CE.SDK’s control loads a production design editor immediately; remaining fails are mostly video, generative AI, mobile/server/batch, and print PDF/X extras not wired in this kit.

> Note: Claude’s weighted score (110) exceeds CE.SDK’s kit score (91). That does **not** mean a from-scratch editor beats CE.SDK in production. It reflects self-scoring on client-side approximations, scoring this *specific* design-editor app rather than the whole product family, and short session budgets.

## What the coding agents built well

**Composer:** documents (px/mm), pan/zoom, layers, undo, text/shapes; session 2 added group/align, crop, RTL, custom fonts, PNG/JPEG/WebP/PDF export; session 3 added templates/brand/variables, image adjustments/filters/masks/stock, text auto-fit, rulers/guides, blend modes, export DPI/bleed/scope.

**Claude (“Canvasly”):** templates, brand, variables/batch export, stock library, LUTs, boolean ops, CMYK/spot fills, crop marks.

## Where each agent stopped

See per-build `STOPPED.md` and `transcripts/*`. Recurring gaps: PDF/X preflight, ML background removal, video, headless/server batch, mobile packaging, accessibility audits.

## Features that do not show up in a short session budget

Cross-device undo, large-document performance, PDF font embedding fidelity, mobile editors, WCAG AA, security reviews. Video (49–54) and most platform rows stay near zero for agent builds.

## How to reproduce

1. Clone the companion repo.
2. Agent day: open only that folder, no IMG.LY skills/MCP, locked model, paste `STARTING_PROMPT.md`, append `TIME_LOG.md`.
3. CE.SDK day: skills + MCP OK, `VITE_CESDK_LICENSE` in `.env`.
4. Score with `shared/SCORING.md`.

## When building with an agent is the right call

- Prototype / internal tool with a thin feature slice.
- Spike before an SDK evaluation.
- CE.SDK integration *with* agent skills (the control path).

## FAQ (stubs)

**Fair prompt?** Same `STARTING_PROMPT.md` and checklist; no CE.SDK on agent days.

**Would more time close the gap?** Claude 87→110 (session 2); Composer 27→46→98 across three sessions (~8 min total). Session 3 closed much of the Claude gap without approaching a 6h wall day.

**Agent + CE.SDK?** Yes — that is the control workflow.

**Partial?** See `shared/SCORING.md`.

## Next steps

- Local repo: `build-vs-buy-ai-agents` (push when ready)
- CE.SDK trial + `cesdk-day-1`
- Agent skills: https://img.ly/docs/cesdk/js/get-started/cesdk-plugin-coding-agents-c0d3ag/

---

*Draft from experiment artifacts. Add IMG.LY case-study numbers when available.*
