# Maintenance & Health Audit — flowai

Scan-only run (Resolution phase intentionally skipped). All 16 categories scanned via 5 parallel read-only workers (W1–W5); every lead was then ground-truthed against source in the Verify gate before severity calibration. Severity per `severity-rubric.md`; ties resolved downward (anti-inflation). Project LOC bucket: **service / framework / tool** → file threshold 500, function threshold 50.

Finding line shape: `- [N] [Severity] <site>: <problem>. (Fix: <fix>)`.

---

## Code Hygiene (Cat 2)

- [1] [Low] `scripts/build-claude-plugins.ts`, `scripts/validate-claude-plugins.ts`: dead compatibility wrapper modules (`export * from …` / CLI re-spawn) with **0 references** anywhere in code/CI/tasks (verified by grep; `deno.json` calls only the new `build-plugins.ts`/`validate-plugins.ts`); documented as "for one transition release" (design.md §3.5). (Fix: confirm the transition release shipped, then delete both files.)
- [2] [Low] `scripts/acceptance-tests/lib/spawned_agent.ts:63,380`: private `parsedSubtype` is assigned (`= parsed.subtype`) but never read; the entire `ParsedAgentOutput.subtype` chain — computed by all three adapters (incl. Codex's synthesized `error`/`success` at codex.ts:174-179) — is dead surface (`format_logs.ts` reads raw events, not this field). (Fix: consume `subtype` for error detection, or remove the field + `parsedSubtype`.)

## Complexity & Hotspots (Cat 3)

- [3] [Medium] 7 production source files exceed the 500-line file threshold (all 1.04×–1.79×, none >2×): `scripts/build-plugins.ts` (897), `scripts/generate-skill-composites.ts` (763), `scripts/sync-plugins-local.ts` (731; also mixes claude-sync + codex-sync + dotenv parsing), `scripts/validate-plugins.ts` (714), `scripts/acceptance-tests/lib/runner.ts` (698), `scripts/check-skills.ts` (651), `scripts/acceptance-tests/lib/trace-renderer.ts` (520). (Fix: split each by concern into a submodule dir.)
- [4] [Medium] Functions over the 50-line threshold (recounted): `framework/core/commands/init/scripts/generate_agents.ts:124` `analyzeProject` (lines 124–265 = 142 lines; mixes file-tree walk + stack detection + inventory + verification assembly); `framework/devtools/skills/engineer-rule/scripts/validate_rule.ts:30` `detectFormat` (lines 30–128 = 99 lines). (Fix: extract sub-steps into named helpers.)

## Technical Debt (Cat 4)

- [5] [Low] `scripts/acceptance-tests/lib/adapters/codex.ts:247`: the only genuine source `TODO` (`TODO(codex-usage)`) — documents a permanent capability gap (no Codex usage API → `calculateUsage` returns `null`). Single isolated TODO. (Fix: parse `~/.codex/sessions/` rollouts or convert to a tracked issue.) *(The other ~100 `TODO/FIXME/HACK/XXX` grep hits are template text or docs describing the markers, not debt — verified.)*

## Consistency (Docs vs Code) (Cat 5)

- [6] [Medium] `README.md:179` + `documents/requirements.md:950` (FR-PACKS): both document agents as `framework/<pack>/agents/<name>/SUBAGENT.md`; actual layout is flat `framework/<pack>/agents/<name>.md` (0 `SUBAGENT.md` files exist; SDS §3.2 is correct). (Fix: change both to `<name>.md`.)
- [7] [Medium] `documents/requirements.md:266` (FR-COMPONENT): claims "All 39 skills" and "Agents (5 canonical definitions)"; actual = 40 skills (+3 commands) and 7 agents, and SDS §3.0/§3.2 already say 43/7. The embedded command also has a stray quote: `find framework/*/acceptance-tests/*" | wc -l`. (Fix: update counts to match reality/SDS; fix the `"`.)
- [8] [Medium] `documents/design.md:362,365` (SDS §3.5): heading "FR-DIST (`cli/`)" and "Location: `cli/` monorepo directory. Published to JSR as `@korchasa/flowai`" contradict the same section's :385 ("external korchasa/flowai-cli repo") and AGENTS.md:68 / README ("this repo no longer publishes to JSR"; no `cli/` dir exists). (Fix: update the Location/heading to the external repo; the `cli/src/*.ts` contract-path references may stay.)
- [9] [Low] `documents/requirements.md:1175,1185` (FR-MEMEX): skill paths written `framework/memex/skills/memex-{save,ask,audit}/` (actual dirs are `{save,ask,audit}` — no `memex-` prefix); "audit_test.ts (6 tests)" (actual 8; SDS §3.15:586 correctly says 8). (Fix: drop `memex-` prefix; 6→8.)

## Documentation Coverage (Cat 6)

- [10] [Low] Under-documented exported surface in plugin-build + acceptance-test infrastructure: `scripts/build-plugins.ts` (`ModelTier`:98, `resolveModelTier`:100, `BuildOptions`:120, `PluginPackArtifact`:133, `buildPlugins`:146 — no JSDoc), `scripts/validate-plugins.ts` (Zod schemas + `validateMarketplaceTree`; no module header), `scripts/sync-plugins-local.ts` (no module-responsibility header; exported planners undocumented), `scripts/acceptance-tests/lib/**` (many exported interfaces/types without JSDoc, missing module comments). (Fix: add module headers + one-line JSDoc on exported symbols.)

## Instruction Coherence (Cat 7)

- [11] [Medium] `AGENTS.md:432-433` vs `documents/requirements.md:735` (FR-ATOM-PUSH.CI-AWAIT) vs `documents/design.md:652,659` (SDS §3.19): SRS/SDS describe the CI-await as a fixed "30 iterations × 60 s" and "re-invokes after 60 s"; the implementing atom (`framework/atoms/push.md:73-75`) is config-driven (Poll interval default 60, Wall-clock budget default 1800, `ITER_CAP = ceil(budget/poll)`), and this project's AGENTS.md sets Poll 15 s / budget 180 s → cap 12. SRS/SDS omit the configurability and hardcode 60 s, contradicting the operative 15 s. (Fix: state in SRS/SDS that poll/budget are AGENTS.md-configurable; reconcile the fixed-30×60 wording with the computed cap.)
- [12] [Low] `documents/design.md:113` ("7 (5 atom + 2 composite)") + `documents/requirements.md:713` ("all 7 SKILL.md files") vs `documents/design.md:164` + `README.md:471` ("8 generated paths"): actual = 8 generated SKILL.md (5 atoms + 3 composites: review-and-commit, ship, ship-task), confirmed via `.gitignore` + `framework/composites.yaml`. design.md is internally contradictory (113 vs 164). (Fix: correct 7→8 and "2 composite"→3.)

## Tooling Relevance (Cat 8)

- [13] [Medium] `.codex/hooks.json`: PostToolUse command `deno run -A .claude/scripts/flowai-skill-structure-validate/run.ts` — `.claude/scripts/` does not exist; the real hook lives at `framework/devtools/hooks/skill-structure-validate/run.ts`. Stale path (+ legacy `flowai-` prefix) → fails/no-ops on every Codex Write/Edit. (Fix: point the command at the real installed path.)
- [14] [Low] `.claude/skills/session-history-analyzer/` (+ `scripts/list_sessions.py`) and `.claude/agents/session-error-analyzer.md` depend on `python3`, but AGENTS.md declares Python is "benchmark fixtures only" and `.devcontainer/` installs Deno, not python3. Dev-tooling stack-declaration mismatch. (Fix: note the python3 dev prerequisite in AGENTS.md / the skill, or confirm the devcontainer provides it.)

## Documentation Health (Cat 9)

- [15] [High] `documents/requirements.md:847-848` (FR-UNIVERSAL.QA-FORMAT, Status `[x]`): `**Acceptance:**` references skill `flowai-conduct-qa-session/SKILL.md` and benchmark `flowai-conduct-qa-session-multi-select-format`, neither of which exists as a real framework primitive (only inside a `diagnose-benchmark-failure` test fixture); also uses the removed `flowai-` prefix. A `[x]` FR whose acceptance reference does not resolve. (Fix: repoint to the real QA-format primitive/benchmark, or revert to `[ ]`; drop the `flowai-` prefix.)
- [16] [High] `documents/requirements.md:1171,1182` (FR-MEMEX) ↔ `documents/design.md:589,597` (SDS §3.15): SRS describes memex `ask` with `[[wikilink]]` citations and an "optional dual-link `[[slug|Name]] ([Name](slug.md))`"; SDS states the wikilink grammar is removed and the audit script + skills are SALP-only (`[REF:mx-<type>:<slug>]`). Direct SRS↔SDS contradiction (SDS + code are SALP-only; SRS is stale). (Fix: rewrite FR-MEMEX to SALP citations.)
- [17] [Low] `documents/index.md`: 5 SRS FR headings have no index row (FR-DOC-INDEX drift) — FR-DECISION-GATE (req:753, `[x]`), FR-UPWARD-NARRATION (760, `[x]`), FR-AI-CODE-REVIEW (767, `[x]`), FR-DIFF-OPTIONAL (774, `[x]`), FR-DOC-ANCHORS.HOOK (1205, `[ ]`). (Fix: add the 5 rows; the four shipped `[x]` FRs are the clearest gap.)

## Architectural Integrity (Cat 10)

- [18] [Low] `scripts/lib/salp-anchor-map.ts:19` imports `computeAutoSlug` from `../check-traceability.ts`: the shared-lib layer (`scripts/lib/`) reaches up into a top-level validator script (reverse dependency). Not a cycle. Layering is inferred from directory convention (not declared in AGENTS.md), hence Low. (Fix: move `computeAutoSlug` into `scripts/lib/` and have `check-traceability.ts` import it from there.)

## Conceptual Duplication (Cat 11)

- [19] [Medium] `scripts/build-plugins.ts` (`resolveModelTier`:100 switch; `CLAUDE_AGENT_KEEP`:61 — a 10-element set) vs `scripts/acceptance-tests/lib/cli-internals.ts` (`resolveModelTier`:80 + `DEFAULT_MODEL_MAPS.claude`:16; `IDE_FIELDS.claude`:46 — the identical 10-element set): the Claude tier→model table and the Claude frontmatter keep-list are coded twice in-repo. `cli-internals.ts` is itself a documented mirror of the external flowai-cli (FR-DIST.MAPPING); `build-plugins.ts` is a third copy the mirror warning does not cover. Driftable. (Fix: extract a shared module both import; rated Medium per anti-inflation tie-breaker given the documented-mirror architecture.)

## API Contract Review (Cat 12)

- [20] [Medium] `scripts/acceptance-tests/lib/usage.ts:29`: `findSessionTranscript` hardcodes `/Users/korchasa/.cursor/projects`. The only non-null usage path (`CursorAdapter.calculateUsage` → `calculateSessionUsage`) therefore works only on one developer's machine and returns `null` everywhere else. (Fix: resolve `~/.cursor/projects` from `$HOME`, or inject the projects dir.)
- [21] [Low] `scripts/acceptance-tests/lib/adapters/types.ts:5`: the `AgentAdapter.ide` union includes `"opencode"`, but no adapter exists and `createAdapter` (mod.ts:23) throws for it; `SUPPORTED_IDES` omits it. Type permits a value the runtime rejects (forward-declared; tracked by FR-ACCEPT.OPENCODE `[ ]`). (Fix: derive the union from `SupportedIde`, or land the OpencodeAdapter.)

## Cross-Implementation Symmetry (Cat 13)

- [22] [Medium] `calculateUsage` across adapters: `ClaudeAdapter` (claude.ts:305) and `CodexAdapter` (codex.ts:246) always return `null`; `CursorAdapter` (cursor.ts:164) returns real usage. There is no `capabilities` tag, so `runner.ts:345` cannot distinguish "usage unsupported" from "zero usage" — the asymmetry silently skews aggregate cost reports. (The interface (types.ts:45) allows `null`, hence Medium not High.) (Fix: add an explicit per-adapter capability flag, or have the runner surface "usage unsupported for IDE X".)
- [23] [Medium] Mock-hook generation diverges: `ClaudeAdapter` (claude.ts:226-276) hardens the hook (broad `Bash` matcher + env-assignment/subshell stripping + `input=$(cat)`) precisely because the `Bash(<prefix>:*)` matcher silently misses the `CLAUDECODE="" claude …` pattern; `CodexAdapter` (codex.ts:210-231) uses exactly that fragile `Bash(${tool}:*)` matcher with no stripping and `read -r input` (truncates multi-line payloads). The same mock-miss class will recur silently for Codex. (Codex hooks are experimental/feature-gated, bounding impact.) (Fix: extract a shared hardened mock-hook generator both adapters call.)

## Defensive-Programming Smell (Cat 14)

- [24] [Low] `scripts/acceptance-tests/lib/spawned_agent.ts:97-98` (`maxSteps = this.options.maxSteps || 10`, `stepTimeout = this.options.stepTimeout || 60000`) and `runner.ts:288` (`scenario.maxSteps || 10`): `||` coerces a passed `0` to the default (`??` intended). Low impact — `0` steps / `0` timeout are not meaningful configs. (Fix: use `?? ` or validate `> 0`.)

## Invariant ↔ Test Pairing (Cat 15)

- [25] [Medium] `scripts/resource-types.ts:31` `modelTierField = z.enum(["max","smart","fast","cheap","inherit"])` ↔ `scripts/build-plugins.ts:100` `resolveModelTier` switch (with `default: return tier`): no test proves every enum member has a switch case. A tier added to the enum falls through `default` and emits the raw tier string as a model name — silently invalid. (Fix: add a test iterating `modelTierField.options` against `resolveModelTier`.)
- [26] [Medium] `scripts/acceptance-tests/lib/adapters/mod.ts:11` `SUPPORTED_IDES` ↔ `createAdapter` switch (mod.ts:15): no test asserts every `SUPPORTED_IDES` entry resolves to an adapter; tests only call `createAdapter(DEFAULT_IDE)`. A new entry without a `case` throws only at runtime. (Fix: add a test iterating `SUPPORTED_IDES` and asserting each yields a defined adapter.)

## Public-Surface Quality (Cat 16)

- [27] [Low] `scripts/build-plugins.ts:178` `export const buildClaudePlugins = buildPlugins`: dead alias with 0 consumers (verified). (Fix: delete.)
- [28] [Low] `scripts/acceptance-tests/lib/adapters/mod.ts:2-4,12`: barrel re-exports `CursorAdapter`/`ClaudeAdapter`/`CodexAdapter` (production uses the `createAdapter` factory; the only direct importers — tests — import the leaf files) and exports an unused `SupportedIde` type (0 consumers). (Fix: have the barrel export only `createAdapter`, `SUPPORTED_IDES`, and the `AgentAdapter`/`ParsedAgentOutput` types.)

---

## Verify-gate drops (leads falsified or refined — not graded)

- [verified false] `scripts/lib/salp-anchor-map.ts` / `scripts/migrate-to-salp.ts`: flagged as "orphaned" — actually FR-DOC-ANCHORS (req:1199) ships `migrate-to-salp.ts` as a user-facing migration tool with 13 tests (`migrate-to-salp_test.ts`); not dead code.
- [verified false] `scripts/acceptance-tests/lib/system_health.ts:75-86` `sh()` catch → `""`: flagged as a "falsely-neutral snapshot that can pass the gate" — actually on darwin a probe failure yields `availableBytes = 0`, so the RAM-headroom gate fails **closed** (blocks), not a false healthy pass; `NEUTRAL_HEALTH` (pct 100) is returned only for non-darwin by design.
- [verified false] `scripts/acceptance-tests/lib/adapters/codex.ts:57` `outputFormat = "stream-json"`: flagged as "Codex must lie / logs mis-parsed" — actually `"stream-json"` intentionally selects the NDJSON formatter (`format_logs.ts:52-56`), which explicitly supports Codex event schemas; Codex logs parse correctly (pinned by `codex_test.ts:12`).
- [verified false] Cat 11 manifest emit (`Record<string,unknown>` literals in `build-plugins.ts`) vs `validate-plugins.ts` Zod schemas: `deno task build-plugins` runs `validate-plugins.ts` after build, gating output every run, so the shapes cannot drift silently.
- [verified false] Cat 13 adapter `getEnv` divergence (Cursor `{}` vs Claude/Codex zeroing a nesting env var): unverifiable (cannot confirm cursor-agent has an analogous nesting variable); dropped as speculative.
- [refined] `scripts/acceptance-tests/lib/usage.ts:44-47` `findSessionTranscript` catch: it logs to `console.error` then returns `null` (not a silent swallow) and the contract allows `null`; not graded as a defensive-smell finding.
- [note] Cat 13 `subtype` vocabulary divergence across the three adapters is real but inconsequential — `ParsedAgentOutput.subtype` is never read (folded into finding [2]).

---

## Summary

Total: **28 findings** — Critical: 0, High: 2, Medium: 13, Low: 13. (Critical share 0% — within the 35% ceiling.) Plus 7 verify-gate drops/refinements.

Per category:
- Structural Integrity (Cat 1): 0 — **clean**
- Code Hygiene (Cat 2): 2
- Complexity & Hotspots (Cat 3): 2
- Technical Debt (Cat 4): 1
- Consistency / Docs vs Code (Cat 5): 4
- Documentation Coverage (Cat 6): 1
- Instruction Coherence (Cat 7): 2
- Tooling Relevance (Cat 8): 2
- Documentation Health (Cat 9): 3
- Architectural Integrity (Cat 10): 1
- Conceptual Duplication (Cat 11): 1
- API Contract Review (Cat 12): 2
- Cross-Implementation Symmetry (Cat 13): 2
- Defensive-Programming Smell (Cat 14): 1
- Invariant ↔ Test Pairing (Cat 15): 2
- Public-Surface Quality (Cat 16): 2

Per severity:
- Critical: 0
- High: 2 (findings 15, 16 — both Documentation Health)
- Medium: 13 (findings 3, 4, 6, 7, 8, 11, 13, 19, 20, 22, 23, 25, 26)
- Low: 13 (findings 1, 2, 5, 9, 10, 12, 14, 17, 18, 21, 24, 27, 28)

Scan areas that came back clean (no findings):
- **Structural Integrity (Cat 1)** — file placement, kebab-case naming, every shipping pack has `pack.yaml`, config files at expected locations, no empty/orphaned directories.
- **Code Hygiene — tests & imports** — no zero-assertion / trivial / commented-out tests; `deno lint` reports no unused imports or dead symbols (the only lint diagnostics are intentional inline `jsr:`/`npm:` specifiers in shipped hook/skill scripts).
- **Documentation Health — GFM cross-links** — all `[text](path.md#anchor)` links in AGENTS.md / README / documents resolve (target file + GFM heading slug); SALP `[REF:..|..]` references are a separate, validated grammar.
- **Documentation Health — stale `[x]` acceptance references** — all spot-checked `*_test.ts` paths and benchmark scenario dirs for `[x]` FRs resolve on disk, except FR-UNIVERSAL.QA-FORMAT (finding 15).
- **Conceptual Duplication — plugin manifest schemas** — Claude vs Codex manifest/marketplace Zod schemas are deliberately distinct (different required fields) and share base atoms; not driftable clones.
