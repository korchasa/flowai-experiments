# Maintenance Audit Report

- **Repository:** flowai (framework repo), audited at commit `d28b590f`
- **Date:** 2026-06-11
- **Scope:** all 16 maintenance categories, scanned via 5 parallel read-only worker buckets (W1–W5), then ground-truthed one-by-one through the parent Verify gate. Severity per `severity-rubric.md` with the anti-inflation tie-breaker (ties → lower tier).
- **Complexity LOC bucket:** service/framework/tool (default) → **500 lines** (AGENTS.md: "Assisted Engineering framework", Deno task scripts).
- Fixture content under `acceptance-tests/*/fixture/` excluded by design; generated SKILL.md build artifacts excluded per `framework/composites.yaml`.

---

## Category 1 — Structural Integrity

- [1] [Low] `scripts/acceptance-tests/lib/`: one directory mixes snake_case (majority: `spawned_agent.ts`, `process_watchdog.ts`, …) and kebab-case (`trace-collector.ts`, `trace-renderer.ts`, `trace-styles.ts`, `trace-types.ts`, `cli-internals.ts`) module names with no rule. (Fix: pick snake_case, rename the 5 kebab-case files, update imports)
- [2] [Low] `scripts/maintenance_scan_buckets_test.ts`: only snake_case file at `scripts/` top level; all ~46 siblings are kebab-case (`check-skills_test.ts`, …). (Fix: rename to `maintenance-scan-buckets_test.ts`)
- [3] [Low] `scripts/acceptance-tests/lib/config_test.ts:2`: file named `config_test.ts` but no `config.ts` exists — it tests `getIdeConfig`/`loadConfig` from `./llm.ts` (which has no `llm_test.ts`). (Fix: rename to `llm_test.ts`)
- [4] [Low] `framework/core/commands/init/scripts/generate_agents.test.ts`: uses `.test.ts` suffix while the repo convention is Deno-style `_test.ts`. (Fix: rename to `generate_agents_test.ts`)
- [5] [Low] `scripts/detect-ide-env.sh`: one-off diagnostic script with zero references from tasks, CI, docs, or code (verified: only hit is the file itself). (Fix: delete or document)
- [6] [Low] `deno.json:33-40` vs `deno.json:42-52`: `lint.exclude` skips entire `framework/*/{skills,commands,agents}/*/acceptance-tests/` trees while `fmt.exclude` skips only `*/fixture/` — scenario `mod.ts` files are formatted but never linted. (Fix: narrow lint exclude to `*/fixture/`, or document the exemption)

## Category 2 — Code Hygiene

- [7] [High] `scripts/acceptance-tests/lib/spawned_agent_test.ts:250` `"SpawnedAgent - Error Handling (Invalid Command)"`: test has zero assertions — `try { await agent.run(); } catch (_e) { /* Expect some kind of error */ }` passes regardless of behavior (verified by reading the body). False safety. (Fix: assert a concrete observable — rejection or non-zero exit — or delete)
- [8] [Medium] `scripts/utils.ts:195` `moveFileWithCleanup`: exported async function with zero callers and zero test references anywhere in non-fixture code (verified by grep). (Fix: delete)
- [9] [Medium] `scripts/build-plugins.ts:178` `export const buildClaudePlugins = buildPlugins;` + `scripts/build-claude-plugins.ts` + `scripts/validate-claude-plugins.ts`: compatibility wrappers that `documents/design.md:410` says exist "for one transition release" are still shipping at 0.13.9 with zero references from `deno.json` tasks, CI, or code (verified). Temporary fix became permanent. (Fix: delete alias + both wrappers; update design.md:410)
- [10] [Low] Over-export pattern: `scripts/lib/salp-anchor-map.ts:41,64` (`extractFrAnchors`, `extractSdsAnchors` — verified consumed only by `buildAnchorMap` in the same file), plus ~15–20 similar internally-only exported symbols across `check-pack-refs.ts`, `generate-skill-composites.ts`, `check-skills.ts`, `check-fr-coverage.ts`, `cache.ts`, `process_watchdog.ts`. (Fix: one mechanical sweep dropping `export` from internal-only symbols)

## Category 3 — Complexity & Hotspots

(LOC bucket: 500-line default — service/framework/tool per AGENTS.md vision.)

- [11] [High] `scripts/build-plugins_test.ts`: 1205 LOC — 2.4× the 500-line bucket (recounted). (Fix: split per emit phase — marketplace, manifest, primitives, hooks)
- [12] [High] `scripts/build-plugins.ts`: 897 LOC (1.8×) AND ~8 distinct concerns in one file — model-tier resolution (:100), two marketplace emitters (:180/:211), pack building (:272), skill markdown transform (:512), agent frontmatter transform (:703), hooks emission (:732), license reading (:802), CLI flag parsing (:878). God module. (Fix: extract transform layer + per-target emitters into `scripts/lib/plugins/`; keep an orchestrator)
- [13] [High] `scripts/sync-plugins-local.ts`: 731 LOC (1.5×) AND 5+ unrelated concerns — dotenv parsing (:25), Codex TOML rewriting (:183), generic process-exec helpers (:253-298), `syncClaude` (:537), `syncCodex` (:588), CLI parsing (:681) (symbols verified). (Fix: split into sync-claude/sync-codex modules; move exec helpers next to `scripts/utils.ts`)
- [14] [Medium] `scripts/generate-skill-composites.ts`: 763 LOC (1.5×, recounted). (Fix: extract atom parsing and rendering into `scripts/lib/`)
- [15] [Medium] `scripts/validate-plugins.ts`: 714 LOC (1.4×, recounted). (Fix: split Claude vs Codex validators sharing the zod schemas)
- [16] [Medium] `scripts/acceptance-tests/lib/runner.ts`: 698 LOC (1.4×, recounted). (Fix: extract sandbox preparation and artifact collection)
- [17] [Medium] Five more files over the 500-line bucket by 1.04–1.36× (all recounted): `scripts/check-skills_test.ts` (681), `scripts/check-skills.ts` (651), `scripts/acceptance-tests/lib/cache_test.ts` (608), `framework/devtools/skills/engineer-rule/scripts/rule_scripts_test.ts` (547), `scripts/acceptance-tests/lib/trace-renderer.ts` (520). (Fix: split along existing internal seams)
- [18] [Medium] Functions over the 50-line threshold — verified examples: `trace-styles.ts:6` `getCSS` (319 lines, mostly a CSS template literal), `framework/devtools/skills/engineer-skill/scripts/validate_skill.ts:9` `validateSkill` (153), `scripts/task-check.ts:22` `buildCheckPlan` (144), `framework/core/commands/init/scripts/generate_agents.ts:124` `analyzeProject` (142); plus ~10 more measured at 2×+ (`judge.ts:evaluateChecklist` 135, `format_logs.ts:formatAgentLogs` 135, `check-task-format.ts:validateNewShapeTask` 129, `system_health.ts:readHealth` 123, …). (Fix: decompose along internal phase comments; move `getCSS` body to a static asset)

