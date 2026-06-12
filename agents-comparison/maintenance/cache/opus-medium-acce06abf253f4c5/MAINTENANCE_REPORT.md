# Maintenance Audit Report — flowai framework

Scope: Deno/TypeScript framework repo. Product source = `framework/` (content packs) + `scripts/` (Deno tooling) + `scripts/acceptance-tests/lib/` (acceptance system + IDE adapters). Test fixtures under `**/acceptance-tests/**/fixture/`, `CHANGELOG.md`, and `deno.lock` excluded from quality/LOC flagging per project conventions. CLI source lives in the external `flowai-cli` repo and is out of scope.

Mode: Scan + Verify only. Every finding below was ground-truthed against source (Verify gate). No project files were modified except this report. Severity per `severity-rubric.md`; ties broken downward (anti-inflation).

---

## Code Hygiene

- [1] [Low] `scripts/lib/salp.ts:163,167`: exported `serializeAnchor` / `serializeRef` consumed only by `scripts/lib/salp_test.ts` — no production caller. (Fix: drop `export`, or confirm intended public SALP API and document it.) — rubric `#cat-2-code-hygiene` (unused export).
- [2] [Low] `scripts/lib/composite-list.ts:41`: exported `compositeNames()` referenced only from `scripts/check-skills_test.ts:266` — no production caller. (Fix: inline into the test or de-export.) — `#cat-2-code-hygiene`.
- [3] [Low] `scripts/lib/salp-anchor-map.ts:41,64`: `extractFrAnchors` / `extractSdsAnchors` exported but used only internally by `buildAnchorMap` (same file) — over-broad surface. (Fix: drop `export`.) — `#cat-2-code-hygiene`.
- [4] [Low] `scripts/acceptance-tests/lib/spawned_agent.ts:63,380`: private field `parsedSubtype` is assigned (`:380`) but never read anywhere — dead write; the parsed `subtype` (`success`/`error`/`input_required`) contract is captured then dropped. (Fix: consume it to drive run state, or remove the field.) — `#cat-2-code-hygiene` (unused private symbol).

## Complexity & Hotspots

LOC bucket = "service / framework / tool" (default) → file threshold 500, function threshold 50. File LOC are exact (`wc -l`).

- [5] [Medium] `scripts/build-plugins.ts`: 897 LOC (1.8× threshold); multiple concerns (pack build, Claude manifest, Codex manifest, marketplace emit). (Fix: split emit stages into modules.) — `#cat-3-complexity-hotspots`.
- [6] [Medium] `scripts/generate-skill-composites.ts`: 763 LOC. (Fix: separate parse vs render stages.) — `#cat-3-complexity-hotspots`.
- [7] [Medium] `scripts/sync-plugins-local.ts`: 731 LOC. (Fix: split per primitive type.) — `#cat-3-complexity-hotspots`.
- [8] [Medium] `scripts/validate-plugins.ts`: 714 LOC. (Fix: split per validation rule group.) — `#cat-3-complexity-hotspots`.
- [9] [Medium] `scripts/acceptance-tests/lib/runner.ts`: 698 LOC. (Fix: extract sandbox-prep / scenario-run / reporting.) — `#cat-3-complexity-hotspots`.
- [10] [Medium] `scripts/check-skills.ts`: 651 LOC. (Fix: split per check.) — `#cat-3-complexity-hotspots`.
- [11] [Medium] `scripts/acceptance-tests/lib/trace-renderer.ts`: 520 LOC (1.04× threshold). (Fix: extract sub-renderers.) — `#cat-3-complexity-hotspots`.
- [12] [Medium] `scripts/acceptance-tests/lib/spawned_agent.ts:182` `start()`: ~218-line function (>4× the 50-line function threshold) mixing spawn / IO-wiring / teardown. (Fix: extract sub-steps.) — `#cat-3-complexity-hotspots` (function > 50 lines).

## Technical Debt

- [13] [Low] `scripts/acceptance-tests/lib/adapters/codex.ts:247`: single `TODO(codex-usage)` documenting a known capability gap (Codex usage/cost returns `null`). No other real-source `TODO`/`FIXME`/`HACK`/`XXX` and no clusters found. (Fix: track as an issue ticket.) — `#cat-4-technical-debt` (single isolated TODO).

## Consistency (Docs vs Code)

Major doc claims verified consistent (CLI in external repo; `framework.tar.gz` SHA-256 pinning producer; `deno task check` phases). Minor drift only:

