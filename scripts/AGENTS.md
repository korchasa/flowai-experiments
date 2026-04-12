# Development Commands

## Shell Environment

- Always use `NO_COLOR=1` when running shell commands — ANSI escape codes waste tokens and clutter output.
- When writing scripts, respect the `NO_COLOR` env var (<https://no-color.org/>) — disable ANSI colors when it is set.

## Standard Interface

- `check` — the main command for comprehensive project verification. Runs:
  - code formatting check (`deno fmt --check`)
  - static code analysis (`deno lint`)
  - all unit tests (`deno test -A --ignore=scripts/experiments/*/results`)
- `test <path>` — runs a single test file or suite (`deno test -A <path>`).
- `experiment <name>` — runs an experiment variant end-to-end (spawns the live Claude CLI; requires macOS keychain auth).
- `dev` — not applicable. This repo has no long-running dev server. Use `experiment --dry-run` for quick iteration.
- `prod` — not applicable. Experiments are run manually on developer machines; there is no deployable artifact.

## Detected Commands

All commands are defined as Deno tasks in [`deno.json`](../deno.json) and must be invoked from the repo root (`benchmarks/config.json` is resolved CWD-relative, intentional).

- `deno task check` — format check + lint + unit tests. The canonical gate: run before every commit.
- `deno task test` — unit tests only (`deno test -A --ignore=scripts/experiments/*/results`). Use during TDD loops.
- `deno task experiment <name> --variant <v> [flags]` — run an experiment variant. Flags: `--dry-run`, `--reps`, `--axis <name>=<csv>` (repeatable; axis names are experiment-specific — see the experiment's README), `--model`, `--ide`, `--seed`.

## Command Scripts

- [`scripts/task-experiment.ts`](task-experiment.ts) — CLI entry point for experiments. Parses flags, resolves variant file, invokes runner.
- [`scripts/experiments/lib/runner.ts`](experiments/lib/runner.ts) — experiment sweep engine (cells × trials × adherence).
- [`scripts/experiments/lib/judge.ts`](experiments/lib/judge.ts) — binary-verdict judge invocation.
- [`scripts/experiments/lib/noise.ts`](experiments/lib/noise.ts) — noise corpus sampling for CLAUDE.md padding.
- [`scripts/experiments/lib/tokens.ts`](experiments/lib/tokens.ts) — token counting (Anthropic tokenizer heuristics).
- [`scripts/experiments/lib/report.ts`](experiments/lib/report.ts) — JSON + Markdown result writers.
- [`scripts/benchmarks/lib/`](benchmarks/lib/) — minimal agent runtime (adapters, llm, spawned_agent, usage). Name is a historical artifact from the `flow` split; Phase-3 rename planned.
- [`scripts/utils.ts`](utils.ts) — shared helpers (FS, paths, formatting).

## Running experiments — prerequisites

- `claude` CLI installed and authenticated. On macOS, OAuth credentials live in keychain entry `Claude Code-credentials`. If missing or expired, the runner fails with a clear error — STOP and ask the user, do not invent replacements.
- `benchmarks/config.json` present at repo root — holds IDE defaults (`agent_model`, `judge` model).
- Invoke all tasks from the repo root. Running from `scripts/` breaks config resolution.

## CI Scope

CI runs `deno task check` only (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). CI does NOT run `deno task experiment` — experiments need live Claude CLI auth and are run manually on developer machines.
