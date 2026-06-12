# Maintenance-Audit Report Judging

**Reference checkout (ground truth):** `/Users/korchasa/tmp/maint-20260611/fable-high`
**Pooled union:** 124 unique findings — **120 valid**, **4 invalid**.

Every pooled finding was verified against the source files. First-pass region verifiers
sometimes mislabeled a *confirmed contradiction* as INVALID (their own evidence supported the
finding); each disputed verdict was re-checked directly against the files and corrected.

## Scoreboard

| Report        | Findings | Valid | Invalid | Missed | Completeness | Precision |
|---------------|---------:|------:|--------:|-------:|-------------:|----------:|
| **fable-high**   | 97 | **97** | 0 | 23 | **0.808** | **1.000** |
| **fable-medium** | 74 | 72 | 0 | 48 | 0.600 | 1.000 |
| **opus-high**    | 43 | 39 | **4** | 81 | 0.325 | 0.907 |
| **opus-medium**  | 41 | 34 | 0 | 86 | 0.283 | 1.000 |
| **opus-xhigh**   | 28 | 33* | 0 | 87 | 0.275 | 1.000 |

completeness = valid / (valid + missed), against 120 valid pooled findings.
precision = valid / (valid + invalid).
\*opus-xhigh's bundled LOC finding maps to 6 distinct pooled file-size issues, so its distinct-pooled
coverage (33) exceeds its raw finding count (28); same effect inflates fable-medium/opus-medium distinct coverage.

**Verdict:** fable-high is the clear winner — highest completeness (0.808) with perfect precision and
zero errors. fable-medium is a solid second. The opus cells cluster tightly at low completeness;
opus-high reached furthest of them but is the **only** report with false positives (4).

## Errors (invalid findings)

Only **opus-high** produced invalid findings. All four are non-issues — the cited evidence is either
self-consistent or documents intentional design. The other four reports had zero errors.

### opus-high — 4 errors

- **[26] FR-MAINT index-row drift** (Cat 9). Claim: `index.md` FR-MAINT summary disagrees with SRS.
  *Checked:* `documents/index.md:72` = "Automated project maintenance via `deno task check`…";
  `documents/requirements.md:72` FR-MAINT Description says the **same** thing. They agree — no divergence.
- **[27] Orphan `[x]` FRs lack code markers** (Cat 9). Claim: md-skill FRs (`fr:ship`, `fr:doc-tasks`, …)
  have no SALP back-reference, so traceability is broken.
  *Checked:* `AGENTS.md:130-137` explicitly permits **non-code evidence** (acceptance tests, file/dir
  existence) placed directly in SRS; the cited FRs carry acceptance-test evidence and are policy-compliant.
  fable-high gate-dropped the identical lead as `[verified false]`.
- **[30] codex `outputFormat="stream-json"` overload** (Cat 12). Claim: reusing Claude's literal mis-routes
  Codex logs.
  *Checked:* `format_logs.ts` deliberately treats `stream-json` as an NDJSON-**family** tag and explicitly
  handles Codex's `thread.started`/`item.completed`/`turn.completed` schema; `codex_test.ts` pins that logs
  parse correctly. Intentional design, not a contract defect. (opus-xhigh independently verified this false.)
- **[33] `cliVersion()` `""` sentinel smell** (Cat 12). Claim: empty-string-on-failure conflates probe-failure.
  *Checked:* `adapters/version.ts:1-11` JSDoc documents the never-throws / `""`-on-failure contract as
  **deliberate**, chosen so the cache key stays stable. fable-high and opus-medium both verified this as
  intentional and dropped it. (Distinct from the valid finding P85 = "no `version_test.ts` covers that contract".)

## Evidence spot-checks performed directly (beyond agent verification)

- **deno.json** — confirmed `build-plugins` and `validate-plugins` tasks are byte-identical (P108);
  `lint.exclude` skips whole `acceptance-tests/` trees while `fmt.exclude` skips only `*/fixture/` (P6);
  no Deno engine constraint (P109). `@acceptance-tests/` alias present (P50).
- **scripts/ root** — `maintenance_scan_buckets_test.ts` is the lone snake_case-base file; all 22 other
  `*_test.ts` are kebab-base (P2).
- **LOC counts** (`wc -l`) — build-plugins_test 1205, build-plugins 897, generate-skill-composites 763,
  sync-plugins-local 731, validate-plugins 714, runner 698, check-skills_test 681, check-skills 651,
  cache_test 608, rule_scripts_test 547, trace-renderer 520 — all match (P11–P17).
- **design.md:154** — "Each script header MUST include a `Run:` section"; no `Run:` enforcement in any
  `check-*.ts` (P83). **AGENTS.md:136** — acceptance refs "matched by `check-fr-coverage.ts`", which is
  absent from `task-check.ts` buildCheckPlan (runs `check-srs-evidence.ts`) (P84).
- **FR-DOC-INDEX (requirements.md:1233)** — spec mandates GFM `- [<NS>-<ID>](path.md#anchor)…` rows; actual
  `index.md` rows are SALP `- [REF:fr:… | FR-…] — …` (P45). FR-MAINT index row == SRS (P110 → invalid).
- **README.md** — `## Packs` has core/engineering/ide-bridge/devtools/deno/typescript/beta but **no memex**
  section; `## Project Structure` tree lists only 5 packs, omitting memex/ ide-bridge/ beta/ (P26).
- **AGENTS.md** — traceability bullets mandate `// FR-<ID>` "validated by check-traceability.ts" while the
  script errors on that grammar (P29); `flowai-*` naming contradiction with framework/AGENTS.md +
  check-naming-prefix.ts (P30); flat-gitignored vs nested-committed tasks (P118); GODS template shows only
  `implements:` vs FR-DOC-TASKS required `date`/`status` (P119).
- **types.ts** — `AcceptanceTestScenario` vs `AcceptanceTestAgentScenario` are near-duplicate abstract
  classes (identical sandboxState default + setup(), structurally identical targetAgentPath getters) (P53).

## Notes on scoring rules applied

- Near-duplicate findings inside one report counted once (e.g. fable-medium's two index-drift findings →
  one pooled P46; its single multi-file LOC finding → the corresponding pooled file-size ids).
- Severity inflation was **not** charged against any report — no assigned severity is outright contradicted
  by the evidence (all reports kept Critical at 0% and used defensible High/Medium/Low bands).
- A finding was marked INVALID only when the reference files contradict it or it is a non-issue by the
  report's own category definition (the 4 opus-high items above).
