# Maintenance Report

Generated: 2026-06-12

Verification baseline: `NO_COLOR=1 deno task check` passed. The scan covered all 16 maintenance categories, then applied the verify gate and severity calibration.

## Finding 1 — [Medium] Category 3: Complexity & Hotspots

- Evidence:
  - `scripts/build-plugins.ts:1-897` — 897 lines.
  - `scripts/generate-skill-composites.ts:1-763` — 763 lines.
  - `scripts/sync-plugins-local.ts:1-731` — 731 lines.
  - `scripts/validate-plugins.ts:1-714` — 714 lines.
  - `scripts/acceptance-tests/lib/runner.ts:1-698` — 698 lines.
  - `scripts/check-skills.ts:1-651` — 651 lines.
  - `scripts/acceptance-tests/lib/trace-renderer.ts:1-520` — 520 lines.
- Rationale: Seven production framework/tool files exceed the 500-line default threshold; the largest is 1.79x, so this is Medium, not High.
- Suggested remediation: split by concern: plugin emitters, validators, local sync planners, runner orchestration, trace rendering, and skill-rule validators.

## Finding 2 — [Medium] Category 3: Complexity & Hotspots

- Evidence:
  - `scripts/acceptance-tests/lib/utils.ts:99-205` — `copyFrameworkToIdeDir` is 108 lines and copies skills, commands, agents, assets, hooks, and mutates command frontmatter.
  - `scripts/task-acceptance-tests.ts:66-119` — `main` is 54 lines and mixes regeneration, config, locking, discovery, cache precheck, execution, summaries, and finalization.
- Rationale: Two functions exceed the 50-line function threshold and mix orchestration with domain steps.
- Suggested remediation: extract per-resource copy helpers and acceptance-run phases with names matching the existing lifecycle.

## Finding 3 — [Low] Category 4: Technical Debt

- Evidence:
  - `scripts/acceptance-tests/lib/adapters/codex.ts:246-253` — `calculateUsage` returns `null` with `TODO(codex-usage)` and notes that aggregate cost reports are skewed for Codex runs.
- Rationale: Single isolated TODO documents a known capability gap; impact is real but localized.
- Suggested remediation: add a Codex session usage parser or make aggregate reports explicitly mark Codex usage as unavailable.

## Finding 4 — [Medium] Category 5: Consistency (Docs vs Code)

- Evidence:
  - `documents/design.md:51` says "Commands by pack (8)".
  - `documents/design.md:110` says "Commands: 9 (3 atom-generated, 3 composite-generated, 3 standalone)".
  - `documents/design.md:113` says "Gitignored generated paths: 7".
  - `documents/design.md:42-49` lists 8 generated targets.
  - Verification commands returned 8 command directories and 8 generator targets:
    - `find framework/*/commands -mindepth 1 -maxdepth 1 -type d | wc -l` -> 8.
    - `deno run -A scripts/generate-skill-composites.ts --list-targets | wc -l` -> 8.
- Rationale: SDS inventory contradicts both itself and current generator output.
- Suggested remediation: change the SDS summary to 8 commands and 8 gitignored generated paths, with 2 atom-generated commands, 3 composite-generated commands, and 3 standalone commands.

## Finding 5 — [Medium] Category 6: Documentation Coverage

