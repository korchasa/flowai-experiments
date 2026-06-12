# Maintenance Report

Scan mode: full automatic, scan-only. Verification gate applied to every retained finding. No project file was modified except this report.

## [Medium] Finding 1 — Category 3: Complexity & Hotspots

- **Paths and evidence:** `scripts/build-plugins.ts` = 897 lines; `scripts/generate-skill-composites.ts` = 763 lines; `scripts/sync-plugins-local.ts` = 731 lines; `scripts/validate-plugins.ts` = 714 lines; `scripts/acceptance-tests/lib/runner.ts` = 698 lines; `scripts/check-skills.ts` = 651 lines; `scripts/acceptance-tests/lib/trace-renderer.ts` = 520 lines. Measured with `wc -l`; service/framework threshold is 500 lines.
- **Rubric anchor:** `severity-rubric.md#cat-3-complexity-hotspots` — file over threshold, below 2x.
- **Fix:** Split each oversized script by concern: schema/types, filesystem I/O, transformation logic, command-line entrypoint, and report rendering.
- **Rationale:** These files exceed the project-normalized 500-line limit, raising review and regression risk.

## [Medium] Finding 2 — Category 3: Complexity & Hotspots

- **Paths and evidence:** `scripts/acceptance-tests/lib/trace-styles.ts:6` `getCSS` spans 319 lines; `scripts/task-check.ts:22` `buildCheckPlan` spans 144 lines; `scripts/sync-plugins-local.ts:588` `syncCodex` spans 87 lines; `scripts/acceptance-tests/lib/trace-styles.ts:327` `getJS` spans 78 lines; `scripts/build-plugins.ts:732` `emitHooks` spans 69 lines; `scripts/acceptance-tests/lib/acceptance_cli.ts:36` `parseAndValidateArgs` spans 68 lines; `scripts/acceptance-tests/lib/trace-renderer.ts:399` `renderToC` spans 67 lines; `scripts/acceptance-tests/lib/trace-renderer.ts:118` `renderDashboardRows` spans 65 lines; `scripts/build-plugins.ts:427` `emitPrimitives` spans 59 lines.
- **Rubric anchor:** `severity-rubric.md#cat-3-complexity-hotspots` — function over 50 lines.
- **Fix:** Extract static assets from `trace-styles.ts`; split large orchestration functions into named helpers with focused tests.
- **Rationale:** Several functions exceed the 50-line limit, concentrating unrelated branches and making failures harder to localize.

## [Low] Finding 3 — Category 4: Technical Debt

- **Paths and evidence:** `scripts/acceptance-tests/lib/adapters/codex.ts:247` contains `TODO(codex-usage)`; lines 247-253 return `null` usage for Codex while Claude and Cursor return real usage.
- **Rubric anchor:** `severity-rubric.md#cat-4-technical-debt` — single isolated TODO.
- **Fix:** Implement Codex rollout usage parsing or turn the TODO into a tracked SRS/task item with explicit acceptance.
- **Rationale:** Codex cost reporting is knowingly incomplete and can skew aggregate benchmark cost summaries.

## [Medium] Finding 4 — Category 5: Consistency (Docs vs Code)

- **Paths and evidence:** `README.md:80` says "All seven marketplace packs" and lists `beta`, `core`, `deno`, `devtools`, `engineering`, `memex`, `typescript`; `framework/ide-bridge/pack.yaml:1` defines an eighth pack, and `README.md:255-264` documents `ide-bridge`.
- **Rubric anchor:** `severity-rubric.md#cat-5-consistency-docs-vs-code` — docs drift; anti-inflation keeps this below High because implementation exists and the pack is documented later.
- **Fix:** Update the marketplace section and install examples to include `flowai-ide-bridge` or state why the pack is excluded from marketplace publication.
- **Rationale:** Public install guidance contradicts the current pack inventory.

## [High] Finding 5 — Category 7: Instruction Coherence

- **Paths and evidence:** `AGENTS.md:75-76` requires short kebab-case source primitive names without the legacy `flowai-` prefix; `framework/AGENTS.md:8-9` still says command and skill names are `flowai-*` / `flowai-setup-*`; actual paths such as `framework/core/commands/init/SKILL.md` and `framework/ide-bridge/skills/ai-ide-runner/SKILL.md` use short names.
- **Rubric anchor:** `severity-rubric.md#cat-7-instruction-coherence` — contradictory rules in different instruction files.
- **Fix:** Rewrite `framework/AGENTS.md:8-9` to match the short-name convention and keep legacy-prefix references only in migration/cleanup contexts.
- **Rationale:** Agents editing framework primitives can follow the nested instruction file and create names that root policy and validators reject.

## [High] Finding 6 — Category 8: Tooling Relevance

- **Paths and evidence:** `.claude/settings.json:8` and `.codex/hooks.json:9` both run `deno run -A .claude/scripts/flowai-skill-structure-validate/run.ts`; that file does not exist (`test -e` returned 1). The real hook source is `framework/devtools/hooks/skill-structure-validate/run.ts`.
- **Rubric anchor:** `severity-rubric.md#cat-8-tooling-relevance` — hook actively fails because it calls a missing tool/path.
- **Fix:** Regenerate local hook configuration from the current framework install path or remove the stale hook entries from local dev config.
- **Rationale:** Any Write/Edit hook invocation in Claude or Codex will try to execute a missing script.

## [Low] Finding 7 — Category 9: Documentation Health

