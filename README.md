# flowai-experiments

Parameterized empirical studies of AI agent platforms. Measures how model × IDE × memory-layout × workload combinations affect agent behavior (e.g. "max `CLAUDE.md`/`AGENTS.md` token budget at which an agent still follows an embedded rule ≥80% of the time").

## Directory layout

```
shared/                        runner, judge, noise, report, tokens, adapters, llm
claude-md-length/              variants single-file + tree-sum (rule adherence vs file size)
context-anatomy/               variant baseline (CLI-intrinsic context floor + slope)
anchor-systems/                documentation anchor/link navigation benchmark
tokenizers/                    tokens/char across models × 40+ UDHR languages (OpenRouter)
compression-decompression/     compress→decompress fact-retention benchmark (Claude CLI)
images-hard/                   text-to-image: 12 hard test cases (OpenRouter)
scripts/
  task-experiment.ts            CLI entry (deno task experiment <name> --variant <v> ...)
config.json                     IDE defaults (agent_model, judge model)
<name>/results/                 committed JSON + Markdown evidence (one pair per run)
.env.example                    env var template (copy to .env, fill OPENROUTER_API_KEY)
```

## Running locally

**Agent-spawning experiments** (via `@korchasa/ai-ide-cli`; selected runtime auth required):

```bash
# dry run
deno task experiment claude-md-length --variant single-file --dry-run

# one trial
deno task experiment claude-md-length --variant single-file --reps 1 --axis tokens=500 --axis rule=format

# full sweep with config.json defaults
deno task experiment claude-md-length --variant single-file --ide opencode
```

**API-based experiments** (require `OPENROUTER_API_KEY` in `.env`):

```bash
# copy and fill the template once
cp .env.example .env   # then add your key

# dry run (no API calls)
deno task experiment:tokenizers --dry-run
deno task experiment:images-hard --dry-run
deno task experiment:compression --dry-run

# live runs
deno task experiment:tokenizers --model anthropic/claude-haiku-4-5
deno task experiment:images-hard --model google/gemini-2-5-flash-preview
deno task experiment:compression
```

See each experiment's `README.md` for flags and methodology.

All tasks **must be invoked from the repo root** — `config.json` is resolved CWD-relative (intentional).

## Evidence retention

Live run output is part of the product, not temporary logs. Keep every retained run in the repository as a pair:

| Artifact | Purpose |
| --- | --- |
| `<experiment>/results/<date>-<slug>.json` | Raw machine-readable evidence. |
| `<experiment>/results/<date>-<slug>.md` | Human-readable summary derived from the JSON. |

Do not keep fresh successful results only in the working tree. If a run is cited from this `README.md`, both artifact files must be committed with it. Failed attempts that did not measure the target behavior should be documented as notes only, not stored as benchmark evidence.

## Running locally vs CI

CI runs `deno task check` (format + lint + test). CI does **NOT** run `deno task experiment*` — agent experiments need authenticated local AI IDE CLIs; API experiments need `OPENROUTER_API_KEY`. Run all experiments manually on a developer machine.

## Concepts

| Term | Meaning |
| --- | --- |
| Experiment | Parameterized sweep producing a curve or headline number. Axes: tokens × rule × reps (or similar). Output: JSON + Markdown committed as evidence. |
| Cell | One point in the cartesian product of axes. |
| Trial | One agent run within a cell (`reps` trials per cell). |
| Adherence | Mean pass-rate of a binary judge verdict over trials in a cell. |
| Headline number | Single summary figure derived from the adherence curve (e.g. `max(tokens : mean_adherence ≥ 0.8)`). |

## Findings

Benchmark findings live in each experiment directory next to the retained JSON and Markdown artifacts.
The root README only tracks retained evidence coverage.

| Experiment family | README | Retained result pairs |
| --- | --- | ---: |
| anchor-systems | [anchor-systems/README.md](anchor-systems/README.md) | 5 |
| context-anatomy | [context-anatomy/README.md](context-anatomy/README.md) | 3 |
| claude-md-length | [claude-md-length/README.md](claude-md-length/README.md) | 2 |
| tokenizers | [tokenizers/README.md](tokenizers/README.md) | 2 |
| images-hard | [images-hard/README.md](images-hard/README.md) | 2 |
| compression-decompression | [compression-decompression/README.md](compression-decompression/README.md) | 2 |
| **Total** |  | **16** |

## License

MIT (matches upstream `flow`).
