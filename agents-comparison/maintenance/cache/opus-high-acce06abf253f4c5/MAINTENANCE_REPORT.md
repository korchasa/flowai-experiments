# Maintenance & Health Audit — flowai

Scan-only audit (Scan phase + Verify gate). Project: `flowai` — Deno/TypeScript
framework. Source = `scripts/` + `framework/<pack>/`; `*/acceptance-tests/*/fixture/**`
and `acceptance-tests/cache/**` treated as test fixtures (excluded). Complexity LOC
bucket: **service / framework / tool** (default) → file threshold 500, function 50.
Every finding below was ground-truthed against source; falsified leads are listed
under "Verify gate — dropped findings".

---

## Structural Integrity (Cat 1)

- [1] [Low] `framework/core/commands/init/scripts/generate_agents.test.ts`: uses `.test.ts` suffix; the other 33 test files use the `_test.ts` convention. (Rationale: lone naming outlier vs. project convention. Fix: rename to `generate_agents_test.ts`.)

## Code Hygiene (Cat 2)

- [2] [Low] `scripts/lib/salp.ts:163,167` `serializeAnchor` / `serializeRef`: exported but consumed only by `salp_test.ts` (no production caller). (Rationale: unused public surface. Fix: de-export or confirm test-only API is intentional.)
- [3] [Low] `scripts/lib/composite-list.ts:41` `compositeNames`: exported but consumed only by `check-skills_test.ts`. (Rationale: unused public surface. Fix: de-export if not a real helper.)
- [4] [Low] `scripts/lib/salp-anchor-map.ts:41,64` `extractFrAnchors` / `extractSdsAnchors`: exported with zero external references; used only internally by `buildAnchorMap` in the same module. (Rationale: unnecessary export. Fix: drop the `export` keyword.)

## Complexity & Hotspots (Cat 3)

- [5] [Medium] `scripts/build-plugins.ts`: 897 LOC (1.79× of 500-line threshold). (Rationale: largest source file, multiple emit phases. Fix: split emit phases into modules.)
- [6] [Medium] `scripts/generate-skill-composites.ts`: 763 LOC (1.53×). (Rationale: parsing + rendering in one file. Fix: extract parse vs. render concerns.)
- [7] [Medium] `scripts/sync-plugins-local.ts`: 731 LOC (1.46×). (Rationale: Claude + Codex sync paths combined. Fix: separate per-IDE modules.)
- [8] [Medium] `scripts/validate-plugins.ts`: 714 LOC (1.43×). (Rationale: over threshold. Fix: extract per-tree validators.)
- [9] [Medium] `scripts/acceptance-tests/lib/runner.ts`: 698 LOC (1.40×). (Rationale: over threshold. Fix: extract collection/reporting helpers.)
- [10] [Medium] `scripts/check-skills.ts`: 651 LOC (1.30×). (Rationale: over threshold. Fix: split validation rules.)
- [11] [Medium] Functions over 50 lines: `build-plugins.ts:272` `buildPack` (82), `generate-skill-composites.ts:193` `parseAtomSource` (89), `sync-plugins-local.ts:588` `syncCodex` (87). (Rationale: measured > 50-line limit. Fix: decompose into sub-steps.)

## Technical Debt (Cat 4)

- [12] [Low] `scripts/acceptance-tests/lib/adapters/codex.ts:246` `TODO(codex-usage)`: single in-source TODO documenting the Codex usage-parsing gap. (Rationale: lone isolated TODO, no urgency marker. Fix: track via FR or implement parser.)

## Consistency (Docs vs Code) (Cat 5)

- [13] [Medium] `README.md:179`: documents agents at `framework/<pack>/agents/<name>/SUBAGENT.md`, but no `SUBAGENT.md` exists anywhere — actual layout is flat `framework/<pack>/agents/<name>.md` (and `framework/AGENTS.md:12` agrees). (Rationale: documented structure the code never implemented. Fix: change to `<name>.md`.)

## Documentation Coverage (Cat 6)

