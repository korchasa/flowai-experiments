# Maintenance Report

Scope: read-only maintenance audit of all 16 pinned categories. Primary stack: TypeScript/Deno framework repository. Complexity threshold selected: 500 lines, based on the project being an "Assisted Engineering framework" using TypeScript and Deno.

## [1] [Medium] Category 3 — Complexity & Hotspots

- Evidence: `scripts/build-plugins.ts` 897 lines, `scripts/generate-skill-composites.ts` 763, `scripts/sync-plugins-local.ts` 731, `scripts/validate-plugins.ts` 714, `scripts/acceptance-tests/lib/runner.ts` 698, `scripts/check-skills.ts` 651, `scripts/acceptance-tests/lib/trace-renderer.ts` 520.
- Rationale: production source files exceed the 500-line service/framework threshold by 1.04x-1.79x.
- Fix: split each file by responsibility: marketplace/build emission, composite parsing/rendering, IDE sync, validation, runner sandbox/execution/scoring, skill-rule traversal, and trace HTML rendering.

## [2] [Medium] Category 3 — Complexity & Hotspots

- Evidence: long functions: `scripts/build-plugins.ts:272` `buildPack` 82 lines; `scripts/generate-skill-composites.ts:423` `renderCompositeTarget` 111; `scripts/acceptance-tests/lib/runner.ts:550` `runScenario` 86; `scripts/check-skills.ts:456` `validateSkill` 76; `scripts/check-task-format.ts:90` `validateNewShapeTask` 129; `scripts/acceptance-tests/lib/spawned_agent.ts:280` `monitorProcess` 186.
- Rationale: functions exceed the 50-line threshold and combine orchestration, parsing, validation, and reporting logic.
- Fix: extract smaller phase functions with one responsibility each.

## [3] [Medium] Category 3 — Complexity & Hotspots

- Evidence: `scripts/acceptance-tests/lib/trace-styles.ts:6` `getCSS` spans 319 lines; `scripts/acceptance-tests/lib/trace-styles.ts:327` `getJS` spans 78 lines.
- Rationale: large static browser assets are embedded as TypeScript functions, inflating source complexity and review cost.
- Fix: move static CSS/JavaScript into assets or split into named template sections.

## [4] [Low] Category 4 — Technical Debt

- Evidence: `scripts/acceptance-tests/lib/adapters/codex.ts:247-253` has `TODO(codex-usage)` and returns `null` for Codex usage while noting skewed aggregate cost reports.
- Rationale: single TODO, but it documents a real known capability gap.
- Fix: implement Codex session usage parsing or return a typed unavailable usage result.

## [5] [High] Category 5 — Consistency (Docs vs Code)

- Evidence: `README.md:179` documents agents as `framework/<pack>/agents/<name>/SUBAGENT.md`; `documents/design.md:208` says agents are `.md` files directly under `framework/<pack>/agents/`.
- Rationale: public README path contradicts the implemented agent file layout.
- Fix: update README to `framework/<pack>/agents/<name>.md`.

## [6] [Medium] Category 5 — Consistency (Docs vs Code)

- Evidence: `README.md:396-404` project tree lists `core`, `engineering`, `devtools`, `deno`, `typescript`; existing packs also include `beta`, `ide-bridge`, and `memex`, documented elsewhere at `README.md:255`, `README.md:294`, and `documents/design.md:139`.
- Rationale: public project structure omits live packs.
- Fix: add `beta`, `ide-bridge`, and `memex` to the README tree.

## [7] [High] Category 5 — Consistency (Docs vs Code)

- Evidence: `documents/acceptance-testing.md:52-63` says benchmark adapters support Cursor and Claude Code only; `scripts/acceptance-tests/lib/adapters/mod.ts:11` supports `cursor`, `claude`, `codex`; `acceptance-tests/config.json:20-27` configures Codex.
- Rationale: acceptance-testing docs omit a supported adapter and mislead runner users.
- Fix: document Codex support and note OpenCode as pending.

## [8] [High] Category 5 — Consistency (Docs vs Code)

