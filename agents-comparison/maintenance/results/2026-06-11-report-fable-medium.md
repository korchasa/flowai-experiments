# Maintenance Audit Report

Scan date: 2026-06-11 · Repository: flowai (Deno/TypeScript framework) · Workflow: 16-category maintenance sweep (FR-MAINT-SCAN), 5 parallel read-only scan buckets, parent-side verification gate + severity calibration per severity-rubric.md (anti-inflation tie-breaker applied).

Complexity LOC bucket: **service / framework / tool → 500 lines** (AGENTS.md Vision: "Assisted Engineering **framework** … Delivered as AI skills and agents").

All findings below were individually ground-truthed against the source (per-shape checks from verification-gate.md). Falsified leads are listed as `[verified false]` at the end of their category and carry no severity.

---

## Structural Integrity (Cat 1)

### [1] [Low] scripts/acceptance-tests/lib/ — mixed file-naming conventions
- Evidence: `acceptance_cli.ts`, `process_watchdog.ts`, `spawned_agent.ts`, `system_health.ts` (snake_case) sit beside `cli-internals.ts`, `trace-collector.ts`, `trace-renderer.ts` (kebab-case) in the same directory; `scripts/` root is kebab-case throughout.
- Rationale: one directory mixes two naming conventions, breaking the project-wide kebab-case pattern. (Fix: standardize on kebab-case, update imports.)

### [2] [Low] scripts/maintenance_scan_buckets_test.ts — odd file name
- Evidence: only file in `scripts/` root with a snake_case base name; all 23 sibling tests use kebab-case base + `_test.ts` (e.g. `check-skills_test.ts`).
- Rationale: single naming-convention outlier. (Fix: rename to `maintenance-scan-buckets_test.ts`.)

- [verified false] scripts/acceptance-tests/lib/setpgrp_exec.py: "lone unmarked Python file in a TS directory" — actually referenced from `spawned_agent.ts:20` and documented at `spawned_agent.ts:39/231/418` as the intentional process-group wrapper.

## Code Hygiene (Cat 2)

