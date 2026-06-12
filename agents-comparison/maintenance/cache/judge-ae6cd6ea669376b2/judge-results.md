# Maintenance-Audit Judge Results

Reference checkout (ground truth): `/Users/korchasa/tmp/maint-gpt-20260612/fable-high`

Pooled unique findings: **139** (137 VALID, 2 INVALID after ground-truthing).

## Scoreboard

| Report | Valid | Invalid (errors) | Missed | Completeness | Precision |
|---|---|---|---|---|---|
| fable-high | 94 | 0 | 43 | 68.6% | 100.0% |
| fable-medium | 67 | 0 | 70 | 48.9% | 100.0% |
| gpt-5.5-high | 44 | 1 | 92 | 32.1% | 97.8% |
| opus-medium | 36 | 2 | 101 | 26.3% | 94.7% |
| opus-high | 31 | 0 | 106 | 22.6% | 100.0% |
| opus-xhigh | 28 | 0 | 109 | 20.4% | 100.0% |
| gpt-5.5-xhigh | 12 | 0 | 125 | 8.8% | 100.0% |
| gpt-5.5-medium | 11 | 0 | 126 | 8.0% | 100.0% |

Completeness = valid / (valid+missed) over the 137-finding VALID pool. Precision = valid / (valid+invalid).

## Per-report error lists (evidence checked)

### fable-high
- No invalid/inflated findings. All reported findings verified against the checkout.

### fable-medium
- No invalid/inflated findings. All reported findings verified against the checkout.

### gpt-5.5-high
- **P122 [severity-inflation]** — git-diff '(git diff failed)' sentinel graded Critical; degraded-evidence (other evidence sections remain), non-fatal -> Critical contradicted; appropriate Med/Low. Repo otherwise 0 Critical.

### gpt-5.5-medium
- No invalid/inflated findings. All reported findings verified against the checkout.

### gpt-5.5-xhigh
- No invalid/inflated findings. All reported findings verified against the checkout.

### opus-high
- No invalid/inflated findings. All reported findings verified against the checkout.

### opus-medium
- **P74 [wrong-claim]** — index.md:72 FR-MAINT row ('deno task check' maintenance) AGREES with SRS FR-MAINT block; claimed disagreement is false (confused with FR-MAINT-SCAN audit skill).
- **P75 [non-issue]** — orphan [x] md-skill FRs missing code marker: AGENTS.md:133-134 explicitly permits non-code/acceptance evidence for such FRs -> policy-compliant, not a defect.

### opus-xhigh
- No invalid/inflated findings. All reported findings verified against the checkout.

## Notable verification notes

- **P79** (fable-high, core↔adapter coupling): both import edges verified real; report explicitly hedged 'no module-level cycle', so counted VALID as a low-value layering observation (imports are type-only).
- **P70** (index.md drift): VALID across reports; minor inaccuracy in fable-high — `fr:doc-anchors.hook` is `[ ]` in SRS, not `[x]`, but the row is genuinely absent so the core claim holds.
- **P122**: the `(git diff failed)` sentinel is real (VALID pooled finding) but only gpt-5.5-high surfaced it, at Critical — graded as a severity-inflation error for that report.
- LOC claims (P14/P15) re-measured with `wc -l`: all matched exactly (build-plugins 897, build-plugins_test 1205, etc.).

## Pooled finding catalog (presence matrix)

Legend: ✓ present. Columns: FH=fable-high, FM=fable-medium, GH=gpt-5.5-high, GM=gpt-5.5-medium, GX=gpt-5.5-xhigh, OH=opus-high, OM=opus-medium, OX=opus-xhigh.