- Evidence: `framework/memex/assets/AGENTS.md:88-94` labels the section `source-summary` but sets `type: source`; `framework/memex/skills/save/acceptance-tests/new/mod.ts:50-52` expects `type: source-summary`.
- Rationale: memex schema and acceptance checklist disagree on the required frontmatter value.
- Fix: choose one canonical type and update schema, skill expectations, tests, and fixtures.

## [9] [Low] Category 6 — Documentation Coverage

- Evidence: exported public symbols without local responsibility comments include `scripts/build-plugins.ts:38`, `:39`, `:98`, `:100`, `:120`, `:133`, `:146`, `:178`, `:268`; `scripts/generate-skill-composites.ts:22`, `:193`; `scripts/validate-plugins.ts:115`, `:138`, `:169`, `:182`, `:215`, `:221`, `:234`; `scripts/check-task-format.ts:27`, `:29`, `:35`, `:53`, `:220`.
- Rationale: public exports lack JSDoc despite the category rule requiring documentation for exported functions/types.
- Fix: add concise responsibility and contract comments to exported symbols.

## [10] [Low] Category 6 — Documentation Coverage

- Evidence: first meaningful line is not a file-responsibility comment in `framework/devtools/hooks/skill-structure-validate/run.ts:1`, `framework/memex/hooks/status/run.ts:1`, `scripts/build-plugins.ts:1`, `scripts/task-check.ts:1`, `scripts/utils.ts:1`, `scripts/sync-plugins-local.ts:1`, `scripts/validate-plugins.ts:1`, `scripts/task-test.ts:1`.
- Rationale: module-level responsibilities are not stated at file entry points.
- Fix: add short top-of-file docblocks.

## [11] [High] Category 7 — Instruction Coherence

- Evidence: `AGENTS.md:75-76` requires short names without `flowai-`; `framework/AGENTS.md:8-9` still requires `flowai-*` names.
- Rationale: mutually exclusive naming instructions can send future primitive edits in opposite directions.
- Fix: keep short-name rule and update `framework/AGENTS.md`.

## [12] [High] Category 7 — Instruction Coherence

- Evidence: `AGENTS.md:93` names task files as `documents/tasks/<YYYY-MM-DD>-<slug>.md`; `AGENTS.md:204-207` repeats the flat format; `documents/requirements.md:1241-1244` requires `documents/tasks/<YYYY>/<MM>/<slug>.md`.
- Rationale: task placement instructions conflict inside the project canon.
- Fix: update root task rules to the committed nested date layout.

## [13] [Medium] Category 7 — Instruction Coherence

- Evidence: SRS scope at `documents/requirements.md:6` lists Cursor, Claude Code, OpenCode but omits OpenAI Codex; `AGENTS.md:40` and `README.md:154` include OpenAI Codex.
- Rationale: audience/scope statements disagree across source-of-truth docs.
- Fix: update SRS scope or explicitly mark it historical.

## [14] [High] Category 7 — Instruction Coherence

- Evidence: `README.md:80` says all seven packs are published as native plugins; `README.md:106` says `flowai-beta` is inert on Codex; `documents/design.md:426` says hook-only `beta` emits no Codex manifest.
- Rationale: plugin install guidance overstates Codex pack availability.
- Fix: state that Claude Code receives seven packs while Codex receives only packs with skills.

## [15] [High] Category 7 — Instruction Coherence

- Evidence: `README.md:118` says Codex hooks use `[features].plugin_hooks`; `documents/design.md:398` still says `codex_hooks` and `.flowai.yaml experimental.codexHooks`; `documents/requirements.md:1213` says the flag was renamed.
- Rationale: feature flag instructions contradict each other.
- Fix: update SDS to the current feature flag and remove stale `.flowai.yaml` wording.

## [16] [High] Category 7 — Instruction Coherence

- Evidence: `README.md:191` and `README.md:469` say `.claude/skills/` and `.claude/agents/` are tracked; `documents/design.md:122` says they are gitignored; `.gitignore:19-23` ignores only generated `flowai-*` and selected artifacts.
- Rationale: dev-resource ownership rules conflict.
- Fix: document tracked dev-only resources and ignored generated framework resources separately.

## [17] [High] Category 8 — Tooling Relevance

