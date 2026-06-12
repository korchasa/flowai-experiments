# Autonomous Maintenance

Measures how **model × reasoning-effort** affects the quality of an autonomous maintenance audit over a FIXED commit of [korchasa/flowai](https://github.com/korchasa/flowai). Each cell follows a **pinned snapshot of the maintenance workflow** (passed as inbound instructions, NOT the live plugin skill) and scans the same repo snapshot non-interactively into a findings report; an LLM judge then scores every report for **completeness** and **error count**.

## Motivation

The flowai maintenance skill fans out parallel scan workers and calibrates severity. Open questions: which model tier / effort level finds the most real issues, which hallucinates the fewest, and whether the expensive cells buy detection depth or only verbosity. Two pins make reports comparable across time: a fixed target commit AND a fixed workflow text (the user-installed skill evolves; the snapshot does not).

## Method

- **Target**: korchasa/flowai at commit `d28b590f7345fae07cbdc527156f4dc3876400cc` (`feat(maintenance): parallel read-only scan delegation`) — pinned in [run.sh](run.sh) via `COMMIT`, fresh `git clone … && git checkout` per cell.
- **Pinned workflow**: [skill/](skill/) is a committed snapshot of `framework/core/skills/maintenance/` (SKILL.md + 5 references + the scan-worker agent definition) taken from the SAME commit. run.sh feeds it to the session as instructions; the live `flowai:maintenance` plugin skill is never invoked.
- **Isolation**: sessions run with `--safe-mode` — all user plugins, skills, hooks, MCP servers, and CLAUDE.md files are disabled, so nothing outside the pinned text shapes behavior. Custom agent types are therefore unavailable; per the skill's own fallback rule, bucket scans run inline or via general-purpose subagents fed the pinned worker definition as their prompt.
- **Matrix**: `opus-4.8 × {medium, high, xhigh}`, `fable-5 × {medium, high}` — 5 cells, detached `claude -p` sessions with `--permission-mode bypassPermissions`.
- **Task per cell**: Scan phase (16 categories) + Verify gate with severity calibration, NO interactive resolution, NO file modifications; sole artifact is `MAINTENANCE_REPORT.md` (per-finding severity/category/path/line evidence + summary with counts and clean areas).
- **Judge** ([judge.sh](judge.sh), fixed cell `opus:high` for comparability): pools findings across all reports, deduplicates, verifies EVERY pooled finding against the reference checkout, then scores each report:
  - `validFindings` / `invalidFindings` (errors: hallucinated paths, misread content, wrong claims)
  - `missedValidFindings` (valid pooled findings absent from the report)
  - `completeness = valid / (valid + missed)` — relative to the verified pooled union
  - `precision = valid / (valid + invalid)`
- **Cost/duration**: from each cell's own session transcript in `~/.claude/projects/`.

Completeness is *pooled-relative* (union of what any cell found, verified), not absolute — no human-curated ground truth exists for the snapshot.

## Results

Run 2026-06-11 (judge: opus:high; pooled union 124 findings, 120 valid). Full artifacts in [results/](results/) — judge pair + all five cell reports.

| Cell | Valid | Invalid | Missed | Completeness | Precision | Cost* | Time |
|------|------:|--------:|-------:|-------------:|----------:|------:|-----:|
| **fable-high** | **97** | 0 | 23 | **0.808** | 1.000 | $79.01 | 41m |
| fable-medium | 72 | 0 | 48 | 0.600 | 1.000 | $47.06 | 23m |
| opus-high | 39 | **4** | 81 | 0.325 | 0.907 | $22.31 | 21m |
| opus-medium | 34 | 0 | 86 | 0.283 | 1.000 | $17.53 | 17m |
| opus-xhigh | 33 | 0 | 87 | 0.275 | 1.000 | $45.57 | 36m |

*Main-session usage at standard rates (opus 15/75, fable 5/25 per Mtok + cache rates); subagent token usage not included.

Key findings:

- **Inversion vs the app-generation experiment**: on audit/detection work Fable 5 dominates in quality — fable-high found 2.5× more verified issues than the best opus cell with zero false positives, though at 3.5× the cost ($79.01 vs $22.31 at official rates: fable 10/50, opus 5/25 per Mtok).
- **opus-high is the only cell with errors** (4 invalid findings, all "non-issue flagged as issue" — intentional design read as defect). Fable cells: 169 findings, 0 errors.
- **xhigh effort bought nothing here**: opus-xhigh is the most expensive opus cell ($45.57) and the least complete overall (0.275). Effort scaling helps construction tasks, not breadth-of-scan tasks.
- **Report volume tracked completeness, not noise**: fable reports were 2–2.7× longer (39–41 KB vs 15–20 KB) and the extra volume was verified-valid findings (precision 1.0), not verbosity.
- Judge self-correction mattered: first-pass region verifiers mislabeled several confirmed contradictions as INVALID; the judge re-checked disputed verdicts against files directly before scoring.

## Non-goals

- Judging fix quality (scan-only; resolution loop is explicitly skipped).
- Cross-IDE comparison (Claude Code CLI only).
- Absolute recall vs a human-audited ground truth (pooled-union proxy only).

## Reproduction

```bash
# full matrix (5 autonomous sessions + repo clones under <out-root>)
./run.sh ~/tmp/maint-$(date +%Y%m%d)

# single cell
./run.sh ~/tmp/maint-one fable:medium

# after all cells finish (reports exist): judge
./judge.sh ~/tmp/maint-$(date +%Y%m%d)
```

Requires an authenticated `claude` CLI (no plugins needed — the workflow is the committed snapshot). Override pins via `COMMIT=<sha>` / `SRC_REPO=<path>` env vars; to re-pin the workflow, regenerate `skill/` from the new commit (`git show <sha>:framework/core/skills/maintenance/...`). Progress: `-p` stdout buffers until exit; the live signal is each cell's transcript under `~/.claude/projects/`.

## Artifacts

- [skill/](skill/) — pinned maintenance workflow snapshot (SKILL.md, references/, scan-worker agent) @ the target commit.
- [run.sh](run.sh) — per-cell clone @ pinned commit + detached `--safe-mode` session driven by the snapshot.
- [judge.sh](judge.sh) — pooled verification judge (writes `judge-results.json` / `.md` into the run dir).
- `results/` — committed dated judge artifacts per retained run.
