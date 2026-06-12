# Build Brief — Claude Code Session Analyzer (one version per model×effort cell)

You are building ONE complete version of a **desktop app** in the CURRENT directory.
Functional spec: read the REQUIREMENTS section below in this same file in full — it is the contract.
This brief OVERRIDES the spec where they differ.

## Hard requirement: a real desktop window (gen1 failure — do not repeat)
Gen1 produced localhost web servers opened as browser tabs. That is NOT acceptable here.
- The app MUST open as a **standalone desktop window**: no browser address bar, no tabs, its own window.
- Acceptable implementations, in order of preference:
  1. **Tauri v2** (if the Rust toolchain works on this machine — check `rustc --version` first; if missing or broken, fall back immediately, do not install toolchains).
  2. **Chromeless Chrome app window**: launch your local server, then `open -na "Google Chrome" --args --app=http://127.0.0.1:<port> --new-window` (verified working on this macOS). Electron is allowed but its ~200MB download makes it a last resort.
- `npm run app` (or `deno task app`) must be the single command that builds, starts, and opens the window.
- A plain `open <url>` that lands in a browser tab FAILS the goal.

## Port assignment (gen1 had collisions)
Use the port given in your goal prompt as the DEFAULT (still overridable via `PORT` env). Bind to 127.0.0.1 only.

## Proven patterns from gen1 — all MANDATORY
Five gen1 builds were analyzed; these are the best patterns across them. Implement ALL:

1. **Entity keys**: `sessionId` is the key for session detail (`/api/session/:id`). Never use file paths or base64 blobs as API keys.
2. **Subagents, dual-source**: merge sidechain records (`isSidechain:true`) AND separate `…/subagents/agent-*.jsonl` files; join subagent runs to their spawning Task/Agent `tool_use` via `agentId` when present, fallback to prompt matching. Report the link rate.
3. **Parse observability**: status/dashboard must expose `skippedLines`, `unknownTypes` (with counts), per-file parse warnings, dangling `tool_use` ids. Never crash on malformed lines.
4. **Behavior dashboard**: beyond cost/tokens include `stopReasons`, `interrupts` (user aborts), `askUser` counts, `toolProfile` (per-tool freq + error rate), `cacheEfficiency`, subagent stats, and a flowai `primitives` panel (Skill/Task invocations attributed to named primitives).
5. **Block-level content search**: results carry a snippet, the block kind (`text`/`thinking`/`tool_use`/`tool_result`), and the event uuid so the UI can jump straight to the matching event. Support structured pre-filter (query language `tool:Bash error:true cost>0.5`) + free text + regex + case toggle. Guard with a `truncated` flag.
6. **Virtualized timeline**: session view must stay smooth on a 5000-event session (windowing / IntersectionObserver). Verify against the largest real session.
7. **Deep links**: every event addressable via URL hash; copy-link affordance; next-error / next-tool navigation; keyboard nav (j/k, ⌘K search palette).
8. **Tool-specific rendering**: Bash (cmd + exit code + collapsible output), Edit/Write (real diff), Read/Grep (path + range), Task/Skill (link to subagent), thinking toggle, raw-JSON view per event.
9. **Decoded project names**: decode `projects/` dir names best-effort, but display the `cwd` from records as the source of truth (gen1 had `-` → `/` corruption).
10. **Annotations + saved queries + collections** stored under `./data/`, never touching `~/.claude/`.
11. **Exports**: per-session Markdown transcript, sessions CSV/JSON.
12. **Configurable price table** (per-model input/output/cacheWrite/cacheRead rates) with a sane default; cost everywhere derived from it.
13. **Incremental index** keyed by mtime+size; background first index with progress; instant reuse on restart.
14. **Secret redaction** toggle for display and mandatory before any LLM call; LLM scoring endpoint via local `claude` CLI is opt-in.

