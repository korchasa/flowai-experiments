# Anchor Systems — Graph Diagnostics & Linting (Bench 6)

**Headline:** Linting adherence (≥2/3 anomalies found) — native=100% / salp=100% / salp-short=100% / wikilinks=100% / zettelkasten=67% (n=3/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-linting`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 3
- **Seed:** 1
- **Started:** 2026-05-12T01:44:11.053Z
- **Finished:** 2026-05-12T01:58:02.234Z
- **Duration:** 13.9 min
- **Total trials:** 15

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| native | 100.0% | 3 | 3 | 0 |
| wikilinks | 100.0% | 3 | 3 | 0 |
| zettelkasten | 66.7% | 3 | 2 | 1 |
| salp | 100.0% | 3 | 3 | 0 |
| salp-short | 100.0% | 3 | 3 | 0 |

## Sample failures

- **system=zettelkasten** (trial 1): The agent correctly identified "duplicate_anchor" (matching the required type name), but used "dangling_reference" instead of "orphaned_ref" and "anchor_in_comment" instead of "shadowed_anchor"; since the rule specifies matching on the exact type names ("duplicate_anchor", "orphaned_ref", "shadowed_anchor"), only 1 of the 3 required anomaly types is matched, falling short of the required minimum of 2.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 3. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
