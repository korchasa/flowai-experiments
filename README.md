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

## Evidence retention

Live run output is part of the product, not temporary logs. Keep every retained run in the repository as a pair:

- `<experiment>/results/<date>-<slug>.json` — raw machine-readable evidence.
- `<experiment>/results/<date>-<slug>.md` — human-readable summary derived from the JSON.

Do not keep fresh successful results only in the working tree. If a run is cited from this `README.md`, both artifact files must be committed with it. Failed attempts that did not measure the target behavior should be documented as notes only, not stored as benchmark evidence.

## Running locally vs CI

CI runs `deno task check` (format + lint + test). CI does **NOT** run `deno task experiment*` — agent experiments need a live `claude` CLI with OAuth auth; API experiments need `OPENROUTER_API_KEY`. Run all experiments manually on a developer machine.

## Current verification

Last local verification: 2026-05-13, from repo root.

- `deno task test` passed: 89 tests, 0 failures.
- `deno task check` passed:
  - `deno fmt --check`: 55 files checked.
  - `deno lint`: 44 files checked.
  - `deno test`: 89 tests, 0 failures.
  - `gitleaks`: 16 commits scanned, ~4.31 MB scanned, no leaks found.

This verification covers repository quality gates only. Live experiment runs are separate because they require external Claude/OpenRouter credentials.

## Latest benchmark refresh

Last live benchmark refresh: 2026-05-13, from repo root.

- `deno task experiment:tokenizers --model anthropic/claude-haiku-4.5` passed:
  - 1 / 1 model processed.
  - 54 / 54 language files processed.
  - 249,508 input tokens counted.
  - Estimated cost: $0.253828.
  - Evidence: [`tokenizers/results/2026-05-13-1024-tokenizers-anthropic-claude-haiku-4-5.md`](tokenizers/results/2026-05-13-1024-tokenizers-anthropic-claude-haiku-4-5.md) + [`tokenizers/results/2026-05-13-1024-tokenizers-anthropic-claude-haiku-4-5.json`](tokenizers/results/2026-05-13-1024-tokenizers-anthropic-claude-haiku-4-5.json).
- `deno task experiment:images-hard --model google/gemini-2.5-flash-image` passed:
  - 1 / 1 model processed.
  - 11 / 11 prompts generated images.
  - Evidence: [`images-hard/results/2026-05-13-1057-images-hard-google-gemini-2-5-flash-image.md`](images-hard/results/2026-05-13-1057-images-hard-google-gemini-2-5-flash-image.md) + [`images-hard/results/2026-05-13-1057-images-hard-google-gemini-2-5-flash-image.json`](images-hard/results/2026-05-13-1057-images-hard-google-gemini-2-5-flash-image.json).
- `BENCH_HEALTH_DISABLE=1 deno task experiment:compression --filter adr-record-decision` passed:
  - 1 / 1 scenario included in the final report.
  - Compression ratio: 0.713.
  - Decompression ratio: 1.635.
  - Fact retention: 100% overall, 100% critical.
  - Inventions: 0.
  - Estimated cost: $0.1871.
  - Evidence: [`compression-decompression/results/2026-05-13-1119-compression-adr-record-decision.md`](compression-decompression/results/2026-05-13-1119-compression-adr-record-decision.md) + [`compression-decompression/results/2026-05-13-1119-compression-adr-record-decision.json`](compression-decompression/results/2026-05-13-1119-compression-adr-record-decision.json).

Notes:

- `compression-decompression/run.ts` now respects `--filter` when collecting `runs/latest/` reports. Before this fix, the benchmark command executed the filtered scenario but copied stale reports for unrelated scenarios into the final result artifact.
- `anchor-systems mapping --reps 1` was attempted but not retained as evidence: all 5 cells failed in the Claude judge step with `API Error: Unable to connect to API (FailedToOpenSocket/ConnectionRefused)`, so the run did not measure anchor-system adherence.

