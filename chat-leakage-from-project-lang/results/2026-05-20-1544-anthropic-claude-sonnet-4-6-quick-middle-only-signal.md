# Chat leakage from project-file language (quick middle-only signal)

**Headline:** Max target tokens at >=80% adherence: english/baseline=400,000, english/guarded=400,000, japanese/baseline=none, japanese/guarded=400,000.

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
- **Started:** 2026-05-20T15:44:25.128Z
- **Finished:** 2026-05-20T15:49:27.340Z
- **Duration:** 5.0 min
- **Total trials:** 4

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 400000 | 75.0% | 4 | 3 | 1 |

## Sample failures

- **project_language=japanese, tokens=400000, instruction=baseline** (trial 0): The agent's response contains no FINAL_ANSWER section at all; the agent refused to write the required output, claiming the README.md contained no real requirements, so the rule cannot be satisfied.

## Adherence by project language, instruction, and tokens

| project_language | tokens | instruction | trials | pass | adherence |
|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 1 | 100.0% |
| english | 400000 | guarded | 1 | 1 | 100.0% |
| japanese | 400000 | baseline | 1 | 0 | 0.0% |
| japanese | 400000 | guarded | 1 | 1 | 100.0% |

## Final answer profile

Final answer is extracted from generated text after `FINAL_ANSWER`. Leakage adherence is judged only on this block.

| project_language | tokens | instruction | trials | present | chars | tokens_est | russian | english | japanese |
|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 1 | 358 | 90 | 90 | 0 | 0 |
| english | 400000 | guarded | 1 | 1 | 406 | 102 | 102 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 1 | 416 | 104 | 104 | 0 | 0 |

## Diagnostic failure dimensions

The columns below are deterministic heuristics over `FINAL_ANSWER`; the judge verdict remains the canonical pass/fail signal.

| project_language | tokens | instruction | trials | format_fail | language_leak | semantic_fail | source_term_leak | marker_fail |
|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 0 | 0 | 0 | 0 | 0 |
| english | 400000 | guarded | 1 | 0 | 0 | 0 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 1 | 0 | 1 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 0 | 0 | 0 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| project_language | tokens | instruction | measured | project_file | memory | chat | russian | english | japanese | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 360,464 | 360,380 | 15 | 68 | 80 | 360,384 | 0 | 90 | 248,341 | 0 |
| english | 400000 | guarded | 360,513 | 360,380 | 15 | 117 | 127 | 360,386 | 0 | 66 | 170,886 | 0 |
| japanese | 400000 | baseline | 360,271 | 360,187 | 15 | 68 | 76 | 6 | 360,189 | 82 | 254,685 | 0 |
| japanese | 400000 | guarded | 360,320 | 360,187 | 15 | 117 | 121 | 9 | 360,190 | 50 | 137,304 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
