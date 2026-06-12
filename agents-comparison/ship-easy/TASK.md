# Task (easy): `runs prune` — safe cleanup of old runs

Add a `runs prune` subcommand to the flowai-workflow CLI that deletes old run directories under `<workflow-dir>/runs/` with strict safety rules.

A run's only durable record is its `journal.jsonl` (append-only recovery journal); run status and start time are obtained by replaying it with the EXISTING replayer in `src/state/run-journal.ts`. Do not invent any other state source — a run directory without a replayable journal has unknown state by definition.

## Requested behavior

1. `flowai-workflow runs prune --workflow <dir> --keep <N>`
   - Deletes the OLDEST run directories (by run start time from the replayed journal) so that at most `N` most-recent runs remain.
   - Safety rules (hard requirements):
     - NEVER delete a run whose replayed status is not terminal (anything still running/pending/waiting is untouchable), regardless of `--keep`.
     - NEVER delete the run referenced by an existing `runs/.lock` file.
     - A run whose `journal.jsonl` is missing or cannot be replayed counts as NOT terminal (when in doubt, keep), and is reported as skipped with that reason.
     - `--keep` must be a non-negative integer; reject anything else with a clear error and non-zero exit.
   - `--dry-run` flag: print what WOULD be deleted, delete nothing, exit 0.
   - Prints a summary: how many runs deleted, kept, skipped (with per-run skip reason).
2. Subcommand appears in the CLI `--help` output.

## Constraints

- Follow the existing argument-parsing style in `src/cli.ts`; no new dependencies.
- Run-folder knowledge (journal path, replay, lock file location and format) must reuse existing `src/state/` helpers (`getRunDir`, the journal replayer, lock helpers); do not duplicate path construction or replay logic that already has a helper.
- Tests: unit tests for the prune selection logic on temp-dir fixtures with engine-shaped journals covering: keeps N newest, skips non-terminal, skips locked, missing/unreplayable journal counts as non-terminal, `--keep 0` deletes all terminal unlocked runs, dry-run deletes nothing, bad `--keep` rejected.
- `deno task check` stays green; register the new requirement as an FR in `documents/requirements-engine/06-distribution-and-housekeeping.md` per the project's SRS conventions.

## Out of scope

- No listing/inspection output beyond the prune summary (listing is a separate feature).
- No remote/cloud cleanup; local filesystem only.
- No interactive prompts; flags only.
