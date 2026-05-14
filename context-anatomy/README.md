# Experiment: `context-anatomy`

Measures what occupies the spawned `claude` CLI's context window at
the start of a trial, decomposed into a fixed baseline (system prompt,
built-in tools, account-attached skills/MCP) and the variable
contribution from the project's `AGENTS.md`.

Motivates and complements [`claude-md-length`](../claude-md-length/):
before you can claim "CLAUDE.md size effect", you need to know how
large the non-CLAUDE.md baseline is and how much AGENTS.md actually
adds per token.

## Variants

- **`baseline`** — sweeps the size of the root `AGENTS.md` from 0 to
  16000 tokens; no rules are injected. The agent is given a trivial
  prompt (`"Reply with exactly the single word: pong"`) that forces
  exactly one round-trip so we can read the first `result` event.

## What gets measured

For every trial the experiment parses the raw stream-json NDJSON
captured in `TrialResult.agentOutput` and extracts:

- `init` event counts: `tools`, `skills`, `slash_commands`,
  `mcp_servers`.
- `result` event usage: `cache_creation_input_tokens`,
  `cache_read_input_tokens`, `input_tokens`, `output_tokens`.

Samples are averaged across repetitions per axis value and rendered as
a markdown table in the custom section of the report.

- `baseline` column = `cache_creation + cache_read` — everything the
  model saw in its prompt before it wrote a response.
- Comparing the row at `tokens=0` to the row at `tokens=16000` gives
  the effective token contribution of `AGENTS.md` (including the
  cache-padding overhead the CLI introduces).

## How to run

```bash
# Full sweep (10 trials: 5 sizes × 2 reps)
deno task experiment context-anatomy --variant baseline --model claude-haiku-4-5

# Smoke — single cell, single rep
deno task experiment context-anatomy --variant baseline --model claude-haiku-4-5 \
    --reps 1 --axis tokens=0

# Dry run — print plan, don't spend LLM calls
deno task experiment context-anatomy --variant baseline --dry-run
```

Flags:

