# Anchor Systems — Extraction & Mapping (Bench 1)

**Headline:** Mapping adherence — native=0% / salp=0% / salp-short=0% / wikilinks=0% / zettelkasten=0% (n=3/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-mapping`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 3
- **Seed:** 1
- **Started:** 2026-05-12T00:38:31.376Z
- **Finished:** 2026-05-12T00:40:51.974Z
- **Duration:** 2.3 min
- **Total trials:** 15

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| native | 0.0% | 3 | 0 | 3 |
| wikilinks | 0.0% | 3 | 0 | 3 |
| zettelkasten | 0.0% | 3 | 0 | 3 |
| salp | 0.0% | 3 | 0 | 3 |
| salp-short | 0.0% | 3 | 0 | 3 |

## Sample failures

- **system=native** (trial 0): The agent did not provide any JSON output at all — it returned only an authentication error message ("Not logged in · Please run /login"), meaning all 20 anchors and 25 references are missing, far exceeding the allowed 3 missing entries.
- **system=native** (trial 1): The agent returned "Not logged in · Please run /login" instead of a JSON object with anchors and references, meaning all 45 ground truth entries (20 anchors + 25 references) are missing, far exceeding the allowed 3-entry tolerance.
- **system=native** (trial 2): The agent did not provide any JSON response with anchors and references; instead, it returned an authentication error message "Not logged in · Please run /login", meaning all 45 required entries (20 anchors + 25 references) are missing, far exceeding the allowed 3 missing entries.
- **system=wikilinks** (trial 0): The agent returned no JSON at all — only an authentication error message — meaning all 45 ground truth entries (20 anchors + 25 references) are missing, far exceeding the allowed maximum of 3 missing entries.
- **system=wikilinks** (trial 1): The agent returned only an authentication error message ("Not logged in · Please run /login") instead of a JSON object, providing zero anchors and zero references out of the required 45 total entries (20 anchors + 25 references).

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 3. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