- Evidence: `.claude/settings.json:6-8` invokes `.claude/scripts/flowai-skill-structure-validate/run.ts`; `find .claude -maxdepth 4 -type f` shows no `.claude/scripts/`.
- Rationale: the active hook points at a missing script and will fail when triggered.
- Fix: restore/sync the script or update the hook command to the real path.

## [18] [Medium] Category 8 — Tooling Relevance

- Evidence: `.claude/agents/acceptance-test-runner.md:33-41` references legacy paths `acceptance-tests/<skill>/runs/...` and `benchmarks/...`; current scenarios live under `framework/.../acceptance-tests/`.
- Rationale: the installed runner agent guides users to stale run and fixture paths.
- Fix: update the agent to current acceptance-test output paths.

## [19] [Medium] Category 8 — Tooling Relevance

- Evidence: `.claude/skills/acceptance-tests-all/SKILL.md:29-45` discovers only `framework/*/skills/*/acceptance-tests/**/mod.ts`; repository has 235 skill scenarios, 59 command scenarios, and 9 pack-level scenarios.
- Rationale: a skill named "all framework acceptance tests" omits command, agent, and pack-level surfaces in parallel mode.
- Fix: discover all supported acceptance-test placements.

## [20] [Medium] Category 8 — Tooling Relevance

- Evidence: `.claude/skills/session-history-analyzer/scripts/list_sessions.py` is a Python script in installed dev tooling; `AGENTS.md` declares Python is for benchmark fixtures only.
- Rationale: installed tooling violates the declared stack unless dev-tool Python is explicitly allowed.
- Fix: document a dev-tool exception or port the helper to Deno/TypeScript.

## [21] [High] Category 9 — Documentation Health

- Evidence: `documents/requirements.md:1285-1287` and `framework/core/skills/maintenance/references/scan-buckets.md:111-113` still define Documentation Health in terms of GFM links and GFM orphan FRs; `documents/requirements.md:1188-1202` declares SALP the canonical grammar and rejects GFM FR links.
- Rationale: completed FR-DOC-LINT points maintenance at a superseded cross-reference grammar.
- Fix: rewrite FR-DOC-LINT and maintenance scan-bucket text to SALP `ANC`/`REF`.

## [22] [High] Category 9 — Documentation Health

- Evidence: `documents/requirements.md:1233-1235` says `documents/index.md` rows are GFM links like `[FR-XYZ](requirements.md#...)`; `documents/index.md:7-108` uses SALP `[REF:fr:...]`.
- Rationale: FR-DOC-INDEX describes an obsolete row format while the artifact uses the new one.
- Fix: update FR-DOC-INDEX description and scenario to SALP.

## [23] [Low] Category 9 — Documentation Health

- Evidence: `documents/index.md:50-52` marks `FR-DOC-LINKS` and `FR-DOC-IDS` as `[x]`; `documents/requirements.md:1217-1229` marks both as `[~] Superseded`.
- Rationale: documentation index status disagrees with SRS.
- Fix: update index rows to superseded or define a status mapping for superseded FRs.

## [24] [Low] Category 9 — Documentation Health

- Evidence: `scripts/generate-skill-composites.ts:8-12` says `--check` diff-compares regenerated SKILL.md with disk; `scripts/generate-skill-composites.ts:745-752` says on-disk drift is meaningless and `--check` only validates render plus `.gitignore`.
- Rationale: file header documents obsolete behavior.
- Fix: update the top comment to match current build-artifact behavior.

## [25] [Medium] Category 9 — Documentation Health

- Evidence: `documents/requirements.md:1202` grep guard excludes `acceptance-tests/runs` and cache but not fixtures; `git grep -nE '\[\[[a-z0-9-]+(\|[^]]+)?\]\]' -- framework/ ...` returns many fixture hits under `framework/memex/.../acceptance-tests/.../fixture`; `scripts/check-salp.ts --enforce-no-legacy` also reports fixture/example legacy grammar while the normal validator intentionally skips fixtures.
- Rationale: documented acceptance command fails on known fixture examples rather than the intended target surface.
- Fix: add fixture exclusions or replace the grep guard with `check-salp.ts` semantics.