## Overriding priority: presentation UX
The app wins on how fast a human can read a session, spot problems, and compare runs. Invest in visual hierarchy, density, collapsing, color-coding of event kinds, and a polished dark theme. A feature that is implemented but unreadable does not count. Aim for the polish level of a commercial dev tool, not a prototype.

## Constraints
- READ-ONLY on `~/.claude/` (enforce by construction; Deno permission flags count as a plus). App data in `./data/`.
- Offline by default. Validate against REAL data in `~/.claude/projects/` (~1400 `.jsonl`, watch out for leading-`-` dir names and >10MB files).
- Do not install global toolchains. Use what's present: node 22 / npm 11 / deno 2.8 / system Chrome.

## Definition of done (goal condition)
- `npm run app` / `deno task app` opens a standalone desktop window (NOT a browser tab) showing the UI.
- Parses real `~/.claude/projects` sessions; renders the LARGEST real session timeline smoothly and an aggregate dashboard.
- All 14 mandatory patterns above implemented.
- Lint + typecheck + tests pass; include tests for parser edge cases (broken lines, unknown types, dangling tools, subagent joining).
- `README.md`: stack + why, run instructions, coverage matrix vs REQUIREMENTS (covered/deferred).
- Work autonomously; never stop to ask; pick sensible defaults.

## Chat output rules (strict)
- ALL chat output in **English**, ultra-concise: terse status lines only, no plan restating, no filler.

---

# Requirements — Claude Code Session Analyzer (Desktop App)

Universal desktop app to explore and assess Claude Code sessions stored in `~/.claude/`.
Two goals: (a) quality assessment of flowai-based primitives (skills/commands/agents); (b) general exploratory analysis of agent behavior, cost, and errors.

**Top priority beyond the FR list: information-presentation UX.** The app wins or loses on how clearly and quickly a human can read a session, spot problems, and compare runs. Invest in layout, density, navigation, and readable rendering of tool I/O.

## Grounded data facts (verify against real `~/.claude/`)

- `~/.claude/` ≈ 1.6 GB; `projects/` ≈ 332 MB; ~750 project dirs; ~1400 `*.jsonl` session files.
- Project dir name = encoded `cwd` (slashes → dashes), may start with `-`. Session file = `<sessionId>.jsonl`, one JSON record per line.
- Record `type`: `user`, `assistant`, `system`, `attachment`, `last-prompt`, `queue-operation`, `pr-link`, plus service types. Unknown types must not crash parsing.
- `assistant`: `message.model`, `message.usage` (input/output/cache_creation/cache_read tokens, `service_tier`, `speed`, `server_tool_use`, `iterations`), content blocks `text` / `thinking` / `tool_use`, `stop_reason`.
- `user`: content blocks `tool_result` / `text` / raw string.
- Linking fields: `uuid` + `parentUuid` (tree), `sessionId`, `timestamp`, `cwd`, `gitBranch`, `version`, `entrypoint`, `permissionMode`, `userType`, `promptId`, `isSidechain` (subagents).
- Tools seen: Bash, Edit, Write, Read, Grep, WebFetch, WebSearch, Task*/Skill/ToolSearch, AskUserQuestion.
- Aux sources: `history.jsonl`, `sessions/*.json`, `todos`, `file-history/`, `shell-snapshots/`, `paste-cache/`, `settings*.json`, `telemetry/`, `security/` (0700, may be unreadable).

## 1. Ingestion

- ING-1 Auto-detect `~/.claude/` root; allow override; support multiple roots.
- ING-2 Enumerate `projects/*`, decode dir name → real path, flag missing paths.
- ING-3 Discover all `*.jsonl`; map `sessionId` ↔ file; handle leading-`-` dir names.
- ING-4 Streaming JSONL parse; do not load whole file into memory; handle files >10 MB / >4000 lines.
- ING-5 Tolerate broken/partial lines, unknown `type`, schema drift across `version`; skip+log, never crash.
- ING-6 Schema-version adapters keyed by `version`; preserve unknown fields (forward-compatible).
- ING-7 Optionally index aux sources and link by `sessionId`/`timestamp`/project.
- ING-8 Incremental re-index (mtime/size/hash); no full rescan.
- ING-9 Optional live watch of active sessions (appended lines).
- ING-10 Analyze a copied/archived `~/.claude/` snapshot, not only the live dir.

