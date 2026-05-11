# flowai-experiments

Parameterized empirical studies of AI agent platforms. Measures how model × IDE × memory-layout × workload combinations affect agent behavior (e.g. "max `CLAUDE.md`/`AGENTS.md` token budget at which an agent still follows an embedded rule ≥80% of the time").

## Directory layout

```
scripts/
  task-experiment.ts            CLI entry (deno task experiment <name> --variant <v> ...)
  experiments/
    lib/                        runner, judge, noise, report, tokens, types
    claude-md-length/           variants single-file + tree-sum (rule adherence vs file size)
    context-anatomy/            variant baseline (CLI-intrinsic context floor + slope)
    tokenizers/                 tokens/char across models × 40+ UDHR languages (OpenRouter)
    compression-decompression/  compress→decompress fact-retention benchmark (Claude CLI)
    images-hard/                text-to-image: 12 hard test cases (OpenRouter)
  benchmarks/lib/               minimal agent-runtime subset (adapters, llm, spawned_agent, usage)
config.json                     IDE defaults (agent_model, judge model)
results/                        committed JSON + Markdown evidence (one pair per run)
documents/rnd/                  R&D writeups
.env.example                    env var template (copy to .env, fill OPENROUTER_API_KEY)
```

## Running locally

**Agent-spawning experiments** (claude CLI required — macOS keychain auth):

```bash
# dry run
deno task experiment claude-md-length --variant single-file --dry-run

# one trial
deno task experiment claude-md-length --variant single-file --reps 1 --axis tokens=500 --axis rule=format

# full sweep
deno task experiment claude-md-length --variant single-file --model claude-opus-4-6
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

## Running locally vs CI

CI runs `deno task check` (format + lint + test). CI does **NOT** run `deno task experiment*` — agent experiments need a live `claude` CLI with OAuth auth; API experiments need `OPENROUTER_API_KEY`. Run all experiments manually on a developer machine.

## Concepts

- **Experiment** — parameterized sweep producing a curve or headline number. Axes: tokens × rule × reps (or similar). Output: JSON + Markdown committed as evidence.
- **Cell** — one point in the cartesian product of axes.
- **Trial** — one agent run within a cell (`reps` trials per cell).
- **Adherence** — mean pass-rate of a binary judge verdict over trials in a cell.
- **Headline number** — single summary figure derived from the adherence curve (e.g. `max(tokens : mean_adherence ≥ 0.8)`).

## Findings

Empirical results from runs committed under `results/`. All numbers tied to Claude CLI 2.1.101 and the model versions named.

### AGENTS.md size budget — not the bottleneck most people think

- **Sonnet 4.6:** max safe AGENTS.md = **16,000 tokens at ≥80% adherence** (n=5/cell, 90 trials, 21 min). Adherence holds at ~100% from 500 to 8,000 tokens; the only failure across the entire sweep is one Russian-language trial at 16k (93.3%).
  - The community heuristic *"keep CLAUDE.md under 200 lines"* undercounts the safe budget by ~32×.
  - Evidence: [`results/2026-04-11-2354-claude-sonnet-4-6-single-file.md`](results/2026-04-11-2354-claude-sonnet-4-6-single-file.md).
- **Haiku 4.5:** headline says 500 tokens, but the curve is essentially flat from 500 to 16,000 (73–93% with no monotone trend). Headline collapses to 500 because the conservative `max(tokens : every smaller bucket also passed)` rule trips on a single drop at 1,000 — not because larger files actually hurt.
  - Evidence: [`results/2026-04-12-0025-claude-haiku-4-5-single-file.md`](results/2026-04-12-0025-claude-haiku-4-5-single-file.md).
- **Practical takeaway:** on Sonnet there is plenty of room — optimizing AGENTS.md length is premature. On Haiku, shrinking the file does not move the needle either; the bottleneck is elsewhere (next section).

### The real bottleneck is rule type, not size

Adherence by rule across the full single-file sweep (n=15 trials/rule/model):

- **format** (output must end with `===NIMBUS-END===`): Sonnet **100%**, Haiku **100%**. Surface output constraints land reliably on both.
- **negation** (must not use the word `simply`): Sonnet **100%**, Haiku **90%**. Prohibitions land reliably; small models occasionally slip on idiomatic phrasings ("it simply states…").
- **language** (reply in Russian regardless of the query language): Sonnet **96.7%**, Haiku **43.3%**. Strong behavioral overrides — replacing the model's default mode of speaking — collapse on the small model and stay flat across all sizes.

Practical implication: AGENTS.md is the wrong place to put rules that ask the model to override its default mode of speaking, reasoning, or formatting at the prose level. Surface constraints (formatting markers, banned tokens, response shape) work; behavioral overrides do not, especially on smaller models. If you need a behavioral override on Haiku, put it in the user prompt every turn — not in project memory.

### Built-in CLI baseline dwarfs AGENTS.md content

`baseline = cache_creation + cache_read` from the init/result events — everything the model sees in its prompt **before** generating a response.

- **Sonnet 4.6** (`results/2026-04-11-2352-claude-sonnet-4-6-baseline.md`):
  - tokens=0 → **15,961**, tokens=500 → 17,112, tokens=2000 → 18,435, tokens=8000 → 23,713, tokens=16000 → 30,800.
- **Haiku 4.5** (`results/2026-04-12-0023-claude-haiku-4-5-baseline.md`):
  - tokens=0 → **26,795** (+10,834 vs Sonnet, **+68%**), tokens=500 → 28,038, tokens=2000 → 29,359, tokens=8000 → 34,635, tokens=16000 → 41,731.
- Slope ≈ **0.93 prompt tokens per AGENTS.md axis token** on both models (close to 1.0 because content lands in the cached prefix).
- Tools/skills/MCP/slash counts are constant: 25 tools, 7 skills, 0 MCP servers, 0 slash commands (the claude adapter already passes `--strict-mcp-config --disable-slash-commands` to keep account-level state out of measurements).

Practical implication: if you need to shrink agent context, **AGENTS.md is the last thing to cut**. Even a 16k-token AGENTS.md only doubles the prompt — the floor is what you can't escape. To actually move context cost, strip built-in tools, skills, MCP servers, and slash commands first.

### Model selection by task class

- **Sonnet 4.6** — when AGENTS.md is supposed to *shape behavior*: project conventions, domain rules, persona, language overrides. There is room (16k+) and overrides actually land.
- **Haiku 4.5** — when AGENTS.md needs to enforce *shape of output*: format markers, banned tokens, response templates, schema. Do **not** rely on AGENTS.md for behavioral overrides on Haiku — adherence is roughly a coin flip regardless of file size.

### Caveats on these numbers

- **Sample size:** n=5 trials/cell → ~30% confidence interval per cell. Headline numbers (16k vs 500, 100% vs 43%) are robust because the differences are too large to be noise; single-cell adherence is not.
- **Rule position:** the rule is fixed at 50% of file length. Primacy/recency effects (lost-in-the-middle) are a known confound and would need their own sweep to isolate.
- **Token estimation:** 1 token ≈ 4 chars heuristic (±15%). Axis values are approximate. Swap in a real tokenizer if tighter precision is needed.
- **Versioning:** all numbers tied to `claude` CLI 2.1.101. Re-run after major model or CLI upgrades — language adherence in particular is something model trainers actively retune, so the Haiku finding may move on the next release.
- **Non-determinism:** even at temperature=0, tool use and context can shift outputs. Always read the aggregate curve, not single cells.

## License

MIT (matches upstream `flow`).
