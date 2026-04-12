# flowai-experiments

Parameterized empirical studies of AI agent platforms. Measures how model × IDE × memory-layout × workload combinations affect agent behavior (e.g. "max `CLAUDE.md`/`AGENTS.md` token budget at which an agent still follows an embedded rule ≥80% of the time").

## Directory layout

```
scripts/
  task-experiment.ts            CLI entry (deno task experiment <name> --variant <v> ...)
  experiments/
    lib/                        runner, judge, noise, report, tokens, types
    claude-md-length/           first experiment: variants single-file + tree-sum
      single-file.ts
      tree-sum.ts
      shared.ts
      noise-corpus.md
      results/                  committed JSON + Markdown evidence
  benchmarks/lib/               minimal agent-runtime subset (adapters, llm, spawned_agent, usage)
benchmarks/
  config.json                   IDE defaults (agent_model, judge model)
documents/rnd/                  R&D writeups
```

## Running locally

```bash
# dry run (no CLI spawn)
deno task experiment claude-md-length --variant single-file --dry-run

# smoke test (one trial, requires live claude CLI + macOS keychain auth)
deno task experiment claude-md-length --variant single-file --reps 1 --axis tokens=500 --axis rule=format

# full sweep
deno task experiment claude-md-length --variant single-file --model claude-opus-4-6
```

See [`scripts/experiments/claude-md-length/README.md`](scripts/experiments/claude-md-length/README.md) for the experiment methodology.

All tasks **must be invoked from the repo root** — `benchmarks/config.json` is resolved CWD-relative (intentional, matches flow).

## Running locally vs CI

CI runs `deno task check` (format + lint + test). CI does **NOT** run `deno task experiment` — experiments need a live `claude` CLI with real OAuth authentication (macOS keychain entry `Claude Code-credentials`). Run experiments manually on a developer machine.

## Concepts

- **Experiment** — parameterized sweep producing a curve or headline number. Axes: tokens × rule × reps (or similar). Output: JSON + Markdown committed as evidence.
- **Cell** — one point in the cartesian product of axes.
- **Trial** — one agent run within a cell (`reps` trials per cell).
- **Adherence** — mean pass-rate of a binary judge verdict over trials in a cell.
- **Headline number** — single summary figure derived from the adherence curve (e.g. `max(tokens : mean_adherence ≥ 0.8)`).

## License

MIT (matches upstream `flow`).