## [26] [Medium] Category 10 — Architectural Integrity

- Evidence: `scripts/lib/salp-anchor-map.ts:19` imports `computeAutoSlug` from `scripts/check-traceability.ts:57`; `AGENTS.md:117` and `documents/design.md:636-642` treat `scripts/check-*.ts` as validators and `scripts/lib/*` as reusable infrastructure.
- Rationale: library code depends on a top-level validator module, reversing the intended utility direction.
- Fix: move `computeAutoSlug` into `scripts/lib/` and import it from both consumers.

## [27] [High] Category 11 — Conceptual Duplication

- Evidence: agent frontmatter shape is declared in `scripts/resource-types.ts:53-67`, `scripts/acceptance-tests/lib/cli-internals.ts:27-78`, and filtered again in `scripts/build-plugins.ts:700-717`.
- Rationale: one schema decision is implemented three times across validation, acceptance sandbox transformation, and plugin output.
- Fix: derive IDE field maps from one shared schema/source.

## [28] [Medium] Category 11 — Conceptual Duplication

- Evidence: model-tier mapping exists in `scripts/acceptance-tests/lib/cli-internals.ts:80-88` and separately in `scripts/build-plugins.ts:100-105`.
- Rationale: model tier semantics can drift between acceptance transformations and plugin build output.
- Fix: share a model-tier resolver or explicitly test the intended divergence.

## [29] [Medium] Category 11 — Conceptual Duplication

- Evidence: SALP context stripping exists in both `scripts/check-salp.ts:86-134` and `framework/beta/hooks/doc-anchors-validate/run.ts:196-226`; parser duplication in the hook is documented as single-file distribution at `framework/beta/hooks/doc-anchors-validate/run.ts:25-28`.
- Rationale: even with the accepted single-file hook exception, stripping behavior can drift between dev validator and distributed hook.
- Fix: generate the hook from shared parser/stripper code or add parity tests.

## [30] [High] Category 12 — API Contract Review

- Evidence: `scripts/acceptance-tests/lib/adapters/types.ts:5` includes `"opencode"` in `AgentAdapter.ide`; `scripts/acceptance-tests/lib/adapters/mod.ts:11-27` supports only `cursor`, `claude`, and `codex`; no `scripts/acceptance-tests/lib/adapters/opencode.ts` exists.
- Rationale: exported type advertises an adapter capability the factory cannot construct.
- Fix: remove `"opencode"` until implemented or add `OpenCodeAdapter` and register it.

## [31] [High] Category 12 — API Contract Review

- Evidence: `scripts/acceptance-tests/lib/types.ts:78` and `:85` allow numeric `maxSteps` and `stepTimeoutMs`; `scripts/acceptance-tests/lib/runner.ts:288-289` and `scripts/acceptance-tests/lib/spawned_agent.ts:97-98` use `||`, so `0` becomes a default.
- Rationale: type permits a value whose runtime meaning is silently changed.
- Fix: use `??` plus explicit range validation.

## [32] [High] Category 12 — API Contract Review

- Evidence: `scripts/acceptance-tests/lib/usage.ts:4-16` defines `SessionUsage`; `scripts/acceptance-tests/lib/adapters/types.ts:45-46` returns `SessionUsage | null`; `scripts/acceptance-tests/lib/adapters/claude.ts:305-308` and `codex.ts:246-253` return `null`, while `cursor.ts:164-165` returns an estimate.
- Rationale: the contract conflates actual usage, estimated usage, unavailable usage, and implementation gaps.
- Fix: return a discriminated result such as `actual | estimated | unavailable`.

## [33] [High] Category 13 — Cross-Implementation Symmetry

- Evidence: mock setup diverges across `scripts/acceptance-tests/lib/adapters/claude.ts:211-275`, `codex.ts:188-243`, and `cursor.ts:117-161`; Codex comments say hooks do nothing when the feature is off at `codex.ts:195-197`.
- Rationale: the same mock contract is not equally enforced across adapters.
- Fix: define a shared mock contract and fail diagnostically when an IDE cannot guarantee it.

## [34] [High] Category 13 — Cross-Implementation Symmetry

