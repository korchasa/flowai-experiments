# Task (hard): journal snapshots with crash-safe compaction

Long runs grow `journal.jsonl` (the append-only recovery journal) without bound, and replay cost grows with it. Add **state snapshots** to the journal format and a **crash-safe compaction** operation — automatic in the engine and manual via CLI — that truncates the replay prefix without ever weakening the durability contract.

Every numbered item below is a hard requirement (MUST). The judge verifies each one individually.

## Requested behavior

### A. Snapshot event (journal format extension)

1. Add a new journal event kind `state_snapshot`. Its payload MUST carry: `snapshot_version: 1`, the complete replayed run model at that point (everything the existing replay result reconstructs — run status/metadata, per-node statuses and facts, declared nodes/directories, costs), and `events_covered` (count of journal events the snapshot subsumes).
2. Backward compatibility: journals WITHOUT any snapshot (all existing runs) MUST replay exactly as before — zero behavior change for old artifacts.
3. Forward refusal: a snapshot with `snapshot_version` greater than supported MUST fail replay with a clear error naming the journal path and the unsupported version — never silently skip or partially apply it.

### B. Replay from snapshot

4. The EXISTING replayer in `src/state/run-journal.ts` is the single source of replay truth — extend it; writing a second replayer is forbidden.
5. When a journal contains snapshots, replay MUST seed from the LATEST valid snapshot and apply only events after it.
6. Equivalence invariant: for any run, replaying `snapshot + tail` MUST produce a result deeply equal to replaying the full original journal. A dedicated test MUST assert this by comparing the two replay results' JSON serializations for byte equality.
7. Suffix-only proof: replay of a compacted journal MUST NOT parse pre-snapshot history (it is gone from the file) — and a test MUST prove replay touches only the snapshot line plus subsequent lines (e.g., by line/parse counting on a fixture).
8. The existing torn-trailing-line tolerance (truncated final line after a crash) MUST keep working on compacted journals, including the case where the torn line immediately follows the snapshot.

### C. Compaction operation (shared by engine and CLI)

9. Compaction MUST follow exactly this crash-safe protocol, in this order: (1) replay the current journal; (2) write `journal.jsonl.tmp` containing one `state_snapshot` event followed by zero tail events; (3) fsync the tmp file; (4) copy the current journal to `journal.jsonl.bak`; (5) atomically rename tmp over `journal.jsonl`. At EVERY intermediate point a crash must leave a journal that replays (old content or new content, never neither).
10. Crash-injection tests MUST simulate an abort between each pair of consecutive protocol steps (a test-only fault hook is acceptable) and assert the journal still replays after each injected crash.
11. Compaction MUST refuse (clear error, nothing modified) when: the run is currently active (its lock is held by a live process), or the journal does not replay cleanly beyond the standard torn-line tolerance.
12. `journal.jsonl.bak` from the most recent compaction MUST be kept (one generation), and the summary MUST mention it.

### D. Engine integration (automatic compaction)

13. New settings-level config field `journal_compaction_threshold_events` (non-negative integer; `0` = auto-compaction disabled; pick and document a sensible non-zero default). It MUST be: validated like the neighboring settings, covered by config drift detection, and documented wherever sibling settings are documented.
14. During a run, the engine MUST trigger compaction at node-completion boundaries ONLY (never mid-node), when the journal's event count since the last snapshot exceeds the threshold. The triggering MUST be visible in verbose output as a single line.

### E. CLI

15. `flowai-workflow runs compact --workflow <dir> --run <runId> [--dry-run]`:
    - performs manual compaction with the same protocol and refusal rules;
    - `--dry-run` prints what would happen (event counts, byte sizes) and modifies nothing;
    - on success prints EXACTLY one summary line of the form `compacted <runId>: <eventsBefore> -> <eventsAfter> events, <bytesBefore> -> <bytesAfter> bytes (backup: journal.jsonl.bak)`;
    - run not found / refusal cases exit non-zero with a one-line error, never a stack trace;
    - the subcommand appears in CLI `--help`.

## Constraints

- Follow the existing argument-parsing style in `src/cli.ts`; no new dependencies.
- Reuse existing journal path/state helpers; no duplicated path construction.
- Tests MUST live alongside the subsystems they cover (journal/replay tests with the state tests, config tests with config tests, CLI tests with CLI tests) and cover: snapshot round-trip equivalence (item 6), suffix-only replay (item 7), torn line after snapshot (item 8), every crash-injection point (item 10), both refusal cases (item 11), threshold config validation + drift (item 13), boundary-only auto-trigger (item 14), `--dry-run` no-op and exact summary format (item 15).
- `deno task check` stays green.
- Documentation: register the requirement as an FR in `documents/requirements-engine/01-execution-model.md` (durability/recovery area) per the project's SRS conventions, AND update the engine design doc section that describes the journal/recovery contract so it mentions snapshots and the compaction protocol.

## Out of scope

- No multi-generation backup retention (exactly one `.bak`).
- No compression/encoding changes to journal lines (plain JSONL stays).
- No cross-run or batch compaction in this task.
