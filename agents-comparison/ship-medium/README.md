# Ship (medium): runs doctor

Ship-family benchmark: deliver [TASK.md](TASK.md) end-to-end on a fixed commit of flowai-workflow, following the pinned `ship` workflow. Regime: **durability/consistency checking with atomic repair**. Difficulty: **medium — deep helper archaeology, field-level diffing, atomic write + refusal path**.

Method, matrix, pins, judge, and result cache: [../shared/ship/README.md](../shared/ship/README.md).

```bash
./run.sh ~/tmp/ship-medium-$(date +%Y%m%d)        # full 5-cell matrix
./run.sh ~/tmp/ship-medium-one fable:high          # single cell
./judge.sh ~/tmp/ship-medium-$(date +%Y%m%d)      # after all cells exit
```

Retained evidence: [results/](results/).

## Findings (2026-06-12, 8 cells)

- All 8 cells delivered a functionally complete and SAFE `runs doctor`: torn-line as WARNING, errors on mid-file garbage/unknown kind/event-after-terminal, orphan + missing-dir detection, stale-lock warning, atomic tmp+rename repair with byte-identical `.bak`, refusal on live lock and on unreplayable journals, existing replayer reused everywhere. 13 judge scenarios: 13/13 for seven cells, 12/13 for gpt-5.5-medium.
- Ranking: opus-xhigh > fable-high > fable-medium > opus-medium > gpt-5.5-xhigh > opus-high > gpt-5.5-high > gpt-5.5-medium. With hard bars cleared by everyone, rank turned on requirement-intent depth (the subtly-tautological cost-divergence check), test/plan depth, and diff focus.
- The decisive separator was spec subtlety: the replayer derives `total_cost_usd` from node sums, so a literal cost-divergence check is dead code. Seven cells built a genuine independent cross-check; gpt-5.5-medium shipped the tautology (only real defect of the run, audit-reproduced: zero findings on a genuinely divergent journal) plus a `--json` gap.
- On this harder task the effort gradient finally paid for claude cells (xhigh/high > medium quality), inverting ship-easy where opus-xhigh was last with a keep-window semantics divergence. gpt-5.5 stayed 4–8× cheaper but its depth advantage did not scale with effort.
- Cost (official API rates): fable-high \$60.87, opus-xhigh \$42.06, fable-medium \$33.74, opus-high \$30.03, opus-medium \$18.32, gpt-5.5-xhigh \$7.78, gpt-5.5-high \$6.93, gpt-5.5-medium \$6.80. Wall-clock ~15–30 min per cell. Note: opus-high, opus-xhigh, fable-high are second attempts — the first hit the Claude subscription session limit and was not cached (failures are never cached by design).

Detail: [results/2026-06-12-matrix.md](results/2026-06-12-matrix.md).

## Erratum (2026-06-12): labels equalized after audit

An independent re-audit confirmed all six judged defects (three reproduced by execution) but equalized asymmetric labels; raw judge artifacts are retained unmodified:

- fable-medium's divergence message prints the same unrounded float (`0.30000000000000004`) charged to gpt-5.5-xhigh — now counted as the same cosmetic for both.
- gpt-5.5-xhigh's `--json` omits `repairs[]` exactly as gpt-5.5-medium's does — now counted as the same minor for both.
- gpt-5.5-medium's "unrelated doc churn" (FR-E47 rewrite) is withdrawn: the design file had 3 bytes of headroom under the repo's 29,920-byte docs size gate and the in-scope FR-E83 section had to fit, so the compression was gate-forced.
- Ranking is unchanged — it rests on requirement-intent depth and test/plan depth, which the audit upheld.