| ID | Cat | Sev | Valid | FH | FM | GH | GM | GX | OH | OM | OX | Finding |
|---|---|---|---|-|-|-|-|-|-|-|-|---|
| P1 | 1 | Low | VALID | ✓ | ✓ |  |  |  |  |  |  | acceptance-tests/lib mixes snake_case & kebab-case module names |
| P2 | 1 | Low | VALID | ✓ | ✓ |  |  |  |  |  |  | scripts/maintenance_scan_buckets_test.ts lone snake_case at scripts/ root |
| P3 | 1 | Low | VALID | ✓ |  |  |  |  |  |  |  | config_test.ts misnamed; tests llm.ts, no config.ts |
| P4 | 1 | Low | VALID | ✓ |  |  |  |  | ✓ |  |  | generate_agents.test.ts uses .test.ts vs _test.ts convention |
| P5 | 1 | Low | VALID | ✓ |  |  |  |  |  |  |  | scripts/detect-ide-env.sh orphan diagnostic, zero refs |
| P6 | 1 | Low | VALID | ✓ |  |  |  |  |  |  |  | deno.json lint.exclude vs fmt.exclude asymmetry (scenarios fmt'd not linted) |
| P10 | 2 | Low | VALID | ✓ | ✓ |  |  |  | ✓ | ✓ |  | salp-anchor-map extractFrAnchors/extractSdsAnchors over-exported (internal only) |
| P11 | 2 | Low | VALID |  |  |  |  |  | ✓ | ✓ |  | salp.ts serializeAnchor/serializeRef exported test-only |
| P12 | 2 | Low | VALID |  |  |  |  |  | ✓ | ✓ |  | composite-list.ts compositeNames exported test-only |
| P13 | 2 | Low | VALID |  |  |  |  |  |  | ✓ | ✓ | spawned_agent.ts parsedSubtype assigned never read |
| P7 | 2 | High | VALID | ✓ |  |  |  |  |  |  |  | spawned_agent_test.ts:250 zero-assertion test |
| P8 | 2 | Medium | VALID | ✓ | ✓ |  |  |  |  |  |  | utils.ts:195 moveFileWithCleanup unused export |
| P9 | 2 | Low | VALID | ✓ | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | build-claude-plugins.ts/validate-claude-plugins.ts + buildClaudePlugins dead wrappers |
| P14 | 3 | Medium | VALID | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 7 source files over 500-line bucket (build-plugins 897 ...) |
| P15 | 3 | High | VALID | ✓ |  |  |  |  |  |  |  | build-plugins_test.ts 1205 LOC (2.4x bucket) |
| P16 | 3 | Medium | VALID | ✓ | ✓ | ✓ |  | ✓ | ✓ | ✓ | ✓ | functions over 50-line threshold (buildPack, parseAtomSource, ...) |
| P17 | 3 | Medium | VALID | ✓ |  | ✓ | ✓ |  |  |  |  | trace-styles.ts getCSS 319-line static-asset function |
| P18 | 3 | High | VALID | ✓ |  |  |  |  |  |  |  | build-plugins.ts god module (~8 concerns) |
| P19 | 3 | High | VALID | ✓ | ✓ |  |  |  |  |  |  | sync-plugins-local.ts mixed concerns (dotenv/toml/exec/sync/cli) |
| P20 | 4 | Low | VALID | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | codex.ts:247 TODO(codex-usage), calculateUsage returns null |
| P21 | 5 | High | VALID | ✓ | ✓ |  |  |  |  |  |  | cache.ts hashes scripts/task-bench.ts (renamed); silently dropped from cache key |
| P22 | 5 | High | VALID | ✓ | ✓ | ✓ |  |  |  |  |  | FR-DEV-SYNC/SDS dev-sync mechanism (sync-local task, SessionStart hook, gitignored .claude) doesn't exist |
| P23 | 5 | High | VALID | ✓ | ✓ |  |  |  |  |  |  | 'deno task bench'/task-bench.ts rename drift across docs+CLI help |
| P24 | 5 | Medium | VALID | ✓ |  |  |  |  |  |  |  | FR-ACCEPT-CACHE/SDS cache key cites cli/src/*.ts; no cli/ dir |
| P25 | 5 | Medium | VALID | ✓ | ✓ |  |  |  |  |  | ✓ | FR-MEMEX memex- prefix path drift + audit_test count (6 vs 8) |
| P26 | 5 | Medium | VALID | ✓ | ✓ | ✓ | ✓ |  |  |  |  | README §Packs/Project-tree omits memex/ide-bridge/beta |
| P28 | 5 | Low | VALID | ✓ |  |  |  |  |  |  |  | design.md stale 'benchmarks/' directory token |
| P29 | 5 | Low | VALID | ✓ |  |  |  |  |  |  |  | design.md:135 pack-structure says run.sh; hooks use run.ts |
| P30 | 5 | Medium | VALID |  | ✓ | ✓ |  |  | ✓ |  | ✓ | README:179 + FR-PACKS.STRUCT SUBAGENT.md layout; actual flat <name>.md |
| P31 | 5 | Medium | VALID | ✓ | ✓ |  |  |  |  |  | ✓ | FR-COMPONENT stale counts 39/5 vs 43/7 + malformed find command |
| P32 | 5 | High | VALID | ✓ | ✓ |  |  |  |  |  | ✓ | design.md §3.5 cli/ monorepo + JSR + '1 hook' stale (3 hooks) |
| P33 | 5 | Medium | VALID | ✓ | ✓ |  |  |  |  |  |  | line cap 500 in docs vs SKILL_MAX_LINES=700 |
| P34 | 5 | Low | VALID |  |  |  |  |  |  | ✓ |  | README 'Requires Deno v2.x' but no engine constraint |
| P35 | 5 | Low | VALID | ✓ |  |  |  |  |  | ✓ |  | check-fr-coverage maintained/tested but not in task-check plan |
| P36 | 5 | High | VALID |  |  | ✓ |  |  |  |  |  | memex assets AGENTS.md section source-summary but type:source; mod.ts expects source-summary |
| P_AT | 5 | Medium | VALID | ✓ |  | ✓ |  |  |  |  |  | acceptance-testing.md stale (task-bench, adapter list omits codex, frozen results table) |
| P38 | 6 | Low | VALID | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | many exported symbols lack JSDoc (build-plugins, validate-plugins, etc.) |
| P40 | 7 | High | VALID | ✓ | ✓ |  |  |  |  | ✓ |  | AGENTS.md/SDS mandate legacy // FR-<ID> comments that check-traceability errors on |
| P41 | 7 | High | VALID | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | framework/AGENTS.md flowai-* naming vs root no-prefix + check-naming-prefix |
| P42 | 7 | High | VALID | ✓ |  |  |  |  |  | ✓ |  | AGENTS.md run-ALL-acceptance-tests vs defer-full-sweep-to-user contradiction |
| P43 | 7 | Medium | VALID | ✓ |  |  |  |  |  |  |  | AGENTS.md 2-level FR rule vs 3-level FR-DIST.BUNDLE.PIN |
| P44 | 7 | Medium | VALID | ✓ | ✓ |  |  | ✓ |  |  | ✓ | design.md §3.0 Commands 9 vs 8 / generated paths 7 vs 8 self-contradiction |
| P46 | 7 | Medium | VALID | ✓ |  |  |  |  |  |  |  | Documentation Hierarchy diverged AGENTS.md vs design.md |
| P47 | 7 | Low | VALID | ✓ | ✓ |  |  |  |  |  |  | framework/AGENTS.md §Packs omits ide-bridge |
| P48 | 7 | Low | VALID | ✓ |  |  |  |  |  |  |  | AGENTS.md READ-ONLY claim vs maintained sections ambiguous |
| P49 | 7 | Medium | VALID |  |  | ✓ |  |  | ✓ | ✓ |  | Tasks: AGENTS.md flat+gitignored vs nested committed reality/SRS |
| P50 | 7 | Medium | VALID |  |  |  |  |  | ✓ |  |  | GODS frontmatter template shows only implements:, missing date/status/tags |
| P51 | 7 | Medium | VALID |  | ✓ | ✓ |  |  |  |  |  | Supported-IDE set stated 3 (Cursor/Claude/OpenCode) vs 4 incl Codex |
| P52 | 7 | High | VALID |  | ✓ | ✓ |  |  |  |  |  | FR-DOC-LINT + scan-buckets define doc-health in deprecated GFM grammar |
| P53 | 7 | Low | VALID |  |  |  |  |  |  | ✓ |  | AGENTS.md vague 'etc.'/unquantifiable cost-vs-defect phrases |
| P54 | 7 | Medium | VALID |  |  |  |  |  |  |  | ✓ | CI-await SRS/SDS fixed 30x60 vs config-driven push.md |
| P55 | 7 | High | VALID |  |  | ✓ |  |  |  |  |  | README 'seven packs' overstates Codex availability (hook-only beta inert) |
| P56 | 7 | High | VALID |  |  | ✓ |  |  |  |  |  | Codex hook flag naming codex_hooks vs plugin_hooks/hooks drift |
| P57 | 8 | High | VALID | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | hook path .claude/scripts/flowai-skill-structure-validate/run.ts doesn't exist |
| P58 | 8 | Low | VALID | ✓ |  | ✓ |  |  | ✓ | ✓ |  | acceptance-test-runner agent references stale benchmarks/ + flow-* ids |
| P59 | 8 | Low | VALID | ✓ | ✓ |  |  |  |  | ✓ |  | cross-IDE dev-tooling parity gaps (session-error-analyzer/-history-analyzer) |
| P60 | 8 | Low | VALID | ✓ | ✓ | ✓ |  |  |  |  | ✓ | list_sessions.py python dep vs declared TS/Deno stack |
| P61 | 8 | Low | VALID | ✓ |  |  |  |  |  |  |  | devcontainer installs OpenCode but no opencode adapter |
| P62 | 8 | Low | VALID | ✓ |  |  |  |  |  |  |  | .mcp.json empty placeholder |
| P63 | 8 | Medium | VALID |  |  | ✓ |  |  |  |  |  | acceptance-tests-all SKILL.md discovers only skills, omits command/pack scenarios |
| P37 | 9 | Low | VALID |  |  | ✓ |  |  |  |  |  | generate-skill-composites.ts header docs obsolete --check behavior |
| P64 | 9 | High | VALID | ✓ | ✓ |  |  |  | ✓ |  | ✓ | FR-UNIVERSAL.QA-FORMAT [x] cites flowai-conduct-qa-session (fixture-only) |
| P65 | 9 | High | VALID | ✓ | ✓ |  |  |  |  |  |  | FR-DIST.MARKETPLACE 'Six packs' vs seven (build-plugins/README) |
| P66 | 9 | Medium | VALID | ✓ | ✓ |  |  |  |  |  |  | FR-ONBOARD [x] maintenance-schedule criterion unsatisfied |
| P67 | 9 | Medium | VALID | ✓ |  |  |  |  |  |  |  | Implementation-Order roadmap stale + dangling FR-INIT.RERUN/ACCEPT.COLOC/INIT.IDEMPOTENT |
| P68 | 9 | Medium | VALID | ✓ |  |  |  |  |  |  |  | Dangling FR refs FR-HOOK-DOCS, FR-IDE-SCOPE (no SRS section) |
| P69 | 9 | Medium | VALID | ✓ | ✓ | ✓ |  |  |  |  |  | FR-DOC-INDEX row format GFM vs SALP actual index.md |
| P70 | 9 | Low | VALID | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | index.md status drift + 4-5 missing FR rows |
| P71 | 9 | Low | VALID | ✓ | ✓ |  |  |  |  |  |  | design.md 'Key Agents (7)' lists 6, omits ide-bridge worker.md |
| P73 | 9 | High | VALID |  |  |  |  |  |  |  | ✓ | FR-MEMEX SRS wikilink vs SDS SALP-only contradiction |
| P74 | 9 | Low | **INVALID** |  |  |  |  |  |  | ✓ |  | index FR-MAINT row 'disagrees' with SRS |
| P75 | 9 | Low | **INVALID** |  |  |  |  |  |  | ✓ |  | orphan [x] md-skill FRs missing code marker |
| P77 | 9 | Medium | VALID |  |  | ✓ |  |  |  |  |  | requirements.md:1202 wikilink grep guard fails on fixtures |
| P78 | 10 | Medium | VALID | ✓ | ✓ | ✓ |  |  | ✓ |  | ✓ | salp-anchor-map.ts imports computeAutoSlug from check-traceability.ts (reverse dep) |
| P79 | 10 | Medium | VALID | ✓ |  |  |  |  |  |  |  | core<->adapter bidirectional dir coupling (AgentAdapter in adapters/types) |
| P80 | 10 | Low | VALID | ✓ |  |  |  |  |  |  |  | framework mod.ts import dev-harness via @acceptance-tests/ alias inverts direction |
| P81 | 10 | Medium | VALID |  | ✓ |  |  |  |  |  |  | acceptance-tests/lib files reach up to scripts/utils.ts for ansi |
| P82 | 11 | High | VALID | ✓ | ✓ | ✓ |  |  |  |  | ✓ | model-tier map+agent transform duplicated build-plugins vs cli-internals (divergent default) |
| P83 | 11 | Medium | VALID | ✓ |  |  |  |  |  |  |  | FR-ID regex duplicated across 6 files |
| P84 | 11 | Low | VALID | ✓ |  |  |  |  |  |  |  | AcceptanceTestScenario vs AcceptanceTestAgentScenario near-duplicate |
| P85 | 11 | Low | VALID | ✓ |  |  |  |  |  |  |  | migrate-to-salp hand-rolls REF building vs lib/salp serializers |
| P86 | 11 | Medium | VALID |  | ✓ |  |  |  | ✓ |  |  | parseFrontmatter reimplemented 3x (resource-types/validate-plugins/cli-internals) |
| P87 | 11 | Medium | VALID |  |  |  |  |  |  | ✓ |  | setupMocks scaffold coded 3x across adapters |
| P88 | 11 | Medium | VALID |  |  |  |  |  |  | ✓ |  | parseOutput NDJSON loop duplicated 3x |
| P89 | 11 | Medium | VALID |  |  | ✓ |  |  |  |  |  | SALP context stripping dup check-salp vs doc-anchors-validate hook |
| P90 | 11 | Medium | VALID |  | ✓ |  |  |  |  |  |  | two IDE rosters drifted (SUPPORTED_IDES vs cli-internals incl opencode) |
| P100 | 12 | Low | VALID | ✓ |  |  |  |  |  | ✓ |  | usage.ts model field hardcoded 'estimated (gemini-3-flash-preview baseline)' |
| P91 | 12 | High | VALID | ✓ | ✓ |  |  |  | ✓ |  |  | BenchmarkResult required-number tokensUsed/totalCost/toolCallsCount sentinel conflation |
| P92 | 12 | Medium | VALID | ✓ | ✓ | ✓ |  |  |  |  |  | stepTimeoutMs three contradictory defaults (none/300000/60000) |
| P93 | 12 | High | VALID | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | usage.ts:29 hardcoded /Users/korchasa/.cursor/projects |
| P94 | 12 | Low | VALID | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | adapters/types.ts opencode dead union member |
| P95 | 12 | Low | VALID | ✓ | ✓ |  |  |  | ✓ |  |  | dead vocab input_required subtype + WAIT sentinel unreachable |
| P96 | 12 | High | VALID |  | ✓ |  |  |  |  |  |  | ModelConfig temperature/provider ignored by cliChatCompletion; usage never populated |
| P97 | 12 | Medium | VALID |  | ✓ |  |  |  |  |  |  | buildSkippedResult reports skipped scenario as perfect pass |
| P98 | 12 | Medium | VALID |  |  |  |  |  |  | ✓ |  | codex outputFormat 'stream-json' overloads Claude literal |
| P99 | 12 | Low | VALID |  |  | ✓ |  |  |  | ✓ |  | version.ts cliVersion returns '' in-band sentinel |
| P101 | 13 | High | VALID | ✓ |  |  |  |  | ✓ |  |  | cursor.ts parseOutput never populates assistantText (degrades emulator context) |
| P102 | 13 | Medium | VALID | ✓ | ✓ | ✓ |  | ✓ | ✓ | ✓ | ✓ | mock matcher divergence: claude broad Bash vs codex Bash(${tool}:*) |
| P103 | 13 | Medium | VALID | ✓ | ✓ | ✓ |  | ✓ |  |  | ✓ | codex setupMocks requires --enable codex_hooks never passed (inert) |
| P104 | 13 | High | VALID | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | calculateUsage parity drift + codex comment falsely claims Claude returns real numbers |
| P105 | 13 | Low | VALID | ✓ |  |  |  |  |  |  |  | ParsedAgentOutput.raw: cursor overwrites last vs full array |
| P106 | 13 | Low | VALID | ✓ |  |  |  |  |  |  |  | buildArgs name option handled 3 ways |
| P107 | 13 | Low | VALID | ✓ | ✓ |  |  |  |  |  |  | codex resume argv omits --cd workspace |
| P108 | 13 | Medium | VALID |  | ✓ |  |  |  |  |  |  | runner skipDirs hardcodes only .claude (not .cursor/.codex) |
| P109 | 13 | Medium | VALID |  | ✓ |  |  |  | ✓ |  |  | ParsedAgentOutput subtype vocab honored only by Claude |
| P110 | 13 | High | VALID |  |  | ✓ |  |  | ✓ |  |  | per-line JSON.parse parse errors silently skipped, no warning channel |
| P111 | 14 | High | VALID | ✓ | ✓ |  |  |  |  |  |  | judge.ts fabricates pass:false on judge-infra failure |
| P112 | 14 | High | VALID | ✓ |  |  |  |  |  |  |  | acceptance_runtime executeTask catch console.error only; crashed scenario omitted |
| P113 | 14 | Medium | VALID | ✓ | ✓ |  |  |  |  |  |  | runner non-NotFound framework-copy failures downgraded to warn |
| P114 | 14 | Medium | VALID | ✓ |  |  |  |  |  |  |  | runner CLAUDE.md symlink catch swallows AlreadyExists |
| P115 | 14 | Medium | VALID | ✓ | ✓ |  |  |  |  |  |  | runner readTaskFiles catch-all collapses errors to '(no task files found)' |
| P116 | 14 | Medium | VALID | ✓ | ✓ | ✓ |  |  |  |  | ✓ | maxSteps||10/stepTimeout||60000 boolean coercion vs ?? sibling |
| P117 | 14 | Medium | VALID | ✓ | ✓ |  |  |  |  |  |  | process_watchdog runCmd catch '' guard fails open |
| P118 | 14 | Medium | VALID | ✓ |  |  |  |  |  |  |  | cursor parseOutput brace scanner ignores braces in strings |
| P119 | 14 | Low | VALID | ✓ | ✓ |  |  |  |  |  |  | system_health sh() catch '' -> false 'unhealthy' |
| P120 | 14 | Low | VALID | ✓ |  |  |  |  |  |  |  | acceptance_runtime updateLatestSymlink bare catch swallows all |
| P121 | 14 | Low | VALID | ✓ |  |  |  |  |  |  |  | types.ts targetAgentPath statSync try/catch branching + silent legacy fallback |
| P122 | 14 | Critical | VALID |  |  | ✓ |  |  |  |  |  | runner git diff failure -> '(git diff failed)' sentinel in judge evidence |
| P125 | 14 | Medium | VALID |  |  |  |  |  |  | ✓ |  | llm.ts catch branches on JSON.parse throw (exception-as-control-flow) |
| P126 | 14 | Low | VALID |  |  |  |  |  |  | ✓ |  | cache.ts readCache collapses missing/corrupt/schema to null |
| P127 | 15 | High | VALID | ✓ | ✓ |  |  |  |  |  |  | AgentAdapter integration_test --ignored in CI; real-binary path never runs |
| P128 | 15 | Medium | VALID | ✓ |  |  |  |  |  |  | ✓ | SUPPORTED_IDES / ide-union / config no cross-reference test |
| P129 | 15 | Medium | VALID | ✓ | ✓ | ✓ |  |  |  | ✓ |  | DEFAULT_PACKS omits ide-bridge; no parity test |
| P130 | 15 | Medium | VALID | ✓ |  |  |  |  |  |  |  | CLAUDE_AGENT_KEY_ORDER/SKILL_KEY_ORDER no schema test |
| P131 | 15 | Medium | VALID | ✓ |  |  |  |  | ✓ |  |  | composite canon clauses (c)(d)(e) untested |
| P132 | 15 | Medium | VALID | ✓ | ✓ |  |  |  |  |  |  | design.md 'Run:' header MUST unenforced |
| P133 | 15 | Medium | VALID |  | ✓ | ✓ |  | ✓ | ✓ | ✓ |  | -beta 60-day lifecycle invariant unautomated |
| P135 | 15 | Low | VALID | ✓ |  |  |  |  |  |  |  | no version_test.ts for adapters/version.ts |
| P136 | 15 | Low | VALID |  | ✓ |  |  |  |  |  |  | TRIGGER_TYPES/TRIGGER_INDEXES no stability test |
| P137 | 15 | Medium | VALID |  |  |  |  |  |  |  | ✓ | resolveModelTier enum exhaustiveness untested (default passthrough) |
| P138 | 15 | Medium | VALID |  |  | ✓ |  |  |  | ✓ |  | push-stops-on-ci-timeout scenario deferred/absent |
| P139 | 15 | High | VALID |  |  | ✓ |  |  |  |  |  | flowai-cli cross-IDE hook install acceptance manual-gated |
| P140 | 15 | High | VALID |  |  | ✓ |  |  |  |  |  | 17-script contract invariant no inventory test |
| P141 | 15 | High | VALID |  |  |  | ✓ |  |  |  |  | deno.json lint/fmt/task-check exclude parity invariant untested+drifting |
| P142 | 16 | Medium | VALID | ✓ | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | adapters/mod.ts barrel re-exports adapter classes zero external consumers |
| P143 | 16 | Medium | VALID | ✓ | ✓ |  |  |  |  |  |  | Benchmark*/AcceptanceTest* dual vocabulary |
| P144 | 16 | Medium | VALID | ✓ | ✓ |  |  |  | ✓ | ✓ |  | check-skills/check-agents re-export parseFrontmatter test-only |
| P145 | 16 | Medium | VALID |  | ✓ |  |  |  |  |  |  | deno.json build-plugins/validate-plugins tasks byte-identical |
| P146 | 16 | Medium | VALID |  |  | ✓ |  |  |  |  |  | check-salp/migrate-to-salp silently ignore unknown --flags |
