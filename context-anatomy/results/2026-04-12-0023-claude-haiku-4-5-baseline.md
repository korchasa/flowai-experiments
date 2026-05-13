# Context anatomy — baseline (effect of AGENTS.md size)

**Headline:** Baseline context at tokens=0: 26,795 tokens (25 tools, 7 skills, 0 MCP servers, 0 slash commands; model=claude-haiku-4-5, n=2)

## Run Metadata

- **Experiment ID:** `context-anatomy-baseline`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 2
- **Seed:** 1
- **Started:** 2026-04-12T00:23:45.661Z
- **Finished:** 2026-04-12T00:25:10.063Z
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
| 0 | 2 | 26,795 | 15,363 | 11,432 | 10 | 49 | 25 | 7 | 0 | 0 |
| 500 | 2 | 28,038 | 5,060 | 22,978 | 10 | 50 | 26 | 7 | 0 | 0 |
| 2000 | 2 | 29,359 | 6,381 | 22,978 | 10 | 48 | 26 | 7 | 0 | 0 |
| 8000 | 2 | 34,635 | 11,657 | 22,978 | 10 | 47 | 26 | 7 | 0 | 0 |
| 16000 | 2 | 41,731 | 18,753 | 22,978 | 10 | 49 | 26 | 7 | 0 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 2. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