- Evidence:
  - Verification check found 81 exported TypeScript symbols without an immediately preceding doc comment.
  - Exact missing-doc sites:
    - `scripts/check-traceability.ts:232` — `export function validateTaskRefs(`.
    - `scripts/validate-plugins.ts:115` — `export const MarketplaceSchema = z.object({`.
    - `scripts/validate-plugins.ts:138` — `export const PluginManifestSchema = z.object({`.
    - `scripts/validate-plugins.ts:169` — `export const CodexMarketplaceSchema = z.object({`.
    - `scripts/validate-plugins.ts:182` — `export const CodexPluginManifestSchema = z.object({`.
    - `scripts/validate-plugins.ts:215` — `export const HooksFileSchema = z.object({`.
    - `scripts/validate-plugins.ts:234` — `export async function validateMarketplaceTree(`.
    - `scripts/sync-plugins-local.ts:23` — `export const ENV_AUTO_INSTALL_PLUGINS = "AUTO_INSTALL_PLUGINS";`.
    - `scripts/sync-plugins-local.ts:176` — `export function planCodexPluginAdds(`.
    - `scripts/sync-plugins-local.ts:233` — `export type ClaudeActionPlan = {`.
    - `scripts/migrate-to-salp.ts:28` — `export type SalpId = { ns: string; id: string };`.
    - `scripts/migrate-to-salp.ts:29` — `export type AnchorMap = Map<string, SalpId>;`.
    - `scripts/migrate-to-salp.ts:31` — `export type MigrateOptions = {`.
    - `scripts/migrate-to-salp.ts:42` — `export class SalpMigrationError extends Error {`.
    - `scripts/check-pack-refs.ts:23` — `export const LEAKED_FILENAMES = [`.
    - `scripts/check-pack-refs.ts:28` — `export const LEAKED_DIRNAMES = ["atoms", "composites"] as const;`.
    - `scripts/check-pack-refs.ts:34` — `export interface PackRefError {`.
    - `scripts/check-skills.ts:36` — `export type SkillError = {`.
    - `scripts/check-skills.ts:400` — `export async function collectDocumentationSchemaIndirectionErrors(`.
    - `scripts/check-salp.ts:34` — `export type FindingKind =`.
    - `scripts/check-salp.ts:40` — `export type Finding = {`.
    - `scripts/check-salp.ts:48` — `export type CollectOptions = {`.
    - `scripts/check-trigger-coverage.ts:21` — `export const TRIGGER_TYPES = ["pos", "adj", "false"] as const;`.
    - `scripts/check-trigger-coverage.ts:22` — `export const TRIGGER_INDEXES = [1] as const;`.
    - `scripts/check-trigger-coverage.ts:24` — `export type TriggerType = typeof TRIGGER_TYPES[number];`.
    - `scripts/check-trigger-coverage.ts:37` — `export type CoverageError = {`.
    - `scripts/check-task-format.ts:27` — `export type ValidationLevel = "error" | "warning";`.
    - `scripts/check-task-format.ts:29` — `export type TaskValidationError = {`.
    - `scripts/check-task-format.ts:35` — `export type TaskClassification = "new-shape" | "legacy" | "ignored";`.
    - `scripts/check-task-format.ts:53` — `export type DoDDerivation = {`.
    - `scripts/check-task-format.ts:220` — `export function validateLegacyTask(filePath: string): TaskValidationError[]`.
    - `scripts/build-plugins.ts:38` — `export const DEFAULT_MARKETPLACE_NAME = "flowai-plugins";`.
    - `scripts/build-plugins.ts:39` — `export const DEFAULT_PACKS = [`.
    - `scripts/build-plugins.ts:98` — `export type ModelTier = "max" | "smart" | "fast" | "cheap" | "inherit";`.
    - `scripts/build-plugins.ts:100` — `export function resolveModelTier(`.
    - `scripts/build-plugins.ts:120` — `export interface BuildOptions {`.
    - `scripts/build-plugins.ts:133` — `export interface PluginPackArtifact {`.
    - `scripts/build-plugins.ts:146` — `export async function buildPlugins(opts: BuildOptions): Promise<void> {`.
    - `scripts/build-plugins.ts:178` — `export const buildClaudePlugins = buildPlugins;`.
    - `scripts/build-plugins.ts:268` — `export function pluginNameForPack(packName: string): string {`.
    - `scripts/check-naming-prefix.ts:25` — `export type NamingError = {`.
    - `scripts/lib/salp-anchor-map.ts:21` — `export type SalpId = { ns: string; id: string };`.
    - `scripts/lib/salp-anchor-map.ts:22` — `export type AnchorMap = Map<string, SalpId>;`.
    - `scripts/lib/composite-list.ts:41` — `export function compositeNames(): ReadonlySet<string> {`.
    - `scripts/lib/composite-list.ts:45` — `export function isComposite(skillName: string): boolean {`.
    - `scripts/lib/salp.ts:41` — `export type SalpPos = { line: number; col: number };`.
    - `scripts/lib/salp.ts:43` — `export type SalpAnchor = { ns: string; id: string; pos: SalpPos };`.
    - `scripts/lib/salp.ts:45` — `export type SalpRef = {`.
    - `scripts/lib/salp.ts:52` — `export type LegacyGrammarKind =`.
    - `scripts/lib/salp.ts:57` — `export type LegacyGrammarHit = {`.
    - `scripts/lib/salp.ts:163` — `export function serializeAnchor(a: { ns: string; id: string }): string {`.
    - `scripts/lib/salp.ts:167` — `export function serializeRef(`.
    - `scripts/check-agents.ts:22` — `export type AgentError = {`.
    - `scripts/generate-skill-composites.ts:22` — `export const MANIFEST_PATH = "framework/composites.yaml";`.
    - `scripts/generate-skill-composites.ts:24` — `export interface AtomEntry {`.
    - `scripts/generate-skill-composites.ts:33` — `export interface CompositePhase {`.
    - `scripts/generate-skill-composites.ts:44` — `export interface CompositeEntry {`.
    - `scripts/generate-skill-composites.ts:53` — `export interface Manifest {`.
    - `scripts/generate-skill-composites.ts:193` — `export function parseAtomSource(`.
    - `scripts/resource-types.ts:13` — `export const DESCRIPTION_MAX_LENGTH = 1024;`.
    - `scripts/resource-types.ts:34` — `export const SkillFrontmatterSchema = z.object({`.
    - `scripts/resource-types.ts:49` — `export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;`.
    - `scripts/resource-types.ts:69` — `export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;`.
    - `scripts/check-srs-evidence.ts:31` — `export type EvidenceClaim = {`.
    - `framework/beta/hooks/doc-anchors-validate/run.ts:129` — `export type Finding = {`.
    - `framework/beta/hooks/doc-anchors-validate/run.ts:137` — `export type StopHookInput = {`.
    - `framework/beta/hooks/doc-anchors-validate/run.ts:142` — `export type Decision = { block: boolean; reason?: string };`.
    - `framework/core/commands/init/scripts/generate_agents.ts:281` — `export type {`.
    - `framework/devtools/skills/engineer-skill/scripts/validate_skill.ts:9` — `export function validateSkill(`.
    - `framework/devtools/skills/engineer-skill/scripts/package_skill.ts:16` — `export async function packageSkill(`.
    - `framework/devtools/skills/engineer-skill/scripts/init_skill.ts:92` — `export function titleCaseName(name: string): string {`.
    - `framework/devtools/skills/engineer-skill/scripts/init_skill.ts:109` — `export async function initSkill(`.
    - `framework/devtools/skills/engineer-rule/scripts/init_rule.ts:81` — `export function initRule(`.
    - `framework/devtools/skills/engineer-rule/scripts/validate_rule.ts:304` — `export function validateRule(path: string): [boolean, string] {`.
    - `framework/devtools/skills/engineer-command/scripts/init_command.ts:192` — `export function initCommand(`.
    - `framework/devtools/skills/engineer-command/scripts/validate_command.ts:21` — `export function validateCommand(commandPath: string): [boolean, string] {`.
    - `framework/memex/hooks/status/run.ts:122` — `export async function gatherStatus(root: string): Promise<Status> {`.
    - `framework/memex/hooks/status/run.ts:134` — `export function formatStatus(s: Status): string {`.
    - `framework/memex/scripts/audit.ts:184` — `export async function audit(pagesDir: string): Promise<string[]> {`.
    - `framework/engineering/skills/analyze-context/scripts/count_tokens.ts:15` — `export function countTokens(`.
    - `framework/engineering/skills/draw-mermaid-diagrams/scripts/validate.ts:19` — `export async function validateMermaid(`.
