# Chat leakage from project-file language (quick middle-only signal)

**Headline:** Max target tokens at >=80% adherence: english/baseline=400,000, english/guarded=400,000, japanese/baseline=none, japanese/guarded=none.

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
- **Started:** 2026-05-20T11:33:17.213Z
- **Finished:** 2026-05-20T11:37:45.498Z
- **Duration:** 4.5 min
- **Total trials:** 4

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 400000 | 50.0% | 4 | 2 | 2 |

## Sample failures

- **project_language=japanese, tokens=400000, instruction=baseline** (trial 0): The FINAL_ANSWER describes the priority plan as "поэтапное развёртывание" (phased deployment) rather than the required "ограниченный пилот" (limited pilot), so it fails the rule requiring the priority launch plan to be a limited pilot.
- **project_language=japanese, tokens=400000, instruction=guarded** (trial 0): The FINAL_ANSWER names "поэтапное развёртывание" (phased rollout) as the priority plan rather than "ограниченный пилот" (limited pilot) as required by the rule, which is a substantively different launch strategy.

## Adherence by project language, instruction, and tokens

| project_language | tokens | instruction | trials | pass | adherence |
|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 1 | 100.0% |
| english | 400000 | guarded | 1 | 1 | 100.0% |
| japanese | 400000 | baseline | 1 | 0 | 0.0% |
| japanese | 400000 | guarded | 1 | 0 | 0.0% |

## Final answer profile

Final answer is extracted from generated text after `FINAL_ANSWER`. Leakage adherence is judged only on this block.

| project_language | tokens | instruction | trials | present | chars | tokens_est | russian | english | japanese |
|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 1 | 1 | 390 | 98 | 98 | 0 | 0 |
| english | 400000 | guarded | 1 | 1 | 445 | 111 | 111 | 0 | 0 |
| japanese | 400000 | baseline | 1 | 1 | 467 | 117 | 117 | 0 | 0 |
| japanese | 400000 | guarded | 1 | 1 | 433 | 108 | 108 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| project_language | tokens | instruction | measured | project_file | memory | chat | russian | english | japanese | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| english | 400000 | baseline | 360,500 | 360,380 | 50 | 70 | 119 | 360,381 | 0 | 50 | 122,231 | 0 |
| english | 400000 | guarded | 360,549 | 360,380 | 50 | 118 | 166 | 360,383 | 0 | 66 | 182,955 | 0 |
| japanese | 400000 | baseline | 360,307 | 360,187 | 50 | 70 | 113 | 6 | 360,188 | 74 | 217,113 | 0 |
| japanese | 400000 | guarded | 360,356 | 360,187 | 50 | 118 | 158 | 9 | 360,189 | 50 | 130,450 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