### [3] [Medium] scripts/utils.ts:195 — unused export `moveFileWithCleanup`
- Evidence: `grep -rn moveFileWithCleanup scripts/ framework/` matches only the definition; `utils_test.ts` does not exercise it.
- Rationale: dead exported symbol on the public surface (rubric #cat-2-code-hygiene, unused export → Medium). (Fix: delete.)

### [4] [Low] scripts/check-*.ts — `export`ed symbols with no cross-module consumers
- Evidence: e.g. `check-skills.ts:456 validateSkill`, `check-pack-refs.ts buildAndUnpackTarball`, `check-task-format.ts scanTasks` are exported but imported only by their own `_test.ts` files.
- Rationale: over-exported internals; test-only consumers exist and AGENTS.md notes the typescript-lsp plugin auto-prunes unused exports, so risk is low. (Fix: keep exports only where a test or sibling module needs them; otherwise drop `export`.)

## Complexity & Hotspots (Cat 3)

### [5] [Medium] Six files exceed the 500-line framework bucket (all ≤ 2×)
- Evidence (`wc -l`): `scripts/build-plugins.ts` 897, `scripts/generate-skill-composites.ts` 763, `scripts/sync-plugins-local.ts` 731, `scripts/validate-plugins.ts` 714, `scripts/acceptance-tests/lib/runner.ts` 698, `scripts/check-skills.ts` 651 (also `trace-renderer.ts` at 520, marginal).
- Rationale: threshold exceeded by 1.3×–1.8×, within the Medium band (rubric meta-rule 4). (Fix: split each along its existing phase boundaries, e.g. extract per-file transforms from `build-plugins.ts`.)

### [6] [Medium] Function-length hotspots (> 50 lines) clustered in the same files
- Evidence: `runner.ts` — 5 functions over 50 lines (`prepareSandboxFiles` ~95, `runScenario` ~85, `runAgentWithTimeout` ~74, `gatherJudgeEvidence` ~70, `collectGeneratedFiles` ~57); `build-plugins.ts` — 4 (`buildPack` ~81, `emitHooks` ~68, `emitPrimitives` ~58, `transformSkillFile` ~54); `generate-skill-composites.ts:423 renderCompositeTarget` ~110; `sync-plugins-local.ts:588 syncCodex` ~86; `trace-renderer.ts:27 renderDashboard` ~88; `check-skills.ts:456 validateSkill` ~75.
- Rationale: function > 50 lines → Medium (rubric #cat-3-complexity-hotspots); `runner.ts` is the densest hotspot. (Fix: decompose into phase helpers.)

### [7] [Medium] scripts/sync-plugins-local.ts — mixed concerns
- Evidence: one file holds dotenv parsing (`parseDotenv`), markdown-table parsing/stripping (`parseAndStripFlowaiTables`), and the two-IDE install lifecycle (`syncCodex`).
- Rationale: 2+ unrelated top-level concerns in one module; downgraded from the god-object High because all serve a single sync feature. (Fix: move parsers to `scripts/lib/`, keep orchestration only.)

## Technical Debt (Cat 4)

### [8] [Low] scripts/acceptance-tests/lib/adapters/codex.ts:247 — `TODO(codex-usage)`
- Evidence: the only first-party debt tag in the repo; all other TODO/FIXME/HACK/XXX hits are acceptance-test bait fixtures or rubric prose.
- Rationale: single isolated TODO → Low (rubric #cat-4-technical-debt); the underlying capability gap is graded separately under Cat 13. (Fix: implement the `~/.codex/sessions/` rollout parser or document the gap in reports.)

## Consistency (Docs vs Code) (Cat 5)

### [9] [High] `scripts/task-bench.ts` rename drift across docs and cache code
- Evidence: file does not exist (renamed `task-acceptance-tests.ts`; deno.json has no `bench` task). Stale references: `documents/requirements.md:190-191`, `documents/design.md:293-294,322,150`, `acceptance-tests/AGENTS.md:26`, and `scripts/acceptance-tests/lib/cache.ts:162` still hashes the nonexistent path, so a documented cache-key input silently contributes nothing.
- Rationale: documented behavior the code used to implement and silently renamed away (rubric #cat-5, → High), with a live code consequence in cache.ts. (Fix: global rename in SRS/SDS/AGENTS.md; point cache.ts at the real runner file.)

### [10] [High] documents/design.md §2/§3.1 — dev-resource sync model never matches reality
- Evidence: design.md:14,23,119-124 claim `.claude/skills|agents|scripts` are "generated by `deno task sync-local`", "NOT tracked in git (gitignored)", "auto-synced via SessionStart hook". Reality: no `sync-local` task in deno.json, no SessionStart/SessionEnd hooks in `.claude/settings.json`, and `.gitignore` ignores only `.claude/*/flowai-*` (not `.claude/skills/`).
- Rationale: documented behavior the code does not implement (rubric #cat-5 → High). (Fix: rewrite SDS §3.1/§2 to the current model; see also finding 26.)

### [11] [Medium] README.md:179 + SRS FR-PACKS.STRUCT — wrong agent layout `SUBAGENT.md`
- Evidence: both claim `framework/<pack>/agents/<name>/SUBAGENT.md`; on disk agents are flat files (`framework/core/agents/console-expert.md` …); SDS §3.2 and framework/AGENTS.md correctly say `agents/<name>.md`.
- Rationale: doc drift on the canonical layout. (Fix: correct README:179 and the FR-PACKS.STRUCT criterion to `agents/<name>.md`.)

### [12] [Medium] documents/requirements.md:266 (FR-COMPONENT) — stale counts and broken command
- Evidence: claims "All 39 skills" and "Agents (5 canonical definitions)"; disk has 43 skill dirs and 7 agents (SDS §3.0 agrees: 43/7). The quoted coverage command `find framework/*/acceptance-tests/*" | wc -l` carries a stray quote and the wrong path pattern.
- Rationale: doc drift vs. code truth. (Fix: update to 43/7 and repair the command.)

### [13] [Medium] documents/design.md:365/398 — stale CLI location and hook count
- Evidence: §3.5 says "Location: `cli/` monorepo directory" (no `cli/` dir exists; CLI relocated to korchasa/flowai-cli) and "1 framework hook: `skill-structure-validate`" while three hooks exist (`beta/doc-anchors-validate`, `devtools/skill-structure-validate`, `memex/status`; SRS FR-HOOK-RESOURCES lists all 3).
- Rationale: SDS statements contradicted by the tree. (Fix: update both statements.)

### [14] [Medium] documents/requirements.md:806 (FR-UNIVERSAL.DISCLOSURE) — "<500 lines" vs `SKILL_MAX_LINES = 700`
- Evidence: SRS caps SKILL.md at "<5000 tokens, <500 lines"; `scripts/lib/skill-limits.ts:30` sets `SKILL_MAX_LINES = 700` (ATOM_MAX_LINES = 500).
- Rationale: documented threshold disagrees with the enforcing code. (Fix: align the SRS cap with skill-limits.ts.)

### [15] [Low] README.md:396-411 — Project Structure tree omits three packs
- Evidence: tree lists `core/engineering/devtools/deno/typescript`; `framework/` also contains `ide-bridge`, `memex`, `beta`, all described elsewhere in the same README.
- Rationale: cosmetic doc gap. (Fix: add the three lines.)

### [16] [Low] documents/requirements.md:1175 (FR-MEMEX) — stale `memex-*` skill paths
- Evidence: SRS says `framework/memex/skills/memex-{save,ask,audit}/`; disk has `skills/{ask,audit,save}/` (prefix removed project-wide).
- Rationale: terminology/path drift. (Fix: drop the `memex-` prefix in the FR text.)

## Documentation Coverage (Cat 6)

### [17] [Medium] Complex exported functions without rationale docs
- Evidence: `scripts/generate-skill-composites.ts:193 parseAtomSource` (~88 lines, parses a nontrivial grammar, no doc comment); `scripts/build-plugins.ts buildPlugins` (multi-transform entry, no JSDoc); `scripts/check-skills.ts:400 collectDocumentationSchemaIndirectionErrors` (rule it enforces is unexplained).
- Rationale: complex function (> 20 lines) missing rationale/edge-case notes → Medium (rubric #cat-6). (Fix: add JSDoc with one example each.)

### [18] [Low] scripts/build-plugins.ts — exported surface largely undocumented
- Evidence: `ModelTier`, `resolveModelTier`, `BuildOptions` (partial), `PluginPackArtifact`, `buildPlugins`, `buildClaudePlugins`, `pluginNameForPack` lack per-symbol JSDoc (verified at build-plugins.ts:98,118-130).
- Rationale: public symbols missing docstrings → Low. (Fix: add one-liners.)

### [19] [Low] scripts/lib + validators — undocumented exported helpers and policy constants
- Evidence: `scripts/lib/composite-list.ts:41-47 compositeNames/isComposite`; `scripts/lib/salp.ts:163-172 serializeAnchor/serializeRef` + exported grammar types; exported policy consts `LEAKED_FILENAMES`, `TRIGGER_TYPES`, `ENV_AUTO_INSTALL_PLUGINS` etc.; `check-task-format.ts:220 validateLegacyTask`, `check-traceability.ts:232 validateTaskRefs`, `sync-plugins-local.ts:176 planCodexPluginAdds`.
- Rationale: public symbols missing docstrings → Low. (Fix: one-line JSDoc each.)

## Instruction Coherence (Cat 7)

### [20] [High] AGENTS.md:130 + design.md:248 mandate a traceability grammar the validator blocks
- Evidence: both instruct "Source files contain `// FR-<ID>` (TS/JS) or `# FR-<ID>` (YAML/shell)… Validated by check-traceability.ts"; `scripts/check-traceability.ts:329-332` *errors* on exactly that form ("legacy `// FR-<ID>` shortcut(s) — migrate"); canonical grammar is SALP `// [REF:fr:<id>]`.
- Rationale: an agent following the root instructions verbatim fails `deno task check` — direct contradiction (rubric #cat-7 → High). (Fix: rewrite the Traceability bullets to the SALP grammar.)

### [21] [High] framework/AGENTS.md:8-9 — naming rule contradicts root AGENTS.md and the validator
- Evidence: framework/AGENTS.md says commands/skills "Names: `flowai-*`, `flowai-setup-*`"; root AGENTS.md mandates short kebab-case without the legacy `flowai-` prefix and `scripts/check-naming-prefix.ts` rejects the prefix; SDS §3.1.1 ("Directory names inside packs are the full installed names, e.g. `commit/`") agrees with root.
- Rationale: nested instruction file silently contradicting a root rule → High (rubric #cat-7). (Fix: fix the two Names bullets in framework/AGENTS.md.)

### [22] [Medium] Pack lists presented as exhaustive omit packs
- Evidence: framework/AGENTS.md §Packs lists 7 of 8 (missing `ide-bridge`); documents/design.md:139 lists 7 of 8 (missing `beta`). Eight pack dirs exist.
- Rationale: duplicated lists already diverged. (Fix: add the missing rows, or derive both from `framework/`.)

### [23] [Medium] documents/design.md:179 — composite line cap "500" contradicts the 700-line canon
- Evidence: SDS §3.1.1.1(e) "stay under 500 lines" vs `SKILL_MAX_LINES = 700` (skill-limits.ts:30), FR-SKILL-COMPOSE, and framework/AGENTS.md (700 composite / 500 atom).
- Rationale: 500 is the atom cap, not the composite cap; numeric doc contradiction. (Fix: change (e) to reference SKILL_MAX_LINES/ATOM_MAX_LINES.)

### [24] [Medium] documents/design.md §3.0 — Summary arithmetic internally inconsistent
- Evidence: header "Commands by pack (8)" and disk (8 command dirs: adapt, commit, init, push, review-and-commit, ship, ship-task, update) vs Summary "Commands: 9 (3 atom-generated, 3 composite-generated, 3 standalone)" (actual: 2 atom-generated — commit, push); Summary "Gitignored generated paths: 7 (5 atom targets + 2 composite targets)" vs 8 SKILL.md paths in `.gitignore` (5 command + 3 skill targets), and README:471 says "the 8 generated paths".
- Rationale: same section contradicts itself and the artifacts it describes. (Fix: correct the Summary numbers.)

### [25] [Medium] Cache-key input list triplicated and already diverged
- Evidence: the same list lives in SRS FR-ACCEPT-CACHE:190, design.md:293, and acceptance-tests/AGENTS.md:26 — all three carry the dead `scripts/task-bench.ts` (finding 9).
- Rationale: duplicate rule across files that diverges over time → Medium. (Fix: keep one authoritative list (cache.ts docstring), reference it from the others.)

### [26] [Medium] Supported-IDE set stated as 3 in some places, 4 in others
- Evidence: AGENTS.md:25 and SRS §1 Scope say "(Cursor, Claude Code, OpenCode)"; AGENTS.md Target Audience, README, FR-DIST.DETECT (`[x] Detects 4 IDEs`) say four including OpenAI Codex.
- Rationale: inconsistent scope statements within the same instruction files. (Fix: normalize on the 4-IDE list.)

### [27] [Medium] SRS FR-DOC-LINT defines the doc-health audit in a grammar the project deprecated
- Evidence: FR-DOC-LINT specifies broken-GFM-link and `[FR-<ID>](requirements.md#…)` orphan checks, while FR-DOC-ANCHORS (and the superseded FR-DOC-LINKS/FR-DOC-IDS) replace that grammar with SALP `[ANC:…]`/`[REF:…]` project-wide.
- Rationale: the audit spec drifts from the migration it coexists with; post-cutover the checks as written return false signal. (Fix: restate FR-DOC-LINT checks in SALP terms, keeping GFM checks only for unmigrated surfaces.)

## Tooling Relevance (Cat 8)

### [28] [Medium] PostToolUse hook points at a file absent from the working tree
- Evidence: `.claude/settings.json` and `.codex/hooks.json` both run `deno run -A .claude/scripts/flowai-skill-structure-validate/run.ts`; `.claude/scripts/` does not exist (`ls` → No such file); the path is a gitignored flowai-sync product (source: `framework/devtools/hooks/skill-structure-validate/run.ts`).
- Rationale: in a fresh clone every Write/Edit triggers a failing hook command until a sync is run (rubric #cat-8, hook calls a tool not present → Medium). (Fix: guard the command with a file-existence check or document the sync prerequisite.)

### [29] [Low] Cross-IDE dev-tooling pairing gaps
- Evidence: `.claude/skills/session-history-analyzer` has no counterpart in `.agents/skills/` (which mirrors the other two skills); `.claude/agents/session-error-analyzer.md` has no `.codex/agents/` counterpart (the other two agents are mirrored).
- Rationale: pairing asymmetry in dev tooling, may be intentional Claude-only scope but is undocumented. (Fix: mirror or note the limitation.)

### [30] [Low] .claude/skills/session-history-analyzer/scripts/list_sessions.py vs declared stack
- Evidence: AGENTS.md:61 declares "Python (benchmark fixtures only; no production scripts)"; this dev-skill helper is a Python script.
- Rationale: borderline stack-boundary breach (dev tooling, not production). (Fix: port to Deno or widen the stack note.)

## Documentation Health (Cat 9)

### [31] [High] FR-DEV-SYNC (requirements.md:277-287) — all five `[x]` criteria unverifiable
- Evidence: criteria claim `.claude/{skills,agents,scripts}` gitignored (false — only `.claude/*/flowai-*` is), SessionStart/SessionEnd hooks (none in `.claude/settings.json`), and `deno task sync-local` (no such task in deno.json).
- Rationale: stale `[x]` FR — acceptance does not resolve (rubric #cat-9 → High). (Fix: rewrite to the current dev-resource model or flip to `[ ]`/superseded.)

### [32] [High] FR-UNIVERSAL.QA-FORMAT (requirements.md:845-850) — `[x]` acceptance cites fixture-only artifacts
- Evidence: acceptance references `flowai-conduct-qa-session/SKILL.md` and benchmark `flowai-conduct-qa-session-multi-select-format`; both exist only inside `framework/engineering/skills/diagnose-benchmark-failure/acceptance-tests/md-prior-bullets/fixture/…`, not as framework primitives.
- Rationale: stale `[x]` FR — acceptance reference doesn't resolve → High. (Fix: repoint to surviving evidence or downgrade status.)

### [33] [High] FR-ACCEPT-CACHE (requirements.md:190-191) — `[x]` criteria reference nonexistent `scripts/task-bench.ts`
- Evidence: both checked criteria name `scripts/task-bench.ts` for flag parsing and cache-key coverage; the file does not exist (see finding 9).
- Rationale: stale `[x]` FR — acceptance path doesn't resolve → High. (Fix: update paths to `task-acceptance-tests.ts`.)

### [34] [High] FR-DIST.MARKETPLACE — "Six marketplace packs" vs seven in code and README
- Evidence: requirements.md:384 lists six plugins (no beta); `scripts/build-plugins.ts:39 DEFAULT_PACKS` publishes seven (includes `beta`); README:80 says "All seven marketplace packs".
- Rationale: SRS↔SDS/code contradiction about the same component → High (rubric #cat-9). (Fix: update the SRS sentence and list.)

### [35] [Medium] FR-ONBOARD (requirements.md:119) — `[x]` maintenance-schedule criterion not satisfied
- Evidence: criterion: "[x] Schedule for periodic maintenance (Health Check, Docs Audit, Agent Updates)"; the phrase appears nowhere in README.md (the FR's declared surface — §Maintenance lists two skills, no schedule) nor in framework assets.
- Rationale: checked criterion without resolving evidence; FR otherwise mostly satisfied → Medium. (Fix: add the schedule to README or un-tick.)

### [36] [Medium] FR-PACKS.STRUCT (requirements.md:950) — `[x]` criterion describes a layout that never matches disk
- Evidence: "[x] Agents stored as `framework/<pack>/agents/<name>/SUBAGENT.md`" vs flat `agents/<name>.md` files (see finding 11).
- Rationale: stale checked criterion (feature exists, criterion text wrong) → Medium. (Fix: correct the criterion.)

### [37] [Medium] FR-DOC-INDEX (requirements.md:1233) — `[x]` row-format spec no longer matches index.md
- Evidence: FR mandates rows `- [<NS>-<ID>](relative/path.md#anchor) — summary — status`; actual `documents/index.md` rows use SALP `- [REF:fr:… | FR-…] — … — [ ]`.
- Rationale: the normative format in a checked FR diverged from the artifact it governs. (Fix: update the row-format spec to the SALP form.)

### [38] [Low] documents/index.md — status drift on four rows vs SRS
- Evidence: FR-DIST.MARKETPLACE index `[ ]` vs SRS `[x]` (pilot shipped); FR-UNIVERSAL.QA-FORMAT index `[ ]` vs SRS `[x]`; FR-DOC-LINKS and FR-DOC-IDS index `[x]` vs SRS `[~] Superseded`.
- Rationale: index row drift vs. SRS → Low (rubric #cat-9). (Fix: re-derive the four rows.)

### [39] [Low] documents/index.md — five SRS FRs missing rows
- Evidence: zero index matches for FR-DECISION-GATE, FR-UPWARD-NARRATION, FR-AI-CODE-REVIEW, FR-DIFF-OPTIONAL (SRS:753-779, all `[x]`) and FR-DOC-ANCHORS.HOOK.
- Rationale: index incompleteness → Low. (Fix: back-fill per FR-DOC-INDEX.)

### [40] [Low] documents/design.md:222 — "Key Agents (7 canonical files)" lists six
- Evidence: bullets cover console-expert, diff-specialist, skill-adapter, agent-adapter, maintenance-scan-worker, deep-research-worker; `ide-bridge/agents/worker.md` is counted but absent.
- Rationale: count/list mismatch. (Fix: add the worker bullet.)

- Broken GFM cross-links: a sweep of `documents/*.md`, README.md, and all AGENTS.md found **no real broken file links or anchors** — all suspicious hits are illustrative placeholders inside format specs.

## Architectural Integrity (Cat 10)

### [41] [Medium] scripts/lib/salp-anchor-map.ts:19 — lib module imports a CLI entry script
- Evidence: `import { computeAutoSlug } from "../check-traceability.ts"`; the target is a CLI script with an `if (import.meta.main)` block at line 319.
- Rationale: reverse dependency (shared lib → top-level script) — importing evaluates the script's module scope from a lib context (rubric #cat-10, reverse dependency → Medium). (Fix: move `computeAutoSlug` into `scripts/lib/gfm-slug.ts` and import inward from both.)

### [42] [Medium] scripts/acceptance-tests/lib/ — five files reach up into scripts/utils.ts for `ansi`
- Evidence: `acceptance_cli.ts:8`, `acceptance_runtime.ts:8`, `spawned_agent.ts:3`, `acceptance_report.ts:7`, `acceptance_cache_precheck.ts:6` all `import { ansi } from "../../utils.ts"` while the boundary is declared via the `@acceptance-tests/` alias; the layer also has its own local `utils.ts`.
- Rationale: cross-layer leakage through deep relative paths, two same-named utils modules across the boundary. (Fix: move `ansi` into `scripts/lib/` or the local utils.)

- Cyclic imports: none found — `adapters/mod.ts` re-exports and imports the adapter classes, but no adapter imports the barrel back.

## Conceptual Duplication (Cat 11)

### [43] [High] Agent frontmatter → Claude transform coded twice, already drifting
- Evidence: `scripts/build-plugins.ts:61 CLAUDE_AGENT_KEEP` + `:100 resolveModelTier` (max→opus, smart→sonnet, fast/cheap→haiku) vs `scripts/acceptance-tests/lib/cli-internals.ts:15 DEFAULT_MODEL_MAPS.claude` + `:45 IDE_FIELDS.claude`; cli-internals carries `implements [REF:fr:dist.mapping]`, the same FR. The keep-sets already differ: CLAUDE_AGENT_KEEP includes `scope` but not `color`; IDE_FIELDS.claude includes `color` but not `scope`.
- Rationale: one decision table implemented in two surfaces with silent drift already present (rubric #cat-11, parallel implementations → High). (Fix: extract a shared mapping module in `scripts/lib/` consumed by both.)

### [44] [Medium] Frontmatter parsing reimplemented 8× beside the exported canonical helper
- Evidence: `scripts/resource-types.ts:80 parseFrontmatter` (canonical) vs inline regex copies at `build-plugins.ts:446,516,683`, `generate-skill-composites.ts:197`, `cli-internals.ts:93,161`, `validate-plugins.ts:654` — with regex drift (`\n---` vs `\n---\n?` vs `\n---\n([\s\S]*)$`), so the file-ends-at-`---` edge case differs per path.
- Rationale: duplicated utility with diverging edge-case behavior. (Fix: extend `parseFrontmatter` to also return the body; collapse all call sites.)

### [45] [Medium] Two separately maintained IDE rosters that have drifted
- Evidence: `adapters/mod.ts:11 SUPPORTED_IDES = ["cursor","claude","codex"]` vs `cli-internals.ts` `DEFAULT_MODEL_MAPS`/`IDE_FIELDS` keyed `{claude, cursor, opencode, codex}` — `opencode` exists only in the transform tables (SRS:246 tracks the missing OpencodeAdapter as an open FR).
- Rationale: diverging clones of the supported-IDE decision; partially documented by the open FR. (Fix: derive both from one IDE registry.)

## API Contract Review (Cat 12)

### [46] [High] Step-timeout contract: three divergent claims for the same field
- Evidence: `scripts/acceptance-tests/lib/types.ts:85` doc — "Defaults to no timeout"; `runner.ts:289` applies `scenario.stepTimeoutMs || 300000`; `spawned_agent.ts` doc "Defaults to 60000" with `stepTimeout || 60000` at :98.
- Rationale: type-level contract ("no timeout") cannot be honored by any code path; defaults disagree across layers (rubric #cat-12 → High). (Fix: one source of truth for the default; fix both doc comments.)

### [47] [High] BenchmarkResult — required numbers used as "unknown" sentinels
- Evidence: `types.ts:215-230` types `tokensUsed`, `totalCost`, `toolCallsCount` as required `number`; `runner.ts:344-346` returns `{ tokensUsed: 0 }` when usage is unavailable; `runner.ts:616-617` sets `totalCost: 0, toolCallsCount: 0` unconditionally (never computed).
- Rationale: sentinel-vs-missing conflation — aggregators cannot distinguish "really zero" from "not reported" (rubric #cat-12 → High). (Fix: `number | undefined`; drop or explicitly mark the never-computed fields.)

### [48] [High] ModelConfig demands what cliChatCompletion ignores; LLMResponse.usage never populated
- Evidence: `llm.ts:3-14` requires `temperature: number` and offers `provider?`; `cliChatCompletion` (llm.ts:76+) never reads either (its `_temperature` param is also dead) and returns `usage: undefined` on both paths (llm.ts:171,181) even though the parsed `ClaudeCliEvent` declares `usage`/`total_cost_usd`.
- Rationale: capability-vs-implementation mismatch — the type forces callers to supply inert config (rubric #cat-12 → High). (Fix: make the fields optional with a "CLI does not support" note, or forward them.)

### [49] [High] usage.ts:29 — hardcoded `/Users/korchasa/.cursor/projects`
- Evidence: `findSessionTranscript` iterates a literal absolute home path; on any other machine `Deno.readDir` throws → caught → `null`, indistinguishable from "no usage data".
- Rationale: implementation cannot honor the contract for any other user/host, and fails silently (rubric #cat-12 → High). (Fix: derive from `Deno.env.get("HOME")`.)

### [50] [Medium] spawned_agent.ts:135 — dead `"WAIT"` sentinel in the emulator protocol
- Evidence: `if (input && input !== "WAIT")` vs `user_emulator.ts:55-62`, whose contract is `null` on `<NO_RESPONSE>` and which never returns `"WAIT"`.
- Rationale: the two halves of one interface disagree; the sentinel branch is unreachable. (Fix: remove the check or encode the protocol in the parameter type.)

### [51] [Medium] runner.ts:25-51 `buildSkippedResult` — skipped scenario reported as a perfect pass
- Evidence: skip returns `success: true, score: 100, errorsCount: 0` with every checklist item `pass: true`; `BenchmarkResult` has no skipped marker (only the `logs`/reason strings).
- Rationale: machine-readable results conflate "verified passing" with "never ran"; downgraded from High because the reason strings do label the skip. (Fix: add `skipped?: string` and exclude from aggregation.)

### [52] [Low] adapters/types.ts:5 — dead `"opencode"` union member
- Evidence: `ide: "cursor" | "claude" | "opencode" | "codex"`; no OpencodeAdapter exists, `SUPPORTED_IDES` excludes it, `createAdapter` throws on it. Tracked as an open FR (requirements.md:246).
- Rationale: dead enum value with zero producers/acceptors → Low (rubric #cat-12); known, documented gap. (Fix: derive the union from `SupportedIde` until the adapter lands.)

## Cross-Implementation Symmetry (Cat 13)

### [53] [Medium] CodexAdapter.setupMocks writes hooks that are never enabled
- Evidence: `codex.ts:184-244` writes `.codex/hooks.json` gated behind the `codex_hooks` feature, with an inline comment "requires `--enable codex_hooks` on the test runner's `codex exec` call"; `buildArgs` (codex.ts:84-119) never passes the flag and no config.toml enables it — mocked tools run for real.
- Rationale: capability parity break vs Claude/Cursor mocks; refined from High to Medium because the inline comment documents the best-effort status — but the runner still proceeds as if mocks are active. (Fix: pass `--enable codex_hooks`, or make setupMocks warn explicitly that mocking is inert.)

### [54] [Medium] Mock-matcher robustness diverges across the three adapters
- Evidence: `claude.ts:215-265` ships a hardened hook (strips env prefixes/subshells; built specifically because naive matchers "caused silent mock misses"); `codex.ts:227` uses the naive `Bash(${tool}:*)` matcher; `cursor.ts:130-141` uses a single-line `read -r` parse.
- Rationale: the same logical scenario mocks differently per IDE; the failure mode Claude fixed remains in siblings. (Fix: extract a shared hook-script generator or document the weaker matching.)

### [55] [Medium] calculateUsage capability parity break with no interface tag
- Evidence: `cursor.ts:164-166` returns char/4 estimates ("estimated (gemini-3-flash-preview baseline)"); `claude.ts:305-309` and `codex.ts:246-254` return `null` (commented "not implemented yet" / TODO); `AgentAdapter` exposes no `usageKind` capability flag.
- Rationale: downstream `tokensUsed` mixes 0-means-unknown with approximations, skewing cross-IDE comparisons; documented in comments → Medium. (Fix: add `usageKind: "none" | "estimated" | "exact"`.)

### [56] [Medium] runner.ts:646 — `skipDirs` hardcodes only `.claude`
- Evidence: `const skipDirs = new Set([".claude", ".git", "node_modules"])` in `collectGeneratedFiles`, while adapters use `configDir` `.cursor`/`.codex` too — for those IDEs the whole copied framework is dumped into judge evidence.
- Rationale: reserved-set parity break with real effect (judge-evidence bloat). (Fix: add `adapter.configDir` to skipDirs.)

### [57] [Medium] ParsedAgentOutput subtype vocabulary honored only by ClaudeAdapter
- Evidence: documented union `"success" | "input_required" | "error"` (adapters/types.ts:61); codex synthesizes only success/error (codex.ts:174-179), cursor passes raw unvalidated values (cursor.ts:96-98).
- Rationale: only one of three implementations can produce the full documented set. (Fix: narrow to a real union and map each adapter's native states explicitly.)

### [58] [Low] CodexAdapter resume args omit `--cd ${opts.workspace}`
- Evidence: resume branch (codex.ts:84-97) lacks the `--cd` the initial-turn branch passes (codex.ts:103-104); the comment explains the argv shape but not the omission; works today via the spawner's `cwd`.
- Rationale: within-adapter asymmetry, currently masked. (Fix: add `--cd` or comment why omitted.)

## Defensive-Programming Smell (Cat 14)

### [59] [Medium] system_health.ts:75-86 — `sh()` returns `""` on any spawn failure
- Evidence: empty-string sentinel feeds `readHealth`: failed `vm_stat`/`sysctl` parse to 0 pages → `availableBytes` ≈ 0 → `assertHealthy` throws SystemUnhealthyError and `spawned_agent.ts` aborts with EX_TEMPFAIL.
- Rationale: probe failure indistinguishable from genuine zero-memory pressure (fails closed, so Medium not Critical). (Fix: return `null` on spawn failure and treat unprobeable health as neutral.)

### [60] [Medium] process_watchdog.ts:131-141 — `runCmd` returns `""` on failure, guards fail open
- Evidence: a failed `pgrep`/`ps` spawn is indistinguishable from "no group members", so RSS/fork-loop guards silently see an empty process group.
- Rationale: safety guard quietly disabled when probe tooling breaks. (Fix: return `null` and log once when probes are unavailable.)

### [61] [Medium] runner.ts:359-381 `readTaskFiles` — catch-all conflates errors with "no files"
- Evidence: any error (permission, decode, mid-iteration) collapses to the legacy fallback and then `"(no task files found)"` in judge evidence.
- Rationale: failure indistinguishable from a genuinely empty directory. (Fix: special-case NotFound; propagate or label other errors.)

### [62] [Medium] judge.ts:119-139 — judge infrastructure failure scored as agent failure
- Evidence: after 2 failed attempts every checklist item is fabricated as `pass: false, reason: "Judge evaluation failed after 2 attempts"` → score 0, errorsCount counts them; no machine-readable invalid-run flag (only strings).
- Rationale: error-as-data coupling; logged loudly, so Medium. (Fix: return a typed `judgeFailed` outcome and mark the run invalid.)

### [63] [Medium] runner.ts:141-151 — non-NotFound framework-copy failures only warned
- Evidence: NotFound is rethrown as fatal ("the agent would otherwise run against an empty install"), but every other error (permission, mid-copy) is `console.warn`ed and the run proceeds toward the same misleading outcome the comment warns about.
- Rationale: partial swallow contradicting the stated fatal-precondition rationale. (Fix: rethrow all copy errors.)

### [64] [Medium] `||` fallbacks beside a `??` sibling in the same call chain
- Evidence: `spawned_agent.ts:97-98` `maxSteps || 10`, `stepTimeout || 60000`; `runner.ts:288-289` `maxSteps || 10`, `stepTimeoutMs || 300000`; `runner.ts:296` already uses `totalTimeoutMs ?? 900_000`.
- Rationale: boolean-coerced fallbacks on numeric config, inconsistent with the neighboring nullish pattern; 0 is not a meaningful value here, so Medium not High. (Fix: use `??` for all four.)

- [verified false] adapters/claude.ts:185-188 `if (!result.result && …)`: "conflates empty result with missing" — actually the comment immediately above documents "use last assistant text if result is missing **or empty**" as the intended behavior.

## Invariant ↔ Test Pairing (Cat 15)

### [65] [High] Adapter/runner contract verified only via stubs in CI
- Evidence: `scripts/task-check.ts:100` passes `--ignore=scripts/acceptance-tests/lib/integration_test.ts`; `.github/workflows/ci.yml` runs only `deno task check` for tests — the real-binary integration path never executes in CI.
- Rationale: stub-only contract coverage of a documented uniform contract (rubric #cat-15 → High). (Fix: add a minimal unconditional real-binary smoke to CI.)

### [66] [High] design.md:151-154 "Run:" header MUST — no validator enforces it
- Evidence: SDS mandates every pack script header "MUST include a `Run:` section with the exact `deno run` command"; no check-* script or test enforces it (grep across `scripts/` and `*_test.ts` finds no such check).
- Rationale: documented architectural invariant with zero matching test descriptor (rubric #cat-15 → High). (Fix: add a `check-script-headers` validation with a test fixture.)

### [67] [Medium] build-plugins.ts:39 `DEFAULT_PACKS` — hand-curated list without a cross-reference test
- Evidence: the 7-entry array omits `ide-bridge` (8 pack dirs on disk); zero `DEFAULT_PACKS` references in any `*_test.ts`.
- Rationale: hand-curated allowlist with no test proving parity with `framework/*/pack.yaml` (rubric #cat-15 → Medium); the omission may be intentional but is unencoded. (Fix: add a parity test with an explicit exclusion list.)

### [68] [Medium] design.md:150 `-beta` lifecycle policy — 60-day and delta↔scenario clauses unautomated
- Evidence: the MUST clauses (promote/remove within 60 days; ≥1 dedicated scenario per behavioral delta) have no automated check; the clause itself delegates flagging to the `maintenance` skill, so this is a partially-by-design gap.
- Rationale: refined to Medium — enforcement exists but is manual/skill-level only. (Fix: add a git-date-based check or keep and document the manual gate.)

### [69] [Low] check-trigger-coverage.ts:21-22 `TRIGGER_TYPES`/`TRIGGER_INDEXES` — no stability test
- Evidence: the sibling pattern exists (`check-pack-refs_test.ts:236/244` "LEAKED_* list is stable"); these lists have only indirect coverage via `expectedTriggerDirs()` assertions.
- Rationale: indirect coverage exists → Low. (Fix: add mirroring stability tests.)

## Public-Surface Quality (Cat 16)

### [70] [Medium] build-claude-plugins.ts / validate-claude-plugins.ts — transition wrappers past their expiry
- Evidence: both files are "Compatibility wrapper" shims (`export * from` + re-spawn); documented as kept "for one transition release" (design.md:410); zero references in deno.json tasks, `.github/`, or other scripts; project is at 0.13.9, several releases later.
- Rationale: dead synonym surface with an expired written promise. (Fix: delete both files and the stale design.md sentence.)

### [71] [Medium] adapters/mod.ts:2-4 — barrel re-exports of internal-only adapter classes
- Evidence: external consumers of the barrel import only `createAdapter`/`SUPPORTED_IDES`/`AgentAdapter` (integration_test, runner_test, acceptance_cli, acceptance_runtime); class consumers (`format_logs.ts:15`, `spawned_agent_test.ts`) import the concrete files directly.
- Rationale: barrel re-exports with zero external references widen the public surface past the intended factory entry (rubric #cat-16 → Medium). (Fix: drop the three class re-exports.)

### [72] [Medium] deno.json:25-27 — `build-plugins` and `validate-plugins` tasks are byte-identical
- Evidence: both run `deno run -A scripts/build-plugins.ts && deno run -A scripts/validate-plugins.ts`; a third variant `build-plugins-only` also exists.
- Rationale: synonym duplication on the task surface — `validate-plugins` rebuilds everything, contradicting its name. (Fix: make `validate-plugins` run only the validator, or keep one canonical task.)

### [73] [Medium] acceptance-tests/lib/types.ts — dual naming families for one concept
- Evidence: `BenchmarkScenario` (:7), `BenchmarkResult` (:215) vs `AcceptanceTestScenario` (:135), `AcceptanceTestAgentScenario` (:180) on the same exported surface; scenario files split across both vocabularies.
- Rationale: synonym duplication — consumers must know both prefixes. (Fix: pick one canonical prefix, alias-deprecate the other.)

### [74] [Medium] check-skills.ts:34 — re-export of `parseFrontmatter` with no production consumer
- Evidence: `export { parseFrontmatter } from "./resource-types.ts"` is consumed only by `check-skills_test.ts`; production consumers import `resource-types.ts` directly.
- Rationale: internal-only re-export on a validator's surface (rubric #cat-16 → Medium). (Fix: drop it; point the test at resource-types.ts.)

---

## Summary

### Counts per severity

- Critical: 0
- High: 15 (findings 9, 10, 20, 21, 31, 32, 33, 34, 43, 46, 47, 48, 49, 65, 66)
- Medium: 43
- Low: 16
- **Total: 74 findings** (+2 leads dropped as `[verified false]` by the verification gate)
- Critical share: 0 % (≤ 35 % anti-inflation ceiling honored)

### Counts per category

- Structural Integrity (1): 2
- Code Hygiene (2): 2
- Complexity & Hotspots (3): 3
- Technical Debt (4): 1
- Consistency (Docs vs Code) (5): 8
- Documentation Coverage (6): 3
- Instruction Coherence (7): 8
- Tooling Relevance (8): 3
- Documentation Health (9): 10
- Architectural Integrity (10): 2
- Conceptual Duplication (11): 3
- API Contract Review (12): 7
- Cross-Implementation Symmetry (13): 6
- Defensive-Programming Smell (14): 6
- Invariant ↔ Test Pairing (15): 5
- Public-Surface Quality (16): 5

### Scan areas that came back clean

- **Unused imports** — `deno lint` passes clean across all 95 TS files.
- **Test quality** — every `*_test.ts` contains real assertions; no trivial or commented-out tests found.
- **Dead/empty directories** — none outside `.git`.
- **Config file placement** — `deno.json`, `deno.lock`, `.mcp.json`, `.versionrc.json` all at expected root locations.
- **Broken GFM cross-links** — full sweep of `documents/*.md`, README.md, and all AGENTS.md found no real broken file links or anchors (all hits are illustrative placeholders in format specs).
- **Cyclic imports** — no cycles, including through the `adapters/mod.ts` barrel.
- **Reserved lists mixing positionals and flags** — `RESERVED_MARKETPLACE_NAMES` is homogeneous; no finding.
- **Critical-tier debt** — no `TODO: SECURITY`, FIXME, HACK, or XXX markers in first-party code.
