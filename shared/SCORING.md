# Checklist scoring rubric

Score every row in `checklist.csv` the same way for all three builds.

| Score | Meaning |
|-------|---------|
| `pass` | Test step succeeds without workarounds that change the requirement |
| `partial` | Core behavior present but incomplete, fragile, or missing a listed sub-part |
| `fail` | Not implemented, broken, or only stubbed |
| `n/a` | Not applicable to this web-only experiment (use sparingly; prefer `fail`) |

## Rules

1. Score from a running build, not from reading code alone.
2. Use the `test_step` column as the acceptance check.
3. Weight does not change the score label; weights are for prioritization and rollups.
4. Record short notes in the `*_notes` columns when scoring `partial`.
5. Spot-test these ten items in every build (ids): 1, 3, 6, 7, 12, 13, 20, 22, 34 (or nearest image-crop), and the primary PNG/PDF export row.

## Rollups

- Pass count per build = number of `pass` cells.
- Weighted pass = sum of `weight` for rows scored `pass`.
- Partial does not add to pass count; track separately.
