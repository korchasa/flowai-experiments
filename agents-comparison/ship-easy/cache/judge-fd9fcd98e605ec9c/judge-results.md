# Judge Results — `runs prune` (8 cells)

Task: add `flowai-workflow runs prune --workflow <dir> --keep <N> [--dry-run]` with strict safety rules.
Base commit: `c7305ca`. All cells pushed exactly **one** commit on branch `bench` to their `remote.git` (push OK for all 8). All 8 pass `deno task check` (gate green).

## Summary table

| Rank | Cell | req met | gate | push | fidelity | Key issue |
|------|------|--------:|:----:|:----:|:--------:|-----------|
| 1 | opus-medium | 1.00 | ✅ | ✅ | 4 | none — clean, correct, conservative semantics |
| 2 | gpt-5.5-xhigh | 0.96 | ✅ | ✅ | 4 | minor: local isTerminalStatus dup |
| 3 | gpt-5.5-medium | 0.96 | ✅ | ✅ | 4 | minor: local isTerminalStatus dup |
| 4 | gpt-5.5-high | 0.96 | ✅ | ✅ | 3 | single-variant plan; minor dup |
| 5 | opus-high | 1.00 | ✅ | ✅ | 3 | scope creep (unrelated 06→06b doc split) |
| 6 | fable-high | 1.00 | ✅ | ✅ | 3 | scope creep (06→06b) + largest churn |
| 7 | fable-medium | 1.00 | ✅ | ✅ | 3 | scope creep (06→06b) |
| 8 | opus-xhigh | 0.85 | ✅ | ✅ | 3 | **real over-deletion bug** + skip-reason gap |

## Mechanical checks (all cells)

- **Push reality:** each `remote.git` has `bench` one commit ahead of base `c7305ca`; commit subjects are Conventional Commits (`feat(cli|engine): …`).
- **Gate:** `deno task check` → EXIT 0 for all 8.
- **Own unit tests:** prune + cli tests pass for all 8 (55–68 tests each).
- **FR registration:** all registered `### 3.83 FR-E83` in `documents/requirements-engine/06-distribution-and-housekeeping.md`, plus `index.md` and `requirements-engine.md` rows.

## Functional spot-check (fabricated workflow dir)

Fixture (7 run dirs under `runs/`): `r_old_done`(01-01, completed), `r_mid_done`(03-01, completed), `r_new_done`(05-01, completed), `r_locked_done`(04-01, completed, referenced by `runs/.lock`), `r_running`(02-15, non-terminal), `r_missing`(no journal), `r_malformed`(broken journal).

Hard-requirement results:

| Behavior | Expected | 7 cells | opus-xhigh |
|---|---|---|---|
| `--keep 2` | delete `r_old_done` only; keep `r_mid/r_new`; skip locked/running/missing/malformed | ✅ delete 1 | ❌ **delete 2** (also `r_mid_done`) |
| never delete non-terminal | `r_running` kept | ✅ | ✅ |
| never delete locked | `r_locked_done` kept | ✅ | ✅ (but mis-reported as "kept") |
| missing/malformed → skip w/ reason | both kept, reason given | ✅ | ✅ |
| `--keep 0` | delete 3 terminal-unlocked; keep locked/running/missing/malformed | ✅ | ✅ |
| `--dry-run` | delete nothing, exit 0 | ✅ all 7 keep | ✅ |
| bad `--keep -1` / `abc` | clear error, exit 1 | ✅ | ✅ |
| in `--help` | yes | ✅ | ✅ |

All 8 read the protected run from the lock file's `run_id` directly (none gate protection on PID liveness — correct; a stale lock still protects its run).

## Per-cell evidence

