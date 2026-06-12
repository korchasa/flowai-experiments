# Judge Results — `runs doctor` (FR-E83), ship-medium

8 cells, same task, same pinned full-cycle workflow. Base `c7305ca`, work branch `bench` (+1 commit each).

## Mechanical reality

- **Push**: all 8 pushed the `bench` branch to their `remote.git`; in every cell the remote `bench` tip is byte-identical to the local repo `HEAD`. ✅ 8/8.
- **Gate** (`deno task check` — fmt/lint/type-check/CLI smoke/secret-scan/**tests**/doc-lint/AGENTS accuracy, run by judge): all 8 exit 0 ("All checks passed!"). ✅ 8/8.
- **No new dependencies**: no cell touched `deno.json`/import maps. ✅ 8/8.
- **FR registration**: all 8 added `### 3.83 FR-E83` to `documents/requirements-engine/01-execution-model.md` plus an `index.md` row. ✅ 8/8.

## Summary table

| Cell | req met | gate | push | fidelity | doctor tests | scenarios | defects |
|------|--------:|:----:|:----:|:--------:|:------------:|:---------:|---------|
| **opus-xhigh** | 1.00 | ✅ | ✅ | 5 | 21 | 13/13 | none |
| **fable-high** | 1.00 | ✅ | ✅ | 5 | 23 | 13/13 | none |
| **fable-medium** | 1.00 | ✅ | ✅ | 4 | 25 | 13/13 | none |
| **opus-medium** | 1.00 | ✅ | ✅ | 4 | 16 | 13/13 | none |
| **gpt-5.5-xhigh** | 1.00 | ✅ | ✅ | 4 | 17 | 13/13 | 1 cosmetic |
| **opus-high** | 1.00 | ✅ | ✅ | 4 | 13 | 13/13 | 1 cosmetic |
| **gpt-5.5-high** | 0.97 | ✅ | ✅ | 4 | 12 | 13/13 | 1 minor |
| **gpt-5.5-medium** | 0.88 | ✅ | ✅ | 3 | 7 | 12/13 | 1 real + 1 minor + 1 hygiene |

All 8 implementations are functionally complete and safe: every cell tolerates the torn final line as a WARNING, errors on mid-file garbage / unknown kind / event-after-terminal, detects orphan and missing declared dirs, reports stale locks, performs an **atomic** (`tmp`+rename) torn-line repair with a **byte-identical `.bak`**, and **refuses to modify anything** on a live lock or on errors beyond the torn tail. All reuse the existing `replayRunJournal` (no second replayer) and the `state.ts`/`lock.ts` path/lock helpers. `--json` and `--help` surfaces present everywhere.

## The decisive requirement: cost-sum divergence (1b)

The spec asks doctor to report "replayed `total_cost_usd` diverging from the sum of per-node `cost_usd`." This is subtle: the replayer *derives* `total_cost_usd` as exactly that sum, so a literal reading is tautological/dead. How each cell handled it is the cleanest separator:

- **Genuine independent cross-check** (top-level `event.cost_usd` mirror vs nested `event.node.cost_usd`, or attempt-cost vs node snapshot): fable-high, fable-medium, opus-high, opus-medium, opus-xhigh, gpt-5.5-xhigh, gpt-5.5-high. Constructible and meaningful. ✅
- **gpt-5.5-medium**: the check compares `state.total_cost_usd` to its own re-sum of the same node costs — **always equal → dead code**. Its own "cost divergence" test only fires by injecting a *string* `cost_usd:"2"` (type corruption), not the divergence the spec describes. This sub-requirement provides no real coverage. ⚠️

## Per-cell evidence

### opus-xhigh — rank 1
Largest, tightest package: 314-line plan (5 variants), `doctor.ts` (724 lines) + `doctor_test.ts` (21 blocks, 635 lines), FR in SRS + index. Genuine cost cross-check ("replayed 0.5 diverges from per-node sum 0.9"). Minimal core-file surface (no `types.ts` edit; `lock.ts` +6). No defects across all 13 scenarios; `.bak` byte-identical, atomic rename verified, refusals modify nothing.

