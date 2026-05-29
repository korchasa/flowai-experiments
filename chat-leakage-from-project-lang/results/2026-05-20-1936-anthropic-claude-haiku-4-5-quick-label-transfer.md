# Chat leakage from project-file language (quick label transfer)

**Headline:** Max target tokens at >=80% adherence: english/baseline=none, english/guarded=none.

## Run Metadata

- **Experiment ID:** `chat-leakage-from-project-lang-quick-label-transfer`
- **Model provider:** `anthropic`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Judge runtime:** `claude`
- **Judge model provider:** `anthropic`
- **Judge model:** `claude-sonnet-4-6`
- **Reps per cell:** 1
- **Seed:** 1
- **Started:** 2026-05-20T19:36:22.498Z
- **Finished:** 2026-05-20T19:37:53.758Z
- **Duration:** 1.5 min
- **Total trials:** 2

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 400000 | 0.0% | 2 | 0 | 2 |

## Sample failures

- **project_language=english, tokens=400000, instruction=baseline** (trial 0): The text after FINAL_ANSWER contains three sentences rather than exactly two as required by the rule.
- **project_language=english, tokens=400000, instruction=guarded** (trial 0): The FINAL_ANSWER section contains three Russian sentences (one on the label line plus two in the following paragraph), not exactly two as required by the rule.

## Adherence by project language, instruction, and tokens

| project_language | tokens | instruction | trials | pass | adherence |
|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 0 | 0.0% |
| english | 400000 | guarded | 1 | 0 | 0.0% |

## Final answer profile

Final answer is extracted from generated text after `FINAL_ANSWER`. Leakage adherence is judged only on this block.

| project_language | tokens | instruction | trials | present | chars | tokens_est | russian | english |
|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 1 | 607 | 152 | 152 | 0 |
| english | 400000 | guarded | 1 | 1 | 780 | 195 | 195 | 0 |

## Diagnostic failure dimensions

The columns below are deterministic heuristics over `FINAL_ANSWER`; the judge verdict remains the canonical pass/fail signal.

| project_language | tokens | instruction | trials | format_fail | language_leak | semantic_fail | source_term_leak | marker_fail |
|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 1 | 0 | 0 | 0 | 0 |
| english | 400000 | guarded | 1 | 1 | 0 | 0 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| project_language | tokens | instruction | measured | project_file | memory | chat | russian | english | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 400,169 | 400,073 | 15 | 80 | 87 | 400,082 | 26 | 72,324 | 0 |
| english | 400000 | guarded | 400,219 | 400,073 | 15 | 130 | 135 | 400,084 | 26 | 103,830 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