### opus-xhigh — rank 8 (real defect)
- **High — over-deletion.** `src/state/prune.ts:78-95`: `planPrune` ranks **all** replayable runs (locked + non-terminal included) and keeps the `keep` newest *before* applying safety. Protected runs consume keep slots. Functional proof: `--keep 2` → `deleted 2 … deleted: r_mid_done, r_old_done; kept: r_new_done, r_locked_done`. All 7 other cells delete only `r_old_done`. This also contradicts opus-xhigh's own task file ("deletes the oldest terminal, unlocked runs so the N newest remain").
- **Medium — reporting gap.** A locked/non-terminal run inside the keep window is reported as plain `kept` (`within --keep window`) instead of `skipped` with its protective reason (`prune.ts:88-93`); skip count flips 3↔4 between `--keep 2` and `--keep 0`. Spec mandates per-run skip reason.
- No hard-safety violation (locked & non-terminal are never actually deleted), but the over-deletion of a recent terminal run is surprising for a destructive command, and 7/8 disagree.

### opus-high / fable-high / fable-medium — ranks 5–7 (scope creep)
- Code is correct, safe, and reuses helpers well (opus-high & fable-high export/rename `isTerminalStatus`; fable-high adds `getRunsRoot`). All functional checks pass.
- **Medium — scope creep:** each splits the unrelated plugin-distribution FRs (FR-E70…) out of `06-distribution-and-housekeeping.md` into a brand-new `06b-plugin-distribution.md` (~287–302 lines moved). This is a doc refactor unrelated to `runs prune`; the pinned workflow's Implement→Review gate says out-of-scope edits must be reverted. Bundling it into the feature commit is a hygiene/fidelity violation.
- opus-high ranked above the fable pair for the strongest plan (explicit "Keep-window semantics (resolved ambiguity)" section). fable-high above fable-medium on cleaner helper reuse despite slightly larger churn.

### gpt-5.5-high / -medium / -xhigh — ranks 2–4
- Correct semantics (keep-N applied to the prunable set only), clean focused diffs, no scope creep, FR registered, good tests (xhigh most thorough).
- **Low — minor duplication:** each defines a private `isTerminalStatus` in its prune module rather than reusing the run-journal helper (the others exported it). Soft deviation from "reuse src/state helpers / don't duplicate".
- gpt-5.5-high offered a single variant (rationale given) — acceptable but weaker fidelity for a safety-sensitive task than the multi-variant cells; ranked below the two medium/xhigh.

### opus-medium — rank 1
- Correct and conservative: explicit "Chosen semantics" section states protected runs **do not consume keep slots**; implementation matches.
- Cleanest reuse: exports `isTerminalStatus` from `run-journal.ts` (3-line, justified) and reuses `getRunDir`/`defaultLockPath`/`readLockInfo`/`replayRunJournal`. Fail-safe on a corrupt lock (rethrows non-NotFound).
- Tightest, fully on-scope diff (README + reqs row + task + `prune.ts` + `cli.ts`); all functional checks pass; no defects found.

## Ranking rationale

All eight are functionally viable, gate-green, and reached the remote — a tight field. Discriminators, in order of weight:
1. **Correctness defect (decisive):** only opus-xhigh deviates — it over-deletes a recent terminal run and hides protective skip reasons, and its own tests miss the case → rank 8.
2. **Commit hygiene / scope gate:** opus-high, fable-high, fable-medium bundle an unrelated ~290-line doc refactor (06→06b) the workflow says to revert → ranks 5–7, below all clean-diff cells.
3. **Plan fidelity & reuse among the clean cells:** opus-medium edges gpt-5.5-xhigh/medium for explicitly resolving the keep-window ambiguity *and* reusing the shared terminal-status helper (gpt cells duplicate it). gpt-5.5-high drops one place for offering only a single variant.

Corrupt-lock handling note (not in the required spec matrix): opus-medium, opus-xhigh, gpt-5.5-medium, gpt-5.5-xhigh fail-safe (rethrow on an unreadable lock); fable-medium, opus-high, fable-high swallow a corrupt lock as "no lock" — marginally less safe, low severity.