### fable-high — rank 2
Richest plan (6 variant mentions, explicit review note, dense TDD narrative). 23 doctor tests **plus** substantial `cli_test.ts` additions. Genuine cost cross-check; `REPAIR_BLOCKING_CODES` gate refuses on garbage/replay/terminal/cost. `--json` carries `severity/code/message/path`. Slightly larger surface (`types.ts` +46, README, design docs) but all on-topic. No defects.

### fable-medium — rank 3
Most doctor tests (25). Adds a canonical `isKnownJournalEventKind` export to `run-journal.ts` (single-source reuse for the unknown-kind check — not a second replayer). Cost divergence constructible via `attempt_completed.cost_usd` vs node snapshot. Graceful `run_dir_missing` handling. No defects.

### opus-medium — rank 4
16 doctor tests, 4 variants, focused diff. Per-node attempt-vs-snapshot cost reconciliation (live, demonstrated). Replay failure deduped against parse error to avoid double-reporting; phase-aware orphan detection; reserved dirs (`logs`/`worktree`/`.hitl-inbox`) excluded. No defects.

### gpt-5.5-xhigh — rank 5
17 doctor tests, FR registered with SALP REF, focused diff. Genuine cost divergence via event-level vs node `cost_usd`; the run-level total-vs-sum branch is structurally dead but the event-cost branch covers intent. Cosmetic only: cost message prints `0.30000000000000004`. `--json` is findings-only (no `repairs`), field `evidence_path`.

### opus-high — rank 6
13 doctor tests, added canonical `RUN_JOURNAL_EVENT_KINDS` export (good reuse). Genuine cost cross-check. **Cosmetic defect**: on a live-lock repair refusal of a torn-only journal the human report prints `RESULT: … — exit 0` while the process correctly exits **1** (the printed hint derives from `hasErrors()` and ignores refusal). Exit code itself is correct.

### gpt-5.5-high — rank 7
12 doctor tests, 4 variants, focused diff. **Minor defect**: the run-level `total_cost_usd`-vs-node-sum check is dead code; divergence is detected only via the `attempt_completed.cost_usd`-vs-`node.cost_usd` path — which works and satisfies the requirement intent, so functionally complete. `--json` uses `evidence_path`.

### gpt-5.5-medium — rank 8
Functionally the weakest of a strong field. Passes 12/13 scenarios with correct exit codes and safe repairs, but:
- **Real defect**: `COST_DIVERGENCE` is dead for valid numeric journals (compares the replayer total to a re-sum of the same node costs). Only fires via an artificial string-typed cost in its own test → no real coverage of requirement 1b.
- **Minor**: `--json` omits the `repairs[]`/`hasErrors` payload, so `--repair --json` doesn't machine-report repairs.
- **Hygiene / scope creep**: the commit rewrote an unrelated `FR-E47` budget-enforcement section in `documents/design-engine/04-data-and-logic.md` (−50/+15) that has nothing to do with `runs doctor`.
- Thinnest plan (2 variants) and fewest tests (7).

## Ranking rationale

All 8 cleared the hard bars (gate green, pushed, safe atomic repair with byte-faithful backup, replayer reuse, FR registered, no new deps), so ranking turns on **requirement-intent coverage, test/plan depth, and diff focus**. The top six are defect-free or carry only cosmetic blemishes; among them depth of tests and plan and minimality of surface order opus-xhigh → fable-high → fable-medium → opus-medium → gpt-5.5-xhigh → opus-high. gpt-5.5-high drops for a documented dead branch (intent still met via the working path). gpt-5.5-medium ranks last on the only substantive correctness gap (cost-divergence is non-functional for real journals), compounded by a `--json` gap, unrelated doc churn, and the thinnest plan/tests.

**Final: opus-xhigh > fable-high > fable-medium > opus-medium > gpt-5.5-xhigh > opus-high > gpt-5.5-high > gpt-5.5-medium.**
