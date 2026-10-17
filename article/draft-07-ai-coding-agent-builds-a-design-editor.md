# We Asked an AI Coding Agent to Build a Design Editor. Here Is What It Built and What Was Missing

**Subtitle:** Claude (in Cursor) and Composer each got the same checklist in continuous sessions. The same checklist built with CE.SDK is the control. Transcripts, scores, and builds are in the companion repo.

**Status:** Draft for IMG.LY review · Experiment updated 2026-10-17 (Composer + CE.SDK at 159/159) · Not a literal 6-hour wall-clock day (see time logs).

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

**Logged agent time (not 6h wall-clock):** Claude ~43 minutes across 2 sessions; Composer ~12 minutes across 4 sessions; CE.SDK scaffold + live spot-test + Sessions 3–4 kit wiring.

## Results

| | Claude | Composer | CE.SDK |
|--|-------:|---------:|-------:|
| **Pass count (of 67)** | 45 | **67** | **67** |
| **Weighted pass (of 159)** | **110** | **159** | **159** |

Full table: `results/checklist-scored.csv`.

### How to read this

Composer and CE.SDK both hit **159/159** on this checklist. That does **not** mean a ~12-minute from-scratch agent equals a production SDK: Composer’s passes include dry-run AI, WebM (not always H.264 MP4), best-effort PDF/X metadata, and mobile *shells*—self-scored against the same rubric. CE.SDK’s 159 is the commercial surface once features are enabled. Claude (**110**) stopped earlier under the Other-models budget. The article still turns on *how* each path gets there and what “pass” hides.

> Note: Equal weighted scores can mask unequal production readiness. Prefer reading `PROGRESS.md` notes and spot-tests alongside the rollup.

## What the coding agents built well

**Composer:** sessions 1–3 built a full design MVP (templates/brand, images, export); session 4 closed video studio, AI dry-run layers, vector PDF/PDF-X options, CMYK/spot, boolean/text-on-path, headless CSV batch, and platform shells to **159/159**.

**Claude (“Canvasly”):** templates, brand, variables/batch export, stock library, LUTs, boolean ops, CMYK/spot fills, crop marks.

## Where each agent stopped

See per-build `STOPPED.md` and `transcripts/*`. Claude still stops short of video/AI/platform depth. Composer and CE.SDK claim full checklist coverage with different fidelity behind each pass.

## Features that do not show up in a short session budget

Cross-device undo, large-document performance, print-shop PDF/X certification, real mobile device QA, WCAG AA audits, security reviews—even when the weighted rollup reads 159.

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

**Would more time close the gap?** Claude 87→110; Composer 27→46→98→**159** across four short sessions (~12 min). Checklist completeness can converge quickly; production fidelity still diverges.

**Agent + CE.SDK?** Yes — that is the control workflow.

**Partial?** See `shared/SCORING.md`.

## Next steps

- Local repo: `build-vs-buy-ai-agents` (push when ready)
- CE.SDK trial + `cesdk-day-1`
- Agent skills: https://img.ly/docs/cesdk/js/get-started/cesdk-plugin-coding-agents-c0d3ag/

---

*Draft from experiment artifacts. Add IMG.LY case-study numbers when available.*