## Concepts

- **Experiment** — parameterized sweep producing a curve or headline number. Axes: tokens × rule × reps (or similar). Output: JSON + Markdown committed as evidence.
- **Cell** — one point in the cartesian product of axes.
- **Trial** — one agent run within a cell (`reps` trials per cell).
- **Adherence** — mean pass-rate of a binary judge verdict over trials in a cell.
- **Headline number** — single summary figure derived from the adherence curve (e.g. `max(tokens : mean_adherence ≥ 0.8)`).

## Findings

Empirical results from runs committed under each experiment's `results/`. Current inventory: 33 retained result pairs (`.json` + `.md`): 22 anchor-systems, 3 context-anatomy, 2 claude-md-length, 2 tokenizers, 2 images-hard, 2 compression-decompression. All numbers are tied to the named model/CLI versions and the specific retained artifact linked beside each claim.

### AGENTS.md size budget — not the bottleneck most people think

- **Sonnet 4.6:** max safe AGENTS.md = **16,000 tokens at ≥80% adherence** (n=5/cell, 90 trials, 21 min). Adherence holds at ~100% from 500 to 8,000 tokens; the only failure across the entire sweep is one Russian-language trial at 16k (93.3%).
  - The community heuristic *"keep CLAUDE.md under 200 lines"* undercounts the safe budget by ~32×.
  - Evidence: [`claude-md-length/results/2026-04-11-2354-claude-sonnet-4-6-single-file.md`](claude-md-length/results/2026-04-11-2354-claude-sonnet-4-6-single-file.md).
- **Haiku 4.5:** headline says 500 tokens, but the curve is essentially flat from 500 to 16,000 (73–93% with no monotone trend). Headline collapses to 500 because the conservative `max(tokens : every smaller bucket also passed)` rule trips on a single drop at 1,000 — not because larger files actually hurt.
  - Evidence: [`claude-md-length/results/2026-04-12-0025-claude-haiku-4-5-single-file.md`](claude-md-length/results/2026-04-12-0025-claude-haiku-4-5-single-file.md).
- **Practical takeaway:** on Sonnet there is plenty of room — optimizing AGENTS.md length is premature. On Haiku, shrinking the file does not move the needle either; the bottleneck is elsewhere (next section).

### The real bottleneck is rule type, not size

Adherence by rule across the full single-file sweep (n=15 trials/rule/model):

- **format** (output must end with `===NIMBUS-END===`): Sonnet **100%**, Haiku **100%**. Surface output constraints land reliably on both.
- **negation** (must not use the word `simply`): Sonnet **100%**, Haiku **90%**. Prohibitions land reliably; small models occasionally slip on idiomatic phrasings ("it simply states…").
- **language** (reply in Russian regardless of the query language): Sonnet **96.7%**, Haiku **43.3%**. Strong behavioral overrides — replacing the model's default mode of speaking — collapse on the small model and stay flat across all sizes.

Practical implication: AGENTS.md is the wrong place to put rules that ask the model to override its default mode of speaking, reasoning, or formatting at the prose level. Surface constraints (formatting markers, banned tokens, response shape) work; behavioral overrides do not, especially on smaller models. If you need a behavioral override on Haiku, put it in the user prompt every turn — not in project memory.

### Built-in CLI baseline dwarfs AGENTS.md content

`baseline = cache_creation + cache_read` from the init/result events — everything the model sees in its prompt **before** generating a response.

- **Sonnet 4.6** (`context-anatomy/results/2026-04-11-2352-claude-sonnet-4-6-baseline.md`):
  - tokens=0 → **15,961**, tokens=500 → 17,112, tokens=2000 → 18,435, tokens=8000 → 23,713, tokens=16000 → 30,800.