- [14] [Medium] `scripts/generate-skill-composites.ts:193` `parseAtomSource`: complex parser (89 lines, regex frontmatter split + branch extraction) with no JSDoc/example. (Rationale: complex logic lacks rationale notes. Fix: add JSDoc with an example atom + `ParsedAtom` shape.)
- [15] [Low] `scripts/build-plugins.ts:146` `buildPlugins`: primary exported entrypoint, no JSDoc. (Rationale: undocumented public symbol. Fix: document inputs/outputs.)
- [16] [Low] `scripts/validate-plugins.ts:234` `validateMarketplaceTree`: exported validator, no JSDoc. (Rationale: undocumented public symbol. Fix: document the contract.)
- [17] [Low] `scripts/check-skills.ts:400` `collectDocumentationSchemaIndirectionErrors`: exported, non-obvious name, no JSDoc. (Rationale: undocumented public symbol. Fix: JSDoc the rule it enforces.)
- [18] [Low] `framework/memex/scripts/audit.ts:184` `audit` & `framework/memex/hooks/status/run.ts:122` `gatherStatus`: exported async functions, no JSDoc. (Rationale: undocumented public symbols. Fix: add responsibility comments.)

## Instruction Coherence (Cat 7)

- [19] [High] `framework/AGENTS.md:8-9` vs root `AGENTS.md:75-76`: framework/AGENTS.md says command/skill dir names are `flowai-*` / `flowai-setup-*`, but root AGENTS.md mandates "without the legacy `flowai-` prefix" and actual dirs are unprefixed (`commit`, `plan`, `init`…). (Rationale: contradictory rules across instruction files. Fix: update framework/AGENTS.md to the short-kebab rule.)
- [20] [High] root `AGENTS.md:206-210` (and `:93`): tasks declared as flat `documents/tasks/<YYYY-MM-DD>-<slug>.md` with "Directory is gitignored", but reality is nested `documents/tasks/<YYYY>/<MM>/<slug>.md`, committed (28 tracked files; `documents/.gitignore` only ignores `rnd/refs/`), as mandated by SRS `FR-DOC-TASKS`. (Rationale: instruction contradicts SRS and the committed tree. Fix: update AGENTS.md §Tasks to nested-committed layout, delete the "gitignored" line.)
- [21] [Medium] `AGENTS.md:222-262` GODS Format: frontmatter template shows only `implements:`, but actual task files and `FR-DOC-TASKS` require `date`, `status`, `tags`, `related_tasks`. (Rationale: documented template diverges from enforced/actual format. Fix: sync GODS frontmatter block with FR-DOC-TASKS fields.)

## Tooling Relevance (Cat 8)

- [22] [High] `.claude/settings.json` PostToolUse: runs `deno run -A .claude/scripts/flowai-skill-structure-validate/run.ts`, but `.claude/scripts/` does not exist (real hook is `framework/devtools/hooks/skill-structure-validate/run.ts`). (Rationale: hook fails on every Write/Edit — missing target file. Fix: correct the path or generate the stub at sync time.)
- [23] [High] `.codex/hooks.json` PostToolUse: identical broken reference to `.claude/scripts/flowai-skill-structure-validate/run.ts`. (Rationale: hook fails on every Write/Edit. Fix: same as [22].)

## Documentation Health (Cat 9)

- [24] [Low] `documents/index.md`: 5 SRS FRs have no index row — `FR-DECISION-GATE` (SRS:753), `FR-UPWARD-NARRATION` (760), `FR-AI-CODE-REVIEW` (767), `FR-DIFF-OPTIONAL` (774), `FR-DOC-ANCHORS.HOOK` (1205). (Rationale: index ↔ SRS row drift. Fix: back-fill the missing rows.)
- [25] [Low] `documents/index.md:50,52`: `FR-DOC-IDS` and `FR-DOC-LINKS` carry status `[x]`, but SRS marks both `[~] Superseded` (requirements.md:1217,1224). (Rationale: index status drift. Fix: change rows to Superseded.)
- [26] [Low] `documents/index.md:103`: `FR-UNIVERSAL.QA-FORMAT` shown `[ ]`, but SRS `**Status:** [x]` (requirements.md:850). (Rationale: index status drift. Fix: flip row to `[x]`.)

## Architectural Integrity (Cat 10)

- [27] [Medium] `scripts/lib/salp-anchor-map.ts:19` imports `computeAutoSlug` from `../check-traceability.ts`. (Rationale: a shared-lib module (`scripts/lib/`, lowest layer) depends upward on a top-level dev-tooling script — reverse dependency. Fix: move `computeAutoSlug` into `scripts/lib/` and have both import it there.)

## Conceptual Duplication (Cat 11)

