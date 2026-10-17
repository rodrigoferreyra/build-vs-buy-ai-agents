# Starting prompt (agent days)

Copy everything below the line into a new Agent chat. Open **only** this build folder as the Cursor workspace root. Do not enable IMG.LY agent skills or the `imgly_docs` MCP server.

---

You are building a browser design editor (Canva-like) from a blank folder.

## Constraints

- Stack: **React + TypeScript + Vite** only.
- Do **not** use CE.SDK, `@cesdk/*`, `@imgly/*`, or any IMG.LY product.
- Do **not** assume IMG.LY agent skills or docs MCP are available.
- Work against `checklist.csv` in this folder. Prioritize higher `weight` items first.
- Goal: maximize checklist passes in one working day.
- Keep a running note of attempted vs deferred items (e.g. `PROGRESS.md`).
- Prefer a runnable app over incomplete architecture. Ship something `npm install && npm run dev` can open.

## Timebox

- Working window: **6 hours** wall-clock from the start timestamp in `TIME_LOG.md`.
- When time is up: stop coding, fill `TIME_LOG.md` end time, leave the app in whatever state it is, and write a short `STOPPED.md` summarizing what works and what does not.

## Deliverables in this folder

1. A Vite React TypeScript app (create it yourself).
2. `TIME_LOG.md` with start/end and model name.
3. `PROGRESS.md` mapping checklist ids you touched.
4. A README with install/run steps.

Begin by scaffolding the Vite app, then implement canvas + documents, text, layers, images, undo, and export as far as the timebox allows.
