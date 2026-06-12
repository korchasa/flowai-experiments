# Run report: two generations, 10 autonomous builds (2026-06-11)

Task: desktop analyzer for `~/.claude/` Claude Code sessions (see ../BRIEF.md). 5 cells × 2 brief generations. All 10 builds completed autonomously and shipped green gates.

## Per-build data

Source: each build's own session transcript in `~/.claude/projects/` (usage-derived cost, timestamp-derived duration) + live verification of the artifacts.

### Gen1 (permissive brief: "choose a stack, prefer minimal setup")

| Cell | Cost | Time | Tool calls | Stack | Tests | Verified live |
|------|-----:|-----:|-----------:|-------|------:|---------------|
| opus-high | $36.79 | 18m | 66 | npm+Vite+Express SPA | 18/18 | UI 200, 1164 sessions indexed, dashboard $14.9k total cost |
| opus-medium | $42.62 | 20m | 84 | npm+Vite client/server | 15/15 | 4771-event session parsed; block-level search w/ snippets |
| fable-high | $18.39 | 26m | 95 | **Deno**, chromeless window | 15/15 | richest behavior dashboard (stopReasons/interrupts/askUser/toolProfile/primitives) |
| fable-medium | $12.49 | 21m | 80 | npm, `open` URL | 13/13 | parseHealth, danglingToolUseIds, md-export |
| opus-xhigh | $97.35 | 37m | 129 | npm | 28/28 | dual-source subagents, 84% agentId join, virtualization |

Gen1 deviation: "desktop app" requirement degraded to localhost web servers in 4/5 cells (only fable-high opened a chromeless window). Root cause: brief listed "local web app launched as desktop" as acceptable and pushed "minimal setup".

### Gen2 (corrected brief: hard desktop-window DoD + 14 mandatory patterns from gen1 analysis + fixed ports)

| Cell | Cost | Time | Tool calls | Stack | Tests | Notable |
|------|-----:|-----:|-----------:|-------|------:|---------|
| opus-high | $43.16 | 18m | 63 | Deno | ✓ | incremental index reuses 1159/1165 entries on restart |
| opus-medium | $34.06 | 15m | 52 | Deno | ✓ | multi-root support (`roots[]`); cheapest opus cell |
| fable-high | $15.27 | 27m | 56 | Deno | 14/14 | all 14 patterns explicitly reported; 432 dangling tool_use detected |
| fable-medium | $11.42 | 18m | 60 | Deno, zero-dependency | 12/12 | cheapest cell overall |
| opus-xhigh | $103.26 | 39m | 134 | Deno | 20/20 | 100% subagent link rate; hand-written variable-height virtualizer over 17.6 MB session; consent-gated LLM scoring verified (400 without consent) |

All 5 gen2 cells opened real chromeless desktop windows (verified by process list: `Chrome --app=http://127.0.0.1:<port>`); Tauri correctly skipped per fallback rule (rustc 1.69 too old).

## Totals

- Gen1: $207.6; Gen2: $207.2. Equal cost despite gen2's stricter, larger requirement set.
- Fable cells: $11.4–18.4; Opus cells: $34.1–43.2; xhigh: $97.4–103.3.

## Conclusions

1. **Brief quality > model choice.** The same matrix under a prescriptive brief delivered strictly more (real windows, 14 patterns, equal-or-better tests) at the same total cost and less wall time. Exploration waste, not feature work, is what a vague brief buys.
2. **Fable 5 ≈ 3–4× cheaper than Opus 4.8** here with comparable gate quality. For codegen-heavy autonomous builds it is the value pick; Opus xhigh is the depth pick.
3. **xhigh's premium is spent on self-verification**, and it shows: only xhigh measured its own feature accuracy (subagent join rate) and iterated to 100%; only xhigh survived the largest real session smoothly via a custom virtualizer.
4. **Soft preferences silently dominate hard nouns.** "Desktop app" (noun) lost to "prefer minimal setup" (preference) in 4/5 gen1 cells. DoD-level hard requirements are the only reliable steering: gen2's "browser tab = FAIL" fixed it in 5/5.
5. **Environment nudges converge stacks.** One sentence ("Deno permission flags count as a plus") flipped stack choice from 1/5 Deno to 5/5 Deno.

## Reproducibility caveats

- One run per cell per generation — directional, not statistical.
- Cost figures use standard Anthropic rates applied to transcript `usage`; subscription billing differs.
- Builds ran on macOS (Darwin 25.5.0), Deno 2.8.2, node 22, system Chrome; the chromeless-window path is macOS-specific (`open -na "Google Chrome" --args --app=…`).