## 2. Domain model

- MODEL-1 Canonical model `Project → Session → Turn → Event → ContentBlock`.
- MODEL-2 Rebuild conversation tree via `uuid`/`parentUuid`; support branching (retries, edits), not linear-only.
- MODEL-3 Pair `tool_use` ↔ `tool_result` by id; flag dangling calls.
- MODEL-4 Subagents: treat `isSidechain:true` as nested sub-sessions; link to parent Task/Agent call; visualize hierarchy.
- MODEL-5 Roles/subjects: user/assistant/system, `userType`, `entrypoint`, `permissionMode`, `gitBranch`, `model`.
- MODEL-6 Time model: normalize `timestamp`; step durations, gaps, session length, active vs wall time.
- MODEL-7 Dedup sessions across backups by `sessionId`+hash.

## 3. Viewer (UX-critical)

- VIEW-1 Session list with sort/filter: project, date, model, duration, cost, turns, has-errors, has-subagents.
- VIEW-2 Session timeline: ordered turns; expandable `text` / `thinking` / `tool_use` / `tool_result`; collapse long outputs.
- VIEW-3 Dedicated thinking view (toggle).
- VIEW-4 Tool-specific rendering: Bash (cmd/stdout/exit), Edit/Write (diff), Read (file/range), Grep, WebFetch/WebSearch, Task/Skill/ToolSearch.
- VIEW-5 Tree/graph of conversation + subagent hierarchy (collapse/expand).
- VIEW-6 Diff view for edits; optionally reconstruct file state from `file-history/`.
- VIEW-7 Raw JSON view per event.
- VIEW-8 Navigation: jump by parent, next-error, next-tool-X, deep-link to event.

## 4. Search & filter

- SEARCH-1 Full-text across all sessions (prompts, replies, thinking, commands, tool results) with highlight.
- SEARCH-2 Structured filters: model, tool, `stop_reason`, `permissionMode`, git branch, date/cost/token ranges, has-subagents/errors.
- SEARCH-3 Query language e.g. `tool:Bash error:true model:opus cost>0.5`.
- SEARCH-4 Cross-session search; group results by session/project.
- SEARCH-5 Saved queries/views.
- SEARCH-6 Regex + case sensitivity + per-block-type search.

## 5. Cost & tokens

- COST-1 Aggregate input/output/cache_creation/cache_read tokens by event/turn/session/project/model.
- COST-2 Configurable price table per model (separate cache-write/cache-read rates, `service_tier`); compute money cost.
- COST-3 Cache efficiency: cache_read vs cache_creation share; flag poor cache use.
- COST-4 Time-series of cost/tokens by day/week/project/model.
- COST-5 Most expensive steps/tools/subagents; intra-session cost distribution.
- COST-6 Model mix stats (`model`, `speed`, `service_tier`).

## 6. Behavior analytics

- BEHAV-1 Tool profile: frequency, duration, error rate per tool (session/project/global).
- BEHAV-2 Bash analysis: command distribution, nonzero exits, dangerous patterns.
- BEHAV-3 Edit analysis: edit volume, files touched, read/write ratio, blind edits without prior Read.
- BEHAV-4 Loop/repeat detection: near-identical repeated calls, repeated failures, long no-progress streaks.
- BEHAV-5 `stop_reason` analytics; detect token-limit truncations.
- BEHAV-6 Thinking length vs output; correlation with success/cost.
- BEHAV-7 Human interaction: AskUserQuestion count/locations, interrupts, `permissionMode` changes.
- BEHAV-8 Subagents: count, depth, cost, failure share, contribution to outcome.

## 7. Error & quality

