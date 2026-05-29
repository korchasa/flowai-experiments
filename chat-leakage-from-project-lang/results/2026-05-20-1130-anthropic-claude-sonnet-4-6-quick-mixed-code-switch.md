# Chat leakage from project-file language (quick mixed code-switch)

**Headline:** Max target tokens at >=80% adherence: english/baseline=400,000, english/guarded=400,000, japanese/baseline=400,000, japanese/guarded=400,000.

## Run Metadata

- **Experiment ID:** `chat-leakage-from-project-lang-quick-mixed-code-switch`
- **Model provider:** `anthropic`
- **Model:** `claude-sonnet-4-6`
- **IDE:** `claude`
- **Judge runtime:** `claude`
- **Judge model provider:** `anthropic`
- **Judge model:** `claude-sonnet-4-6`
- **Reps per cell:** 1
- **Seed:** 1
- **Started:** 2026-05-20T11:30:44.820Z
- **Finished:** 2026-05-20T11:33:07.681Z
- **Duration:** 2.4 min
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
| english | 400000 | baseline | 1 | 1 | 305 | 76 | 76 | 0 | 0 |
| english | 400000 | guarded | 1 | 1 | 409 | 102 | 102 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 1 | 378 | 95 | 95 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 1 | 483 | 121 | 121 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| project_language | tokens | instruction | measured | project_file | memory | chat | russian | english | japanese | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 400,250 | 400,129 | 50 | 70 | 175 | 400,075 | 0 | 26 | 52,945 | 0 |
| english | 400000 | guarded | 400,298 | 400,129 | 50 | 118 | 221 | 400,077 | 0 | 26 | 53,071 | 0 |
| japanese | 400000 | baseline | 400,222 | 400,101 | 50 | 70 | 166 | 26 | 400,030 | 26 | 52,939 | 0 |
| japanese | 400000 | guarded | 400,270 | 400,101 | 50 | 118 | 209 | 29 | 400,032 | 26 | 53,084 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
