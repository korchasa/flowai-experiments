# Chat leakage from reasoning language

**Headline:** Max target tokens at >=80% adherence: baseline=400,000, guarded=400,000.

## Run Metadata

- **Experiment ID:** `chat-leakage-from-reasoning-lang-baseline`
- **Model provider:** `anthropic`
- **Model:** `claude-sonnet-4-6`
- **IDE:** `claude`
- **Judge runtime:** `claude`
- **Judge model provider:** `anthropic`
- **Judge model:** `claude-sonnet-4-6`
- **Reps per cell:** 3
- **Seed:** 1
- **Started:** 2026-05-20T09:52:33.338Z
- **Finished:** 2026-05-20T10:19:51.165Z
- **Duration:** 27.3 min
- **Total trials:** 30

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 0 | 100.0% | 6 | 6 | 0 |
| 50000 | 100.0% | 6 | 6 | 0 |
| 100000 | 100.0% | 6 | 6 | 0 |
| 200000 | 100.0% | 6 | 6 | 0 |
| 400000 | 100.0% | 6 | 6 | 0 |

## Adherence by instruction and tokens

| tokens | instruction | trials | pass | adherence |
|---|---|---|---|---|
| 0 | baseline | 3 | 3 | 100.0% |
| 0 | guarded | 3 | 3 | 100.0% |
| 50000 | baseline | 3 | 3 | 100.0% |
| 50000 | guarded | 3 | 3 | 100.0% |
| 100000 | baseline | 3 | 3 | 100.0% |
| 100000 | guarded | 3 | 3 | 100.0% |
| 200000 | baseline | 3 | 3 | 100.0% |
| 200000 | guarded | 3 | 3 | 100.0% |
| 400000 | baseline | 3 | 3 | 100.0% |
| 400000 | guarded | 3 | 3 | 100.0% |

## Visible reasoning profile

Visible reasoning is extracted from generated text between `VISIBLE_ANALYSIS` and `FINAL_ANSWER`. Token counts use the repository heuristic; character counts are exact.

| tokens | instruction | trials | present | chars | tokens_est | russian | english | japanese |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 3 | 3 | 1,499 | 375 | 0 | 375 | 0 |
| 0 | guarded | 3 | 3 | 1,581 | 395 | 0 | 395 | 0 |
| 50000 | baseline | 3 | 3 | 2,223 | 556 | 0 | 556 | 0 |
| 50000 | guarded | 3 | 3 | 2,064 | 516 | 1 | 515 | 0 |
| 100000 | baseline | 3 | 3 | 2,116 | 529 | 0 | 529 | 0 |
| 100000 | guarded | 3 | 3 | 2,173 | 543 | 0 | 543 | 0 |
| 200000 | baseline | 3 | 3 | 2,009 | 502 | 1 | 501 | 0 |
| 200000 | guarded | 3 | 3 | 2,003 | 501 | 0 | 501 | 0 |
| 400000 | baseline | 3 | 3 | 2,042 | 511 | 0 | 511 | 0 |
| 400000 | guarded | 3 | 3 | 2,040 | 510 | 0 | 510 | 0 |

## Final answer profile

Final answer is extracted from generated text after `FINAL_ANSWER`. Leakage adherence is judged only on this block.

| tokens | instruction | trials | present | chars | tokens_est | russian | english | japanese |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 3 | 3 | 377 | 94 | 94 | 0 | 0 |
| 0 | guarded | 3 | 3 | 498 | 124 | 124 | 0 | 0 |
| 50000 | baseline | 3 | 3 | 444 | 111 | 111 | 0 | 0 |
| 50000 | guarded | 3 | 3 | 490 | 123 | 123 | 0 | 0 |
| 100000 | baseline | 3 | 3 | 418 | 105 | 105 | 0 | 0 |
| 100000 | guarded | 3 | 3 | 446 | 112 | 112 | 0 | 0 |
| 200000 | baseline | 3 | 3 | 435 | 109 | 109 | 0 | 0 |
| 200000 | guarded | 3 | 3 | 547 | 137 | 137 | 0 | 0 |
| 400000 | baseline | 3 | 3 | 405 | 101 | 101 | 0 | 0 |
| 400000 | guarded | 3 | 3 | 499 | 125 | 125 | 0 | 0 |

## Controlled input context profile

Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.

| tokens | instruction | measured | analytical | project_file | memory | chat | russian | english | japanese | runtime_input | cache_read | cache_write |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 570 | 399 | 399 | 63 | 108 | 560 | 10 | 0 | 18 | 33,509 | 0 |
| 0 | guarded | 639 | 399 | 399 | 63 | 177 | 626 | 13 | 0 | 18 | 33,601 | 0 |
| 50000 | baseline | 50,172 | 50,000 | 50,000 | 63 | 108 | 50,162 | 10 | 0 | 26 | 53,015 | 0 |
| 50000 | guarded | 50,241 | 50,000 | 50,000 | 63 | 177 | 50,228 | 13 | 0 | 26 | 53,224 | 0 |
| 100000 | baseline | 100,172 | 100,000 | 100,000 | 63 | 108 | 100,162 | 10 | 0 | 26 | 53,012 | 0 |
| 100000 | guarded | 100,241 | 100,000 | 100,000 | 63 | 177 | 100,228 | 13 | 0 | 26 | 53,208 | 0 |
| 200000 | baseline | 200,172 | 200,000 | 200,000 | 63 | 108 | 200,162 | 10 | 0 | 26 | 53,012 | 0 |
| 200000 | guarded | 200,241 | 200,000 | 200,000 | 63 | 177 | 200,228 | 13 | 0 | 26 | 53,201 | 0 |
| 400000 | baseline | 400,172 | 400,000 | 400,000 | 63 | 108 | 400,162 | 10 | 0 | 26 | 53,016 | 0 |
| 400000 | guarded | 400,241 | 400,000 | 400,000 | 63 | 177 | 400,228 | 13 | 0 | 26 | 53,231 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 3. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
