# CLAUDE.md / AGENTS.md max length (single file)

**Headline:** Max safe AGENTS.md size: 16000 tokens at ≥80% adherence (model=claude-sonnet-4-6, ide=claude, n=5/cell).

## Run Metadata

- **Experiment ID:** `claude-md-length-single-file`
- **Model:** `claude-sonnet-4-6`
- **IDE:** `claude`
- **Reps per cell:** 5
- **Seed:** 1
- **Started:** 2026-04-11T23:54:02.150Z
- **Finished:** 2026-04-12T00:15:16.217Z
- **Duration:** 21.2 min
- **Total trials:** 90

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 500 | 100.0% | 15 | 15 | 0 |
| 1000 | 100.0% | 15 | 15 | 0 |
| 2000 | 100.0% | 15 | 15 | 0 |
| 4000 | 100.0% | 15 | 15 | 0 |
| 8000 | 100.0% | 15 | 15 | 0 |
| 16000 | 93.3% | 15 | 14 | 1 |

## Adherence by rule

| rule | adherence |
|---|---|
| format | 100.0% |
| language | 96.7% |
| negation | 100.0% |

## Sample failures

- **tokens=16000, rule=language** (trial 3): The agent's final response is written entirely in English ("The README contains only a minimal placeholder…"), violating the rule that all natural-language sentences must be in Russian.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 5. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