- Evidence: parse errors are silently skipped in `scripts/acceptance-tests/lib/adapters/claude.ts:148-152`, `codex.ts:134-139`, and `cursor.ts:89-110`, each with different behavior.
- Rationale: malformed output handling is not symmetric and has no common warning channel.
- Fix: add parse warnings or typed parse status to `ParsedAgentOutput`.

## [35] [High] Category 13 — Cross-Implementation Symmetry

- Evidence: usage differs across `scripts/acceptance-tests/lib/adapters/claude.ts:305-308`, `codex.ts:246-253`, and `cursor.ts:164-165`.
- Rationale: aggregate benchmark reports compare unavailable data with estimates under the same nullable contract.
- Fix: use shared typed usage status and aggregate only compatible kinds.

## [36] [Medium] Category 13 — Cross-Implementation Symmetry

- Evidence: `scripts/acceptance-tests/lib/cli-internals.ts:45-61` and `:115-148` transform agent frontmatter for four IDEs; `scripts/build-plugins.ts:670-717` applies a Claude-only subset.
- Rationale: acceptance sandbox transformation and product plugin output can drift silently.
- Fix: share target-IDE transformation logic or add explicit parity tests.

## [37] [High] Category 14 — Defensive-Programming Smell

- Evidence: `scripts/acceptance-tests/lib/runner.ts:141-151` catches non-`NotFound` failures from `copyFrameworkToIdeDir`, logs a warning, and continues.
- Rationale: acceptance scenarios can run with a partial framework install, producing misleading failures.
- Fix: fail setup with a typed error unless the failure is explicitly recoverable.

## [38] [Critical] Category 14 — Defensive-Programming Smell

- Evidence: `scripts/acceptance-tests/lib/runner.ts:403-409` catches `git diff` failure and replaces evidence with the happy sentinel string `"(git diff failed)"`.
- Rationale: the judge receives an evidence block that hides why diff evidence is missing.
- Fix: preserve stderr/status in typed evidence or abort the scenario.

## [39] [Medium] Category 14 — Defensive-Programming Smell

- Evidence: `scripts/acceptance-tests/lib/adapters/version.ts:17-40` returns `""` for missing binary, timeout, non-zero exit, and kill errors.
- Rationale: multiple operationally distinct failures collapse into one sentinel in cache-key logic.
- Fix: return `{ ok: false, reason }` or log structured diagnostics.

## [40] [Medium] Category 14 — Defensive-Programming Smell

- Evidence: `scripts/acceptance-tests/lib/usage.ts:30-47` catches any Cursor project-dir read error, logs it, and returns `null`; `calculateSessionUsage` treats null as transcript not found at `usage.ts:57-58`.
- Rationale: unavailable directory and missing session are conflated.
- Fix: return typed `unavailable` versus `not_found`.

## [41] [High] Category 15 — Invariant ↔ Test Pairing

- Evidence: `documents/requirements.md:737` and `documents/design.md:664` explicitly defer `push-stops-on-ci-timeout`; grep finds no test with that descriptor.
- Rationale: the CI-await timeout branch is a documented behavior without a matching scenario.
- Fix: add a sleep-shim scenario or mark it as manual acceptance with owner.

## [42] [High] Category 15 — Invariant ↔ Test Pairing

- Evidence: `documents/design.md:150` requires `-beta` primitives to be promoted/removed within 60 days and to have coverage parity; grep finds tests for `flowai-beta` packaging but no age/parity enforcement.
- Rationale: lifecycle invariant has no deterministic check.
- Fix: add a maintenance/check script or benchmark that verifies beta age and scenario parity.

## [43] [High] Category 15 — Invariant ↔ Test Pairing

- Evidence: `documents/requirements.md:1214` leaves flowai-cli cross-IDE hook install acceptance as `manual — korchasa (pending external PR)`.
- Rationale: a documented hook-install contract remains manually gated.
- Fix: replace with an automated test once the external CLI path is available, or keep the FR pending.

## [44] [Medium] Category 15 — Invariant ↔ Test Pairing