## Category 4 — Technical Debt

- [19] [Low] `scripts/acceptance-tests/lib/adapters/codex.ts:247` `TODO(codex-usage)`: the only real TODO in non-fixture sources — `calculateUsage` stub returning `null`, self-described "known capability gap that skews aggregate cost reports" (verified). (Fix: implement the `~/.codex/sessions/` parser or track as an SRS-linked task)

## Category 5 — Consistency (Docs vs Code)

- [20] [High] `scripts/acceptance-tests/lib/cache.ts:162`: hashes `join("scripts", "task-bench.ts")` — a file that no longer exists (renamed `task-acceptance-tests.ts`) — while the comment at `cache.ts:155` claims the entry script is part of the cache key and the algorithm treats missing files as "contribute nothing" (design.md:293). The runner entry script is silently excluded from cache invalidation. (Fix: hash `scripts/task-acceptance-tests.ts`)
- [21] [High] FR-DEV-SYNC (`documents/requirements.md:277-286`, all items `[x]`) + SDS §3.1 (`documents/design.md:115-124`) describe a mechanism that does not exist: no `deno task sync-local` in `deno.json`; `.claude/settings.json` has one PostToolUse hook, no SessionStart/SessionEnd; `.claude/skills|agents` are tracked in git (verified via `git ls-files`), with only `.claude/*/flowai-*` gitignored — README:191,469 states the opposite ("Tracked in git directly") and matches reality. (Fix: rewrite FR-DEV-SYNC + SDS §3.1/§2 to the current plugin-based mechanism or flip items to `[ ]`)
- [22] [Medium] Global `deno task bench` / `task-bench.ts` rename drift: `documents/requirements.md:191,238-239`, `documents/design.md:150,293-294,322,355,360`, `documents/acceptance-testing.md:7,19`, `acceptance-tests/AGENTS.md:25`, and `scripts/acceptance-tests/lib/acceptance_cli.ts:1-14` (help text prints `Usage: deno task bench`) all reference the old name; the actual task is `acceptance-tests` (verified in deno.json). (Fix: global rename in docs + CLI help/header)
- [23] [Medium] `documents/requirements.md:190` (FR-ACCEPT-CACHE `[x]`) + `documents/design.md:293` claim the cache key covers `cli/src/transform.ts`, `cli/src/sync.ts`; no `cli/` dir exists and `whitelistedCrossPackageFiles` is only `["scripts/utils.ts"]` (cache.ts:72-74, verified). (Fix: update both doc sites)
- [24] [Medium] FR-MEMEX (`documents/requirements.md:1175,1185`): claims skills at `framework/memex/skills/memex-{save,ask,audit}/` — actual dirs are `save/ask/audit` (verified); claims `audit_test.ts` has "6 tests" — actual 8 `Deno.test` blocks (verified). (Fix: drop the `memex-` prefix; update count)
- [25] [Medium] `documents/acceptance-testing.md`: stale on multiple axes (verified) — §1 names `scripts/task-bench.ts`; §2.1 adapter list (:59-63) omits `codex.ts`; §5 is a frozen "Current State (2026-01-31)" results table of retired `flowai-*` scenario ids (violates AGENTS.md "docs reflect current state, not history"); heading numbering jumps §3→§5. (Fix: refresh adapter list, delete the results table, fix numbering)
- [26] [Medium] `README.md` §Packs (:193-300) has no `memex` section despite memex being a shipped marketplace pack, and the Project Structure tree (:395-411) omits `memex/`, `ide-bridge/`, `beta/` (verified via heading scan). AGENTS.md's Documentation Map requires README §Packs to track pack changes. (Fix: add memex section; complete the tree)
- [27] [Low] `documents/design.md:150,253,293`: stale `benchmarks/` directory token (renamed `acceptance-tests/`) in §3.4 heading, `-beta` retirement instructions, and cache-key prose. (Fix: replace token at the three sites)
- [28] [Low] `documents/design.md:135`: pack structure block says `hooks/<name>/ # hook.yaml + run.sh`; all three shipped hooks use `run.ts` (verified). (Fix: `run.sh` → `run.ts`)

## Category 7 — Instruction Coherence

