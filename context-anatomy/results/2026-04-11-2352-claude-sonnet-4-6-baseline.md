# Context anatomy — baseline (effect of AGENTS.md size)

**Headline:** Baseline context at tokens=0: 15,961 tokens (25 tools, 7 skills, 0 MCP servers, 0 slash commands; model=claude-sonnet-4-6, n=2)

## Run Metadata

- **Experiment ID:** `context-anatomy-baseline`
- **Model:** `claude-sonnet-4-6`
- **IDE:** `claude`
- **Reps per cell:** 2
- **Seed:** 1
- **Started:** 2026-04-11T23:52:38.517Z
- **Finished:** 2026-04-11T23:54:01.863Z
- **Duration:** 1.4 min
- **Total trials:** 10

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 0 | 100.0% | 2 | 2 | 0 |
| 500 | 100.0% | 2 | 2 | 0 |
| 2000 | 100.0% | 2 | 2 | 0 |
| 8000 | 100.0% | 2 | 2 | 0 |
| 16000 | 100.0% | 2 | 2 | 0 |

## Context metrics by `tokens`

Each row averages `n` trials at the given axis value. **baseline** = cache_creation + cache_read (everything the model saw in its prompt before generating a response). **tools/skills/slash/mcp** come from the CLI's init event.

| tokens | n | baseline | cache_create | cache_read | input | output | tools | skills | slash | mcp |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 2 | 15,961 | 9,976 | 5,985 | 3 | 5 | 25 | 7 | 0 | 0 |
| 500 | 2 | 17,112 | 5,028 | 12,084 | 3 | 5 | 26 | 7 | 0 | 0 |
| 2000 | 2 | 18,435 | 6,351 | 12,084 | 3 | 5 | 26 | 7 | 0 | 0 |
| 8000 | 2 | 23,713 | 11,629 | 12,084 | 3 | 5 | 26 | 7 | 0 | 0 |
| 16000 | 2 | 30,800 | 18,716 | 12,084 | 3 | 5 | 26 | 7 | 0 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 2. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
