# Chat leakage from project-file language (quick middle-only signal)

**Headline:** Max target tokens at >=80% adherence: english/baseline=400,000, english/guarded=400,000, japanese/baseline=400,000, japanese/guarded=400,000.

## Run Metadata

- **Experiment ID:** `chat-leakage-from-project-lang-quick-middle-only-signal`
- **Model provider:** `anthropic`
- **Model:** `claude-sonnet-4-6`
- **IDE:** `claude`
- **Judge runtime:** `claude`
- **Judge model provider:** `anthropic`
- **Judge model:** `claude-sonnet-4-6`
- **Reps per cell:** 1
- **Seed:** 1
- **Started:** 2026-05-20T15:02:48.241Z
- **Finished:** 2026-05-20T15:06:54.543Z
- **Duration:** 4.1 min
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
| english | 400000 | baseline | 1 | 1 | 432 | 108 | 108 | 0 | 0 |
| english | 400000 | guarded | 1 | 1 | 429 | 107 | 107 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 1 | 367 | 92 | 92 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 1 | 523 | 131 | 131 | 0 | 0 |

## Diagnostic failure dimensions

The columns below are deterministic heuristics over `FINAL_ANSWER`; the judge verdict remains the canonical pass/fail signal.

| project_language | tokens | instruction | trials | format_fail | language_leak | semantic_fail | source_term_leak | marker_fail |
|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 0 | 0 | 0 | 0 | 0 |
| english | 400000 | guarded | 1 | 0 | 0 | 0 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 0 | 0 | 0 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 0 | 0 | 0 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| project_language | tokens | instruction | measured | project_file | memory | chat | russian | english | japanese | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 360,515 | 360,380 | 67 | 68 | 133 | 360,382 | 0 | 58 | 148,368 | 0 |
| english | 400000 | guarded | 360,564 | 360,380 | 67 | 117 | 181 | 360,383 | 0 | 58 | 153,204 | 0 |
| japanese | 400000 | baseline | 360,322 | 360,187 | 67 | 68 | 127 | 6 | 360,189 | 50 | 130,114 | 0 |
| japanese | 400000 | guarded | 360,371 | 360,187 | 67 | 117 | 172 | 9 | 360,190 | 50 | 129,738 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
