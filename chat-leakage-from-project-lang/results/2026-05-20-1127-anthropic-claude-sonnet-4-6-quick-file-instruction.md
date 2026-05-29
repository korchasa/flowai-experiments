# Chat leakage from project-file language (quick file instruction)

**Headline:** Max target tokens at >=80% adherence: english/baseline=400,000, english/guarded=400,000, japanese/baseline=400,000, japanese/guarded=400,000.

## Run Metadata

- **Experiment ID:** `chat-leakage-from-project-lang-quick-file-instruction`
- **Model provider:** `anthropic`
- **Model:** `claude-sonnet-4-6`
- **IDE:** `claude`
- **Judge runtime:** `claude`
- **Judge model provider:** `anthropic`
- **Judge model:** `claude-sonnet-4-6`
- **Reps per cell:** 1
- **Seed:** 1
- **Started:** 2026-05-20T11:27:33.555Z
- **Finished:** 2026-05-20T11:30:35.009Z
- **Duration:** 3.0 min
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
| english | 400000 | baseline | 1 | 1 | 404 | 101 | 101 | 0 | 0 |
| english | 400000 | guarded | 1 | 1 | 435 | 109 | 109 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 1 | 457 | 114 | 114 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 1 | 556 | 139 | 139 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| project_language | tokens | instruction | measured | project_file | memory | chat | russian | english | japanese | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 400,168 | 400,048 | 50 | 70 | 117 | 400,051 | 0 | 26 | 52,933 | 0 |
| english | 400000 | guarded | 400,217 | 400,048 | 50 | 118 | 163 | 400,054 | 0 | 26 | 52,824 | 0 |
| japanese | 400000 | baseline | 400,140 | 400,019 | 50 | 70 | 111 | 6 | 400,024 | 26 | 52,909 | 0 |
| japanese | 400000 | guarded | 400,188 | 400,019 | 50 | 118 | 154 | 9 | 400,025 | 26 | 53,102 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
