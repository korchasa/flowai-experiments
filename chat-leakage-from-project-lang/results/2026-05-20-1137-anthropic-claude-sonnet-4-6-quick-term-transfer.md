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
- **Started:** 2026-05-20T11:37:54.489Z
- **Finished:** 2026-05-20T11:40:45.966Z
- **Duration:** 2.9 min
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
| english | 400000 | baseline | 1 | 1 | 521 | 130 | 130 | 0 | 0 |
| english | 400000 | guarded | 1 | 1 | 568 | 142 | 142 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 1 | 525 | 131 | 131 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 1 | 441 | 110 | 110 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| project_language | tokens | instruction | measured | project_file | memory | chat | russian | english | japanese | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 400,226 | 400,070 | 50 | 105 | 150 | 400,076 | 0 | 26 | 53,028 | 0 |
| english | 400000 | guarded | 400,274 | 400,070 | 50 | 154 | 196 | 400,078 | 0 | 26 | 53,176 | 0 |
| japanese | 400000 | baseline | 400,184 | 400,028 | 50 | 105 | 142 | 9 | 400,033 | 26 | 53,041 | 0 |
| japanese | 400000 | guarded | 400,233 | 400,028 | 50 | 154 | 186 | 12 | 400,035 | 26 | 53,184 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
