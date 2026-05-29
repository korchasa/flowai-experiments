# Chat leakage from project-file language (quick term transfer)

**Headline:** Max target tokens at >=80% adherence: english/baseline=400,000, english/guarded=400,000, japanese/baseline=400,000, japanese/guarded=400,000.

## Run Metadata

- **Experiment ID:** `chat-leakage-from-project-lang-quick-term-transfer`
- **Model provider:** `anthropic`
- **Model:** `claude-sonnet-4-6`
- **IDE:** `claude`
- **Judge runtime:** `claude`
- **Judge model provider:** `anthropic`
- **Judge model:** `claude-sonnet-4-6`
- **Reps per cell:** 1
- **Seed:** 1
- **Started:** 2026-05-20T15:49:31.419Z
- **Finished:** 2026-05-20T15:53:18.943Z
- **Duration:** 3.8 min
- **Total trials:** 4

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 400000 | 100.0% | 4 | 4 | 0 |

## Adherence by project language, instruction, and tokens

| project_language | tokens | instruction | trials | pass | adherence |
|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 1 | 100.0% |
| english | 400000 | guarded | 1 | 1 | 100.0% |
| japanese | 400000 | baseline | 1 | 1 | 100.0% |
| japanese | 400000 | guarded | 1 | 1 | 100.0% |

## Final answer profile

Final answer is extracted from generated text after `FINAL_ANSWER`. Leakage adherence is judged only on this block.

| project_language | tokens | instruction | trials | present | chars | tokens_est | russian | english | japanese |
|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 1 | 547 | 137 | 137 | 0 | 0 |
| english | 400000 | guarded | 1 | 1 | 539 | 135 | 135 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 1 | 466 | 117 | 117 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 1 | 600 | 150 | 150 | 0 | 0 |

## Diagnostic failure dimensions

The columns below are deterministic heuristics over `FINAL_ANSWER`; the judge verdict remains the canonical pass/fail signal.

| project_language | tokens | instruction | trials | format_fail | language_leak | semantic_fail | source_term_leak | marker_fail |
|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 0 | 0 | 0 | 0 | 0 |
| english | 400000 | guarded | 1 | 0 | 0 | 0 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 0 | 0 | 0 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 0 | 0 | 1 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| project_language | tokens | instruction | measured | project_file | memory | chat | russian | english | japanese | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 400,166 | 400,049 | 15 | 101 | 109 | 400,057 | 0 | 26 | 52,969 | 0 |
| english | 400000 | guarded | 400,215 | 400,049 | 15 | 150 | 156 | 400,059 | 0 | 26 | 53,112 | 0 |
| japanese | 400000 | baseline | 400,137 | 400,020 | 15 | 101 | 103 | 9 | 400,025 | 26 | 52,940 | 0 |
| japanese | 400000 | guarded | 400,187 | 400,020 | 15 | 150 | 148 | 12 | 400,027 | 26 | 53,012 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
