# Judge Results — FR-E83: journal snapshots with crash-safe compaction

Task: `/Users/korchasa/www/flowai/flowai-experiments/autonomous/ship-hard/TASK.md`
Base commit: `c7305ca` · Push branch: `bench` (all cells) · Judged: 2026-06-12

## Mechanical checks (judge-run)

- **Push reality**: all 8 cells pushed `bench` = 1 commit ahead of `c7305ca`; local HEAD == remote `bench` tip for every cell. ✅ pushOk = true ×8.
- **Gate (`deno task check`)**: PASS ×8 (exit 0). The gate runs fmt, lint, type-check, full test suite, doc-lint, FR canonical field-set, SALP, and config-drift checks. ✅ gatePass = true ×8.
- **Functional spot-checks**: each cell's `runs compact` CLI was exercised against fabricated `/tmp` run fixtures (success, `--dry-run`, run-not-found, `--help`, forward-version refusal). All 8 produced the byte-exact success line, a true no-op dry-run, a one-line non-zero stack-free not-found error, `compact` in `--help`, and a forward-refusal naming path + version.

## Summary table

| Rank | Cell | reqMet | Gate | Push | WF | Compaction shrinks? | Real defects | Note |
|------|------|--------|------|------|----|--------------------|--------------|------|
| 1 | **opus-xhigh** | 1.00 | ✅ | ✅ | 5 | ✅ | none (2 info) | Flawless; in-scope MCP shared-core; exemplary dual-review doc |
| 2 | **fable-medium** | 1.00 | ✅ | ✅ | 5 | ✅ | none (2 info) | Complete, V1/V2/V3 variants, 215 tests |
| 3 | **fable-high** | 1.00 | ✅ | ✅ | 4 | ✅ | none | Zero defects; no recorded review verdict |
| 4 | **gpt-5.5-medium** | 1.00 | ✅ | ✅ | 5 | ✅ | 3 low | All 15 met; raw OS not-found msg, `runs --help` |
| 5 | **opus-medium** | 0.97 | ✅ | ✅ | 4 | ✅ | 1 low | Clean; item 14 auto-trigger not test-locked |
| 6 | **opus-high** | 0.97 | ✅ | ✅ | 4 | ✅ | 2 low | Leaked `</content></invoke>` artifact in committed doc; item 14 test gap |
| 7 | **gpt-5.5-xhigh** | 1.00 | ✅ | ✅ | 5 | ❌ | 1 **major** | 15/15 + great workflow, BUT compaction GROWS file (embeds event history) |
| 8 | **gpt-5.5-high** | 1.00 | ✅ | ✅ | 4.5 | ❌ | 2 **major** | Grows file + O(n²) auto-trigger; weakest commit msg |

WF = workflow fidelity (0–5). reqMet uses denominator 15 (the numbered MUST items).

## The decisive axis: does compaction actually bound growth?

The task's premise is *"Long runs grow `journal.jsonl` without bound."* The fix must truncate the replay prefix. Item 1 says the snapshot carries **the run model** (status/metadata/node statuses/facts/nodes/dirs/costs) + `events_covered` — **not** the raw event log.

- **opus-xhigh, opus-high, opus-medium, fable-high, fable-medium, gpt-5.5-medium** store only the model → compaction **shrinks** the file (e.g. 1725→515, 1261→532, 1998→606 bytes). Correct.
- **gpt-5.5-high** (`types.ts:517 events: RunJournalEvent[]`) and **gpt-5.5-xhigh** (`types.ts:636 events: NonSnapshotRunJournalEvent[]`) embed the entire event history inside each snapshot → compaction **grows** the file (judge-verified live: 1500→2027 and 871→1279 bytes). Line-count replay is still bounded (suffix-only test passes), but byte-size still grows with run length, and the mandated `bytesBefore -> bytesAfter` summary goes the wrong way. This is a **major design defect** that defeats the feature's purpose, even though all 15 items are nominally "met." Both gpt high/xhigh are therefore ranked below the clean shrinking implementations.

gpt-5.5-high carries a **second** major defect: its auto-trigger runs a full dry-run replay on *every* node completion *before* the threshold check (`engine.ts maybeCompactJournal`), making a long run O(n²) — re-replaying the whole journal per node, the exact cost the feature is meant to bound.

## Per-cell evidence

### 1. opus-xhigh — rank 1
- Protocol exact (`run-journal.ts:566-590`): replay → write tmp(1 snapshot, 0 tail) → fsync → copy `.bak` → atomic rename, `faultHook(step)` after each; crash-injection loops all 5 boundaries.
- Single replayer extended (backward scan + `applyJournalEvents` snapshot seed); item 6 byte-equality, item 7 suffix-only (unparseable-prefix proof), item 8 torn-after-snapshot all tested.
- `src/mcp/commands.ts (+99)` = `compactRun` shared core (next to `resumeRun`/`deliverHumanAnswer`) — the "shared by engine and CLI" seam, **in-scope, not churn**.
- Live: `compacted 20260612T120000: 6 -> 1 events, 1718 -> 578 bytes (backup: journal.jsonl.bak)`. Config `journal_compaction_threshold_events` default 1000, validated, documented. Workflow doc has variants, TDD trace, dual-reviewer PASS.

