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

Cost / wall time / tool calls per cell (cost from `message.usage` at official API rates: opus 5/25, fable 10/50 per Mtok + cache rates):

| Cell | Gen1 cost | Gen1 time | Gen1 calls | Gen2 cost | Gen2 time | Gen2 calls | Gen2 tests |
|------|----------:|----------:|-----------:|----------:|----------:|-----------:|-----------:|
| opus-high | \$12.26 | 18m | 66 | \$14.39 | 18m | 63 | ✓ |
| opus-medium | \$14.21 | 20m | 84 | \$11.35 | 15m | 52 | ✓ |
| fable-high | \$36.79 | 26m | 95 | \$30.55 | 27m | 56 | 14/14 |
| fable-medium | \$24.99 | 21m | 80 | \$22.84 | 18m | 60 | 12/12 |
| opus-xhigh | \$32.45 | 37m | 129 | \$34.42 | 39m | 134 | 20/20 |
| **Total** | **\$120.70** | | | **\$113.55** | | | |

### Gen2 addendum: gpt-5.5 cells (2026-06-12, codex CLI)

The same gen2 brief was later run through `codex exec` (`--ignore-user-config`, `--dangerously-bypass-approvals-and-sandbox`), ports 4716–4718:

| Cell | Cost | Time | Source files | Desktop window | Note |
|------|-----:|-----:|-------------:|:--:|------|
| gpt-5.5-medium | \$1.91 | ~15m | 11 | ✅ chromeless Chrome | smallest build |
| gpt-5.5-high | \$1.83 | ~15m | 8 | ✅ chromeless Chrome | lint+typecheck+tests pass |
| gpt-5.5-xhigh | \$5.83 | ~18m | 9 | ✅ chromeless Chrome | left the app running on exit |

All three honored the hard desktop-window requirement (the gen1 trap), at 1/6–1/18 the cost of claude cells — but the builds are an order of magnitude smaller (8–11 source files vs 50+ for claude cells), so cost parity claims need a depth-per-dollar caveat: cheap cells build the checklist, not the product depth. Verified statically (window mechanism, tests, README coverage matrix); not feature-audited live.

## Gen2 feature audit (2026-06-12, static)

What the 8 builds actually contain, audited statically against BRIEF.md (route/function evidence per cell; no servers started). Legend: ✅ full / ◐ partial / — absent. Columns: opus-medium, opus-high, opus-xhigh, fable-medium, fable-high, gpt-5.5-medium, gpt-5.5-high, gpt-5.5-xhigh.

| Feature (brief ref) | o-med | o-high | o-xhigh | f-med | f-high | g-med | g-high | g-xhigh |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Sessions list sort/filter (VIEW-1) | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ✅ | ✅ |
| Timeline + thinking toggle + raw JSON (VIEW-2/3/7) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tool-specific renderers incl. Edit diff (VIEW-4/6, P8) | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ◐ | ✅ |
| Conversation tree / branch view (VIEW-5) | ◐ | ◐ | ◐ | ◐ | ◐ | — | — | — |
| Subagent dual-source merge + link rate (P2) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ✅ |
| Search query language (SEARCH-1..4, P5) | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ◐ | ✅ |
| Saved queries (SEARCH-5) | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ◐ | ✅ |
| Price table + cost analytics (COST-1/2, P12) | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ◐ | ✅ |
| Cache efficiency (COST-3) | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ✅ | ✅ |
| Behavior dashboard (P4) | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ✅ | ✅ |
| Per-project dashboard (DASH-2) | ✅ | ◐ | ✅ | ✅ | ✅ | — | ✅ | ◐ |
| Session compare (DASH-3) | — | ✅ | ✅ | — | ✅ | — | — | — |
| Loop/repeat detection (BEHAV-4) | — | ✅ | — | — | — | — | — | — |
| Annotations + collections (OUT-1/2) | ✅ | ◐ | ✅ | ✅ | ✅ | ◐ | ◐ | ✅ |
| Exports MD + CSV/JSON (OUT-3, P11) | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ✅ | ✅ |
| Secret redaction, UI + pre-LLM (PRIV-2, P14) | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ✅ | ✅ |
| LLM scoring: consent + hash cache (QUAL-4..6) | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ◐ | ◐ |
| Virtualized timeline (P6) | ✅ | ✅ | ✅ | ◐ | ✅ | ✅ | ✅ | ✅ |
| Incremental indexing (ING-8, P13) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-root (ING-1) | ✅ | ◐ | ◐ | ◐ | ◐ | — | ✅ | ✅ |
| Live watch (ING-9) | — | — | — | — | — | — | — | — |
| **Full-feature count (of 21)** | **17** | **16** | **17** | **15** | **17** | **4** | **10** | **15** |

