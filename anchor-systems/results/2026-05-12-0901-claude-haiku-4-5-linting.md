# Anchor Systems — Graph Diagnostics & Linting (Bench 6)

**Headline:** Linting adherence (≥2/3 anomalies found) — native=100% / salp=60% / salp-short=60% / wikilinks=80% / zettelkasten=80% (n=5/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-linting`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 5
- **Seed:** 1
- **Started:** 2026-05-12T09:01:52.685Z
- **Finished:** 2026-05-12T09:26:51.498Z
- **Duration:** 25.0 min
- **Total trials:** 25

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| native | 100.0% | 5 | 5 | 0 |
| wikilinks | 80.0% | 5 | 4 | 1 |
| zettelkasten | 80.0% | 5 | 4 | 1 |
| salp | 60.0% | 5 | 3 | 2 |
| salp-short | 60.0% | 5 | 3 | 2 |

## Sample failures

- **system=wikilinks** (trial 1): Only one exact type name match ("duplicate_anchor") was found; the other two entries used "anchor_in_comment" and "broken_reference" instead of the required "shadowed_anchor" and "orphaned_ref", falling below the minimum threshold of 2 matching anomaly type names.
- **system=zettelkasten** (trial 4): The agent correctly identified "duplicate_anchor" by exact type name, but used "broken_reference" instead of "orphaned_ref" and "anchor_in_comment" instead of "shadowed_anchor", resulting in only 1 of the 3 required type names matching exactly, which is fewer than the 2 required to pass.
- **system=salp** (trial 2): The agent only uses one of the three exact type names specified in the rule ("duplicate_anchor"); the other two entries use "invalid_reference" and "commented_anchor" instead of the required "orphaned_ref" and "shadowed_anchor", so only 1 of the 3 planted anomaly types is matched by name.
- **system=salp** (trial 3): The agent only matched 1 of the 3 required anomaly type names exactly ("duplicate_anchor"); it used "missing_anchor" instead of "orphaned_ref" and "anchor_in_comment" instead of "shadowed_anchor", failing the type-name matching criterion for at least 2 anomalies.
- **system=salp-short** (trial 0): The agent only produced one matching type name ("duplicate_anchor"); the other two anomalies were reported as "broken_reference" and "anchor_in_comment" rather than the required "orphaned_ref" and "shadowed_anchor", so fewer than 2 of the 3 expected type names appear in the output.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 5. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
