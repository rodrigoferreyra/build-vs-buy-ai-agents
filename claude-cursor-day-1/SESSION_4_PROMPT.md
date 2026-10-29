# Session 4 prompt

Open **only** this folder (`claude-cursor-day-1/`) as the Cursor workspace root. Model: **Claude Sonnet 5.5 High** (`claude-sonnet-5-5-high`). No IMG.LY skills, no `imgly_docs` MCP, no CE.SDK. Copy everything below the line into a new Agent chat. Record start time in `TIME_LOG.md` before it writes code.

---

This is Session 4 of the same build. Do not scaffold a new app. Do not restart from a blank folder. Continue the existing Vite + React + TypeScript editor in this workspace.

## Constraints

- Stack stays React + TypeScript + Vite.
- Do not use CE.SDK, `@cesdk/*`, `@imgly/*`, or any IMG.LY product.
- Do not assume IMG.LY agent skills or docs MCP are available.
- Do not copy code from `../cesdk-day-1`, `../cursor-day-1`, or any IMG.LY repo.
- Open source libraries are allowed.
- Work against `checklist.csv` in this folder. Score against `../shared/SCORING.md` if you can read it; otherwise use the copy of the rows in `PROGRESS.md`.
- Only a **pass** counts. Partial adds nothing. Prefer a real pass on a high-weight row over a thin pass on several low-weight rows.
- Keep `npm run build` green. Prefer a runnable app.

## Where we are

Sessions 1–3 already reached **123 / 159** (51 pass / 3 partial / 13 fail). Session 3 stopped because the model hit its usage limit while wrapping up, not because the remaining rows were impossible.

`STOPPED.md` and `PROGRESS.md` are the record. Read them, then `TIME_LOG.md`, then the remaining fail/partial rows in `PROGRESS.md`.

Deps already installed but not fully used: `imagetracerjs`, `onnxruntime-web`, `axe-core`, `@napi-rs/canvas`, `esbuild`. There is a stub `src/i18n.ts` and an empty `locales/de.ts`.

## Remaining rows (36 weight)

Do higher `weight` first.

| id | status | weight | what |
| --- | --- | --- | --- |
| 45 | fail | 3 | PDF/X-4 export |
| 58 | fail | 3 | Mount in a second framework (plain JS is enough as the second host) |
| 60 | fail | 3 | Headless Node.js + Docker render, no UI |
| 62 | fail | 3 | White-label: title, logo, colors, hide panels |
| 25 | partial | 3 | Background removal in the browser (today: flood fill, not ML) |
| 47 | partial | 3 | Embedded fonts + selectable text in PDF (RTL/effects still rasterised; system fonts not embedded) |
| 61 | partial | 3 | Batch from CSV (today: in the tab only; needs headless) |
| 55 | fail | 2 | Text-to-image in the editor with the user's own key (dry-run placeholder is OK if labeled) |
| 56 | fail | 2 | AI result as editable layers, no regenerate to move them |
| 57 | fail | 2 | AI limited to brand templates |
| 59 | fail | 2 | React Native and/or Flutter shell that opens this design |
| 63 | fail | 2 | Custom asset source (URL + manifest is enough) |
| 64 | fail | 2 | German UI strings |
| 18 | fail | 1 | Text on a path |
| 27 | fail | 1 | Vectorize a raster logo to paths |
| 65 | fail | 1 | Keyboard / ARIA so canvas tools are reachable |

Goal: pass as many of these as you can, toward **159 / 159**. If the budget runs out again, stop, leave the app building, and write the wrap.

## How to work

1. Append a Session 4 block to `TIME_LOG.md` now: model `Claude Sonnet 5.5 High` (`claude-sonnet-5-5-high`), start timestamp, this folder. Do not overwrite Sessions 1–3.
2. Implement remaining rows, highest weight first.
3. After each cluster of rows, `npm run build`.
4. Re-score in `PROGRESS.md` (status + notes). Update `STOPPED.md` with what Session 4 added and what is still open.
5. When you stop (rows closed, or usage limit): fill TIME_LOG end time and duration, leave weighted pass / remaining weight in STOPPED.md.

Begin. Do not wait for extra confirmation.