### 2. fable-medium — rank 2
- Protocol exact (`run-journal.ts:553-580`); compaction lives inside `run-journal.ts`. 4-boundary crash injection, both refusals tested, one-generation `.bak`.
- Live: `compacted 20260101T000000: 5 -> 1 events, 1288 -> 481 bytes (...)`. WF5 plan with three variants + rationale, FR + design doc (`04a-journal-recovery.md`).
- Info-only: no parent-dir fsync (not required by the 5-step spec); dry-run uses a distinct prefix.

### 3. fable-high — rank 3
- Separate `src/state/journal-compaction.ts` that calls the single replayer (no second replayer). Exact protocol (`:117-177`) with dry-run early-return before any write; fault hooks at all 4 inter-step boundaries.
- **Zero defects found.** Live: `compacted 20260612T120000: 7 -> 1 events, 1725 -> 515 bytes (...)`. New `design-engine/06-journal-durability.md`. WF4 (no recorded review verdict).

### 4. gpt-5.5-medium — rank 4
- All 15 met, compaction shrinks (`1998 -> 606`). Exact protocol (`run-journal.ts:388-412`), crash injection at 4 boundaries, both refusals tested, explicit Approve verdict (WF5).
- Low: run-not-found surfaces a raw `os error 2: stat` message (still one-line/no-stack/exit 1); `runs --help` errors instead of listing (top-level `--help` shows compact); SRS status checkbox left `[ ]`.

### 5. opus-medium — rank 5
- Clean shrinking compaction (`1261 -> 532`), exact protocol (`journal-compaction.ts:87-124`) with fault hook at all 5 boundaries, both refusals, byte-equality + suffix-only + torn-after-snapshot tested.
- Item 14 = **partial**: auto-trigger/verbose-line correct in code (`engine.ts:344-348`) but only unit-tested at `maybeCompactAtBoundary`, not through `Engine.run()`. No real code defect.

### 6. opus-high — rank 6
- Equivalent clean implementation (`1474 -> 578`), separate `journal-compaction.ts` calling the single replayer, 4-boundary crash injection, both refusals.
- **Hygiene defect**: committed task doc ends with leaked tool-call wrapper junk `</content>` / `</invoke>` (lines 232-233). Item 14 same test-lock gap as opus-medium → partial.

### 7. gpt-5.5-xhigh — rank 7
- Workflow is exemplary (10-step TDD trace, APPROVE verdict, FR across SRS/SDS/index) and every CLI/protocol behavior is exact — exact summary line, dry-run no-op, forward-refusal, 5-boundary crash injection, both refusals.
- **Major defect**: snapshot embeds the full event log (`types.ts:636`), so compaction grew the file `871 -> 1279` bytes in the judge's live run. Bounded replay-line-count but unbounded byte-size — undermines the task goal. Ranked below all shrinking cells despite 15/15.

### 8. gpt-5.5-high — rank 8
- Solid tests and exact CLI behavior, but **two major defects**: (a) compaction grows the file (`1500 -> 2027`, embedded `events: replay.events`); (b) auto-trigger re-replays the entire journal on every node completion before the threshold check (O(n²)). Commit message lacks the `(engine)` scope its siblings use and has an empty body. Both defects directly contradict the "bound the growth/replay cost" purpose → last.

## Ranking rationale

All 8 cleared the hard gates: every cell pushed a clean single-commit `bench`, passes the full `deno task check`, and implements the exact crash-safe 5-step protocol, the exact CLI summary line, forward-version refusal, both refusal cases, and torn-line tolerance — a genuinely strong field.

Separation comes from two things the gate doesn't catch:

1. **Whether compaction fulfills its purpose.** gpt-5.5-high and gpt-5.5-xhigh embed the full event history in each snapshot, so the journal *grows* on compaction. This is the single most important quality signal in this task and drops both gpt high/xhigh below every cell whose compaction shrinks — even cells that lost a fraction on a test-coverage technicality (opus-high/medium item 14). gpt-5.5-high additionally has an O(n²) auto-trigger, putting it last.

2. **Polish and workflow record among the clean implementations.** opus-xhigh tops the field: flawless 15/15, shrinking compaction, an in-scope shared MCP core that future-proofs the CLI/engine split, and the most rigorous workflow doc (variant archetypes + dual reviewer verdict). fable-medium and fable-high follow with flawless code; gpt-5.5-medium matches on requirements with only cosmetic polish gaps. opus-medium and opus-high are essentially complete (item 14 behavior is correct, just not test-locked end-to-end), with opus-high docked for committing a leaked tool-call artifact into its task doc.
