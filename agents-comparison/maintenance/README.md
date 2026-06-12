# Autonomous Maintenance

Measures how **model × reasoning-effort** affects the quality of an autonomous maintenance audit over a FIXED commit of [korchasa/flowai](https://github.com/korchasa/flowai). Each cell follows a **pinned snapshot of the maintenance workflow** (passed as inbound instructions, NOT the live plugin skill) and scans the same repo snapshot non-interactively into a findings report; an LLM judge then scores every report for **completeness** and **error count**.

## Motivation

The flowai maintenance skill fans out parallel scan workers and calibrates severity. Open questions: which model tier / effort level finds the most real issues, which hallucinates the fewest, and whether the expensive cells buy detection depth or only verbosity. Two pins make reports comparable across time: a fixed target commit AND a fixed workflow text (the user-installed skill evolves; the snapshot does not).

## Method

- **Target**: korchasa/flowai at commit `d28b590f7345fae07cbdc527156f4dc3876400cc` (`feat(maintenance): parallel read-only scan delegation`) — pinned in [run.sh](run.sh) via `COMMIT`, fresh `git clone … && git checkout` per cell.
- **Pinned workflow**: [skill/](skill/) is a committed snapshot of `framework/core/skills/maintenance/` (SKILL.md + 5 references + the scan-worker agent definition) taken from the SAME commit. run.sh feeds it to the session as instructions; the live `flowai:maintenance` plugin skill is never invoked.
- **Isolation**: sessions run with `--safe-mode` — all user plugins, skills, hooks, MCP servers, and CLAUDE.md files are disabled, so nothing outside the pinned text shapes behavior. Custom agent types are therefore unavailable; per the skill's own fallback rule, bucket scans run inline or via general-purpose subagents fed the pinned worker definition as their prompt.
- **Matrix**: `opus-4.8 × {medium, high, xhigh}`, `fable-5 × {medium, high}` (detached `claude -p`, `--permission-mode bypassPermissions`) + `gpt-5.5 × {medium, high, xhigh}` (detached `codex exec`, `--dangerously-bypass-approvals-and-sandbox`, `--ignore-user-config`) — 8 cells.
- **Task per cell**: Scan phase (16 categories) + Verify gate with severity calibration, NO interactive resolution, NO file modifications; sole artifact is `MAINTENANCE_REPORT.md` (per-finding severity/category/path/line evidence + summary with counts and clean areas).
- **Judge** ([judge.sh](judge.sh), fixed cell `opus:high` for comparability): pools findings across all reports, deduplicates, verifies EVERY pooled finding against the reference checkout, then scores each report:
  - `validFindings` / `invalidFindings` (errors: hallucinated paths, misread content, wrong claims)
  - `missedValidFindings` (valid pooled findings absent from the report)
  - `completeness = valid / (valid + missed)` — relative to the verified pooled union
  - `precision = valid / (valid + invalid)`
- **Cost/duration**: from session transcripts (`~/.claude/projects/` `message.usage`; `~/.codex/sessions/` `total_token_usage`, summed over a cell's sub-sessions) at official API rates: opus 5/25, fable 10/50, gpt-5.5 5/30 per Mtok + cache rates.

Completeness is *pooled-relative* (union of what any cell found, verified), not absolute — no human-curated ground truth exists for the snapshot.

## Results

Current verdict: run 2026-06-12, 8 cells (judge: opus:high; pooled union 139 findings, 137 valid). The 5 claude reports are cache-identical to the 2026-06-11 run; the judge re-verified the expanded pool, so claude completeness values shifted with the larger denominator. Full artifacts in [results/](results/) — both judge pairs + all eight cell reports.

| Cell | Valid | Invalid | Missed | Completeness | Precision | Cost | Time |
|------|------:|--------:|-------:|-------------:|----------:|------:|-----:|
| **fable-high** | **94** | 0 | 43 | **0.686** | 1.000 | \$79.01 | 41m |
| fable-medium | 67 | 0 | 70 | 0.489 | 1.000 | \$47.06 | 23m |
| gpt-5.5-high | 44 | 1 | 92 | 0.321 | 0.978 | \$11.20 | ~18m |
| opus-medium | 36 | 2 | 101 | 0.263 | 0.947 | \$17.53 | 17m |
| opus-high | 31 | 0 | 106 | 0.226 | 1.000 | \$22.31 | 21m |
| opus-xhigh | 28 | 0 | 109 | 0.204 | 1.000 | \$45.57 | 36m |
| gpt-5.5-xhigh | 12 | 0 | 125 | 0.088 | 1.000 | \$4.24 | ~15m |
| gpt-5.5-medium | 11 | 0 | 126 | 0.080 | 1.000 | \$3.81 | ~13m |

Key findings:

- **Fable dominates detection breadth**: fable-high found 2.1× more verified issues than the best non-fable cell with zero false positives, though at 3.5× opus-high's cost. The quality inversion vs construction benchmarks holds with 8 cells.
- **gpt-5.5 forks on effort in an unusual way**: gpt-5.5-high spawned codex sub-sessions per scan area (6 sessions, \$11.20) and placed 3rd overall (44 valid, 0.321); its medium and xhigh siblings scanned single-threaded and produced near-empty reports (11–12 findings, 0.08 completeness) — the cheapest cells of the matrix and the least useful.
- **xhigh effort bought nothing in breadth-of-scan** in either family: opus-xhigh 0.204 at \$45.57, gpt-5.5-xhigh 0.088. Effort scaling helps construction tasks, not audits.
- **Precision stayed near-perfect everywhere** (3 invalid findings across 333 total); volume tracked completeness, not noise.
- Judge self-correction mattered: disputed verdicts were re-checked directly against files before scoring.

## Non-goals

- Judging fix quality (scan-only; resolution loop is explicitly skipped).
- Cross-IDE comparison (Claude Code CLI only).
- Absolute recall vs a human-audited ground truth (pooled-union proxy only).

## Reproduction

```bash
# full matrix (8 autonomous sessions + repo clones under <out-root>)
./run.sh ~/tmp/maint-$(date +%Y%m%d)

# single cell
./run.sh ~/tmp/maint-one fable:medium

# after all cells finish (reports exist): judge
./judge.sh ~/tmp/maint-$(date +%Y%m%d)
```

Requires authenticated `claude` + `codex` CLIs (no plugins needed — the workflow is the committed snapshot). Override pins via `COMMIT=<sha>` / `SRC_REPO=<path>` env vars; to re-pin the workflow, regenerate `skill/` from the new commit (`git show <sha>:framework/core/skills/maintenance/...`). Progress: `-p` stdout buffers until exit; the live signal is each cell's transcript under `~/.claude/projects/`.

## Artifacts

- [skill/](skill/) — pinned maintenance workflow snapshot (SKILL.md, references/, scan-worker agent) @ the target commit.
- [run.sh](run.sh) — per-cell clone @ pinned commit + detached isolated session (claude `--safe-mode` / codex `--ignore-user-config`) driven by the snapshot; result cache in `cache/`.
- [judge.sh](judge.sh) — pooled verification judge (writes `judge-results.json` / `.md` into the run dir).
- `results/` — committed dated judge artifacts per retained run.