- **Paths and evidence:** `documents/index.md` has no rows for implemented SRS requirements `FR-DECISION-GATE` (`documents/requirements.md:753-758`), `FR-UPWARD-NARRATION` (`documents/requirements.md:760-765`), `FR-AI-CODE-REVIEW` (`documents/requirements.md:767-772`), and `FR-DIFF-OPTIONAL` (`documents/requirements.md:774-779`). `documents/index.md:49-58` jumps from `FR-DOC-ANCHORS` through task/doc rows and lacks those FR IDs.
- **Rubric anchor:** `severity-rubric.md#cat-9-documentation-health` — index row drift vs SRS.
- **Fix:** Add missing `documents/index.md` rows with matching SALP refs, summaries, and `[x]` status.
- **Rationale:** The navigation index omits current implemented requirements.

## [High] Finding 8 — Category 12: API Contract Review

- **Paths and evidence:** `scripts/acceptance-tests/lib/adapters/types.ts:5` declares `AgentAdapter.ide` can be `"opencode"`, but `scripts/acceptance-tests/lib/adapters/mod.ts:11-25` registers only `cursor`, `claude`, and `codex`; `documents/requirements.md:244-250` tracks `FR-ACCEPT.OPENCODE` as open and says no `opencode.ts` / `opencode_test.ts` exists.
- **Rubric anchor:** `severity-rubric.md#cat-12-api-contract-review` — capability-vs-implementation mismatch.
- **Fix:** Either implement and register `OpencodeAdapter`, or remove `"opencode"` from the runtime adapter contract until the open FR is implemented.
- **Rationale:** The type-level contract advertises a runtime adapter that the factory cannot create.

## [High] Finding 9 — Category 15: Invariant ↔ Test Pairing

- **Paths and evidence:** `AGENTS.md:416` requires `deno.json` `lint.exclude`, `deno.json` `fmt.exclude`, and `scripts/task-check.ts` `--ignore` to list the same acceptance-test paths; current values differ at `deno.json:31-49` and `scripts/task-check.ts:100-110`. `scripts/task-check_test.ts:70-92` only checks that broad phases exist, with no descriptor asserting exclude/ignore parity.
- **Rubric anchor:** `severity-rubric.md#cat-15-invariant-test-pairing` — documented invariant with no matching test descriptor.
- **Fix:** Add a unit test that extracts and normalizes the three lists, then either make them equal or rewrite the invariant to state the intentional differences.
- **Rationale:** A documented maintenance invariant is both untested and currently drifting.

## [Medium] Finding 10 — Category 16: Public-Surface Quality

- **Paths and evidence:** `documents/design.md:410` says compatibility wrappers `scripts/build-claude-plugins.ts` and `scripts/validate-claude-plugins.ts` exist for "one transition release"; `deno.json:2` is now version `0.13.9`; the wrappers still re-export public surfaces at `scripts/build-claude-plugins.ts:4` and `scripts/validate-claude-plugins.ts:4`.
- **Rubric anchor:** `severity-rubric.md#cat-16-public-surface-quality` — redundant public surface / compatibility alias.
- **Fix:** Remove the wrappers and stale documentation, or document a renewed compatibility window with tests proving current callers still need them.
- **Rationale:** The legacy public entrypoints remain after the documented transition window, increasing API surface and stale docs.

## [Low] Finding 11 — Category 6: Documentation Coverage

- **Paths and evidence:** Exported symbols missing immediate responsibility comments include `scripts/build-plugins.ts:38` `DEFAULT_MARKETPLACE_NAME`, `scripts/build-plugins.ts:39` `DEFAULT_PACKS`, `scripts/build-plugins.ts:98` `ModelTier`, `scripts/build-plugins.ts:100` `resolveModelTier`, `scripts/build-plugins.ts:120` `BuildOptions`, `scripts/build-plugins.ts:133` `PluginPackArtifact`, `scripts/build-plugins.ts:146` `buildPlugins`, `scripts/generate-skill-composites.ts:22` `MANIFEST_PATH`, `scripts/generate-skill-composites.ts:193` `parseAtomSource`, and `scripts/check-skills.ts:400` `collectDocumentationSchemaIndirectionErrors`.
- **Rubric anchor:** `severity-rubric.md#cat-6-documentation-coverage` — public symbol missing docstring.
- **Fix:** Add concise JSDoc to exported constants, types, and functions that are imported by tests or other modules.
- **Rationale:** Public TypeScript surface lacks responsibility comments required by the maintenance workflow.

## Summary

- **Total:** 11 findings — Critical: 0, High: 4, Medium: 4, Low: 3.
- **Per category:** Category 3 Complexity & Hotspots: 2; Category 4 Technical Debt: 1; Category 5 Consistency (Docs vs Code): 1; Category 6 Documentation Coverage: 1; Category 7 Instruction Coherence: 1; Category 8 Tooling Relevance: 1; Category 9 Documentation Health: 1; Category 12 API Contract Review: 1; Category 15 Invariant ↔ Test Pairing: 1; Category 16 Public-Surface Quality: 1.
- **Clean scan areas:** Category 1 Structural Integrity; Category 2 Code Hygiene & Dependencies; Category 10 Architectural Integrity; Category 11 Conceptual Duplication; Category 13 Cross-Implementation Symmetry; Category 14 Defensive-Programming Smell.
- **Verification notes:** `deno run -A scripts/check-traceability.ts`, `deno run -A scripts/check-srs-evidence.ts`, and `deno run -A scripts/check-salp.ts` completed without reported broken references; no empty non-git directories were found.