- [14] [Low] `README.md:49,157`: states "Requires Deno v2.x" but `deno.json` has no engine/version constraint and nothing enforces it. (Fix: add a CI/runtime version guard, or soften to a recommendation.) — `#cat-5-consistency-docs-vs-code` (terminology/claim drift).
- [15] [Low] `scripts/check-fr-coverage.ts`: maintained and tested (`check-fr-coverage_test.ts`) but never invoked by `scripts/task-check.ts` (`deno task check`). (Fix: wire into the check plan or confirm it is CI-only.) — `#cat-5-consistency-docs-vs-code`.

## Documentation Coverage

- [16] [Low] Exported public symbols missing JSDoc across primary source: `scripts/build-plugins.ts:146 buildPlugins`, `:268 pluginNameForPack`; `scripts/acceptance-tests/lib/system_health.ts:68,122,170` (`SystemUnhealthyError`/`readHealth`/`describeHealth`); `scripts/acceptance-tests/lib/trace-collector.ts:14 TraceCollector`, `trace.ts:19 TraceLogger`; validators `check-skills.ts:400`, `check-task-format.ts:220`, `check-traceability.ts:232`; `generate-skill-composites.ts:193 parseAtomSource`; plus several distributed `framework/*/skills/*/scripts/*` entry functions. Module-level headers are otherwise generally present. (Fix: add one-line JSDoc per exported symbol, prioritizing distributed scripts.) — `#cat-6-documentation-coverage` (public symbol missing docstring).

## Instruction Coherence

- [17] [High] `framework/AGENTS.md:8-9` ("Names: `flowai-*`") contradicts root `AGENTS.md:75-76,216-217` and the enforced rule `scripts/check-naming-prefix.ts` NP-1 ("must NOT use the retired `flowai-` source prefix"). Actual dirs use no prefix (`framework/core/commands/{commit,push,...}`). The nested file is stale and authoritative-by-location for agents editing `framework/`, so the wrong rule wins. (Fix: update `framework/AGENTS.md:8-9` to the no-prefix convention.) — `#cat-7-instruction-coherence` (two files contradict).
- [18] [Medium] `AGENTS.md:334` ("Run ALL acceptance tests before finishing") vs `AGENTS.md:313,324` ("defer the full sweep to the user; do NOT run the full sweep yourself") — internal contradiction within the root instruction file. (Fix: scope line 334 to changed scenarios, hand the full sweep to the user.) — `#cat-7-instruction-coherence` (duplicate/divergent rule).
- [19] [Medium] Task-file layout: `AGENTS.md:206` says flat `documents/tasks/<YYYY-MM-DD>-<slug>.md` (gitignored), but the repo and `framework/core/assets/AGENTS.template.md` use nested committed `documents/tasks/<YYYY>/<MM>/<slug>.md` (e.g. `documents/tasks/2026/05/`), validated by `check-task-format.ts`. Root is the outlier. (Fix: align root `AGENTS.md` to the nested committed-tasks scheme.) — `#cat-7-instruction-coherence`.
- [20] [Medium] Code-evidence grammar: `AGENTS.md:131-132` treats bare `// FR-<ID>` as valid evidence, while `framework/core/assets/AGENTS.template.md:59,97` states bare `// FR-<ID>` comments are rejected by the SALP validator (must be a SALP REF). (Fix: human decision — align root to whichever validator `deno task check` runs.) — `#cat-7-instruction-coherence`.
- [21] [Low] Ambiguities: `AGENTS.md:3` ("review all project documents … etc." — unbounded set); `AGENTS.template.md:100` ("when automation cost exceeds defect cost" — unquantifiable). (Fix: replace "etc." with "per the Documentation Map"; close the example list.) — `#cat-7-instruction-coherence` (vague rule).

## Tooling Relevance

- [22] [Medium] `.claude/agents/acceptance-test-runner.md:33,36,39`: instructs locating output at `acceptance-tests/<skill>/runs/<scenario-id>/`, `benchmarks/…/runs/…/sandbox`, and `…/scenarios/`. Actual layout (`AGENTS.md:344`, on-disk) is `acceptance-tests/runs/latest/<scenario-id>/run-1/` with co-located scenarios; the `benchmarks/` dir and per-skill `runs/` no longer exist. Following the agent fails. (Fix: update path references to the current layout.) — `#cat-8-tooling-relevance` (stale agent reference).
- [23] [Low] `.codex/agents/` has 2 agents (`acceptance-test-fixer`, `acceptance-test-runner`); `.claude/agents/` has 3 — `session-error-analyzer` has no `.codex/agents/*.toml` counterpart. (Fix: confirm intentional, else regenerate via sync.) — `#cat-8-tooling-relevance`.
- [24] [Low] `.codex/hooks.json:9`: PostToolUse hook runs `deno run -A .claude/scripts/flowai-skill-structure-validate/run.ts` — a sync-generated, gitignored path (source: `framework/devtools/hooks/skill-structure-validate/run.ts`). On a clean checkout without `deno task sync-local`, the hook fails on every Write/Edit. (Fix: confirm sync materializes the path, or repoint to a committed location.) — `#cat-8-tooling-relevance`.

