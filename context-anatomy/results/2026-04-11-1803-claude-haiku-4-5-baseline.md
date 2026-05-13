# Context anatomy — baseline (effect of AGENTS.md size)

**Headline:** Baseline context at tokens=0: 26,203 tokens (24 tools, 6 skills, 0 MCP servers, 0 slash commands; model=claude-haiku-4-5, n=1)

## Run Metadata

- **Experiment ID:** `context-anatomy-baseline`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 1
- **Seed:** 1
- **Started:** 2026-04-11T18:03:22.670Z
- **Finished:** 2026-04-11T18:03:33.654Z
- **Duration:** 0.2 min
- **Total trials:** 1

## Adherence by tokens

| tokens | adherence | trials | pass | fail |
|---|---|---|---|---|
| 0 | 100.0% | 1 | 1 | 0 |

## Context metrics by `tokens`

Each row averages `n` trials at the given axis value. **baseline** = cache_creation + cache_read (everything the model saw in its prompt before generating a response). **tools/skills/slash/mcp** come from the CLI's init event.

| tokens | n | baseline | cache_create | cache_read | input | output | tools | skills | slash | mcp |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 1 | 26,203 | 26,203 | 0 | 10 | 54 | 24 | 6 | 0 | 0 |

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