- **Haiku 4.5** (`context-anatomy/results/2026-04-12-0023-claude-haiku-4-5-baseline.md`):
  - tokens=0 → **26,795** (+10,834 vs Sonnet, **+68%**), tokens=500 → 28,038, tokens=2000 → 29,359, tokens=8000 → 34,635, tokens=16000 → 41,731.
- Slope ≈ **0.93 prompt tokens per AGENTS.md axis token** on both models (close to 1.0 because content lands in the cached prefix).
- Tools/skills/MCP/slash counts are constant: 25 tools, 7 skills, 0 MCP servers, 0 slash commands (the claude adapter already passes `--strict-mcp-config --disable-slash-commands` to keep account-level state out of measurements).

Practical implication: if you need to shrink agent context, **AGENTS.md is the last thing to cut**. Even a 16k-token AGENTS.md only doubles the prompt — the floor is what you can't escape. To actually move context cost, strip built-in tools, skills, MCP servers, and slash commands first.

### Anchor systems help traversal, not extraction

The `anchor-systems` suite compares five documentation-linking systems across task classes on `claude-haiku-4-5`. The repo contains early n=1/n=3 probes plus n=5 retained sweeps. The main signal below uses the n=5 artifacts where available; the later n=1 reruns are smoke/spot checks, not stronger evidence.

- **Extraction and mapping:** every system scored **0%** across 25 trials. The agent hallucinated anchor IDs or references even when the fixture contained explicit structure. Stronger anchor syntax alone did not make full graph extraction reliable. This result repeated across several retained probes.
  - Main evidence: [`anchor-systems/results/2026-05-12-0717-claude-haiku-4-5-mapping.md`](anchor-systems/results/2026-05-12-0717-claude-haiku-4-5-mapping.md).
- **Boundary detection:** every system scored **100%** across 25 trials. Once the task is local and asks for code-block line ranges, all link formats were sufficient. This result also repeated in n=3 and n=1 retained runs.
  - Main evidence: [`anchor-systems/results/2026-05-12-0742-claude-haiku-4-5-boundary.md`](anchor-systems/results/2026-05-12-0742-claude-haiku-4-5-boundary.md).
- **Multi-hop traversal:** Native Markdown scored **6.7%**, Wikilinks **0%**, Zettelkasten **26.7%**, SALP **53.3%**, SALP-short **60%** over 75 trials. The headline for deep targets is sharper: native **20%**, wikilinks **0%**, zettelkasten **80%**, SALP **60%**, SALP-short **100%**. Explicit stable anchor IDs help traversal across chains, but the small model still drops or invents hops.
  - Main evidence: [`anchor-systems/results/2026-05-12-0752-claude-haiku-4-5-multi-hop.md`](anchor-systems/results/2026-05-12-0752-claude-haiku-4-5-multi-hop.md).
- **Graph linting:** Native Markdown scored **100%**, Wikilinks and Zettelkasten **80%**, SALP and SALP-short **60%** across 25 trials. Later n=1 spot checks hit 100% for every system, but the n=5 artifact is the better retained estimate.
  - Main evidence: [`anchor-systems/results/2026-05-12-0901-claude-haiku-4-5-linting.md`](anchor-systems/results/2026-05-12-0901-claude-haiku-4-5-linting.md).
- **RAG noise resistance:** every system scored **100%** across 75 trials and across noise_count values 3, 6, and 9. The agent can stay focused on the anchor-bearing function when the target is explicit.
  - Main evidence: [`anchor-systems/results/2026-05-12-0926-claude-haiku-4-5-rag-noise.md`](anchor-systems/results/2026-05-12-0926-claude-haiku-4-5-rag-noise.md).

Practical implication: use explicit anchor IDs for multi-hop documentation flows, especially SALP/SALP-short, but do not assume they make broad graph extraction safe. If the task needs a complete graph, add a verifier or constrained parser. If the task is local boundary lookup or noisy retrieval, the tested systems are already adequate at this scale.

### Standalone benchmarks now have fresh retained evidence