- Rationale: Public/exported TypeScript surface has systematic missing documentation, but behavior remains validated by tests.
- Suggested remediation: add concise "why/how" JSDoc to exported APIs that form script/library contracts; avoid comments for private implementation details.

## Finding 6 — [High] Category 7: Instruction Coherence

- Evidence:
  - `framework/AGENTS.md:8` says command names are `flowai-*`, `flowai-setup-*`.
  - `framework/AGENTS.md:9` says skill names are `flowai-*`.
  - `AGENTS.md:75-76` says command and skill names are short kebab-case without the legacy `flowai-` prefix.
  - `README.md:112` says source primitive names are short kebab-case and plugin namespace carries the `flowai` brand.
- Rationale: Two active instruction surfaces give opposite naming rules for framework primitives.
- Suggested remediation: update `framework/AGENTS.md:8-9` to match the short-name source contract and plugin namespace branding rule.

## Finding 7 — [Medium] Category 8: Tooling Relevance

- Evidence:
  - `.codex/hooks.json:5-10` configures `PostToolUse` for `Write|Edit` with command `deno run -A .claude/scripts/flowai-skill-structure-validate/run.ts`.
  - Filesystem check: `.claude/scripts` and `.claude/scripts/flowai-skill-structure-validate` do not exist.
  - Existing hook implementation is under `framework/devtools/hooks/skill-structure-validate/run.ts:12-21`.
- Rationale: Active Codex hook config points at a missing local script, so the hook cannot run as configured.
- Suggested remediation: either remove the stale repo-local hook or point it at an installed/generated hook path that exists in this checkout.

## Finding 8 — [Low] Category 9: Documentation Health