- `--model <id>` — agent model under test.
- `--ide <id>` — IDE adapter (currently claude only; the experiment
  relies on `claude`'s stream-json init event format).
- `--reps <n>` — override trials per cell (default 2).
- `--axis tokens=<csv>` — override the tokens axis (e.g. `0,1000,8000`).
  The `--axis` flag is the generic axis-override interface; repeat it to
  override multiple axes. This experiment only declares `tokens`.
- `--seed <n>` — base seed for deterministic noise.

## How to read results

Each run produces two sibling files in `./results/`:

- `<DATE>-<HHMM>-<model>-baseline.json` — full per-trial raw data
  including the entire NDJSON stream.
- `<DATE>-<HHMM>-<model>-baseline.md` — human summary with headline,
  the default adherence table (all 100% — it's a stub judge), and the
  **Context metrics** section which is the real payload:

  ```
  | tokens | n | baseline | cache_create | cache_read | ... |
  |---|---|---|---|---|---|
  | 0      | 2 | 26,000   | ...          | ...        | ... |
  | 16000  | 2 | 44,000   | ...          | ...        | ... |
  ```

The adherence table will always read 100% because the judge rule is a
stub ("response is non-empty"). Ignore that section — this experiment
does not test adherence.

## Results

Retained baseline sweeps:

`baseline = cache_creation + cache_read` from the init/result events — everything the model sees in
its prompt before generating a response.

| Model | tokens=0 | tokens=500 | tokens=2000 | tokens=8000 | tokens=16000 | Evidence |
|-------|---------:|-----------:|------------:|------------:|-------------:|----------|
| Sonnet 4.6 | 15,961 | 17,112 | 18,435 | 23,713 | 30,800 | [baseline](results/2026-04-11-2352-claude-sonnet-4-6-baseline.md) |
| Haiku 4.5 | 26,795 | 28,038 | 29,359 | 34,635 | 41,731 | [baseline](results/2026-04-12-0023-claude-haiku-4-5-baseline.md) |

Haiku's tokens=0 baseline is +10,834 vs Sonnet (+68%).

- Slope is approximately **0.93 prompt tokens per AGENTS.md axis token** on both models (close to
  1.0 because content lands in the cached prefix).
- Tools/skills/MCP/slash counts are constant: 25 tools, 7 skills, 0 MCP servers, 0 slash commands
  (the claude adapter already passes `--strict-mcp-config --disable-slash-commands` to keep
  account-level state out of measurements).

Practical implication: if you need to shrink agent context, AGENTS.md is the last thing to cut. Even
a 16k-token AGENTS.md only doubles the prompt; the floor is what you cannot escape. To move context
cost materially, strip built-in tools, skills, MCP servers, and slash commands first.

## Baseline finding — haiku smoke (2026-04-11)

First smoke run — `claude-haiku-4-5`, cleanroom config dir, one trial
at `tokens=0` (no `AGENTS.md` at all):

- **`cache_creation_input_tokens`: 26,203** — the whole prompt-side
  payload for one round trip.
- **`tools`: 24**, **`skills`: 6** (`update-config`, `debug`,
  `simplify`, `batch`, `loop`, `claude-api`), **`agents`: 5**
  (`general-purpose`, `statusline-setup`, `Explore`, `Plan`,
  `claude-code-guide`).
- **`mcp_servers`: 0**, **`slash_commands`: 0**, **`plugins`: 0** —
  isolation worked: `--strict-mcp-config --disable-slash-commands`
  stripped account-level MCP/slash, cleanroom `CLAUDE_CONFIG_DIR`
  stripped project/global memory files and marketplace plugins.

Where those ~26k tokens come from, traced back to physical sources:

- **Inside the `claude` binary** (~233 MB ELF at
  `~/.local/share/claude/versions/<v>`): built-in system prompt, all
  24 tool schemas, 6 skill descriptors, 5 agent descriptors. Grep
  confirms the skill names appear many times inside the ELF — they
  are embedded, not loaded from disk. This is the largest single
  contributor to the baseline.
- **Injected by the CLI at startup** (per-machine dynamic sections):
  `cwd`, platform/env info, model/date, git status of the sandbox,
  memory-path resolution report. Varies run-to-run, but every run
  pays the cost.
- **NOT loaded**: `~/.claude/CLAUDE.md` (absent on the host),
  `~/.claude/plugins/marketplaces/` (not wired in cleanroom mode),
  project-root `.claude/` (sandbox is a fresh temp dir with no
  `.claude/` subtree), `mcp_needs_auth_cache.json`, `settings.json`.

### This baseline is normal and intentional

The experiment is designed to measure what an agent actually
experiences in the **real operating environment** — the one the user
sees when they run `claude` in their own project. The 26k baseline is
the floor of that environment. We explicitly do NOT try to subtract
it or simulate a zero-baseline idealized model:

- `claude-md-length` headline numbers (e.g. "max safe single-file
  AGENTS.md = 1000 tokens on haiku") are **relative to this baseline**.
  They describe the real cliff a real agent hits, not a theoretical
  one. Reproducibility is preserved because the baseline itself is
  stable across runs (same CLI version, same account, same host OS).
- The sibling `claude-md-length` experiment thus measures the delta
  on top of this baseline, which is exactly the question practitioners
  care about: "how much CLAUDE.md can I write before my agent starts
  dropping rules in the environment my agent will actually run in".
- If a future CLI upgrade changes the built-in skill/tool set (and
  moves the baseline), rerun `context-anatomy` first to establish the
  new floor; then rerun `claude-md-length` to see how the headline
  shifts. The two experiments are designed to be read together.

## Caveats

- **One-round prompt**: the agent only runs a single turn. Cache
  numbers reflect the prompt as it is shipped for that single call;
  multi-turn sessions would cache-read on subsequent turns and
  decrease perceived baseline.
- **Account-scoped resources leak in**: skills attached to the
  authenticated `claude.ai` account ship descriptions inside the system
  prompt regardless of `CLAUDE_CONFIG_DIR`. The claude adapter already
  passes `--strict-mcp-config --disable-slash-commands` to eliminate
  account-level MCP servers and slash commands, but skills survive —
  they are counted and reported as part of the baseline.
- **Stub judge**: one LLM call per trial is "wasted" on a vacuous
  pass-check. At 10 trials and cheap judge (`claude-sonnet-4-6` per
  `config.json`) this is a negligible cost, but be aware.
- **Token estimation in setupCell**: AGENTS.md sizes are approximated
  via the same ±15% 4-char heuristic used by `claude-md-length`. The
  axis labels are not exact token counts.
- **CLI version dependence**: the 26k figure is tied to
  `claude-code` `2.1.101` on Linux ARM64. Other versions ship
  different built-in skill/tool/agent sets and will produce different
  baselines.
