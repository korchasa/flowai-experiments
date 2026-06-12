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
- Ranking (corrected per the erratum below): opus-medium and fable-high tie 1st–2nd (zero defects; both properly exported/reused the base `isTerminalStatus` helper) > five cells tie 3rd–7th — gpt-5.5 trio, opus-high, fable-medium — each duplicating `isTerminalStatus` instead of exporting the existing base helper > opus-xhigh 8th with the run's only behavioral outlier: keep-window semantics under which protected (locked/non-terminal) runs consume keep slots, pushing a recent unprotected terminal run out of the window (`--keep 2` deletes 2 runs where 7/8 cells delete 1). Protected runs themselves are never deleted; the cell's plan documents the semantics as a deliberate reading of an ambiguous retention clause. A reporting gap is also confirmed: locked runs inside the window are shown "kept" without the protective reason.
- gpt-5.5 ran fastest (≈13–18 min vs ≈25 min) at every effort.
- Cost (official API rates: opus 5/25, fable 10/50, gpt-5.5 5/30 per Mtok + cache rates): fable-high \$65.19, opus-xhigh \$41.30, opus-high \$32.38, opus-medium \$28.85, fable-medium \$28.41, gpt-5.5-xhigh \$7.64, gpt-5.5-high \$7.63, gpt-5.5-medium \$6.90. The gpt cells are 4–8× cheaper, driven by a ~96% cache-read share at \$0.50/Mtok and 10–30× smaller output volume.

Detail: [results/2026-06-11-matrix-rev2.md](results/2026-06-11-matrix-rev2.md).

## Erratum (2026-06-12): judge verdicts audited and corrected

An independent re-audit of the judge's verdicts (patch-level re-derivation + live reproduction on the pinned base commit) corrected three things; the raw judge artifacts in `results/` and `cache/` are retained unmodified:

- **"Scope creep" (opus-high, fable-high, fable-medium) withdrawn.** The 06→06b doc split was forced by the target repo's own docs size gate (`docsTokenBudget` in `scripts/check.ts`): the SRS file sat 994 bytes under its 29,920-byte budget, the task-required FR sections ran 1,837–2,636 bytes, and the gate's failure message prescribes "split overlarge files by functional area". The "clean" cells fit only by writing terser FRs — opus-medium with 6 bytes to spare.
- **Helper duplication is 5/8, not gpt-only.** opus-high and fable-medium carry the same `isTerminalStatus` duplicate the judge charged only to the gpt trio; the judge mis-credited opus-high with reuse.
- **opus-xhigh's defect re-characterized.** "Over-deletion of protected runs" is refuted; the reproduced behavior is keep-slot consumption by protected runs (see Findings), a documented divergent semantics plus a reporting gap — still the only 1-of-8 behavioral outlier on a destructive command, so the last place stands.

## Methodology note: spec ambiguity poisons single-judge ranking

An earlier task text mistakenly named `state.json` as the run-state source (the engine only persists `journal.jsonl`), creating a spec-vs-reality fork with two defensible implementations. Two judge runs over that forked task ranked the same work in opposite order depending on which side the judge took as ground truth. The task was revised so exactly one variant is correct; forked-era results were discarded. Lesson: before benchmarking, verify every factual claim in the task spec against the pinned codebase — an ambiguous spec measures the judge, not the cells.
