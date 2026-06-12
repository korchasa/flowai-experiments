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
- Ranking: opus-xhigh (1.00, flawless, exact 5-step protocol with fault hooks at every boundary) > fable-medium (1.00, 215 tests) > fable-high (1.00, zero defects) > gpt-5.5-medium (1.00, 3 low) > opus-medium ≈ opus-high (0.97, test gaps on the auto-trigger item) > gpt-5.5-xhigh (1 major + an O(n²)-class trigger) > gpt-5.5-high (2 major).
- **The decisive axis was design comprehension, not item coverage**: gpt-5.5-high and gpt-5.5-xhigh embedded the full event history inside each snapshot, so "compaction" GROWS the journal (judge-verified live: 1500→2027 bytes) — nominally 15/15, but the feature's purpose is defeated. gpt-5.5-high added an O(n²) auto-trigger (full replay per node completion). First benchmark where gpt cells shipped major design defects.
- Effort gradient on hard construction: opus-xhigh first (as on medium), and claude cells took 44–65 min vs ~20 min for gpt — depth bought correctness.
- Cost (official API rates): fable-high \$99.99, fable-medium \$81.43, opus-xhigh \$69.98, opus-high \$40.47, opus-medium \$36.79, gpt-5.5-xhigh \$11.48, gpt-5.5-medium \$10.14, gpt-5.5-high \$8.58.

Detail: [results/2026-06-12-matrix.md](results/2026-06-12-matrix.md).

## Erratum (2026-06-12): audit additions

An independent re-audit reproduced both MAJOR defects live on the pinned base commit (gpt-5.5-high compaction: 4,973 → 5,355 bytes; gpt-5.5-xhigh: 4,973 → 5,368; opus-xhigh genuinely shrinks: 4,973 → 339) and confirmed all low-severity claims. Two corrections; raw judge artifacts retained unmodified:

- gpt-5.5-xhigh's auto-trigger re-parses the entire journal on every node completion — the same O(n²) class the judge charged only to gpt-5.5-high, with a lighter constant (one parse; no replay/serialize). Both gpt cells now carry the label; gpt-5.5-high remains worse.
- opus-high's auto-trigger test gap is narrower than the judge's markdown summary stated: `Engine.run()` end-to-end tests exist; only the mid-node-exclusion and verbose-line assertions are missing (the judge's JSON had this right).
- Root cause of both growing compactions: task item 6 demands byte-equal "replay result" serializations, and the replay result includes the events array — embedding history makes the literal test pass. opus cells compared state-only serializations instead. Ranking unchanged.
