# Task (medium): `runs doctor` — journal health checker with mechanical repair

A run's only durable record is its append-only `journal.jsonl`, replayed via the existing replayer to reconstruct run state. Crashes, manual tampering, and engine bugs can leave a journal (or the surrounding run directory) in a degraded state. Add a `runs doctor` subcommand that diagnoses a run's durability artifacts and can apply safe mechanical repairs.

## Requested behavior

1. `flowai-workflow runs doctor --workflow <dir> --run <runId>`
   - Checks, in order, reporting EVERY problem found (not just the first):
     a. **Journal integrity**: file exists; every line parses as JSON; a truncated/garbage FINAL line is a WARNING, not an error (that is the expected crash artifact the writer already tolerates); a non-final unparsable line is an ERROR; unknown event `kind` values are an ERROR; non-monotonic `seq` and duplicate `event_id` values are each reported (duplicates are a WARNING — the replayer already dedupes them).
     b. **Replay invariants**: replay the journal using the EXISTING replayer in `src/state/run-journal.ts` (writing a second replayer is forbidden; doctor only orchestrates and inspects the replay result). Then report, field-by-field: events appearing after a terminal run event (`run_completed`/`run_failed`/`run_aborted`); node lifecycle events for nodes never declared; `attempt_completed` without a matching `attempt_started`; replayed `total_cost_usd` diverging from the sum of per-node `cost_usd`.
     c. **Filesystem cross-check**: node directories present on disk under the run dir that no journal event mentions (orphans), and directories the journal declares that are missing on disk; a `runs/.lock` referencing this run whose recorded process is no longer alive (stale lock) is a WARNING.
   - Output: human-readable report grouped by severity (ERROR / WARNING / OK summary); exit 0 when no ERRORs, exit 1 otherwise.
2. `--repair` flag — applies ONLY safe mechanical fixes, each reported:
   - torn final journal line: back up the journal as `journal.jsonl.bak`, then atomically rewrite it without the torn line (write tmp + rename);
   - stale `runs/.lock` for this run: remove it.
   - Refusals (clear error, nothing modified): the run is currently active (lock held by a live process), or the journal has errors beyond the torn final line (doctor must not guess at semantic repairs).
3. `--json` flag: machine-readable findings list (severity, code, message, evidence path).
4. Subcommand appears in CLI `--help`.

## Constraints

- Follow the existing argument-parsing style in `src/cli.ts`; no new dependencies.
- The existing replayer is the single source of replay truth. Reuse existing `src/state/` helpers for run/node/lock paths and lock parsing; do not duplicate path construction or lock-file knowledge that already has a helper.
- Tests: unit tests on fabricated run dirs covering: clean run (exit 0); torn last line (WARNING, exit 0); mid-file garbage line (ERROR, exit 1); unknown event kind; events after terminal event; cost-sum divergence; orphan node dir; missing declared dir; stale lock; `--repair` torn-line round-trip (journal replays cleanly after, `.bak` preserved, byte-identical except the torn tail); `--repair` refusal on a live lock and on mid-file garbage; `--json` shape.
- `deno task check` stays green; register the new requirement as an FR in `documents/requirements-engine/01-execution-model.md` (durability/recovery area) per the project's SRS conventions.

## Out of scope

- No journal compaction or rewriting beyond removing the torn final line.
- No multi-run batch mode; one `--run` per invocation.
- No interactive prompts; flags only.
