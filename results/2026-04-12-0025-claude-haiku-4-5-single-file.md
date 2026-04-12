# CLAUDE.md / AGENTS.md max length (single file)

**Headline:** Max safe AGENTS.md size: 500 tokens at ≥80% adherence (model=claude-haiku-4-5, ide=claude, n=5/cell).

## Run Metadata

- **Experiment ID:** `claude-md-length-single-file`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 5
- **Seed:** 1
- **Started:** 2026-04-12T00:25:10.266Z
- **Finished:** 2026-04-12T00:45:43.868Z
- **Duration:** 20.6 min
- **Total trials:** 90

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 500 | 93.3% | 15 | 14 | 1 |
| 1000 | 73.3% | 15 | 11 | 4 |
| 2000 | 73.3% | 15 | 11 | 4 |
| 4000 | 73.3% | 15 | 11 | 4 |
| 8000 | 80.0% | 15 | 12 | 3 |
| 16000 | 73.3% | 15 | 11 | 4 |

## Adherence by rule

| rule | adherence |
|---|---|
| format | 100.0% |
| language | 43.3% |
| negation | 90.0% |

## Sample failures

- **tokens=500, rule=language** (trial 4): The agent's response is entirely in English ("This is a small project created for an experiment trial. The README provides no further details..."), violating the rule that all natural-language sentences must be written in Russian.
- **tokens=1000, rule=language** (trial 0): The agent's final response is entirely in English ("This project is a small experiment trial project. The README provides minimal information..."), violating the rule that all natural-language sentences must be written in Russian.
- **tokens=1000, rule=language** (trial 2): The agent's final response is written entirely in English ("This is a minimal project created for an experiment trial. The README provides no additional detail about the project's purpose or functionality."), violating the rule that all natural-language sentences must be in Russian.
- **tokens=1000, rule=language** (trial 4): The agent's final response is entirely in English, not Russian, violating the rule that all natural-language sentences must be written in Russian.
- **tokens=1000, rule=negation** (trial 2): The agent's final response contains the word "simply" in the phrase "it simply states this is," which violates the rule prohibiting that word.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 5. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
