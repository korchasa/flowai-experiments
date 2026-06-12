# Ship (easy): runs prune

Ship-family benchmark: deliver [TASK.md](TASK.md) end-to-end on a fixed commit of flowai-workflow, following the pinned `ship` workflow. Regime: **destructive CLI behind safety rules**. Difficulty: **easy (calibrated for agents that build whole apps in 30 min)**.

Method, matrix, pins, judge, and result cache: [../shared/ship/README.md](../shared/ship/README.md).

```bash
./run.sh ~/tmp/ship-easy-$(date +%Y%m%d)        # full 8-cell matrix
./run.sh ~/tmp/ship-easy-one fable:high          # single cell
./judge.sh ~/tmp/ship-easy-$(date +%Y%m%d)      # after all cells exit
```

Retained evidence: [results/](results/).

## Findings (2026-06-11, 8 cells)

- All 8 cells delivered end-to-end on the journal-based spec: green `deno task check`, real push, one conventional commit, FR-E83 registered. Comparison is purely about engineering quality.
- Ranking: opus-medium 1st (clean, conservative, zero defects) > gpt-5.5 trio 2nd–4th (correct semantics, focused diffs; minor `isTerminalStatus` duplication) > opus-high/fable-high/fable-medium 5th–7th (correct code but identical scope creep: each split unrelated plugin-distribution FRs into a new `06b` doc, which the workflow's review gate should have reverted) > opus-xhigh 8th with the run's only REAL bug: keep-window applied before the safety filter, so protected runs consume keep slots and a recent terminal run gets over-deleted (`--keep 2` deleted 2 runs where 7/8 cells delete 1).
- The `06 → 06b` doc-split scope creep appeared in 3/8 cells — claude-family only; gpt-5.5 produced no scope creep at any effort and ran fastest (≈13–18 min vs ≈25 min).
- Cost (official API rates: opus 5/25, fable 10/50, gpt-5.5 5/30 per Mtok + cache rates): fable-high \$65.19, opus-xhigh \$41.30, opus-high \$32.38, opus-medium \$28.85, fable-medium \$28.41, gpt-5.5-xhigh \$7.64, gpt-5.5-high \$7.63, gpt-5.5-medium \$6.90. The gpt cells are 4–8× cheaper, driven by a ~96% cache-read share at \$0.50/Mtok and 10–30× smaller output volume.

Detail: [results/2026-06-11-matrix-rev2.md](results/2026-06-11-matrix-rev2.md).

## Methodology note: spec ambiguity poisons single-judge ranking

An earlier task text mistakenly named `state.json` as the run-state source (the engine only persists `journal.jsonl`), creating a spec-vs-reality fork with two defensible implementations. Two judge runs over that forked task ranked the same work in opposite order depending on which side the judge took as ground truth. The task was revised so exactly one variant is correct; forked-era results were discarded. Lesson: before benchmarking, verify every factual claim in the task spec against the pinned codebase — an ambiguous spec measures the judge, not the cells.
