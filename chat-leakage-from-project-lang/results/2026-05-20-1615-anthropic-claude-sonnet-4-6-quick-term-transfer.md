# Chat leakage from project-file language (quick term transfer)

**Headline:** Max target tokens at >=80% adherence: english/baseline=400,000, english/guarded=400,000.

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
- **Started:** 2026-05-20T16:15:18.535Z
- **Finished:** 2026-05-20T16:17:10.551Z
- **Duration:** 1.9 min
- **Total trials:** 2

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 400000 | 100.0% | 2 | 2 | 0 |

## Adherence by project language, instruction, and tokens

| project_language | tokens | instruction | trials | pass | adherence |
|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 1 | 100.0% |
| english | 400000 | guarded | 1 | 1 | 100.0% |

## Final answer profile

Final answer is extracted from generated text after `FINAL_ANSWER`. Leakage adherence is judged only on this block.

| project_language | tokens | instruction | trials | present | chars | tokens_est | russian | english |
|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 1 | 624 | 156 | 156 | 0 |
| english | 400000 | guarded | 1 | 1 | 463 | 116 | 116 | 0 |

## Diagnostic failure dimensions

The columns below are deterministic heuristics over `FINAL_ANSWER`; the judge verdict remains the canonical pass/fail signal.

| project_language | tokens | instruction | trials | format_fail | language_leak | semantic_fail | source_term_leak | marker_fail |
|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 0 | 0 | 0 | 0 | 0 |
| english | 400000 | guarded | 1 | 0 | 0 | 0 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| project_language | tokens | instruction | measured | project_file | memory | chat | russian | english | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 400,166 | 400,049 | 15 | 101 | 109 | 400,057 | 26 | 52,900 | 0 |
| english | 400000 | guarded | 400,211 | 400,049 | 15 | 146 | 151 | 400,060 | 26 | 53,107 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
