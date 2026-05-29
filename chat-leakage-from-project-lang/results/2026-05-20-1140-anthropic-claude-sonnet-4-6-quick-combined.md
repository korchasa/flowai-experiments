# Chat leakage from project-file language (quick combined)

**Headline:** Max target tokens at >=80% adherence: english/baseline=400,000, english/guarded=400,000, japanese/baseline=400,000, japanese/guarded=400,000.

## Run Metadata

- **Experiment ID:** `chat-leakage-from-project-lang-quick-combined`
- **Model provider:** `anthropic`
- **Model:** `claude-sonnet-4-6`
- **IDE:** `claude`
- **Judge runtime:** `claude`
- **Judge model provider:** `anthropic`
- **Judge model:** `claude-sonnet-4-6`
- **Reps per cell:** 1
- **Seed:** 1
- **Started:** 2026-05-20T11:40:53.882Z
- **Finished:** 2026-05-20T11:44:48.113Z
- **Duration:** 3.9 min
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
| english | 400000 | baseline | 1 | 1 | 425 | 106 | 106 | 0 | 0 |
| english | 400000 | guarded | 1 | 1 | 361 | 90 | 90 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 1 | 376 | 94 | 94 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 1 | 526 | 132 | 132 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| project_language | tokens | instruction | measured | project_file | memory | chat | russian | english | japanese | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 360,717 | 360,561 | 50 | 105 | 182 | 360,535 | 0 | 26 | 53,030 | 0 |
| english | 400000 | guarded | 360,765 | 360,561 | 50 | 154 | 229 | 360,536 | 0 | 26 | 53,174 | 0 |
| japanese | 400000 | baseline | 360,440 | 360,284 | 50 | 105 | 173 | 19 | 360,247 | 26 | 53,037 | 0 |
| japanese | 400000 | guarded | 360,488 | 360,284 | 50 | 154 | 218 | 23 | 360,248 | 26 | 53,140 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
