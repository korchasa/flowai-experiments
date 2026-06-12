# Methodology rules — agents-comparison benchmarks

Standing instructions for any agent designing, running, judging, or interpreting benchmarks in this directory. Each rule was paid for by a concrete failure in this study.

## Designing a task spec

- Verify every factual claim in the spec against the pinned codebase BEFORE benchmarking. A spec that named a state file the engine never writes created a spec-vs-reality fork and two opposite rankings from the same judge.
- Formulate the task so exactly ONE implementation variant is correct. If two readings are defensible, the benchmark measures the judge's taste, not the cells. Ambiguous retention semantics in ship-easy produced a "defect" that was really a documented divergent reading.

## Judging

- Mechanical checks first, qualitative scoring second. Run pushes against the bare remote, the project gate, and CLI spot-checks on fabricated fixtures before assigning any rank.
- Checklist coverage does not guarantee purpose achievement. Two "15/15" cells shipped compaction that GROWS the journal. Always verify the feature's premise mechanically (does the file actually shrink? does the cost actually drop?), not just the requirement items.
- Apply identical standards to every cell. The same cosmetic/minor defect must receive the same label everywhere; the original judge charged an unrounded float to one cell and silently ignored the identical float in another.
- Before labeling repeated behavior as a model trait or a defect, check whether the harness or target repo FORCES it. The "scope creep" doc split in 3 cells was prescribed by the target repo's own docs size gate — its error message literally instructs "split overlarge files by functional area". Trace the causal chain: required edit → gate constraint → observed diff.
- Re-audit judge verdicts adversarially before publishing: re-derive every defect claim from the actual patches and reproduce every behavioral claim live on the pinned base commit. The audit here confirmed the facts but overturned several rank discriminators.
- A single LLM judge inherits one taste. Anchor every load-bearing call (rank separators, "real bug" labels) in a mechanical check or a live reproduction.

## Interpreting results

- One run per cell supports DESCRIPTIVE statements only. Interpretive patterns are hypotheses for repeated runs — never write present-tense universals ("X dominates", "effort pays") from single runs; use past-tense, run-scoped wording.
- Ranks within one defect of each other are ties. Do not manufacture precision the data lacks.
- A pattern observed in 2 cells is a sample, not a family verdict.
- When a published verdict is corrected, keep raw judge artifacts unmodified as the historical record and add an explicit erratum stating what changed and why.

## Cost accounting

- Compute costs from session transcripts at official API rates, and verify the rates against the provider's published pricing AT RUN TIME — never from memory. A wrong remembered rate once invalidated every published dollar figure in this study.
- Subscription-billed runs produce normalized estimates, not invoices. Present them for relative comparison and say so.

## Harness

- Cache only successful cells (exit 0). Failures (rate limits, crashes) must never be cached — three rate-limited cells were once cached as results.
- Key caches by the content of pinned inputs (task spec, workflow snapshot, target commit, prompt); exclude launcher mechanics so harness fixes never invalidate paid results.
- Make setup idempotent (`rm -rf` work dirs before clone). Leftover dirs from an interrupted run make `git clone` fail and cells get skipped silently.
