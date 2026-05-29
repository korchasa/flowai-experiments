# chat-leakage-from-reasoning-lang

Measures whether visible English analysis pressure leaks into a final Russian answer after a non-trivial requirement-prioritization task.

## Variant

- `baseline.ts` sweeps:
  - `tokens`: `0`, `50000`, `100000`, `200000`, `400000`
  - `instruction`: `baseline`, `guarded`
  - reps: `3`

## Method

Each trial writes a Russian `README.md` containing structured launch requirements: goal, constraints, risks, exceptions, audit notes, and candidate launch plans. The `tokens` axis controls the size of this analytical material; the final answer is excluded from all controlled context-size measurements.

The user query is Russian. Both instruction cells ask the model to write a visible English `VISIBLE_ANALYSIS` block with 6-10 concise analytical notes, then a separate `FINAL_ANSWER` block with exactly two Russian sentences. The `guarded` cell adds explicit mitigation: keep the final answer natural Russian, avoid English words, calques, and transliteration, translate concepts before writing, and keep exactly two Russian sentences.

The experiment does not measure hidden chain-of-thought length. It records:

- visible-analysis characters and estimated tokens extracted from generated output;
- final-answer characters and estimated tokens extracted from generated output;
- measured controlled input tokens;
- analytical-material tokens;
- project-file tokens;
- project-memory tokens;
- chat/query tokens;
- Russian, English, and Japanese script-token estimates;
- runtime input/cache telemetry when the selected adapter exposes it.

## Run

```bash
deno task experiment chat-leakage-from-reasoning-lang --variant baseline --dry-run
deno task experiment chat-leakage-from-reasoning-lang --variant baseline
```

Useful smoke run:

```bash
deno task experiment chat-leakage-from-reasoning-lang --variant baseline --reps 1 --axis tokens=0 --axis instruction=baseline
```
