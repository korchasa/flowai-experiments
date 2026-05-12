# Development Commands

## Shell Environment

- Always use `NO_COLOR=1` when running shell commands — ANSI escape codes waste tokens and clutter output.
- When writing scripts, respect the `NO_COLOR` env var (<https://no-color.org/>) — disable ANSI colors when it is set.

## Standard Interface

- `check` — the main command for comprehensive project verification. Runs:
  - code formatting check (`deno fmt --check`)
  - static code analysis (`deno lint`)
  - all unit tests (`deno test -A --ignore=scripts/experiments/*/results`)
  - secret scanning of git history (`gitleaks git . --no-banner --no-color`; requires `brew install gitleaks`)
  - Note: `gitleaks dir` scans ALL files including `.gitignore`'d ones — false positives on `.env` and cache files. Always use `gitleaks git` for "no secrets in repo" checks.
- `test <path>` — runs a single test file or suite (`deno test -A <path>`).
- `experiment <name>` — runs an experiment variant end-to-end (spawns the live Claude CLI; requires macOS keychain auth).
- `dev` — not applicable. This repo has no long-running dev server. Use `experiment --dry-run` for quick iteration.
- `prod` — not applicable. Experiments are run manually on developer machines; there is no deployable artifact.

## Detected Commands

All commands are defined as Deno tasks in [`deno.json`](../deno.json) and must be invoked from the repo root (`config.json` is resolved CWD-relative, intentional).

- `deno task check` — format check + lint + unit tests + gitleaks secret scan. The canonical gate: run before every commit. Requires `gitleaks` (`brew install gitleaks`).
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

## First-time setup

After cloning:
1. `brew install gitleaks` — required for `deno task check` secret scan.
2. `git config core.hooksPath .githooks` — activates the pre-commit hook that runs `gitleaks git --staged` before every commit. Already set in `.git/config` for existing checkouts.

## Running experiments — prerequisites

- `claude` CLI installed and authenticated. On macOS, OAuth credentials live in keychain entry `Claude Code-credentials`. If missing or expired, the runner fails with a clear error — STOP and ask the user, do not invent replacements.
- **CRITICAL**: Never attempt to read or write credentials directly — no `security find-generic-password`, no `.credentials.json` creation, no env var injection of tokens. Auth is always handled externally by the CLI. This is a security constraint, not a workaround opportunity.
- `config.json` present at repo root — holds IDE defaults (`default_agent_model`, `judge` model per IDE).
- Invoke all tasks from the repo root. Running from `scripts/` breaks config resolution.
- Note: `~/.claude/CLAUDE.md` leaks into trial agents (no `settingSources` override in `invokeClaudeCli`). Experiments measuring memory-file effects must account for this baseline contamination.

## Known Library Gotchas

### @korchasa/ai-ide-cli (v0.8.3)

- **`settingSources: []`**: creates an empty temp `CLAUDE_CONFIG_DIR`, stripping all auth tokens → "Not logged in". Omit `settingSources` entirely to use native macOS keychain auth.
- **Required fields**: `processRegistry: defaultRegistry` and `retryDelaySeconds: <number>` are both required — missing either causes a runtime error.
- **`taskPrompt`**: the prompt field is `taskPrompt`, not `prompt`.
- **`claudeArgs`**: type is `Record<string, string | null>`, not `string[]`. Use `{"--flag": "value"}` or `{"--flag": ""}` for valueless flags.

## CI Scope

CI runs `deno fmt --check`, `deno lint`, and `deno test -A` individually (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) — it does NOT run `deno task check`, so `gitleaks` is a local-only gate. CI does NOT run `deno task experiment` — experiments need live Claude CLI auth and are run manually on developer machines.

When changing `--ignore` paths in `deno.json` (tasks `test` or `check`), update `.github/workflows/ci.yml` to match — there is no automated check enforcing this sync.
