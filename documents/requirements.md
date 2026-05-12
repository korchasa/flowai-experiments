# SRS

## 1. Intro

- **Desc:** `flowai-experiments` is a Deno/TypeScript harness for parameterized empirical studies of AI agent platforms. The product is committed numeric evidence (adherence curves + headline numbers + raw per-trial logs), not a regression test suite. Each experiment answers one measurable question about (model × IDE × memory-layout × workload).
- **Def/Abbr:**
  - **Experiment** — parameterized sweep producing a curve or headline number.
  - **Variant** — one concrete instantiation of an experiment (e.g. `single-file`, `tree-sum`).
  - **Axis** — a dimension varied during a sweep (e.g. `tokens`, `rule`).
  - **Cell** — one point in the cartesian product of axes.
  - **Trial** — one agent run within a cell; `reps` trials per cell.
  - **Adherence** — mean pass-rate of a binary judge verdict over trials in a cell.
  - **Headline number** — single summary derived from adherence (e.g. `max(tokens : mean_adherence ≥ 0.8)`).
  - **Benchmark** — pass/fail regression test for specific agent primitives. Lives in the sister [`flow`](https://github.com/korchasa/flow) repo, NOT here.

## 2. General

- **Context:** Extracted from the `flow` repo at commit `f311142` (2026-04-11). The sister `flow` repo owns the AssistFlow framework and regression-test benchmarks. This repo owns the empirical-studies pipeline. Clean-slate copy: no git history preserved across the split.
- **Assumptions/Constraints:**
  - Deno 2.x runtime, TypeScript only.
  - Experiments run on developer machines — CI runs only `deno task check`. Live `claude` CLI is required for real runs; auth is via macOS keychain (`claude login`). The CLI reads credentials natively — no file copying needed.
  - Results are committed to the repo under `scripts/experiments/<name>/results/` and form the historical record. They must not be deleted or rewritten.
  - All tasks are invoked from the repo root; `config.json` is resolved CWD-relative.

## 3. Functional Reqs

### 3.1 FR-EXP-RUN

- **Desc:** Run an experiment variant end-to-end: build cartesian product of axes, prepare a clean sandbox per trial, spawn the agent, collect output, judge, compute adherence, write JSON + Markdown reports.
- **Tasks:** [migrate-benchmarks-from-ai-dir](tasks/2026/05/migrate-benchmarks-from-ai-dir.md)
- **Scenario:** User invokes `deno task experiment <name> --variant <v> --model <m>`. Runner loads the variant, iterates cells × trials, calls adapter to spawn agent, calls judge, writes `results/<DATE>-<model>-<variant>.{json,md}`.
- **Acceptance:**
  - [x] Runner loads variant file and sweeps the full cartesian product of axes. Evidence: `scripts/experiments/lib/runner.ts`, `scripts/experiments/lib/runner_test.ts`.
  - [x] Per-trial sandbox is prepared via `Experiment.setupCell`. Evidence: `scripts/experiments/lib/types.ts:70`, `scripts/experiments/claude-md-length/single-file.ts`.
  - [x] Each trial calls the configured adapter (`claude` or `cursor`). Evidence: `scripts/benchmarks/lib/adapters/mod.ts`, `scripts/benchmarks/lib/adapters/claude.ts`.
  - [x] Results are emitted as JSON + Markdown in `results/`. Evidence: `scripts/experiments/lib/report.ts`, `scripts/experiments/claude-md-length/results/2026-04-11-claude-haiku-4-5-single-file.md`.

### 3.2 FR-EXP-JUDGE

- **Desc:** Binary pass/fail judgment of one specific rule per trial, via an LLM judge (`judge` model configured in `config.json`).
- **Scenario:** Runner passes `{rule, userQuery, agentOutput}` to `judge.ts`. Judge returns `{pass: bool, reason: string}`. Runner stores verdict in `TrialResult`.
- **Acceptance:**
  - [x] Judge receives rule + query + output and returns a binary verdict with a reason. Evidence: `scripts/experiments/lib/judge.ts`, `scripts/experiments/lib/judge_test.ts`.
  - [x] Judge model is configurable via `config.json`. Evidence: `config.json`.

### 3.3 FR-EXP-NOISE

- **Desc:** Deterministic sampling from a committed noise corpus to pad memory files to a target token budget without introducing competing directives.
- **Scenario:** Experiment requests N tokens of noise with `seed`. `noise.ts` returns a byte-identical slice of the corpus for the same seed.
- **Acceptance:**
  - [x] Deterministic sampling: same seed + same request → byte-identical output. Evidence: `scripts/experiments/lib/noise.ts`, `scripts/experiments/lib/noise_test.ts`.
  - [x] Corpus contains no executable directives (descriptive prose only). Evidence: `scripts/experiments/claude-md-length/noise-corpus.md`.

### 3.4 FR-EXP-TOKENS

- **Desc:** Estimate token counts for memory files using a lightweight heuristic (1 token ≈ 4 chars, ±15%). Precise enough to make axis values meaningful.
- **Scenario:** Experiment constructs a memory file of target token size. `tokens.ts` exposes `countTokens(text)` and `sliceToTokens(text, n)`.
- **Acceptance:**
  - [x] Token-counting helper exists and is unit-tested. Evidence: `scripts/experiments/lib/tokens.ts`, `scripts/experiments/lib/tokens_test.ts`.

### 3.5 FR-EXP-REPORT

- **Desc:** Emit committed per-run artifacts: `<DATE>-<model>-<variant>.json` (full per-trial raw data) and `<DATE>-<model>-<variant>.md` (human summary with headline, per-axis table, per-rule breakdown, sample failures).
- **Scenario:** After sweep completes, runner calls `report.writeJson` + `report.writeMarkdown`. Files land in `scripts/experiments/<name>/results/`.
- **Acceptance:**
  - [x] JSON writer emits `ExperimentReport` schema v1. Evidence: `scripts/experiments/lib/report.ts`, `scripts/experiments/lib/types.ts:81`.
  - [x] Markdown writer emits headline + axis tables + samples. Evidence: `scripts/experiments/lib/report.ts`, `scripts/experiments/lib/report_test.ts`.
  - [x] Results are committed to the repo. Evidence: `scripts/experiments/claude-md-length/results/2026-04-11-claude-haiku-4-5-tree-sum.md`.

### 3.6 FR-EXP.MEMORY-LENGTH

- **Desc:** First experiment: measure the max token budget of project memory files at which an agent still follows an embedded rule ≥80% of the time. Two variants: `single-file` (all memory in one root file) and `tree-sum` (budget split across ancestor chain).
- **Scenario:** Three rules (`format`, `language`, `negation`) × token axis × 5 reps. Neutral query. Cleanroom `claude` invocation — `--strict-mcp-config --disable-slash-commands` (auth via macOS keychain). Headline: `max(tokens : mean_adherence ≥ 0.8)`. Numbers are relative to the CLI-intrinsic baseline (~26k on haiku) quantified by FR-EXP.CONTEXT-ANATOMY — measurement is performed in the real operating environment, not against an idealized zero baseline.
- **Acceptance:**
  - [x] `single-file` variant runs and commits results for Haiku 4.5. Evidence: `scripts/experiments/claude-md-length/single-file.ts`, `scripts/experiments/claude-md-length/results/2026-04-11-claude-haiku-4-5-single-file.md`.
  - [x] `tree-sum` variant runs and commits results for Haiku 4.5. Evidence: `scripts/experiments/claude-md-length/tree-sum.ts`, `scripts/experiments/claude-md-length/results/2026-04-11-claude-haiku-4-5-tree-sum.md`.
  - [x] Account-level MCP and slash commands are blocked via `--strict-mcp-config --disable-slash-commands`. `~/.claude/CLAUDE.md` is visible to trial agents (acceptable — experiments don't test memory injection). Evidence: `scripts/benchmarks/lib/adapters/claude.ts`, `scripts/experiments/lib/runner.ts:363`.
  - [ ] Sonnet and Opus results for both variants. Evidence: none yet.

### 3.7 FR-EXP.CONTEXT-ANATOMY

- **Desc:** Second experiment: decompose the prompt-side context a spawned `claude` CLI carries at trial start, as a function of root `AGENTS.md` size. Serves as a baseline reference for FR-EXP.MEMORY-LENGTH — without knowing the CLI's intrinsic floor, "effect of CLAUDE.md size" has no reference frame.
- **Scenario:** Sweep `tokens` axis (0, 500, 2000, 8000, 16000), trivial `"Reply with pong"` query, single round trip per trial. Parse the stream-json init event (`tools`, `skills`, `slash_commands`, `mcp_servers`, `agents` counts) and result event usage (`cache_creation_input_tokens`, `cache_read_input_tokens`, `input_tokens`, `output_tokens`). Render averaged metrics table in the custom markdown section of the report. Judge is a vacuous stub — adherence column of the default renderer is ignored.
- **Acceptance:**
  - [x] Experiment directory with `baseline.ts`, `shared.ts`, `README.md`. Evidence: `scripts/experiments/context-anatomy/baseline.ts`, `scripts/experiments/context-anatomy/shared.ts`, `scripts/experiments/context-anatomy/README.md`.
  - [x] NDJSON parser extracts init-event counts and result-event usage, tolerant of interleaved stderr / partial streams. Evidence: `scripts/experiments/context-anatomy/shared.ts:49`, `scripts/experiments/context-anatomy/shared_test.ts`.
  - [x] Framework hook `Experiment.renderCustom?` + `ExperimentReport.customMarkdown?` renders metric table before the Caveats block, without touching existing adherence rendering. Evidence: `scripts/experiments/lib/types.ts:79`, `scripts/experiments/lib/runner.ts:236`, `scripts/experiments/lib/report.ts:110`.
  - [x] Smoke run on `claude-haiku-4-5` at `tokens=0` produced `cache_creation_input_tokens=26203` with 24 tools, 6 skills, 5 agents, 0 mcp_servers, 0 slash_commands — confirming the isolation stack works. Evidence: `scripts/experiments/context-anatomy/README.md#baseline-finding--haiku-smoke-2026-04-11`, `results/2026-04-11-1803-claude-haiku-4-5-baseline.md`.
  - [ ] Full sweep (all 5 token sizes × 2 reps) committed. Evidence: pending.

### 3.8 FR-EXP-ADAPTERS

- **Desc:** Pluggable agent adapters. Initial: `claude` (hierarchical memory via ancestor `CLAUDE.md` files) and `cursor` (`.cursorrules` at project root only, single-file-only).
- **Scenario:** Runner selects adapter from CLI `--ide <id>`. Adapter handles memory-file placement, CLI spawning, env isolation.
- **Acceptance:**
  - [x] `claude` adapter spawns `claude -p` with isolated config. Evidence: `scripts/benchmarks/lib/adapters/claude.ts`, `scripts/benchmarks/lib/adapters/claude_test.ts`.
  - [x] `cursor` adapter supports single-file variant. Evidence: `scripts/benchmarks/lib/adapters/cursor.ts`, `scripts/benchmarks/lib/adapters/cursor_test.ts`.
  - [x] Adapter registry `mod.ts` exposes the set. Evidence: `scripts/benchmarks/lib/adapters/mod.ts`.

### 3.9 FR-EXP.TOKENIZERS

- **Desc:** Measure tokenizer efficiency (tokens/char) of OpenRouter models across 40+ UDHR language corpora. Entry point: `deno task experiment:tokenizers`.
- **Scenario:** User invokes `deno task experiment:tokenizers [--model <id>] [--language <lang>] [--dry-run]`. Shim spawns `bench.ts` from `scripts/experiments/tokenizers/` with isolated output dir, then copies results to `results/<DATE>-tokenizers-<model>.{json,md}`.
- **Acceptance:**
  - [ ] `deno task experiment:tokenizers --dry-run` exits 0 and prints plan. Evidence: `scripts/experiments/tokenizers/tokenizers_test.ts::smoke`.
  - [ ] First live run commits `results/*-tokenizers-*.md`. Evidence: `ls results/*tokenizers*.md`.

### 3.10 FR-EXP.COMPRESSION

- **Desc:** Two-stage compress→decompress benchmark for technical documents. Measures fact retention (%) and compression ratio across styles and models. Entry point: `deno task experiment:compression`.
- **Scenario:** User invokes `deno task experiment:compression [--filter <id>] [--compress-models <m>] [--decompress-models <m>] [--dry-run]`. Shim spawns `scripts/bench.ts` from `scripts/experiments/compression-decompression/` with the sub-project's deno.json, then aggregates `runs/latest/` artefacts into `results/<DATE>-compression-<filter>.{json,md}`.
- **Acceptance:**
  - [ ] `deno task experiment:compression --dry-run` exits 0 and prints plan. Evidence: `scripts/experiments/compression-decompression/run.ts`.
  - [ ] `deno task check:compression` passes. Evidence: `cd scripts/experiments/compression-decompression && deno task check`.
  - [ ] First live run commits `results/*-compression-*.md`. Evidence: `ls results/*compression*.md`.

### 3.11 FR-EXP.IMAGES-HARD

- **Desc:** Text-to-image generation benchmark: 12 hard test cases (typography, anatomy, geometry, schematics) evaluated via OpenRouter API. Entry point: `deno task experiment:images-hard`.
- **Scenario:** User invokes `deno task experiment:images-hard [--model <id>] [--prompt <TC-IDs>] [--dry-run]`. Shim spawns `bench.ts` from `scripts/experiments/images-hard/`, copies results to `results/<DATE>-images-hard-<model>.{json,md}`.
- **Acceptance:**
  - [ ] `deno task experiment:images-hard --dry-run` exits 0 and prints plan. Evidence: `scripts/experiments/images-hard/images_test.ts::smoke`.
  - [ ] First live run commits `results/*-images-hard-*.md`. Evidence: `ls results/*images-hard*.md`.

### 3.12 FR-EXP.ANCHOR-SYSTEMS

- **Desc:** Measure how reliably AI agents navigate five documentation-linking systems (Native Markdown, Wikilinks, Zettelkasten UID, SALP, SALP-short) across five task types: anchor-reference mapping, context boundary detection, multi-hop chain traversal, graph linting, and RAG noise resistance. Produces adherence curves per system × task-type.
- **Tasks:** [anchor-systems-experiment](tasks/2026/05/anchor-systems-experiment.md)
- **Scenario:** Five variants under `scripts/experiments/anchor-systems/`: `mapping`, `boundary`, `multi-hop`, `linting`, `rag-noise`. All tasks are answer-only (read files, respond with text or JSON — no file edits). Static fixture sets (15 Markdown + 4 code files per system, 5 systems + 1 `corrupted/` set) committed under `fixtures/` with `ground-truth.json`. Invoked as `deno task experiment anchor-systems --variant <v>`.
- **Acceptance:**
  - [x] Fixture sets for all 5 systems (native, wikilinks, zettelkasten, salp, salp-short): 19 files each + `corrupted/` (19 files, salp+anomalies) + `ground-truth.json`. Evidence: `ls scripts/experiments/anchor-systems/fixtures/`.
  - [x] `mapping` variant: system axis, F₁ of extracted JSON graph. Evidence: `scripts/experiments/anchor-systems/mapping.ts`, `results/2026-05-12-0038-claude-haiku-4-5-mapping.md`.
  - [x] `boundary` variant: system axis, IoU ≥ 0.8 on code block line-ranges. Evidence: `scripts/experiments/anchor-systems/boundary.ts`, `results/2026-05-12-0059-claude-haiku-4-5-boundary.md`.
  - [x] `multi-hop` variant: system × target (shallow/medium/deep), hop-accuracy across reference chains. Evidence: `scripts/experiments/anchor-systems/multi-hop.ts`, `results/2026-05-12-0105-claude-haiku-4-5-multi-hop.md`.
  - [x] `linting` variant: system axis, F₁ ≥ 0.7 detection of 3 planted anomalies. Evidence: `scripts/experiments/anchor-systems/linting.ts`, `results/2026-05-12-0144-claude-haiku-4-5-linting.md`.
  - [x] `rag-noise` variant: system × noise_count [3, 6, 9], focus on anchor-bearing function vs noise neighbours. Evidence: `scripts/experiments/anchor-systems/rag-noise.ts`, `results/2026-05-12-0158-claude-haiku-4-5-rag-noise.md`.
  - [x] `deno task check` green. Evidence: `deno task check 2>&1 | tail -5`.
  - [x] First live run results committed for all 5 variants on `claude-haiku-4-5`. Evidence: `ls results/2026-05-12-*-claude-haiku-4-5-*.md`.

## 4. Non-Functional

- **Perf/Reliability/Sec/Scale/UX:**
  - **Perf:** no global wall-clock budget. One variant run on Haiku 4.5 takes ~20 min for ~75–90 trials. Opus runs take longer.
  - **Reliability:** runner is fail-fast. A single failing trial does NOT stop the sweep — the verdict is recorded as `exitCode != 0`, adherence includes it. Trials never retry silently.
  - **Sec:** no secrets in results. The judge never sees user filesystem beyond the sandbox. Auth via macOS keychain (`claude login`); the CLI reads credentials natively. No credentials are copied or committed.
  - **Scale:** cartesian sweeps scale as `|axes₁| × |axes₂| × ... × reps`. Keep small.
  - **UX:** CLI is invoked from repo root. `--dry-run` prints the sweep plan without spawning agents.

## 5. Interfaces

- **CLI:** `deno task experiment <name> --variant <v> [--model <m>] [--ide <id>] [--reps <n>] [--axis <name>=<csv>]… [--seed <n>] [--dry-run]`. `--axis` is the sole axis-override mechanism: repeatable, accepts any axis declared by the variant, rejects unknown names. No axis-specific flag (e.g. `--sizes`, `--rules`) is hard-coded at the engine level.
- **Config:** `config.json` — IDE defaults (`default_agent_model`, `judge` model). Resolved CWD-relative.
- **Memory files:** adapters write per-trial `CLAUDE.md` / `AGENTS.md` (claude) or `.cursorrules` (cursor) into the sandbox.
- **Env isolation (claude adapter):** spawn args include `--strict-mcp-config --disable-slash-commands` to strip account-level MCP and slash commands. Auth via macOS keychain; no `CLAUDE_CONFIG_DIR` override. `~/.claude/CLAUDE.md` is visible to trial agents — acceptable for experiments that don't test memory injection. Built-in tools/skills/agents embedded in the `claude` binary still contribute ~26k baseline on haiku — this is the measurement target, not a leak.
- **Experiment extension point:** `scripts/experiments/lib/types.ts` exports the `Experiment` interface — new experiments implement `{id, name, description, axes, defaults, setupCell, query, judgePrompt, headline}` plus optional `renderCustom?(report)` for experiments whose payload is not pass/fail adherence (e.g. metric tables extracted from raw agent output — see FR-EXP.CONTEXT-ANATOMY).
- **Env (OpenRouter-based experiments):** `OPENROUTER_API_KEY` — required for `experiment:tokenizers` and `experiment:images-hard`. See `.env.example`. Not used by agent-spawning experiments.

## 6. Acceptance

- **Criteria:**
  - [x] `deno task check` is green (`deno fmt --check && deno lint && deno test`). Evidence: `deno.json:10`, CI passing via `.github/workflows/ci.yml`.
  - [x] At least one experiment with two variants and committed results exists. Evidence: `scripts/experiments/claude-md-length/results/`.
  - [x] Runner, judge, noise, tokens, report libs are unit-tested. Evidence: `scripts/experiments/lib/*_test.ts`.
  - [ ] Sonnet + Opus results for `claude-md-length` (both variants). Evidence: pending.
  - [ ] Phase-3 rename of `scripts/benchmarks/lib/` → `scripts/lib/runtime/` (tracked in `AGENTS.md` architecture note).