- [29] [High] `AGENTS.md:130-132` + `documents/design.md:248` instruct agents to write legacy `// FR-<ID>` comments "validated by check-traceability.ts" — but `scripts/check-traceability.ts:9-12` reports exactly that grammar as **errors** with a migration hint (SALP `// [REF:fr:<id>]` is canonical, FR-DOC-ANCHORS). An agent following the root instructions fails `deno task check`. (Fix: update both sites to the SALP grammar)
- [30] [High] `framework/AGENTS.md:8-9` tells primitive authors "Names: `flowai-*`, `flowai-setup-*`" — directly contradicting root `AGENTS.md:75-76` ("without the legacy `flowai-` prefix"), FR-PACKS.STRUCT (`requirements.md:945`), and `scripts/check-naming-prefix.ts` which rejects the prefix (verified). Nested file silently overrides root rules. (Fix: delete the `flowai-*` naming claims)
- [31] [High] `AGENTS.md:319` ("CHECK: Run ALL acceptance tests for the affected agent") and `AGENTS.md:334` ("Run ALL acceptance tests … before finishing") vs `AGENTS.md:324` ("CHECK (full sweep) — defer to the user … Do NOT run the full sweep yourself"): mutually exclusive instructions about who runs the CHECK sweep (verified in-file). (Fix: make steps 4/rules reference the defer-to-user policy)
- [32] [Medium] `AGENTS.md:140` ("Exactly 2 levels — `FR-x` and `FR-x.y`. No `FR-x.y.z`.") vs `documents/requirements.md:509` `#### FR-DIST.BUNDLE.PIN` — a three-level FR id in the SRS (verified). (Fix: rename the FR or relax the rule)
- [33] [Medium] `documents/design.md:110-113` (§3.0 Summary) says "Commands: 9" and "Gitignored generated paths: 7" — contradicting the SDS's own §3.1.1 heading "Commands by pack (8)" (design.md:51), `framework/composites.yaml` (8 targets, verified), `framework/AGENTS.md:43` and `README.md:471` ("The 8 generated paths"); `requirements.md:713` also says "materializes all 7 SKILL.md files". (Fix: correct §3.0 to 8 commands / 8 paths; fix SRS "7"→"8")
- [34] [Medium] Composite line cap stated as **500** in `documents/design.md:179` (canon clause "(e) stay under 500 lines") and FR-UNIVERSAL.DISCLOSURE (`requirements.md:806-807`: "<500 lines", "Line cap (500) … still apply") vs the enforced value **700** (`scripts/lib/skill-limits.ts:31` `SKILL_MAX_LINES = 700`, `framework/AGENTS.md` "currently 700", FR-SHIP/FR-SHIP-TASK "700-line cap") — verified. (Fix: update the two stale doc sites to 700, pointing at skill-limits.ts as the single source)
- [35] [Medium] Documentation Hierarchy duplicated and diverged: `AGENTS.md:89-95` (item 6 = README.md, no acceptance-testing.md) vs `documents/design.md:240-246` (item 6 = acceptance-testing.md, no README) — verified side-by-side. (Fix: keep the hierarchy in AGENTS.md, have SDS reference it)
- [36] [Low] `framework/AGENTS.md:20-28` §Packs omits the `ide-bridge` pack (exists on disk with pack.yaml, in SDS §3.0 and README §Packs — verified). (Fix: add the bullet)
- [37] [Low] `AGENTS.md:90` declares AGENTS.md "READ-ONLY reference" while `AGENTS.md:3` requires reviewing/updating project docs each session and the file contains maintained sections (CI/CD, Detected Commands) — ambiguous scope. (Fix: scope the READ-ONLY claim to rules/vision sections)

## Category 9 — Documentation Health