## Documentation Health

GFM cross-links sampled clean (27 cross-references verified, zero broken). No SRS↔SDS contradictions surfaced.

- [25] [Low] `documents/index.md`: 5 SRS FRs have no index row — `FR-DECISION-GATE` (`requirements.md:753`), `FR-UPWARD-NARRATION` (`:760`), `FR-AI-CODE-REVIEW` (`:767`), `FR-DIFF-OPTIONAL` (`:774`), `FR-DOC-ANCHORS.HOOK` (`:1205`). (Fix: add `[REF:fr:…]` rows.) — `#cat-9-documentation-health` (index row drift).
- [26] [Low] `documents/index.md:72`: `FR-MAINT` row summary ("Automated project maintenance via `deno task check` …") and status `[x]` disagree with the SRS `FR-MAINT` block (`requirements.md:753`-region; the maintenance *audit skill*, not `deno task check`). (Fix: rewrite the index summary/status to match the SRS.) — `#cat-9-documentation-health`.
- [27] [Low] Orphan `[x]` FRs: several `[x]` FRs implemented by markdown skills/composites carry no SALP back-reference in source (e.g. `fr:ship` → `framework/composites/ship.md`, `fr:atom-implement`, `fr:cicd`, `fr:doc-tasks`), which `framework/atoms/review.md:172` flags as "missing code marker". May be an intentional exemption for md-skill FRs. (Fix: add a `[REF:fr:<slug>]` marker per primitive, or document the exemption.) — `#cat-9-documentation-health` (orphan FR).

## Architectural Integrity

Clean: no cyclic imports (the `salp-anchor-map.ts → check-traceability.ts` edge is one-directional), no layer leakage (adapters import "up" only to the neutral `usage.ts`; `usage.ts` imports no adapter). See clean-areas note re: the `adapters/mod.ts` re-export + re-import shape (latent TDZ trap if any adapter ever imports the barrel).

## Conceptual Duplication

- [28] [Medium] `scripts/acceptance-tests/lib/adapters/{claude.ts:206-303, codex.ts:203-244, cursor.ts:126-162}` `setupMocks`: the mock-hook-writing scaffold (mkdir, per-tool loop, write `mock-<tool>.sh`, chmod 0o755, serialize hooks JSON) is coded three times, diverging only in payload shape, matcher string, and output filename. (Fix: extract `writeMockHooks(...)` parameterized by a per-IDE config object.) — `#cat-11-conceptual-duplication` (parallel implementations; downgraded one tier — per-IDE divergence is partly essential).
- [29] [Medium] `scripts/acceptance-tests/lib/adapters/{claude.ts:134-195, codex.ts:121-182, cursor.ts:60-114}` `parseOutput`: the NDJSON event-collection loop (split/trim/`JSON.parse`/skip-malformed/collect assistant texts/take last as result) is duplicated; `codex.ts:174` self-documents the coupling ("mimic Claude's vocabulary so downstream judges don't fork"). (Fix: factor a shared `parseNdjsonEvents(stdout)` helper; adapters supply only per-event field extraction.) — `#cat-11-conceptual-duplication`.

## API Contract Review

- [30] [Medium] `scripts/acceptance-tests/lib/adapters/codex.ts:57` `outputFormat = "stream-json"` reuses Claude's literal even though Codex emits a different NDJSON schema (`thread.started`/`item.completed`/`turn.completed`); `format_logs.ts:56` routes on the overloaded tag, which now denotes an "NDJSON-family" tag, not the literal Claude format. (Fix: add a distinct discriminant, e.g. `"codex-jsonl"`, or document the overload.) — `#cat-12-api-contract-review` (capability-vs-impl).
- [31] [Medium] `scripts/acceptance-tests/lib/usage.ts` `calculateSessionUsage`: a missing transcript yields `0` tokens (caller `runner.ts` reports `0`), indistinguishable from a genuine 0-token session; the result also hardcodes `model: "estimated (gemini-3-flash-preview baseline)"` unrelated to the actual run. (Fix: distinguish "no transcript" from "zero usage" at the `collectUsage` boundary; surface real provenance.) — `#cat-12-api-contract-review` (sentinel-vs-missing conflation).
- [32] [Low] `scripts/acceptance-tests/lib/adapters/types.ts:5`: `ide` union includes `"opencode"`, but `adapters/mod.ts:11` `SUPPORTED_IDES` and `createAdapter` omit it (factory `throw`s). Forward-declared (`FR-ACCEPT.OPENCODE` is `[ ]`); the union advertises an unimplemented member and no test asserts union ⊇ list. (Fix: drop `"opencode"` until an adapter lands, or add the `case`.) — `#cat-12-api-contract-review` (dead/unimplemented union member).
- [33] [Low] `scripts/acceptance-tests/lib/adapters/types.ts:55` `cliVersion(): Promise<string>` (impl `version.ts:33,38`) returns `""` as an in-band sentinel for "could not probe" — conflates probe-failure with an empty version string. Documented but fragile. (Fix: `Promise<string | null>`.) — `#cat-12-api-contract-review` (sentinel-vs-missing).

