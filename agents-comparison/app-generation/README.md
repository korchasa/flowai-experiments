# Autonomous App Generation

Measures how **model × reasoning-effort** affects a fully autonomous Claude Code build of a non-trivial desktop app from a fixed brief. One detached `claude -p "/goal …"` session per matrix cell; no human input between launch and completion.

## Motivation

flowai assumes agents can carry a whole feature autonomously. Open questions: how do model tier and effort level trade off against cost, wall time, feature depth, and self-verification quality on an identical, sizeable task? And how much does brief quality (vague vs pattern-prescriptive) change the outcome?

## Method

- **Task**: build a desktop analyzer for `~/.claude/` Claude Code sessions (~1400 real JSONL transcripts as input data). Full spec: [BRIEF.md](BRIEF.md) — requirements + hard DoD (desktop window, mandatory implementation patterns, lint/typecheck/tests green, README coverage matrix).
- **Matrix**: `opus-4.8 × {medium, high, xhigh}`, `fable-5 × {medium, high}` — 5 cells, each in its own work dir with a pre-assigned port.
- **Launch**: `./run.sh <out-root>` (detached `claude -p "/goal …" --permission-mode bypassPermissions`).
- **Measurement**: each build's own session transcript in `~/.claude/projects/` (cost from `message.usage`, duration from timestamps, tool-call counts) + manual live verification of the produced apps (build, tests, server boot, API probes on real data).
- **Two generations of the brief were run**: gen1 — permissive brief ("choose a stack, prefer minimal setup"); gen2 — corrected brief (hard desktop-window requirement, 14 mandatory patterns distilled from gen1 analysis, fixed ports). BRIEF.md is the gen2 version.

## Results (2026-06-11)

See [results/2026-06-11-two-generations.md](results/2026-06-11-two-generations.md) for the full run report.

Cost / wall time / tool calls per cell (cost estimated from `message.usage` at standard Anthropic rates):

| Cell | Gen1 cost | Gen1 time | Gen1 calls | Gen2 cost | Gen2 time | Gen2 calls | Gen2 tests |
|------|----------:|----------:|-----------:|----------:|----------:|-----------:|-----------:|
| opus-high | $36.79 | 18m | 66 | $43.16 | 18m | 63 | ✓ |
| opus-medium | $42.62 | 20m | 84 | $34.06 | 15m | 52 | ✓ |
| fable-high | $18.39 | 26m | 95 | $15.27 | 27m | 56 | 14/14 |
| fable-medium | $12.49 | 21m | 80 | $11.42 | 18m | 60 | 12/12 |
| opus-xhigh | $97.35 | 37m | 129 | $103.26 | 39m | 134 | 20/20 |
| **Total** | **$207.6** | | | **$207.2** | | | |

Key findings:

- **Fable 5 is 3–4× cheaper than Opus 4.8** at equal effort on this task, with comparable gate results (all cells shipped green lint/typecheck/tests).
- **xhigh costs ~2.5× high** and buys real depth, not just tokens: only xhigh implemented dual-source subagent parsing with a measured join rate (gen1: 84% via `agentId`; gen2: 100%), wrote the most tests (20/20), and hand-built a variable-height virtualizer that renders a 17.6 MB session smoothly.
- **Brief quality dominates model choice.** Gen1's permissive brief produced 5 localhost web apps despite the word "desktop" (the "minimal setup" hint won); gen2's hard requirement produced 5 real chromeless desktop windows at the SAME total cost and slightly less wall time. Prescriptive pattern lists do not make builds more expensive — they remove exploration waste.
- **Stack convergence under a strict brief**: gen1 chose 4× npm/Vite + 1× Deno; gen2 — 5× Deno (its `--allow-write=./data` flags structurally enforce the read-only constraint, which the brief rewarded).
- **Effort shows where verification depth matters**: medium cells verified via API probes; high cells added headless-Chrome screenshot verification; xhigh measured its own feature accuracy (subagent link rate) and iterated until 100%.

## Non-goals

- Judging UI/UX quality automatically (manual side-by-side review only).
- Multi-IDE comparison (Claude Code CLI only; Cursor/Codex out of scope here).
- Statistical reps — one run per cell per generation; treat findings as directional.

## Reproduction

```bash
# full 5-cell matrix into a scratch dir (WARNING: ~$200 and ~40 min per generation)
./run.sh ~/tmp/appgen-$(date +%Y%m%d)

# a single cheap cell
./run.sh ~/tmp/appgen-one fable:medium:4714
```

Requires an authenticated `claude` CLI. Builds run with `--permission-mode bypassPermissions` in isolated dirs; review run.sh before launching. Progress: build transcripts appear under `~/.claude/projects/-<encoded-out-root>-…/` — tool-call tails are the most reliable live signal (the `-p` stdout buffers until exit).

## Artifacts

- [BRIEF.md](BRIEF.md) — the exact brief given to every build (gen2, single file).
- [run.sh](run.sh) — launcher.
- [results/](results/) — committed run reports.
- Generated apps themselves live outside this repo (local scratch dirs; ~3500–4800 LOC each).
