# Ship family — shared method

Measures how **model × reasoning-effort** affects end-to-end delivery of FIXED technical tasks on a FIXED commit of [flowai-workflow](https://github.com/korchasa/flowai-workflow), executed per a **pinned snapshot of the flowai `ship` command** (full cycle: plan → implement → review → commit → push, with gates). An LLM judge then verifies each attempt mechanically (gate run, real push, functional spot-checks) and scores requirements coverage, workflow fidelity, and defects.

## Motivation

The maintenance experiment measured *detection* breadth; app-generation measured *greenfield construction*. This one measures the third regime: **disciplined delivery into an existing mature codebase** — following a prescriptive multi-phase workflow with TDD, review verdict, docs sync, and push gates. A catalog of tasks with different demand profiles separates "follows discipline" from "raw capability": some tasks load convention-compliance, others edge-case correctness, others real algorithmics.

## Method

- **Target**: flowai-workflow at commit `c7305ca069bc13b4ae80ba8273e7265a98ed84f4` (`fix(engine): fail fast on swallowed errors…`) — pinned in [run-impl.sh](run-impl.sh); per cell: bare clone as a private `origin` + work clone on a `bench` branch at the pin. The Push phase runs for real against the cell's own bare remote; the actual repository is never touched.
- **Task ladder** (the sibling `ship-*` benchmark dirs, one TASK.md each) — one task per run, selected by running the specific benchmark dir; all grounded in real repo structures (the `journal.jsonl` replayer — the engine's only durable run record, `runs/.lock`, node directories). Each level is calibrated to its difficulty on EVERY axis (code surface, algorithmics, edge cases, convention archaeology, SRS load, test surface):
  - **ship-easy — `runs prune`** — destructive cleanup behind safety rules (terminal status, lock, keep-when-in-doubt), validation, `--dry-run`.
  - **ship-medium — `runs doctor`** — journal health diagnostics reusing the existing replayer + atomic mechanical `--repair` with backup and refusal paths.
  - **ship-hard — journal snapshots + crash-safe compaction** — journal format extension (versioned `state_snapshot`), replay equivalence proven byte-equal, fixed compaction protocol with crash-injection tests, engine auto-trigger, config knob, CLI; 15 individually-judged MUSTs.
- **Pinned workflow**: [ship-SKILL.md](ship-SKILL.md) — generated `ship` composite snapshot from flowai@`188b5033` (plan/implement/review/commit/push atoms, 575 lines), passed as inbound instructions; the live plugin skill is never invoked. Benchmark adaptations (in the prompt): non-interactive variant gate (choose + record rationale), CI-await skipped (bare remote has no CI), no gh.
- **Isolation**: `--safe-mode` (no user plugins/skills/hooks/CLAUDE.md auto-load; the workflow reads the repo's AGENTS.md from disk itself, as the skill prescribes).
- **Matrix**: `opus-4.8 × {medium, high, xhigh}`, `fable-5 × {medium, high}` via detached `claude -p` (`--permission-mode bypassPermissions`, `--safe-mode`) + `gpt-5.5 × {medium, high, xhigh}` via detached `codex exec` (`--dangerously-bypass-approvals-and-sandbox`, `--ignore-user-config`) — 8 cells. Cell syntax: `<model>:<effort>`, e.g. `fable:high`, `gpt-5.5:xhigh`.
- **Judge** ([judge-impl.sh](judge-impl.sh), fixed cell `opus:high`): mechanical checks first — `deno task check` inside each clone, push verified against the cell's bare remote, functional spot-checks of the new CLI on fabricated run dirs — then per-bullet requirements scoring with file:line evidence, workflow-fidelity score (plan variants, TDD traces, review verdict, SRS/FR registration), and a defect list.

## Results

After a run, copy `judge-results.{json,md}` plus per-cell cost/time into the benchmark's `results/` as a dated set.

## Non-goals

- UI/UX quality (CLI text quality is judged only for clarity of errors/summaries).
- Cross-IDE comparison (Claude Code CLI only).
- Statistical reps — one attempt per cell per run; directional.

## Reproduction

Run from a specific `ship-*` benchmark dir (thin wrappers around [run-impl.sh](run-impl.sh) / [judge-impl.sh](judge-impl.sh)):

```bash
cd ../ship-medium
./run.sh ~/tmp/ship-medium-$(date +%Y%m%d)        # full 5-cell matrix
./judge.sh ~/tmp/ship-medium-$(date +%Y%m%d)      # after all cells exit
```

One out-root per benchmark run.

Requires an authenticated `claude` CLI (no plugins needed). Override pins via `COMMIT=<sha>` / `SRC_REPO=<path>`; to re-pin the workflow, regenerate `ship-SKILL.md` from the flowai repo (`deno run -A scripts/generate-skill-composites.ts --write`, then copy `framework/core/commands/ship/SKILL.md`). Progress: `-p` stdout buffers until exit; live signal = transcripts under `~/.claude/projects/`.

## Artifacts

- the sibling `ship-*` benchmark dirs (one TASK.md each) — fixed task specs (ground truth for the judge).
- [ship-SKILL.md](ship-SKILL.md) — pinned ship workflow snapshot.
- [run-impl.sh](run-impl.sh) — per-cell bare remote + work clone @ pin + detached `--safe-mode` session.
- [judge-impl.sh](judge-impl.sh) — mechanical-first judge (writes `judge-results.json` / `.md` into the run dir).
- `results/` in each `ship-*` benchmark dir — committed dated artifacts per retained run.