## Cross-Implementation Symmetry

- [34] [Medium] `calculateUsage` parity across adapters: `cursor.ts:164` returns real usage; `claude.ts:305` and `codex.ts:246` return `null`. The interface permits `| null` ("best-effort"), but the omission carries no capability flag, so aggregate cost reports skew silently for Claude/Codex. (Fix: expose an explicit `supportsUsage` capability or surface a one-time "usage unsupported for <ide>" notice.) — `#cat-13-cross-implementation-symmetry` (downgraded one tier — interface documents the null contract).
- [35] [Medium] Mock matcher divergence: `claude.ts:281` uses `matcher: "Bash"` (broad, with in-hook first-word stripping, per its own comment that the prefix matcher is unreliable) while `codex.ts:226` — writing the same Claude-Code-style `hooks.json` schema — uses `matcher: "Bash(${tool}:*)"`, the exact prefix matcher Claude's adapter abandoned. Latent silent-mock-miss for Codex env-prefixed commands. (Fix: reuse Claude's broad-`Bash` + in-hook stripping for Codex, or document why it differs.) — `#cat-13-cross-implementation-symmetry` (reserved/strategy drift between adapters).

## Defensive-Programming Smell

- [36] [Medium] `scripts/acceptance-tests/lib/llm.ts:144-152`: on CLI failure the catch branches purely on whether `JSON.parse(stdout)` throws to pick a `result=…` vs `stdout_len=…` diagnostic — exception-as-control-flow. Diagnostics-only, low blast radius. (Fix: inspect `stdout.trim()` shape explicitly before parsing.) — `#cat-14-defensive-smell` (error-as-decision coupling).
- [37] [Low] `scripts/acceptance-tests/lib/cache.ts:221,229,304,318`: `readCache` collapses missing-file, corrupt-JSON, and schema-mismatch all into `null` ("cache miss") — a corrupt cache is silently indistinguishable from a cold cache. Acceptable for a cache, but undetectable poisoning. (Fix: log/warn on corrupt-but-present cache files.) — `#cat-14-defensive-smell` (wholesale swallow; downgraded — documented cache semantics, not a happy-path sentinel).

## Invariant ↔ Test Pairing

- [38] [Medium] `scripts/build-plugins.ts:39` `DEFAULT_PACKS` lists `[beta, core, deno, devtools, engineering, memex, typescript]` but OMITS `ide-bridge`, which exists on disk as `framework/ide-bridge/pack.yaml` (shippable skills `ai-ide-runner`, `delegate-to-ide` + agent `worker.md`). No test asserts every `framework/*/pack.yaml` ∈ `DEFAULT_PACKS`, so `ide-bridge` silently never builds into a plugin. (Fix: add `Deno.test("DEFAULT_PACKS covers every framework pack dir")` asserting set-equality, then add `ide-bridge` if intended.) — `#cat-15-invariant-test-pairing` (hand-curated list without cross-reference test).
- [39] [Medium] `documents/design.md:150` (SDS §3.1.1): "`-beta` MUST be promoted or removed within 60 days … `maintenance` flags any `-beta` crossing the 60-day threshold." No `Deno.test`/scenario descriptor matches `-beta`/`60-day`; the invariant lives only in skill prose. (Fix: add a `maintenance` acceptance scenario `beta-lifecycle-flags-stale`, or a static check.) — `#cat-15-invariant-test-pairing` (documented invariant without test).
- [40] [Low] `FR-ATOM-PUSH.CI-AWAIT` (`requirements.md:735`, `[ ]`): the 30-iteration timeout-cap branch (the wall-clock safety bound preventing a ~30-min hang) has zero coverage; other branches have scenarios under `framework/core/commands/push/acceptance-tests/`. (Fix: add a `sleep`-shimmed `push-stops-on-ci-timeout` test.) — `#cat-15-invariant-test-pairing` (downgraded — FR is unshipped `[ ]`).

