# Ship (hard): journal snapshots + crash-safe compaction

Ship-family benchmark: deliver [TASK.md](TASK.md) end-to-end on a fixed commit of flowai-workflow, following the pinned `ship` workflow. Regime: **engine-core durability: journal format extension, replay equivalence, crash-injection**. Difficulty: **hard on three axes — algorithmics (byte-equal replay equivalence), edit volume (7+ subsystems), instruction-following (15 individually-judged MUSTs)**.

Method, matrix, pins, judge, and result cache: [../shared/ship/README.md](../shared/ship/README.md).

```bash
./run.sh ~/tmp/ship-hard-$(date +%Y%m%d)        # full 5-cell matrix
./run.sh ~/tmp/ship-hard-one fable:high          # single cell
./judge.sh ~/tmp/ship-hard-$(date +%Y%m%d)      # after all cells exit
```

Retained evidence: [results/](results/).

## Findings (2026-06-12, 8 cells)

- All 8 cells delivered: green gate, real push, byte-exact CLI summary line, forward-version refusal, crash-injection suites. Nominal 15/15 requirement coverage in 5 cells.
- Ranking: opus-xhigh (1.00, flawless, exact 5-step protocol with fault hooks at every boundary) > fable-medium (1.00, 215 tests) > fable-high (1.00, zero defects) > gpt-5.5-medium (1.00, 3 low) > opus-medium ≈ opus-high (0.97, test gaps on the auto-trigger item) > gpt-5.5-xhigh > gpt-5.5-high.
- **The decisive axis was design comprehension, not item coverage**: gpt-5.5-high and gpt-5.5-xhigh embedded the full event history inside each snapshot, so "compaction" GROWS the journal (judge-verified live: 1500→2027 bytes) — nominally 15/15, but the feature's purpose is defeated. gpt-5.5-high added an O(n²) auto-trigger (full replay per node completion). First benchmark where gpt cells shipped major design defects.
- Effort gradient on hard construction: opus-xhigh first (as on medium), and claude cells took 44–65 min vs ~20 min for gpt — depth bought correctness.
- Cost (official API rates): fable-high \$99.99, fable-medium \$81.43, opus-xhigh \$69.98, opus-high \$40.47, opus-medium \$36.79, gpt-5.5-xhigh \$11.48, gpt-5.5-medium \$10.14, gpt-5.5-high \$8.58.

Detail: [results/2026-06-12-matrix.md](results/2026-06-12-matrix.md).