- Evidence:
  - `documents/requirements.md:753-779` defines four implemented FRs: `FR-DECISION-GATE`, `FR-UPWARD-NARRATION`, `FR-AI-CODE-REVIEW`, `FR-DIFF-OPTIONAL`.
  - `documents/index.md:45-60` has no rows for those four FRs.
  - `documents/index.md:50` and `documents/index.md:52` mark `FR-DOC-IDS` and `FR-DOC-LINKS` as `[x]`.
  - `documents/requirements.md:1217-1229` marks both `FR-DOC-LINKS` and `FR-DOC-IDS` as `[~] Superseded`.
- Rationale: The navigation index is stale: missing current implemented FRs and stale status for two superseded FRs.
- Suggested remediation: add the four missing FR rows and update the two superseded rows to match SRS status.

## Finding 9 — [Low] Category 12: API Contract Review

- Evidence:
  - `scripts/acceptance-tests/lib/adapters/types.ts:3-5` allows `AgentAdapter.ide` to be `"opencode"`.
  - `scripts/acceptance-tests/lib/adapters/mod.ts:11-27` registers only `cursor`, `claude`, and `codex`; `createAdapter("opencode")` throws.
  - `documents/requirements.md:244-251` documents `FR-ACCEPT.OPENCODE` as pending and says `"opencode"` is currently a dead enum value.
- Rationale: Type-level API accepts an IDE that runtime factory support rejects; this is already tracked as a pending requirement, so Low.
- Suggested remediation: implement and register `OpencodeAdapter`, or remove `"opencode"` from the union until implementation lands.

## Finding 10 — [High] Category 13: Cross-Implementation Symmetry

- Evidence:
  - `scripts/acceptance-tests/lib/runner.ts:205-210` calls `adapter.setupMocks(...)` uniformly and then logs that hooks were created.
  - `scripts/acceptance-tests/lib/adapters/codex.ts:188-197` says Codex mocks require a hook feature flag and, when the feature is off, the mock "does nothing" and falls through to real tool execution.
  - `scripts/acceptance-tests/lib/adapters/codex.ts:85-112` builds both resume and initial `codex exec` arguments without enabling any hook feature.
  - `README.md:114` notes Codex hook flag naming changed from `codex_hooks` to `hooks`; `README.md:118` says Codex hook execution is feature-gated and requires `[features].plugin_hooks = true`.
- Rationale: One adapter exposes the same mock setup contract as the others but can silently skip mocks and run real tools.
- Suggested remediation: fail fast when Codex hooks are unavailable, or enable the current Codex hook feature explicitly in runner args/config before claiming mocks were installed.

## Finding 11 — [Medium] Category 15: Invariant ↔ Test Pairing

- Evidence:
  - `documents/design.md:150` defines a `-beta` primitive lifecycle invariant: promote/remove within 60 days and require benchmark coverage for each behavioral delta.
  - `find framework -type d -name '*-beta' -print` returned no current beta primitive directories.
  - Search of `scripts`, `framework`, and tests for `beta.*60`, `60.*beta`, `coverage parity`, and `-beta.*scenario` found historical task prose and unrelated beta-pack tests, but no validator or acceptance test enforcing the invariant.
- Rationale: A documented future-facing invariant has no machine check, so a stale `*-beta` primitive could pass `deno task check`.
- Suggested remediation: add a validator or maintenance acceptance scenario for stale `*-beta` detection and beta-delta coverage pairing.

## Summary

Severity counts:

- Critical: 0
- High: 2
- Medium: 6
- Low: 3

Category counts:

- Category 3 Complexity & Hotspots: 2
- Category 4 Technical Debt: 1
- Category 5 Consistency (Docs vs Code): 1
- Category 6 Documentation Coverage: 1
- Category 7 Instruction Coherence: 1
- Category 8 Tooling Relevance: 1
- Category 9 Documentation Health: 1
- Category 12 API Contract Review: 1
- Category 13 Cross-Implementation Symmetry: 1
- Category 15 Invariant ↔ Test Pairing: 1

Clean scan areas:

- Category 1 Structural Integrity: no verified misplaced assets/configs, empty source dirs, duplicate sources of truth, orphan generated outputs, or dead structural directories.
- Category 2 Code Hygiene: project lint/check passed; no verified real trivial tests, commented-out code, or unused imports in production scope.
- Category 10 Architectural Integrity: import-cycle scan checked 466 TypeScript files and found no cycles; no verified layer leaks.
- Category 11 Conceptual Duplication: no verified duplicate rule engines, schema clones, or parallel decision tables beyond findings already categorized above.
- Category 14 Defensive-Programming Smell: no verified silent fallback/suppression issue beyond the Codex mock-contract finding categorized under Category 13.
- Category 16 Public-Surface Quality: no verified public-surface synonym or stale alias issue requiring a separate finding.

