# flowai-experiments — Agent Instructions

## Project Vision

Parameterized empirical studies of AI agent platforms. The product is committed numeric evidence, not regression tests. One experiment produces one (headline number + adherence curve + committed raw results) tuple per (model × IDE × variant) combination.

Sister repository: [`flow`](https://github.com/korchasa/flow) holds the AssistFlow framework (skills/agents/commands) and benchmark (regression test) infrastructure.

## Core Rules

- Fail fast, fail clearly. Surface errors immediately with clear messages — no silent fallbacks, no default-value assumptions, no swallowed exceptions.
- Verify every change by running `deno task check` — never assume correctness.
- Keep formatter/linter output clean. A broken baseline blocks all future work.
- Write documentation in English, compressed style. Brevity preserves context window.
- Do not add fallbacks or error-recovery hacks silently — if unsure, ask first.
- All tasks must be invoked from the repo root. `config.json` is resolved CWD-relative; this is intentional.
- Do not use tables in chat output — use two-level lists instead (portable, terminal-friendly).
- Provide evidence for claims — link to code, docs, or tool output.
- Use standard tools (`jq`, `yq`, `jc`) to process structured output.
- Before implementing any dev tooling (secret scanners, linters, formatters, test runners) — first check for an existing CLI tool: `brew search <name>`, `which <name>`, web search. Prefer maintained external tools over custom scripts.
- Secret scanning (API keys/tokens in git history) ≠ security code review (OWASP, injection). For leaked credentials → `gitleaks` (already in `deno task check`). For code vulnerabilities → `/security-review` skill.

## Project Information

- Project Name: flowai-experiments

## Project tooling Stack

- TypeScript
- Deno

## Architecture

- `scripts/experiments/lib/` — framework (runner, judge, noise, report, tokens, types).
- `scripts/experiments/<name>/` — per-experiment directory with `README.md`, variant files, `shared.ts`, committed static inputs, `results/`.
- `scripts/benchmarks/lib/` — minimal agent runtime (adapters, llm, spawned_agent, usage). Name is a historical artifact from the split; a Phase-3 rename is planned.
- `scripts/task-experiment.ts` — CLI entry point.
- `config.json` — IDE defaults (agent model + judge model per IDE).
- `documents/rnd/` — R&D writeups that motivate experiments.

## Key Decisions

- **Deno + TypeScript**: primary runtime (see `deno.json`).
- **Evidence-first**: experiment results committed as `results/<DATE>-<model-slug>-<variant>.{json,md}`. Code changes without committed evidence are incomplete.
- **Clean-slate copy from flow**: history not preserved. Blame traversal across the split requires checking out `flow@f311142`.
- **CI scope**: CI runs `deno task check` only. Experiments need live `claude` CLI + macOS keychain auth (not runnable in CI).

## Documentation Hierarchy

1. **`AGENTS.md`**: Project vision, constraints, mandatory rules. Read-only reference.
2. **`documents/AGENTS.md`**: Documentation system rules (SRS/SDS/GODS formats, compressed style).
3. **`scripts/AGENTS.md`**: Development commands (standard interface, detected commands).
4. **SRS** (`documents/requirements.md`): "What" & "Why". Source of truth for requirements.
5. **SDS** (`documents/design.md`): "How". Architecture and implementation. Depends on SRS.
6. **Tasks** (`documents/tasks/<YYYY-MM-DD>-<slug>.md`): Temporary plans/notes per task.
7. **`README.md`**: Public-facing overview. Derived from AGENTS.md + SRS + SDS.

## Planning Rules

- **Environment side-effects**: When changes touch infra, databases, or external services, the plan must include migration, sync, or deploy steps — otherwise the change works locally but breaks in production.
- **Verification steps**: Every plan must include specific verification commands (tests, validation tools, connectivity checks) — a plan without verification is just a wish.
- **Functionality preservation**: Before editing any file for refactoring, run existing tests and confirm they pass — prerequisite, not suggestion. Without a green baseline you cannot detect regressions. Run tests again after all edits.
- **Data-first**: When integrating with external APIs or processes, inspect the actual protocol and data formats before planning — assumptions about data shape are the #1 source of integration bugs.
- **Variant analysis**: When the path is non-obvious, propose variants with Pros/Cons/Risks per variant and trade-offs across them.
- **Task-first**: Before implementing a migration or refactor, glob `documents/tasks/**/*.md` and check for an existing task with overlapping FR-IDs or keywords. If found, read it fully — it contains chosen variants, constraints, and known gaps that supersede ad-hoc discovery.
- **Plan persistence**: After variant selection, save the detailed plan to `documents/tasks/<YYYY-MM-DD>-<slug>.md` using GODS format — chat-only plans are lost between sessions.
- **Proactive resolution**: Before asking the user, exhaust available resources (codebase, docs, web) to find the answer autonomously.

## Experiment TDD

1. **RED**: Write the experiment variant file (`scripts/experiments/<name>/<variant>.ts`) with axes, setup, query, and judge prompt. Add a smoke-check (tiny reps + tiny sizes) and confirm the runner exits cleanly but produces failing adherence (proves the rule is testable).
2. **GREEN**: Tune axis values and rule text until the headline number is stable across reruns.
3. **COMMIT EVIDENCE**: Run the full sweep and commit `results/<DATE>-<model-slug>-<variant>.{json,md}`. This is the product.
4. **CHECK**: `deno task check` — format + lint + unit tests must pass.

## Unit-Test Rules (for the runner/judge/noise/report/tokens libs)

- Test logic and behavior only — do not test constants.
- No stubs or mocks for internal code. Use real implementations.
- When a test fails, fix the source, not the test.
- Run all tests before finishing (`deno task test`), not just the ones you changed.

## Diagnosing Failures

1. Read the relevant code and error output before making any changes.
2. Apply "5 WHY" analysis to find the root cause.
3. Root cause is fixable — apply the fix, retry.
4. Second fix attempt failed — STOP. Output a short state/expected/5-why/root-cause/hypotheses report. Wait for user help.

When the root cause is outside your control (missing Claude CLI auth, macOS keychain empty, expired OAuth token, unavailable external services) — STOP immediately and ask the user for the correct values. Do not guess or invent replacements.

## Code Documentation

- **Module level**: each module gets an `AGENTS.md` describing its responsibility and key decisions.
- **Code level**: JSDoc for classes, methods, and functions. Focus on *why* and *how*, not *what*. Skip trivial comments — they add noise without value.

> **Before you start:** read `documents/requirements.md` (SRS) and `documents/design.md` (SDS) if you haven't in this session. They contain project requirements and architecture that inform every task.