- QUAL-1 Error detection: nonzero exits, `is_error` tool_result, stacktraces, dangling tool_use, truncations, permission denials.
- QUAL-2 Error taxonomy (tool/logic/context-limit/permission/external/loop), configurable rules.
- QUAL-3 Heuristic quality metrics (no LLM): tool success rate, repeats, interrupts/rollbacks, progress-vs-cost, stall length.
- QUAL-4 Optional LLM-assisted scoring via local `claude` CLI; structured verdict (findings, severity, root cause, recommendations). Model/effort configurable.
- QUAL-5 LLM config: model, effort, rubric/prompt template, token budget; explicit consent before sending content to a model; secret redaction first.
- QUAL-6 Reproducibility: store run params (model, effort, rubric version, input hash) with result; cache by input hash.
- QUAL-7 Compare scorings of one session across models/effort.

## 8. flowai-specific analytics

- FLOW-1 Detect flowai skill/command/agent invocations (Skill/Task calls, slash-commands in prompts, primitive names); attribute turns to a primitive.
- FLOW-2 Quality per primitive: success, cost, steps, repeats, errors; compare primitives.
- FLOW-3 Optional workflow-conformance: deviations of a run from the primitive's intended process.
- FLOW-4 Regression tracking of a primitive over time/framework version/git branch.
- FLOW-5 Optional correlation with external acceptance-test runs (no hard dependency).

## 9. Dashboards & comparison

- DASH-1 Global dashboard: counts, total cost/tokens, error rate, activity over time.
- DASH-2 Per-project dashboard.
- DASH-3 Side-by-side compare of sessions/projects/models/primitives.
- DASH-4 Trends: metric time-series grouped by day/week/project/model.
- DASH-5 Outlier detection (unusually expensive/long/error-prone sessions).

## 10. Annotations, reports, export

- OUT-1 Bookmarks, tags, notes on session/turn/event; stored separately, never mutate source `.jsonl`.
- OUT-2 Manual collections of sessions.
- OUT-3 Export filtered data/metrics to JSON/CSV/Markdown; one-session Markdown transcript.
- OUT-4 Analysis report (metrics + LLM verdicts + annotations) to Markdown/HTML/PDF.
- OUT-5 Deep-link to event; copy quote with context.

## 11. Non-functional

- PERF-1 Handle ≥1.6 GB, ≥1400 sessions, files >10 MB; first index in background with progress, no UI block.
- PERF-2 Interactive list/search over the index (~hundreds of ms); heavy parse lazy/streamed.
- PERF-3 Local index/cache (embedded DB) with incremental update; cache derived metrics + LLM scorings.
- PRIV-1 Offline by default; network only for explicit, consented LLM calls.
- PRIV-2 Optional secret/token redaction on display and especially before LLM send.
- PRIV-3 Read-only on `~/.claude/`: NEVER modify/delete source files; app data in a separate dir.
- PORT-1 Cross-platform desktop (macOS/Linux/Windows); correct path decoding for all OSes.
- REL-1 Isolate per-file/per-session failures; no global re-index on one error.
- EXT-1 Extensible via config: error rules, metrics, LLM rubrics, price tables (no rebuild).
- OBS-1 Parse observability: skipped-line/unknown-type counts, schema-drift diagnostics.
- UX-1 Keyboard nav, dark/light theme, virtualized lists for large volumes.

## 12. Constraints & assumptions

- JSONL schema is undocumented and shifts across versions — infer empirically, stay forward-compatible.
- Leading-`-` encoded project dir names need careful handling (no shell-glob bugs).
- LLM analysis runs via local `claude` CLI; app orchestrates calls, does not implement the model.
- Some dirs are 0700 (`security/`, `agents/`, `daemon/`) — degrade gracefully when unreadable.

## 13. Out of scope

- Not an editor/debugger of live sessions (read/analyze only).
- Not a cloud/multi-user/sync service (manual snapshot import aside).
- Not a replacement for flowai acceptance tests — only analyze their traces if present.