Scale and what makes each build different:

| Build | Files | LOC | Tests | Views | Distinctive |
|---|---:|---:|---:|---:|---|
| opus-medium | 20 | 3,172 | 10 | 10 | only true multi-root (`claudeRoots()`); widest nav (8 tabs); breadth over depth |
| opus-high | 19 | 3,206 | 13 | 7 | only loop/repeat detection; compare view; annotations server-side only |
| opus-xhigh | 38 | 7,672 | 20 | 8 | 2× anyone's scale, modular `src/core/` (15 modules), hand-rolled virtualizer, blind-edit detection, dedicated primitives view |
| fable-medium | 17 | 3,877 | 12 | 6 | complete middle; virtualization is shallow CSS `content-visibility`; compare/loops explicitly deferred |
| fable-high | 17 | 4,287 | 14 | 8 | richest query language (`branch:`/`stop:`/`after:`/`tokens>`), dedicated subagent timeline route, active-vs-wall time; most analytic depth per LOC |
| gpt-5.5-medium | 13 | 1,264 | 6 | ~2 | thinnest: search re-parses corpus per query, ⌘K palette is a dead stub, deep links don't survive reload, annotations API-only |
| gpt-5.5-high | 10 | 1,210 | 3 | 4 | most app-shaped gpt UI (4 tabs, working ⌘K, project panel); subagents NOT merged into parent timeline (aux sessions) |
| gpt-5.5-xhigh | 11 | 3,237 | 3 | 1 | functionally richest gpt: full subagent merge w/ provenance, 7-key query language, live price-table editor, only build meeting QUAL-6 scoring cache; read-only enforced via Deno flags |

Reading: claude cells cluster at 15–17/21 with different *shapes* (opus-medium breadth, fable-high analytic depth, opus-xhigh scale+architecture); gpt forks hard on effort — medium ships a 4/21 skeleton, xhigh reaches fable-medium's breadth (15/21) at ~1/4 the cost and ~40% of the LOC, with shallower depth behind the same checkmarks. Universal gaps across all 8: live watch, real conversation-tree visualization, time-series trends (gpt also lacks compare and behavior analytics BEHAV-2..4).

Key findings:

- **Fable 5 is 3–4× cheaper than Opus 4.8** at equal effort on this task, with comparable gate results (all cells shipped green lint/typecheck/tests).
- **xhigh costs ~2.6× high (opus)** and buys real depth, not just tokens: only xhigh implemented dual-source subagent parsing with a measured join rate (gen1: 84% via `agentId`; gen2: 100%), wrote the most tests (20/20), and hand-built a variable-height virtualizer that renders a 17.6 MB session smoothly.
- **Brief quality dominates model choice.** Gen1's permissive brief produced 5 localhost web apps despite the word "desktop" (the "minimal setup" hint won); gen2's hard requirement produced 5 real chromeless desktop windows at the SAME total cost and slightly less wall time. Prescriptive pattern lists do not make builds more expensive — they remove exploration waste.
- **Stack convergence under a strict brief**: gen1 chose 4× npm/Vite + 1× Deno; gen2 — 5× Deno (its `--allow-write=./data` flags structurally enforce the read-only constraint, which the brief rewarded).
- **Effort shows where verification depth matters**: medium cells verified via API probes; high cells added headless-Chrome screenshot verification; xhigh measured its own feature accuracy (subagent link rate) and iterated until 100%.

## Non-goals

- Judging UI/UX quality automatically (manual side-by-side review only).
- Multi-IDE comparison (Claude Code CLI only; Cursor/Codex out of scope here).
- Statistical reps — one run per cell per generation; treat findings as directional.

## Reproduction

```bash
# full matrix into a scratch dir (WARNING: ~$120+ and ~40 min per generation)
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