- Evidence: `scripts/build-plugins.ts:39-45`, `documents/design.md:426`, and `README.md:80` each describe the pack list; no test asserts `DEFAULT_PACKS` matches framework pack dirs and README/catalog docs.
- Rationale: hand-curated pack lists can drift silently.
- Fix: add a cross-reference test for `DEFAULT_PACKS`, framework dirs, and public pack docs.

## [45] [High] Category 15 — Invariant ↔ Test Pairing

- Evidence: `documents/requirements.md:854-862` claims all 17 scripts satisfy structured output, diagnostics, idempotence, and error clarity; no inventory test named or found for this 17-script contract.
- Rationale: broad `[x]` script invariant lacks a matching systematic test.
- Fix: add a script-contract inventory test.

## [46] [Medium] Category 16 — Public-Surface Quality

- Evidence: `scripts/build-claude-plugins.ts:4` and `scripts/validate-claude-plugins.ts:4` re-export new modules through compatibility wrappers; `scripts/build-plugins.ts:178` also exports `buildClaudePlugins = buildPlugins`.
- Rationale: legacy public aliases remain with no current TypeScript consumers found.
- Fix: narrow wrappers to CLI execution or deprecate/remove the aliases.

## [47] [Medium] Category 16 — Public-Surface Quality

- Evidence: `scripts/acceptance-tests/lib/adapters/mod.ts:1-4` re-exports concrete adapter classes while `mod.ts:11-15` exposes `SUPPORTED_IDES` and `createAdapter`; current tests import classes directly from concrete files.
- Rationale: barrel exposes internal concrete classes beyond the factory surface.
- Fix: keep `createAdapter` plus types as the barrel API, and import classes directly where needed.

## [48] [Medium] Category 16 — Public-Surface Quality

- Evidence: `scripts/check-salp.ts` argument handling filters positional values by `!a.startsWith("--")`; `scripts/migrate-to-salp.ts:268-270` does the same; stricter parsers reject unknown flags in `scripts/sync-plugins-local.ts:681-710` and `scripts/acceptance-tests/lib/acceptance_cli.ts:63-99`.
- Rationale: public script surface silently ignores unknown `--...` options.
- Fix: add explicit allowed flag sets and reject unknown options.

## Verified False / Dropped Leads

- [verified false] Category 2 `jsr:` imports in framework pack scripts: although plain `deno lint` flags them, `documents/design.md:151-154` requires pack scripts to use standalone `jsr:` imports, and `scripts/task-check.ts` excludes the relevant lint rules for `framework/`.
- [verified false] Category 10 SALP parser copy in `framework/beta/hooks/doc-anchors-validate/run.ts`: `run.ts:25-28` documents the single-file distribution exception; kept only the parity-risk part as finding [29].
- [verified false] Category 14 `options.judgeClient || evaluateChecklist` at `scripts/acceptance-tests/lib/runner.ts:554`: the declared type is a function, so this is not a valid zero/empty-string fallback trap.

## Summary

- Total: 48 findings — Critical: 1, High: 24, Medium: 21, Low: 2.
- Per category: Category 1 Structural Integrity: 0; Category 2 Code Hygiene: 0; Category 3 Complexity & Hotspots: 3; Category 4 Technical Debt: 1; Category 5 Consistency (Docs vs Code): 4; Category 6 Documentation Coverage: 2; Category 7 Instruction Coherence: 6; Category 8 Tooling Relevance: 4; Category 9 Documentation Health: 5; Category 10 Architectural Integrity: 1; Category 11 Conceptual Duplication: 3; Category 12 API Contract Review: 3; Category 13 Cross-Implementation Symmetry: 4; Category 14 Defensive-Programming Smell: 4; Category 15 Invariant ↔ Test Pairing: 5; Category 16 Public-Surface Quality: 3.
- Clean scan areas: structural file placement after dropping undocumented `.agents`/`.codex` lead; dead directories; unused import/export evidence; trivial/no-assertion tests in primary tests; broken code-comment doc links (`check-traceability.ts` clean); SRS/SDS evidence claims (`check-srs-evidence.ts` clean); trigger benchmark coverage (`check-trigger-coverage.ts` clean); default SALP validator run (`check-salp.ts` clean in non-enforcement mode).