- [38] [High] FR-UNIVERSAL.QA-FORMAT (`documents/requirements.md:837-850`, Status `[x]`): acceptance items cite skill `flowai-conduct-qa-session` and benchmark `flowai-conduct-qa-session-multi-select-format` — no such skill or scenario exists anywhere outside a test fixture (verified by find/grep). Stale `[x]` acceptance reference. (Fix: re-point acceptance to the current Q&A-format owner or flip to `[ ]`)
- [39] [High] FR-DIST.MARKETPLACE (`documents/requirements.md:384`): "Six marketplace packs … (`flowai`, `flowai-deno`, `flowai-devtools`, `flowai-engineering`, `flowai-memex`, `flowai-typescript`)" vs SDS `DEFAULT_PACKS` = 7 incl. `beta` (`scripts/build-plugins.ts:39-47`, verified) and `README.md:80` "All seven marketplace packs". SRS↔SDS↔README contradiction. (Fix: SRS → seven packs incl. `flowai-beta`)
- [40] [High] SDS §3.5 (`documents/design.md:364-365`) still describes the pre-split monorepo: "**Location:** `cli/` monorepo directory. Published to JSR as `@korchasa/flowai`" — contradicting `AGENTS.md:68` ("This repo no longer publishes to JSR"; CLI lives in korchasa/flowai-cli) and the absence of any `cli/` dir; the same section claims "1 framework hook: `skill-structure-validate`" while FR-HOOK-RESOURCES (`requirements.md:1012`, `[x]`) and disk show 3 hooks (`beta/doc-anchors-validate`, `devtools/skill-structure-validate`, `memex/status`) — verified. (Fix: rewrite §3.5 Location/Distribution/hook bullets to the external-repo reality)
- [41] [Medium] FR-COMPONENT (`documents/requirements.md:264-266`): "All 39 skills" — actual 43 skill dirs (verified count); "Agents (5 canonical definitions)" — actual 7 agent files (verified); stated count command is malformed (unbalanced quote: `` find framework/*/acceptance-tests/*" | wc -l ``). (Fix: update to 43/7; replace with a runnable command)
- [42] [Medium] FR-ONBOARD (`documents/requirements.md:114-120`, items `[x]`): "[x] Schedule for periodic maintenance (Health Check, Docs Audit, Agent Updates)" and "[x] Guidance for specific cases (Investigate, Answer, Engineer)" only partially resolve — README §3 Maintenance (:380-383) lists just `maintenance`/`investigate`, no schedule, no Answer/Engineer guidance (verified). (Fix: align acceptance items with README's current sections or restore content)
- [43] [Medium] `documents/requirements.md:28-43` "Implementation Order (open requirements)": stale roadmap — FR-PACKS/FR-HOOK-RESOURCES/FR-SCRIPTS listed open though their items are `[x]`; **FR-INIT.RERUN** and **FR-ACCEPT.COLOC** (rows 32-33) have no FR section anywhere in the SRS; SDS §3.8 heading cites **FR-INIT.IDEMPOTENT** which also has no SRS section (verified by grep). (Fix: refresh the block; add or rename the dangling ids)
- [44] [Medium] Dangling FR references `FR-HOOK-DOCS` and `FR-IDE-SCOPE` cited at `AGENTS.md:94,119` and `documents/design.md:245,683` — neither FR exists in `documents/requirements.md` (verified by grep). (Fix: point at FR-HOOK-RESOURCES / FR-DIST.* or add the FRs)
- [45] [Medium] FR-DOC-INDEX (`documents/requirements.md:1233`) and SDS §3.16 specify the index row format as GFM `- [<NS>-<ID>](relative/path.md#anchor) — …`, but the actual `documents/index.md` uses SALP rows (`- [REF:fr:… | FR-…] — …`) — spec not updated after the SALP cutover; agents following the spec would write the wrong format (verified). (Fix: update FR-DOC-INDEX + SDS §3.16 to the SALP row form)
- [46] [Low] `documents/index.md` drift vs SRS (all verified): row `FR-DIST.MARKETPLACE — [ ]` vs SRS `[x]` (:41); `FR-UNIVERSAL.QA-FORMAT — [ ]` vs SRS `[x]` (:103); `FR-DOC-IDS`/`FR-DOC-LINKS` rows `[x]` vs SRS `[~] Superseded` (:50,52); `FR-UPDATE` summary "Framework update command" contradicts the FR's boundary ("never runs `flowai update`", req:888) (:107); five `[x]` SRS anchors missing rows entirely (`fr:decision-gate`, `fr:upward-narration`, `fr:ai-code-review`, `fr:diff-optional`, `fr:doc-anchors.hook`). (Fix: reconcile the five rows, back-fill the five missing ones)
- [47] [Low] `documents/design.md:398-404` "Key Agents (7 canonical files)" lists only 6 bullets — omits `framework/ide-bridge/agents/worker.md` (present in the §3.0 inventory, verified). (Fix: add the worker bullet)

Gate notes (dropped leads, no severity): `[verified false]` documents/requirements.md "orphan `[x]` FRs without code references" (~21 ids) — AGENTS.md:133-135 explicitly allows non-code evidence (acceptance tests referenced in SRS), which these FRs carry; policy-compliant, not defects.

## Category 10 — Architectural Integrity

- [48] [Medium] `scripts/lib/salp-anchor-map.ts:19` `import { computeAutoSlug } from "../check-traceability.ts"`: shared-lib layer imports a top-level task script — reverse dependency against SDS §3.18's lib-as-infrastructure layering (verified import line). (Fix: move `computeAutoSlug` into `scripts/lib/` and import it from both)
- [49] [Medium] `scripts/acceptance-tests/lib/runner.ts:10` and `spawned_agent.ts:2` import the neutral seam contract `AgentAdapter` from the per-adapter directory (`./adapters/types.ts`), while `adapters/types.ts:1` imports `../usage.ts` — bidirectional coupling between core and adapter dirs (verified both edges; no module-level cycle). (Fix: move `AgentAdapter`/`ParsedAgentOutput` into the neutral `lib/types.ts`)
- [50] [Low] `framework/*/acceptance-tests/*/mod.ts` (product tree) import dev-harness types via the `@acceptance-tests/` alias (`deno.json:18`) — inverts the declared product-vs-dev-tooling direction without a documented exception. (Fix: document the exception in AGENTS.md/SDS)

## Category 11 — Conceptual Duplication

- [51] [Medium] Model-tier map + universal-agent transform coded twice: `scripts/build-plugins.ts:100-118` `resolveModelTier` (unknown tier → passed through) vs `scripts/acceptance-tests/lib/cli-internals.ts:15-25,80-88` `DEFAULT_MODEL_MAPS` + its own `resolveModelTier` (unknown tier → `undefined`/dropped), plus duplicated keep-sets (`CLAUDE_AGENT_KEEP` vs `IDE_FIELDS`) and an untyped `parseYaml(...) as Record<string, unknown>` beside the typed sibling. `cli-internals.ts:1-10` itself warns drift "will silently desynchronise" (verified both impls + divergent default). (Fix: one shared tier-map/transform module consumed by both; encode the unknown-tier policy once)
- [52] [Medium] FR-ID grammar regex `FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*` duplicated across 6 files (`check-traceability.ts`, `migrate-to-salp.ts`, `check-task-format.ts`, `check-fr-coverage.ts`, `lib/salp-anchor-map.ts`, `lib/salp.ts` — verified), with heading-matcher variants already divergent. (Fix: export a single `FR_ID_PATTERN` from `scripts/lib/`)
- [53] [Medium] `scripts/acceptance-tests/lib/types.ts:135-171` `AcceptanceTestScenario` vs `:180-213` `AcceptanceTestAgentScenario`: near-duplicate base classes — identical `sandboxState` default, identical `setup()`, structurally identical `targetAgentPath` scan loops differing only in the probed path pattern (verified). (Fix: one shared abstract base with a path-probe parameter)
- [54] [Low] `scripts/migrate-to-salp.ts:55,133-205` hand-rolls SALP detection regex and `[REF:…]` string-building in parallel with `scripts/lib/salp.ts:163-176` `serializeAnchor`/`serializeRef`, which SDS §3.18 declares the grammar owner (one-shot migration script, mitigating). (Fix: import the serializers from lib/salp.ts)

Gate notes: `[verified false]` "the supported-IDE set diverges between `cli-internals.ts` maps (incl. `opencode`) and `SUPPORTED_IDES`" — cli-internals is a documented verbatim mirror of the 4-IDE flowai-cli transform, while `SUPPORTED_IDES` scopes the 3-IDE harness; intentional asymmetry.

## Category 12 — API Contract Review

- [55] [High] `scripts/acceptance-tests/lib/types.ts:222,229-230` (`BenchmarkResult.tokensUsed/totalCost/toolCallsCount` required `number`) vs `runner.ts:344-346` (`return { tokensUsed: 0 }` when usage unavailable) and `runner.ts:616-617` (`totalCost: 0, toolCallsCount: 0` hardcoded, never computed): sentinel-vs-missing conflation — Claude and Codex adapters always return `null` usage (verified `claude.ts:305-309`, `codex.ts:246-254`), so every claude/codex run reports 0 tokens and aggregates print `Cost: $0`. (Fix: type the fields `number | undefined` and propagate absence)
- [56] [Medium] `scripts/acceptance-tests/lib/types.ts:80-85` documents `stepTimeoutMs` as "Defaults to no timeout" while `runner.ts:289` defaults it to `300000` and `spawned_agent.ts:98` to `60000` — three contradictory defaults for one field (verified all three sites). (Fix: one documented default in one place)
- [57] [Medium] `scripts/acceptance-tests/lib/usage.ts:29` hardcodes `/Users/korchasa/.cursor/projects` (Cursor usage silently unavailable on any other machine); `:65-76` sets required `projectPath` to sentinel `""` on reconstruction failure; `:142` overloads the `model` field with the literal `"estimated (gemini-3-flash-preview baseline)"` while `tokens.*` carry chars/4 estimates (verified). (Fix: derive from `HOME`; `projectPath?: string`; add an `estimated: boolean` flag)
- [58] [Low] `scripts/acceptance-tests/lib/adapters/types.ts:5`: `ide` union advertises `"opencode"` but no adapter exists — `SUPPORTED_IDES = ["cursor","claude","codex"]` and `createAdapter` throws for it (verified `mod.ts:11,23-26`). Dead union member. (Fix: derive the union from `SUPPORTED_IDES`)
- [59] [Low] Dead vocabulary in the agent-output contract (all verified): `adapters/types.ts:61` documents subtype `"input_required"` with zero producers/consumers; `spawned_agent.ts:63,380` `parsedSubtype` is written and never read; `spawned_agent.ts:135` checks the `"WAIT"` sentinel that `UserEmulator.getResponse` can never return (it yields `null` or free text, `user_emulator.ts:53-62`). (Fix: remove the dead value, field, and sentinel check)

Gate notes: `[verified false]` `adapters/version.ts` "conflates failure modes behind `\"\"`" — the empty-string-on-any-failure, never-throws contract is explicitly documented in the file's JSDoc with the cache-key rationale; deliberate design, not a smell.

## Category 13 — Cross-Implementation Symmetry

- [60] [High] `scripts/acceptance-tests/lib/adapters/cursor.ts:60-115` `parseOutput` never populates `assistantText` (stays `null`) while Claude/Codex concatenate all assistant messages — `spawned_agent.ts:385` (`parsed.assistantText || parsed.result`) silently degrades UserEmulator context to final-result-only on every Cursor run; no capability tag (verified all three adapters). (Fix: collect assistant text in CursorAdapter or tag the omission explicitly)
- [61] [Medium] Mock-hook semantics diverge across adapters: `claude.ts:215-285` uses a broad `Bash` matcher + robust first-bare-word script because — per its own comment — the `Bash(<prefix>:*)` matcher "caused silent mock misses"; `codex.ts:227` still emits the known-bad `matcher: Bash(${tool}:*)` and both `codex.ts`/`cursor.ts` scripts read one stdin line and block unconditionally (verified all three `setupMocks`). (Fix: shared hook-script generator parameterized per IDE settings format)
- [62] [Medium] `codex.ts:188-197` `setupMocks` documents that hooks require `--enable codex_hooks` "on the test runner's `codex exec` call", but `buildArgs` (codex.ts:72-118) never passes it and no other code does (verified by grep) — Codex mocks are written, logged as created, and permanently inert; tests fall through to real tool execution. (Fix: pass the enable flag / config.toml gate, or tag `setupMocks` unsupported for codex)
- [63] [Medium] `calculateUsage` parity drift: Cursor returns chars/4 estimates, Claude returns `null` ("not implemented yet"), Codex returns `null` — and the Codex comment (codex.ts:249-251) falsely claims "`ClaudeAdapter` and `CursorAdapter` return real numbers" (verified: Claude returns null, Cursor estimates). No per-adapter capability flags. (Fix: correct the comment; add `supportsUsage`-style capability tags)
- [64] [Low] `ParsedAgentOutput.raw` shape diverges: Claude/Codex store the full event array, Cursor overwrites with the last parsed object only (`cursor.ts:106`, verified). (Fix: accumulate an array in CursorAdapter)
- [65] [Low] `buildArgs` `name` option handled three ways: Claude uses `--name`, Codex documents ignoring it (codex.ts:77), Cursor silently drops it (verified). (Fix: add the same doc tag on CursorAdapter)
- [66] [Low] `codex.ts:84-97` resume argv omits the `--cd opts.workspace` that the initial-turn argv passes (:102-104) — asymmetric workspace semantics within one adapter, mitigated by the spawner's `cwd` (verified). (Fix: pass `--cd` in both paths or neither, with a comment)

## Category 14 — Defensive-Programming Smell

- [67] [High] `scripts/acceptance-tests/lib/judge.ts:126-137`: after 2 failed judge attempts, every checklist item is fabricated as `pass: false, reason: "Judge evaluation failed after 2 attempts"` — judge-infrastructure failure is recorded as agent failure, flows into scores and the result cache indistinguishably (verified body). Violates the project's fail-fast rule. (Fix: throw after retry exhaustion or return a typed `JudgeUnavailable` outcome the runner reports distinctly)
- [68] [High] `scripts/acceptance-tests/lib/acceptance_runtime.ts:227-228` (`executeTask` catch → `console.error` only): a crashed scenario produces no failed `BenchmarkResult`, so the summary and exit status silently omit it — a sweep with a crashed scenario can read green; the parallel-mode `errors` array (:255-279) is effectively dead since `executeTask` swallows internally (verified). (Fix: push a synthetic failed result or rethrow so the run exits non-zero)
- [69] [Medium] `scripts/acceptance-tests/lib/runner.ts:150` (framework copy) and `:110-116` (fixture check): non-NotFound failures are downgraded to `console.warn` and the run proceeds against a partially-copied framework/missing fixture, which the judge then attributes to the agent (verified; the NotFound branch correctly throws). (Fix: rethrow non-NotFound errors)
- [70] [Medium] `scripts/acceptance-tests/lib/runner.ts:186-189`: `catch (_) { /* AGENTS.md doesn't exist — skip */ }` around the CLAUDE.md symlink — but AGENTS.md was unconditionally written at :181, so what it actually swallows is symlink failure (e.g. `AlreadyExists` from a fixture-provided CLAUDE.md), silently leaving Claude runs without the root symlink; same pattern at :163-165 (CLAUDE.md append). (Fix: catch `NotFound`/`AlreadyExists` specifically, propagate the rest)
- [71] [Medium] `scripts/acceptance-tests/lib/runner.ts:371-379` `readTaskFiles`: nested catch-alls collapse "tasks dir missing", "file unreadable", and "legacy task.md missing" into the sentinel `"(no task files found)"` — judge evidence cannot distinguish "agent created nothing" from "harness failed to read" (verified). (Fix: catch NotFound only)
- [72] [Medium] `scripts/acceptance-tests/lib/spawned_agent.ts:97-98` (`maxSteps || 10`, `stepTimeout || 60000`) and `runner.ts:288-289` (`|| 10`, `|| 300000`): boolean-coerced fallbacks on numeric options, inconsistent with the `??` used for `totalTimeoutMs` at runner.ts:296 (verified). (Fix: use `??` throughout)
- [73] [Medium] `scripts/acceptance-tests/lib/process_watchdog.ts:130-141` `runCmd` catch → `""`: if `pgrep`/`ps` is missing or fails, `listProcessGroup` returns `[]` and RSS reads as 0 — the resource watchdog silently never trips; a defeated guard is indistinguishable from a healthy process group (verified). (Fix: distinguish "command failed" — throw or log loudly once)
- [74] [Medium] `scripts/acceptance-tests/lib/adapters/cursor.ts:69-112` `parseOutput`: hand-rolled `{`/`}` depth scanner ignores braces inside JSON strings; parse failures are silently skipped via `catch (_) { searchIndex = start + 1 }` — corrupted output is indistinguishable from "no JSON present" (verified). (Fix: parse NDJSON per line like the sibling adapters, or count/log parse misses)
- [75] [Low] `scripts/acceptance-tests/lib/system_health.ts:75-86` `sh()` catch → `""`: on darwin a failing `vm_stat`/`sysctl` parses as zero pages → gate trips with a misleading "system unhealthy" diagnosis (fail-closed but wrong message, verified). (Fix: surface probe failure explicitly)
- [76] [Low] `scripts/acceptance-tests/lib/acceptance_runtime.ts:73-77` `updateLatestSymlink`: bare `catch {}` swallows all `Deno.remove` errors (not just NotFound), after which `Deno.symlink` fails with a confusing `AlreadyExists` (verified). (Fix: catch `Deno.errors.NotFound` only)
- [77] [Low] `scripts/acceptance-tests/lib/types.ts:149-166,194-208` `targetAgentPath` getters: `statSync` try/catch as branching plus a silent legacy fallback path (`framework/skills/<skill>/SKILL.md`) returned on total miss — mitigated by the runner's mount verification (verified). (Fix: return `undefined`/throw when found nowhere)

Gate notes: `[verified false]` `spawned_agent.ts:194-210` "health-gate uses exceptions as expected-state branching" — `assertHealthy` throwing `SystemUnhealthyError` is that function's designed contract; idiomatic guard, not a smell.

## Category 15 — Invariant ↔ Test Pairing

- [78] [High] The `AgentAdapter` contract across cursor/claude/codex is verified only by pure arg/parse unit tests: `scripts/task-check.ts:100` passes `--ignore=scripts/acceptance-tests/lib/integration_test.ts` and `.github/workflows/ci.yml` runs only `deno task check` — the real-binary path never runs unconditionally anywhere (verified both sites). (Fix: add a cheap unconditional smoke, e.g. probe the default adapter binary, keeping full integration manual)
- [79] [Medium] Hand-curated IDE registry without a cross-reference test: `adapters/mod.ts:11` `SUPPORTED_IDES` vs the `ide` union (`adapters/types.ts:5`, includes orphan `"opencode"`) vs `acceptance-tests/config.json` `ides` keys — nothing proves "every union member has an adapter and a config entry" (verified drift already exists, see [58]). (Fix: add `Deno.test("adapters: every SupportedIde has a createAdapter handler and config entry")`)
- [80] [Medium] `scripts/build-plugins.ts:39-47` `DEFAULT_PACKS` omits `ide-bridge` although `framework/ide-bridge/pack.yaml` exists (verified); no test asserts "every `framework/<dir>` with pack.yaml is in DEFAULT_PACKS or on a documented exclusion list", and `sync-plugins-local.ts` installs from the same array — an accidental omission would silently drop a pack from distribution. (Fix: add the cross-reference test with an explicit exclusion list naming ide-bridge)
- [81] [Medium] `scripts/build-plugins.ts:73,86` `CLAUDE_AGENT_KEY_ORDER` / `SKILL_KEY_ORDER`: hand-curated key-order arrays with no test against `resource-types.ts` schemas (verified: no KEY_ORDER reference in build-plugins_test.ts) — a new schema field silently escapes deterministic ordering. (Fix: add "every schema key appears in the order array" tests)
- [82] [Medium] SDS canon clauses for composites (`documents/design.md:179`): clauses (a)/(b) have tests (`generate-skill-composites_test.ts:358,380`) but (c) atom-naming-in-description, (d) verdict reject-branch, and (e) line-cap rejection have zero matching test descriptors (verified test list). (Fix: add the three validator tests)
- [83] [Medium] `documents/design.md:154` "Each script header MUST include a `Run:` section with the exact `deno run` command": no validator or test enforces this — `check-skills.ts`/`check-pack-refs.ts` contain no such check (verified by grep). (Fix: add a check in check-skills.ts + a test)
- [84] [Low] `AGENTS.md:136` says Acceptance references are "matched by `check-fr-coverage.ts`", but the script is absent from `buildCheckPlan` (`task-check.ts` runs `check-srs-evidence.ts` instead) — enforcement happens only when the `review` skill chooses to run it (verified; the review atom does reference it, so this is a wiring gap, not a phantom). (Fix: add it to the check plan or reword AGENTS.md)
- [85] [Low] `scripts/acceptance-tests/lib/adapters/version.ts:1-11` documents a never-throws / empty-string-on-failure contract that the cache key depends on — no `version_test.ts` exists (verified). (Fix: add `Deno.test("probeCliVersion: returns \"\" for missing binary and never throws")`)

## Category 16 — Public-Surface Quality

- [86] [Medium] `scripts/acceptance-tests/lib/adapters/mod.ts:1-4` barrel re-exports `CursorAdapter`/`ClaudeAdapter`/`CodexAdapter`/`ParsedAgentOutput` with zero external consumers — every external import goes to the concrete files (verified by grep); `AgentAdapter` additionally has two live import paths (mod.ts vs adapters/types.ts). (Fix: trim mod.ts to `createAdapter` + `SUPPORTED_IDES` + one canonical `AgentAdapter` path)
- [87] [Medium] Dual vocabulary for one concept on the exported harness surface: `Benchmark*` interfaces (`BenchmarkScenario`, `BenchmarkResult`, …) implemented by `AcceptanceTest*` classes, with framework scenario files importing both names (verified `types.ts` + scenario imports). (Fix: pick one canonical prefix; alias-deprecate the other)
- [88] [Low] Test-only compatibility re-exports: `scripts/check-skills.ts:34` re-exports `parseFrontmatter` (test imports it from `resource-types.ts` directly) and `scripts/check-agents.ts:17-20` re-exports it under the synonym `parseAgentFrontmatter` solely for its own test (verified). (Fix: import from resource-types.ts in the tests; drop both re-exports)

## Category 6 — Documentation Coverage

- [89] [Medium] Large exported entry points lack any JSDoc despite complex multi-phase logic: `scripts/build-plugins.ts` (`buildPlugins` :146+, `DEFAULT_PACKS`, `resolveModelTier`, `BuildOptions`, `pluginNameForPack`) and `scripts/validate-plugins.ts` (five exported zod schemas + `validateMarketplaceTree`), no file headers on either's export cluster (verified spot-reads). (Fix: add JSDoc with edge-case notes on the big functions)
- [90] [Low] Core harness contracts undocumented (verified spot-reads): `scripts/acceptance-tests/lib/types.ts` (`BenchmarkChecklistItem`, `BenchmarkScenario`, `BenchmarkResult`, `LLMMessage`, `LLMResponse` — no symbol JSDoc, no file header), `adapters/types.ts` (`AgentAdapter`, `ParsedAgentOutput`), `adapters/mod.ts` (`SUPPORTED_IDES`), `llm.ts` (`ModelConfig`, `IdeConfig`, `BenchmarkConfig`). (Fix: interface-level JSDoc stating each contract's responsibility)
- [91] [Low] Scattered exported helpers missing one-line JSDoc (verified samples): `scripts/lib/salp.ts:165,169` (`serializeAnchor`, `serializeRef`), `scripts/lib/composite-list.ts:41,45`, `scripts/check-skills.ts:36` (`SkillError`), `scripts/generate-skill-composites.ts:193` (`parseAtomSource`), plus file headers/symbol docs across `judge.ts`, `usage.ts`, `user_emulator.ts`, `template.ts`, `utils.ts`, `adapters/claude.ts`, `adapters/cursor.ts`. (Fix: short JSDoc per symbol)

## Category 8 — Tooling Relevance

- [92] [High] `.claude/settings.json:8` and `.codex/hooks.json:9`: PostToolUse hook runs `deno run -A .claude/scripts/flowai-skill-structure-validate/run.ts` — `.claude/scripts/` does not exist and nothing in the repo creates it (verified: `syncClaude` installs plugins via the claude CLI, never writes that path); the hook errors on every Write/Edit. The actual script lives at `framework/devtools/hooks/skill-structure-validate/run.ts`. (Fix: point both hooks at the framework path or remove them)
- [93] [Low] `.claude/agents/acceptance-test-runner.md:39-57` and `.codex/agents/acceptance-test-runner.toml:34-46`: inspect-sandbox instructions reference the nonexistent `benchmarks/` tree and retired `flow-*`/`flowai-*` scenario ids (verified). (Fix: rewrite to the `acceptance-tests/<pack>/runs/` layout and current ids)
- [94] [Low] Cross-IDE dev-tooling parity gaps: `session-error-analyzer` exists only in `.claude/agents/`; `.agents/skills/` lacks `session-history-analyzer` present in `.claude/skills/` (verified listings). (Fix: port or document as Claude-only)
- [95] [Low] `.claude/skills/session-history-analyzer/scripts/list_sessions.py`: dev skill depends on `python3` while the declared stack is TypeScript+Deno (Python "benchmark fixtures only"). (Fix: note the python3 requirement in SKILL.md or port to Deno)
- [96] [Low] `.devcontainer/devcontainer.json:12,59`: installs and syncs OpenCode, but the harness has no opencode adapter (`SUPPORTED_IDES` = cursor/claude/codex) — container feature exercises nothing automated (verified). (Fix: document as manual-dogfooding-only or add the adapter)
- [97] [Low] `.mcp.json`: empty `{"mcpServers": {}}` placeholder configuring nothing (verified). (Fix: delete or populate)

---

## Summary

**Total: 97 findings — Critical: 0, High: 18, Medium: 45, Low: 34**

Per severity:

- Critical: 0 (0 % — anti-inflation ceiling 35 % respected)
- High: 18
- Medium: 45
- Low: 34

Per category:

- Structural Integrity (Cat 1): 6 — 6 Low
- Code Hygiene (Cat 2): 4 — 1 High, 2 Medium, 1 Low
- Complexity & Hotspots (Cat 3): 8 — 3 High, 5 Medium
- Technical Debt (Cat 4): 1 — 1 Low
- Consistency, Docs vs Code (Cat 5): 9 — 2 High, 5 Medium, 2 Low
- Documentation Coverage (Cat 6): 3 — 1 Medium, 2 Low
- Instruction Coherence (Cat 7): 9 — 3 High, 4 Medium, 2 Low
- Tooling Relevance (Cat 8): 6 — 1 High, 5 Low
- Documentation Health (Cat 9): 10 — 3 High, 5 Medium, 2 Low
- Architectural Integrity (Cat 10): 3 — 2 Medium, 1 Low
- Conceptual Duplication (Cat 11): 4 — 3 Medium, 1 Low
- API Contract Review (Cat 12): 5 — 1 High, 2 Medium, 2 Low
- Cross-Implementation Symmetry (Cat 13): 7 — 1 High, 3 Medium, 3 Low
- Defensive-Programming Smell (Cat 14): 11 — 2 High, 6 Medium, 3 Low
- Invariant ↔ Test Pairing (Cat 15): 8 — 1 High, 5 Medium, 2 Low
- Public-Surface Quality (Cat 16): 3 — 2 Medium, 1 Low

### Verify-gate drops (leads falsified during ground-truthing — no severity)

- `[verified false]` `scripts/acceptance-tests/lib/adapters/version.ts`: "empty-string sentinel conflates failure modes" — the contract is explicitly documented in the file's JSDoc as deliberate cache-key design.
- `[verified false]` `scripts/acceptance-tests/lib/spawned_agent.ts:194-210`: "error-as-decision health gate" — `assertHealthy` throwing is its designed contract; idiomatic guard.
- `[verified false]` "~21 orphan `[x]` FRs with zero code references" — AGENTS.md:133-135 permits acceptance-test (non-code) evidence, which these FRs carry; policy-compliant.
- `[verified false]` "supported-IDE set drifts between `cli-internals.ts` maps and `SUPPORTED_IDES`" — cli-internals is a documented verbatim mirror of the 4-IDE flowai-cli transform; the 3-IDE harness scope is intentional.
- `[verified false]` codex comment claim folded into finding [63] rather than reported as a standalone divergence (refined, not dropped silently).

### Scan areas that came back clean

- **GFM cross-link integrity**: all real `[text](path.md#anchor)` links in `documents/*.md`, `README.md`, root/nested AGENTS.md resolve (checker hits were illustrative placeholders); all SRS `**Tasks:**` links and `index.md` `[REF:fr:…]` ids resolve to SRS anchors.
- **Cyclic imports through barrels**: none found — adapter and trace module graphs are acyclic.
- **Free-function-and-method duplicates / reserved-flag lists mixing positionals and flags**: none exist.
- **Trigger-scenario coverage invariant** (FR-ACCEPT.TRIGGER, 43 skills × 3): holds.
- **Tested hand-curated lists**: `LEAKED_FILENAMES`/`LEAKED_DIRNAMES`, `TRIGGER_TYPES`, `resolveModelTier` tiers, FR-PACKS abort paths, composites `.gitignore` parity — all have cross-reference tests.
- **Technical debt tags**: only one real TODO in non-fixture sources ([19]); no `FIXME`/`HACK`/`XXX`, no security-tagged debt.
- **Acceptance-test evidence**: scenario ids and `*_test.ts` files cited by FR-MAINT-SCAN, FR-MAINT-SEVERITY, FR-ACCEPT-ISOLATION, FR-ACCEPT-GUARDS, FR-SKILL-COMPOSE, FR-DECISION-GATE, FR-UPWARD-NARRATION, FR-AI-CODE-REVIEW, FR-DOC-TASK\*, FR-DOC-LINT, FR-DIAGNOSE-BENCH, FR-SHIP\*, and the memex/beta hook tests all exist on disk.
