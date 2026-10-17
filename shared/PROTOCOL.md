# Experiment protocol (locked)

## Models

| Build | Model ID (Cursor subagent / chat) | Display name |
|-------|-----------------------------------|--------------|
| `claude-cursor-day-1` | `claude-sonnet-5-5-high` | Claude Sonnet 5.5 High |
| `cursor-day-1` | `composer-2.5-fast` | Composer 2.5 Fast |
| `cesdk-day-1` | parent agent / inherit | Whatever model drives the CE.SDK session |

## Timebox

- Target: accumulate toward **~6 hours** of agent work per build via **multiple continuous sessions** (not necessarily one unbroken run).
- Append each session as a new block in that build’s `TIME_LOG.md` (start, end, duration, model).
- Session N continues from existing code + `PROGRESS.md` — do not restart from blank.
- CE.SDK control: same logging; skills/MCP allowed; license via `.env` only.

## Clean workspace checklist (agent days)

Before starting `claude-cursor-day-1` or `cursor-day-1`:

1. Open **only** that build folder as the Cursor workspace root (not the monorepo root, not `nuevo`).
2. Confirm there is **no** `.agents/skills` / CE.SDK plugin in that workspace.
3. Confirm **no** `imgly_docs` MCP entry in that workspace’s `.cursor/mcp.json` (omit the file entirely).
4. Paste `STARTING_PROMPT.md` as the first user message.
5. Record model name + start time in `TIME_LOG.md` before any code is written.
6. Do not copy code from `cesdk-day-1` or from IMG.LY repos during the day.

## CE.SDK day extras

1. Skills + `imgly_docs` MCP allowed.
2. Use `/cesdk:build` (or the build skill) toward a Canva-clone-level design editor.
3. License key only via `.env` / `VITE_CESDK_LICENSE_KEY` — never commit secrets.
4. Reference targets:
   - https://img.ly/blog/how-to-build-a-canva-clone-with-ce-sdk/
   - https://img.ly/docs/cesdk/react/prebuilt-solutions/canva-clone-19de75/
   - https://github.com/imgly/canva-clone-react-cesdk

## Wrap (2026-10-16)

Further Claude/Composer sessions stopped to conserve Cursor “Other models” quota. CE.SDK live re-score and article draft completed on the parent agent only.
