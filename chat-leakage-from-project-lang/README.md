# chat-leakage-from-project-lang

Measures whether non-Russian project-file language leaks into a final Russian answer after a requirement-prioritization task.

## Variant

- `baseline.ts` sweeps:
  - `project_language`: `english`
  - `tokens`: `0`, `50000`, `100000`, `200000`, `400000`
  - `instruction`: `baseline`, `guarded`
  - reps: `3`
- `quick.ts` sweeps:
  - `project_language`: `english`
  - `tokens`: `400000`
  - `instruction`: `baseline`, `guarded`
  - reps: `1`

Mechanism-specific full variants use the same axes as `baseline.ts`:

- `file-instruction.ts` — project file contains a lower-priority source-language summary style convention.
- `mixed-code-switch.ts` — project file mixes Russian with the file language in the same passages.
- `middle-only-signal.ts` — the current limited-pilot decision is surrounded by obsolete broad-launch and delay distractors.
- `term-transfer.ts` — final answer must translate source-language project terms into natural Russian.
- `label-transfer.ts` — final answer must translate English plan labels instead of copying them.
- `marker-readback.ts` — final answer must carry through the neutral decision code for the selected plan.
- `combined.ts` — combines all mechanism pressures.

Mechanism-specific quick variants use `tokens=400000`, both instruction modes, and `reps=1`:

- `quick-file-instruction.ts`
- `quick-mixed-code-switch.ts`
- `quick-middle-only-signal.ts`
- `quick-term-transfer.ts`
- `quick-label-transfer.ts`
- `quick-marker-readback.ts`
- `quick-combined.ts`

## Method

Each trial writes root project memory once with the Russian final-chat rule, then writes English `README.md`. The file describes a launch decision with one correct priority: choose a limited pilot over a broad immediate launch or full delay. The chat query avoids repeating the Russian-language rule; file-language pressure comes from project memory plus `README.md`, not from per-query restatement.

The `baseline` cell asks for only `FINAL_ANSWER`: exactly two short Russian sentences naming the goal, trade-off, and chosen launch plan. The `guarded` cell adds explicit mitigation: translate file concepts before answering, avoid English words, calques, and transliteration.

The experiment records:

- final-answer characters and estimated tokens extracted from generated output;
- measured controlled input tokens;
- project-file tokens;
- project-memory tokens;
- chat/query tokens;
- Russian and English script-token estimates;
- runtime input/cache telemetry when the selected adapter exposes it.

## Run

```bash
deno task experiment chat-leakage-from-project-lang --variant quick --dry-run
deno task experiment chat-leakage-from-project-lang --variant quick
deno task experiment chat-leakage-from-project-lang --variant quick-file-instruction
deno task experiment chat-leakage-from-project-lang --variant quick-mixed-code-switch
deno task experiment chat-leakage-from-project-lang --variant quick-middle-only-signal
deno task experiment chat-leakage-from-project-lang --variant quick-term-transfer
deno task experiment chat-leakage-from-project-lang --variant quick-label-transfer
deno task experiment chat-leakage-from-project-lang --variant quick-marker-readback
deno task experiment chat-leakage-from-project-lang --variant quick-combined
deno task experiment chat-leakage-from-project-lang --variant baseline --dry-run
deno task experiment chat-leakage-from-project-lang --variant baseline
```

Useful smoke run:

```bash
deno task experiment chat-leakage-from-project-lang --variant baseline --reps 1 --axis project_language=english --axis tokens=0 --axis instruction=baseline
```