The standalone benchmark families each have an initial 2026-05-12 retained run and a 2026-05-13 refresh. The latest refresh stores both JSON and Markdown artifacts in the repo:

- **Tokenizers:** `anthropic/claude-haiku-4.5` processed **54/54** UDHR/code files, producing **249,508** input tokens at estimated cost **$0.253828**. The 2026-05-12 run has the same totals; the 2026-05-13 run confirms repeatability for the same model/corpus pair.
  - Evidence: [`tokenizers/results/2026-05-13-1024-tokenizers-anthropic-claude-haiku-4-5.md`](tokenizers/results/2026-05-13-1024-tokenizers-anthropic-claude-haiku-4-5.md) + [`tokenizers/results/2026-05-13-1024-tokenizers-anthropic-claude-haiku-4-5.json`](tokenizers/results/2026-05-13-1024-tokenizers-anthropic-claude-haiku-4-5.json).
- **Images-hard:** `google/gemini-2.5-flash-image` succeeded on **11/11** prompts in the retained hard-image suite. The 2026-05-12 artifact was a 1/1 smoke run; the 2026-05-13 artifact is the first retained broader sweep.
  - Evidence: [`images-hard/results/2026-05-13-1057-images-hard-google-gemini-2-5-flash-image.md`](images-hard/results/2026-05-13-1057-images-hard-google-gemini-2-5-flash-image.md) + [`images-hard/results/2026-05-13-1057-images-hard-google-gemini-2-5-flash-image.json`](images-hard/results/2026-05-13-1057-images-hard-google-gemini-2-5-flash-image.json).
- **Compression-decompression:** `adr-record-decision--compressed-style--claude` retained **100%** overall facts, **100%** critical facts, and **0** inventions with compression ratio **0.713** and decompression ratio **1.635**. The 2026-05-12 and 2026-05-13 retained artifacts report the same metrics for this scenario/style/model combination.
  - Evidence: [`compression-decompression/results/2026-05-13-1119-compression-adr-record-decision.md`](compression-decompression/results/2026-05-13-1119-compression-adr-record-decision.md) + [`compression-decompression/results/2026-05-13-1119-compression-adr-record-decision.json`](compression-decompression/results/2026-05-13-1119-compression-adr-record-decision.json).

Practical implication: standalone benchmarks are now current enough for comparison baselines, but they are still single-model or single-scenario refreshes. Treat them as retained evidence for the named model/scenario, not as broad leaderboard claims.

### Model selection by task class

- **Sonnet 4.6** — when AGENTS.md is supposed to *shape behavior*: project conventions, domain rules, persona, language overrides. There is room (16k+) and overrides actually land.
- **Haiku 4.5** — when AGENTS.md needs to enforce *shape of output*: format markers, banned tokens, response templates, schema. Do **not** rely on AGENTS.md for behavioral overrides on Haiku — adherence is roughly a coin flip regardless of file size.

### Caveats on these numbers

- **Sample size:** n=5 trials/cell → ~30% confidence interval per cell. Headline numbers (16k vs 500, 100% vs 43%) are robust because the differences are too large to be noise; single-cell adherence is not.
- **Rule position:** the rule is fixed at 50% of file length. Primacy/recency effects (lost-in-the-middle) are a known confound and would need their own sweep to isolate.
- **Token estimation:** 1 token ≈ 4 chars heuristic (±15%). Axis values are approximate. Swap in a real tokenizer if tighter precision is needed.
- **Versioning:** all numbers tied to `claude` CLI 2.1.101. Re-run after major model or CLI upgrades — language adherence in particular is something model trainers actively retune, so the Haiku finding may move on the next release.
- **Standalone coverage:** tokenizers/images/compression results above are latest retained runs, but each covers the explicitly named model/scenario only.
- **Non-determinism:** even at temperature=0, tool use and context can shift outputs. Always read the aggregate curve, not single cells.

## License

MIT (matches upstream `flow`).