- [28] [Medium] `scripts/resource-types.ts:77` `parseFrontmatter` vs `scripts/validate-plugins.ts:648` `validateMarkdownFrontmatter` vs `scripts/acceptance-tests/lib/cli-internals.ts:90` `splitFrontmatter`: three independent YAML-frontmatter split/parse implementations. (Rationale: same decision coded three times, drift risk. Fix: route all three through the canonical `parseFrontmatter`.)

## API Contract Review (Cat 12)

- [29] [Medium] `scripts/acceptance-tests/lib/runner.ts:344` `collectUsage`: `if (!usage) return { tokensUsed: 0 }` — conflates `null` (usage unsupported/unknown) with a genuine 0-token run. (Rationale: sentinel-vs-missing conflation skews aggregate cost for non-Cursor adapters. Fix: distinguish null-usage from real zero.)
- [30] [Medium] `scripts/acceptance-tests/lib/usage.ts:29` `findSessionTranscript`: hardcodes `/Users/korchasa/.cursor/projects`. (Rationale: non-portable; silently returns null on any other host, so Cursor usage is effectively dead off the author's machine. Fix: inject the projects dir / require it as a parameter.)
- [31] [Low] `scripts/acceptance-tests/lib/adapters/types.ts:5`: `ide` union includes `"opencode"`, but `createAdapter` (mod.ts:17) throws on it and `SUPPORTED_IDES` (mod.ts:11) omits it (OpencodeAdapter unimplemented; `FR-ACCEPT.OPENCODE` still `[ ]`). (Rationale: type advertises a value the runtime rejects. Fix: drop `"opencode"` until the adapter lands, or implement it.)
- [32] [Low] `scripts/acceptance-tests/lib/adapters/types.ts:61`: `subtype` comment lists `"input_required"`, but no adapter emits it and the only consumer (`spawned_agent.ts:380`) just stores it. (Rationale: dead documented value. Fix: narrow the documented union to values adapters produce.)

## Cross-Implementation Symmetry (Cat 13)

- [33] [Medium] `calculateUsage`: `cursor.ts:164` parses real usage, while `claude.ts:305` and `codex.ts:246` unconditionally `return null`. (Rationale: capability gap across sibling adapters with no typed capability flag for callers to branch on — documented only via comments. Fix: add a `supportsUsage` capability flag on the interface.)
- [34] [Medium] `setupMocks` matcher: `claude.ts` abandoned the `Bash(${tool}:*)` matcher (comment lines 213-225 explain it caused silent mock misses), yet `codex.ts:226` still uses `Bash(${tool}:*)`. (Rationale: divergent reserved/matcher form — Codex mocks will silently miss the env-prefixed commands Claude fixed. Fix: share the env-stripping hook generator or port the fix to Codex.)

## Defensive-Programming Smell (Cat 14)

- [35] [Medium] `scripts/acceptance-tests/lib/adapters/claude.ts:148-152` and `codex.ts:134-139`: per-line `JSON.parse` wrapped in a comment-only `catch (_) { /* Skip malformed lines */ }`. (Rationale: wholesale silent swallow with no count/diagnostic — CLI output-format drift becomes invisible. Fix: track and surface a skipped-line count.)
- [36] [Low] `scripts/acceptance-tests/lib/spawned_agent.ts:385`: `parsed.assistantText || parsed.result`. (Rationale: `||` discards a legitimately empty-string `assistantText`; `??` would be safer. Fix: use `parsed.assistantText ?? parsed.result` if "" is a valid value.)

## Invariant ↔ Test Pairing (Cat 15)

- [37] [Medium] `scripts/generate-skill-composites.ts:574,594,602` `validateCompositeCanon`: enforces 5 canon clauses, but only 2 have negative tests (`generate-skill-composites_test.ts:358` "No delegation", `:380` "Self-contained"); clauses (c) description-names-source-atom, (d) verdict-gate-reject-branch, (e) `SKILL_MAX_LINES` cap have none. (Rationale: hand-curated validation rules without cross-reference tests. Fix: add a negative test per uncovered clause.)
- [38] [Low] `documents/design.md:150`: the `-beta` 60-day lifecycle policy ("MUST be promoted/removed within 60 days") is enforced only by `maintenance`-skill judgment — no automated check or test exists. (Rationale: documented policy with manual-only enforcement. Fix: add `scripts/check-beta-lifecycle.ts` + test, or explicitly mark it manual-only.)

## Public-Surface Quality (Cat 16)

- [39] [Medium] `scripts/check-agents.ts:17-20`: re-exports `parseFrontmatter as parseAgentFrontmatter` "for backward compatibility with tests" — barrel re-export of an internal symbol whose only consumer is `check-agents_test.ts`; also imported plainly at line 11 (duplicate import). (Rationale: internal-only re-export + dead alias. Fix: delete the re-export, point the test at `resource-types.ts`.)
- [40] [Medium] `scripts/check-skills.ts:34`: `export { parseFrontmatter } from "./resource-types.ts"` — re-export consumed only by `check-skills_test.ts`. (Rationale: internal-only barrel re-export. Fix: remove the line.)
- [41] [Medium] `scripts/acceptance-tests/lib/adapters/mod.ts:2-4`: re-exports `CursorAdapter` / `ClaudeAdapter` / `CodexAdapter` with zero production import consumers (production reaches adapters via `createAdapter`; classes imported directly only by tests). (Rationale: barrel re-exports of internal-only symbols. Fix: drop the class re-exports, keep `createAdapter` + types.)

---

## Verify gate — dropped findings

Leads falsified or reclassified during ground-truthing (no severity assigned):

- [verified false] `scripts/acceptance-tests/lib/adapters/version.ts:38` `probeCliVersion` returns `""` on failure — claimed defensive smell; actually a **documented intentional sentinel** (contract comment, version.ts:1-11: `""` = "could not probe", stable cache key).
- [verified false] `scripts/acceptance-tests/lib/adapters/claude.ts:186` `if (!result.result …)` empty-string fallback — claimed conflation bug; actually **intentional** per its own comment "use last assistant text if result is missing **or empty**".
- [verified false] `scripts/task-dev.ts` / `scripts/task-test.ts` "no top-of-file responsibility comment" — actually both carry a JSDoc block at line 4 (immediately after imports).
- [verified false] `documents/index.md` `FR-DIST.MARKETPLACE` status drift — the SRS block (requirements.md:382) carries **no `**Status:**` marker**, so the claimed "SRS = `[x]`" disagreement is unproven.

## Summary

Total: 41 findings — Critical: 0, High: 4, Medium: 21, Low: 16.

Per category:
- Structural Integrity (Cat 1): 1
- Code Hygiene (Cat 2): 3
- Complexity & Hotspots (Cat 3): 7
- Technical Debt (Cat 4): 1
- Consistency / Docs vs Code (Cat 5): 1
- Documentation Coverage (Cat 6): 5
- Instruction Coherence (Cat 7): 3
- Tooling Relevance (Cat 8): 2
- Documentation Health (Cat 9): 3
- Architectural Integrity (Cat 10): 1
- Conceptual Duplication (Cat 11): 1
- API Contract Review (Cat 12): 4
- Cross-Implementation Symmetry (Cat 13): 2
- Defensive-Programming Smell (Cat 14): 2
- Invariant ↔ Test Pairing (Cat 15): 2
- Public-Surface Quality (Cat 16): 3

Critical share: 0% (≤ 35% anti-inflation ceiling satisfied).

Scan areas that came back clean:
- No import cycles through barrels (Cat 10).
- No broken GFM cross-links across the markdown set (Cat 9).
- No stale `[x]` FR acceptance references; all `[x]` FRs resolve and are referenced in code (Cat 9).
- No orphan `[x]` FRs (Cat 9).
- No SRS↔SDS direct contradictions detected (Cat 9).
- No assertion-free, trivial (`assert(true)`), or commented-out tests across the 34 test files (Cat 2).
- No unused imports / unused-var lint hits (Cat 2).
- No dead, empty, or orphaned directories; no misplaced source files; config files at expected locations (Cat 1).
- No real TODO/FIXME/HACK/XXX debt clusters in product source (Cat 4) — only the single `codex.ts` TODO and template placeholders.
- Tooling stack is consistent (TypeScript/Deno; Python limited to declared benchmark/utility scripts) — no stack/domain mismatches in `.claude/`, `.codex/`, `.github/`, `.devcontainer/` (Cat 8).
- No reserved-flag list mixing positionals and `--flags` (Cat 16).
- No `@internal`-marked-but-exported symbols (Cat 16).
