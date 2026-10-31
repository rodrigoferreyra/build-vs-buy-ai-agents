# Experiment status — all three builds at full checklist weight

**Status:** Composer Session 4, CE.SDK Session 4, and Claude Session 4 all **159 / 159**. Claude Sessions 1–3 were Claude Sonnet 5.5 High and stopped at **123 / 159** on the usage limit. Session 4 continued the same folder as **Claude Opus 5.5** (Sonnet was requested; the model change is in `TIME_LOG.md`).

## Final scores

| Build | pass | weighted / 159 | Logged agent time |
|-------|-----:|---------------:|-------------------|
| Claude | **67** | **159** | ~6 h 03 min (4 sessions; S1–S3 Sonnet ~61 min at 123; S4 Opus ~5 h 02 min, ~1 h of that waiting on Android SDK / emulator downloads) |
| Composer | **67** | **159** | ~12 min (4 sessions; S4 ~4 min) |
| CE.SDK | **67** | **159** | scaffold + live + S3/S4 wire |

## Article framing

Multiple continuous sessions, not a literal 6-hour wall-clock day. Agent builds forbid CE.SDK. Perfect checklist scores are self-scored; a second agent rechecked earlier sessions. Claude Session 4 is self-scored. Composer’s 159 is a from-scratch app (video/AI/PDF approximations). CE.SDK’s 159 reflects enabling the commercial product surface. Claude’s 159 includes the Session 4 platform, print, AI and accessibility rows; the output files still have the same system gaps as the other agent-only build.
