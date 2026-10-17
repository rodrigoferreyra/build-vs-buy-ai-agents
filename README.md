# build-vs-buy-ai-agents

Companion repo for the IMG.LY experiment: two coding-agent builds vs one CE.SDK control, scored on the same feature checklist.

**Status:** Wrapped · see [`results/STATUS.md`](./results/STATUS.md)

## Builds

| Folder | Role | Model | Weighted pass / 159 |
|--------|------|-------|--------------------:|
| [`claude-cursor-day-1/`](./claude-cursor-day-1/) | Agent (no CE.SDK) | Claude Sonnet 5.5 High | 123 |
| [`cursor-day-1/`](./cursor-day-1/) | Agent (no CE.SDK) | Composer 2.5 Fast | **159** |
| [`cesdk-day-1/`](./cesdk-day-1/) | Control | CE.SDK 1.83.0 design editor | **159** |

## Run locally

```bash
cd claude-cursor-day-1 && npm i && npm run dev   # :5173
cd cursor-day-1 && npm i && npm run dev          # :5174
cd cesdk-day-1
# .env with VITE_CESDK_LICENSE=... (never commit)
npm i && npm run dev                             # :5176
```

## Artifacts

| Path | What |
|------|------|
| [`shared/`](./shared/) | Checklist, prompt, protocol, scoring |
| [`results/checklist-scored.csv`](./results/checklist-scored.csv) | Full scores |
| [`results/RESULTS.md`](./results/RESULTS.md) | Rollup |
| [`results/SPOT_TEST.md`](./results/SPOT_TEST.md) | Live spot-tests |
| [`results/screenshots/`](./results/screenshots/) | Article screenshots |
| [`article/draft-07-ai-coding-agent-builds-a-design-editor.md`](./article/draft-07-ai-coding-agent-builds-a-design-editor.md) | Article draft |
| [`transcripts/`](./transcripts/) | Session notes |

## Framing

Not a literal 6-hour wall-clock day. **Multiple continuous sessions**; durations in each build’s `TIME_LOG.md`. Agent builds: no IMG.LY skills/MCP. Control: CE.SDK + skills.

## License keys

CE.SDK trial via `.env` only. `.gitignore` excludes `.env`.