## Public-Surface Quality

- [41] [Low] `scripts/acceptance-tests/lib/adapters/mod.ts:2-4`: barrel re-exports `CursorAdapter`/`ClaudeAdapter`/`CodexAdapter` with zero non-test external consumers — production imports only `createAdapter` + `SUPPORTED_IDES`. (Fix: drop the three class re-exports; let tests import concrete classes directly.) — `#cat-16-public-surface-quality` (barrel re-export of internal-only symbols).
- [42] [Low] `scripts/check-skills.ts:34`: `export { parseFrontmatter } from "./resource-types.ts"` self-labeled "for backward compatibility with tests"; only `check-skills_test.ts:13` uses it — real consumers already import from `resource-types.ts`. (Fix: delete the re-export, update the test import.) — `#cat-16-public-surface-quality`.
- [43] [Low] `scripts/build-claude-plugins.ts:4` and `scripts/validate-claude-plugins.ts:4`: `export *` compatibility shims re-exporting entire renamed modules, with no `.ts`/`.json` importer (deno tasks call the canonical `build-plugins.ts`/`validate-plugins.ts`). (Fix: confirm no downstream caller, then delete the shims.) — `#cat-16-public-surface-quality`.

---

## Summary

Total: 43 findings — Critical: 0, High: 1, Medium: 21, Low: 21.

Critical share: 0% (≤ 35% ceiling satisfied).

Per category:
- Code Hygiene (Cat 2): 4 — 4 Low
- Complexity & Hotspots (Cat 3): 8 — 8 Medium
- Technical Debt (Cat 4): 1 — 1 Low
- Consistency (Docs vs Code) (Cat 5): 2 — 2 Low
- Documentation Coverage (Cat 6): 1 — 1 Low
- Instruction Coherence (Cat 7): 5 — 1 High, 3 Medium, 1 Low
- Tooling Relevance (Cat 8): 3 — 1 Medium, 2 Low
- Documentation Health (Cat 9): 3 — 3 Low
- Conceptual Duplication (Cat 11): 2 — 2 Medium
- API Contract Review (Cat 12): 4 — 2 Medium, 2 Low
- Cross-Implementation Symmetry (Cat 13): 2 — 2 Medium
- Defensive-Programming Smell (Cat 14): 2 — 1 Medium, 1 Low
- Invariant ↔ Test Pairing (Cat 15): 3 — 2 Medium, 1 Low
- Public-Surface Quality (Cat 16): 3 — 3 Low

## Scan areas that came back clean

- **Structural Integrity (Cat 1)**: config files present at expected locations; `framework/atoms/`, `framework/composites/`, `framework/composites.yaml` are intentional generator source (no `pack.yaml` by design); no empty/orphaned dirs; `snake_case`/`_test.ts` filenames are the established convention.
- **Architectural Integrity (Cat 10)**: no cyclic imports, no layer leakage, no reverse dependencies. (Latent note: `adapters/mod.ts` re-exports then re-imports the adapter classes — a TDZ-trap shape if an adapter ever imports the barrel; no cycle today.)
- **Documentation Health cross-links (Cat 9)**: 27 verified GFM cross-references, zero broken; no SRS↔SDS contradictions.
- **Consistency (Cat 5)**: major doc claims (external CLI, `framework.tar.gz` SHA-256 pinning, `deno task check` phase order) verified accurate against code/CI.
- **Test quality (Cat 2)**: no missing-assertion, trivial-assertion, or commented-out tests found.
- **Defensive smell (Cat 14)**: no `||` fallback-on-zero in token-handling paths; empty-catch sites in `utils.ts`/`types.ts` are commented filesystem-probe cases, not callback swallows.

### Verify-gate notes (leads corrected/dropped)

- `[verified false]` `scripts/acceptance-tests/lib/adapters/codex.ts` "calculateUsage swallows silently": the gap is explicitly documented in-code (`TODO(codex-usage)` comment + interface `| null` contract) — restated as a documented capability-parity gap (#34), not a silent swallow.
- `[verified false]` `spawned_agent.ts` `parsedSubtype` "defensive swallow": actually a dead private field (assigned, never read) — reclassified to Code Hygiene (#4), not a Cat 14 swallow.
- `[verified false]` "`opencode` is a dead enum with zero rejection sites": it IS rejected at runtime (`createAdapter` default throw) and is forward-declared by `FR-ACCEPT.OPENCODE` `[ ]` — kept as Low (#32) rather than a removal candidate.
