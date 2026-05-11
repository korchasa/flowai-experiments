---
implements:
  - FR-EXP-ADAPTERS
  - FR-EXP-RUN
  - FR-EXP-JUDGE
  - FR-EXP.CONTEXT-ANATOMY
---
# Migrate project to `@korchasa/ai-ide-cli`

## Goal

Replace the project's hand-rolled Claude CLI spawning / NDJSON parsing / retry
logic with the upstream JSR library `@korchasa/ai-ide-cli@0.1.16`. Drop duplicate
functionality, shrink the `scripts/benchmarks/lib/` surface, stay on a
maintained dependency, and free the repo to focus on its actual product
(empirical evidence) rather than CLI plumbing.

## Overview

### Context

- Sister project `flow` already extracted its Claude/OpenCode/Cursor runner into
  `jsr:@korchasa/ai-ide-cli` (v0.1.15). Same author, same architectural
  patterns — this repo is its obvious second consumer.
- `flowai-experiments` carries a verbatim fork of the old runner inside
  `scripts/benchmarks/lib/`: `SpawnedAgent`, `ClaudeAdapter`, `CursorAdapter`,
  `cliChatCompletion`, NDJSON parsing, cleanroom env setup, retry/timeout,
  usage helpers (~2100 LOC incl. tests).
- Keeping the fork means every upstream bug fix or Claude-CLI flag change has
  to be re-ported by hand.

Library exports (from `@korchasa/ai-ide-cli@0.1.15/mod.ts`):
- `invokeClaudeCli(opts: ClaudeInvokeOptions) → RuntimeInvokeResult` — spawn + retry + stream-json parsing + `CliRunOutput`.
- `invokeCursorCli(opts: RuntimeInvokeOptions) → RuntimeInvokeResult` — same for `cursor agent`.
- `invokeOpenCodeCli` — OpenCode support (new, project doesn't use yet).
- `RuntimeAdapter` interface, `getRuntimeAdapter(id)`, `resolveRuntimeConfig()`.
- Stream parsing: `processStreamEvent`, `extractClaudeOutput`, `FileReadTracker`.
- Process registry: `register`, `unregister`, `killAll`, `onShutdown`.
- Types: `CliRunOutput`, `ClaudeInvokeOptions`, `RuntimeInvokeOptions`, etc.

### Current State

**Project modules to replace/refactor:**
- `adapters/claude.ts` (309 LOC) — builds `claude -p` args, parses NDJSON, cleanroom env, memory file writing.
- `adapters/cursor.ts` (192 LOC) — `cursor-agent` args, JSON parser, `.cursorrules` writer.
- `spawned_agent.ts` (374 LOC) — process spawn + stdout/stderr monitoring + timeout + resume loop. Experiments use it with `maxSteps: 1` (single-shot only).
- `llm.ts` (176 LOC) — `cliChatCompletion()` for judge calls via `claude -p --json-schema`.
- `usage.ts` (155 LOC) — legacy Cursor transcript parser. Dead code in practice.

**Two critical library gaps:**

1. **No custom `env` vars** — `executeClaudeProcess()` hardcodes `env: { CLAUDECODE: "" }`. Experiments need `CLAUDE_CONFIG_DIR=<cleanroom temp dir>` for isolation. Without this, global `~/.claude/CLAUDE.md` contaminates trial data.

2. **No raw NDJSON event access** — Stream events are consumed internally; only `CliRunOutput` is returned. `context-anatomy` experiment needs raw init/result events for `cache_creation_input_tokens`, tool/skill/agent counts, etc.

**Additional differences:**
- Library Cursor adapter uses `cursor agent -p` (new headless mode); project uses `cursor-agent` (old binary).
- Library returns `total_cost_usd` in `CliRunOutput` — better than project's transcript-parsing.
- Judge calls use `--output-format json` + `--json-schema` + stdin piping — library uses `stream-json` + `--verbose`. Poor fit for judge without `claudeArgs` passthrough.

### Constraints

- Library gaps must be fixed upstream (`@korchasa/ai-ide-cli`) before full migration.
- Existing experiment results must not be invalidated — `ExperimentReport` schema stays v1.
- `context-anatomy` must retain raw NDJSON access for metric extraction.
- `deno task check` must pass.
- Fail-fast preserved — no silent fallbacks.
- Cleanroom `CLAUDE_CONFIG_DIR` isolation is non-negotiable.
- SRS/SDS must be updated to reflect the new runtime substrate.

## Definition of Done

- [ ] `@korchasa/ai-ide-cli` added to `deno.json` imports.
- [ ] `SpawnedAgent` class deleted; runner uses library's invoke functions.
- [ ] `AgentAdapter` interface narrowed to experiment-specific concerns (memory files, cleanroom env, mock setup).
- [ ] `context-anatomy` extracts metrics via raw event callback or `streamLogPath`.
- [ ] Judge calls work (via library or kept as minimal wrapper).
- [ ] `deno task check` green.
- [ ] Smoke run of `claude-md-length --variant single-file` produces valid results.
- [ ] Smoke run of `context-anatomy --variant baseline` shows non-zero metric table.
- [ ] Dead code removed (`usage.ts`, unused adapter methods).
- [ ] SRS + SDS updated.
- [ ] Cursor support decision documented.

## Solution

**Selected variant: A — full migration using `@korchasa/ai-ide-cli@0.1.16`.**

Library v0.1.16 already ships both `env` and `onEvent` fields in `ClaudeInvokeOptions` / `RuntimeInvokeOptions`. No upstream changes needed.

### Step 1: Add library dependency

**File: `deno.json`**
- Add `"@korchasa/ai-ide-cli": "jsr:@korchasa/ai-ide-cli@^0.1.16"` to `imports`.

**Verify:** `deno check scripts/task-experiment.ts` resolves the new import.

### Step 2: Narrow `AgentAdapter` to experiment-specific concerns

**File: `scripts/benchmarks/lib/adapters/types.ts`**
- Remove `buildArgs`, `parseOutput`, `getEnv`, `calculateUsage`, `command`, `outputFormat`, `configDir` — all handled by library now.
- Keep: `ide`, `getCleanroomEnv`, `writeMemoryFile`, `setupMocks`.
- Remove `ParsedAgentOutput` interface (replaced by library's `CliRunOutput`).
- Remove `SessionUsage` import (dead after `calculateUsage` removal).
- Keep: `MemoryScope`, `MemoryScopeNotSupportedError`.

New shape:
```ts
import type { RuntimeId } from "@korchasa/ai-ide-cli";

export interface ExperimentAdapter {
  readonly ide: RuntimeId;
  getCleanroomEnv(configDir: string): Promise<Record<string, string>>;
  writeMemoryFile(sandboxPath: string, scope: MemoryScope, content: string): Promise<void>;
  setupMocks(sandboxPath: string, mocks: Record<string, string>): Promise<void>;
}
```

### Step 3: Simplify adapter implementations

**File: `scripts/benchmarks/lib/adapters/claude.ts`**
- Delete: `buildArgs`, `parseOutput`, `getEnv`, `calculateUsage`, `command`, `outputFormat`, `configDir`, `ClaudeEvent` interface.
- Keep: `getCleanroomEnv` (credentials copy), `writeMemoryFile` (AGENTS.md + CLAUDE.md symlink), `setupMocks` (hooks mechanism).
- Implement narrowed `ExperimentAdapter` interface.

**File: `scripts/benchmarks/lib/adapters/cursor.ts`**
- Same narrowing: delete `buildArgs`, `parseOutput`, `getEnv`, `calculateUsage`.
- Keep: `writeMemoryFile` (.cursorrules), `setupMocks`, `getCleanroomEnv` (returns `{}`).

**File: `scripts/benchmarks/lib/adapters/mod.ts`**
- Update `createAdapter` to return `ExperimentAdapter`.
- Add `"opencode"` option (library supports it; adapter just needs `getCleanroomEnv` + `writeMemoryFile` stubs that throw `MemoryScopeNotSupportedError` until we implement OpenCode memory files).
- Update `SUPPORTED_IDES` to match library's `RuntimeId` values.

### Step 4: Rewrite `defaultSpawnAgent` in runner

**File: `scripts/experiments/lib/runner.ts`**

Replace the lazy `SpawnedAgent` import with a direct call to `invokeClaudeCli` / `invokeCursorCli`:

```ts
import { invokeClaudeCli, invokeCursorCli } from "@korchasa/ai-ide-cli";

const defaultSpawnAgent: SpawnAgentFn = async (opts) => {
  // Collect raw NDJSON for context-anatomy metrics extraction
  const rawEvents: string[] = [];
  const onEvent = (event: Record<string, unknown>) => {
    rawEvents.push(JSON.stringify(event));
  };

  const common = {
    taskPrompt: opts.prompt,
    model: opts.model,
    permissionMode: "bypassPermissions",
    timeoutSeconds: Math.ceil(opts.stepTimeoutMs / 1000),
    maxRetries: 1,
    retryDelaySeconds: 0,
    cwd: opts.sandbox,
    onEvent,
  };

  let result;
  if (opts.ide === "cursor") {
    // Cursor: pass env only when non-empty (library replaces parent env entirely)
    const cursorEnv = opts.env && Object.keys(opts.env).length > 0
      ? opts.env : undefined;
    result = await invokeCursorCli({
      ...common,
      env: cursorEnv,
      extraArgs: ["--strict-mcp-config", "--disable-slash-commands"],
    });
  } else {
    // Claude: library merges { CLAUDECODE: "", ...env }
    result = await invokeClaudeCli({
      ...common,
      env: opts.env,
      claudeArgs: [
        "--strict-mcp-config", "--disable-slash-commands",
        ...(opts.name ? ["--name", opts.name] : []),
      ],
    });
  }

  if (result.error && !result.output) {
    throw new Error(result.error);
  }

  const output = rawEvents.join("\n");
  const exitCode = result.output?.is_error ? 1 : 0;
  return { output, exitCode };
};
```

Key changes:
- `SpawnAgentFn` signature: add `ide: string` field (currently has `adapter` — replace with `ide` string since adapter is only used for spawning here).
- **`--name` flag** preserved via `claudeArgs` (library's `ClaudeInvokeOptions` has no `name` field).
- **Cursor `env` guard**: pass `env` only when non-empty; library's `...(env ? { env } : {})` replaces parent env entirely when `env` is truthy — empty `{}` from `CursorAdapter.getCleanroomEnv` would wipe the process env.
- `agentOutput` remains raw NDJSON lines (one per `onEvent` call) — `context-anatomy/shared.ts:parseEvents()` continues to work unchanged because it splits on `\n` and parses each `{...}` line.
- `--strict-mcp-config`, `--disable-slash-commands`, `--permission-mode bypassPermissions` move from adapter's `buildArgs` to runner's `defaultSpawnAgent` (experiment concern, not adapter concern).

### Step 5: Update `SpawnAgentFn` type and `RunnerOptions`

**File: `scripts/experiments/lib/runner.ts`**

```ts
export type SpawnAgentFn = (opts: {
  sandbox: string;
  model: string;
  prompt: string;
  ide: string;           // was: adapter: AgentAdapter
  stepTimeoutMs: number;
  name?: string;
  env?: Record<string, string>;
}) => Promise<AgentTrialOutcome>;
```

`RunnerOptions`: replace `adapter: AgentAdapter` with:
- `ide: string` — passed to `SpawnAgentFn`
- `experimentAdapter: ExperimentAdapter` — used for `writeMemoryFile`, `getCleanroomEnv`, `setupMocks`

Update `runExperiment` and `runSingleCell` accordingly:
- `cleanroomEnv = await experimentAdapter.getCleanroomEnv(cleanroomConfigDir)` (same as before)
- `experiment.setupCell` receives `experimentAdapter` instead of `AgentAdapter` in `CellContext`

### Step 6: Update `CellContext` type

**File: `scripts/experiments/lib/types.ts`**

```ts
import type { ExperimentAdapter } from "../../benchmarks/lib/adapters/types.ts";

export interface CellContext {
  sandboxPath: string;
  adapter: ExperimentAdapter;  // narrowed type
  seed: number;
}
```

Experiment variant files (`single-file.ts`, `tree-sum.ts`, `baseline.ts`) call `ctx.adapter.writeMemoryFile(...)` — this interface is preserved, so variant files need zero changes beyond the type narrowing (which is compatible).

### Step 7: Keep `llm.ts` for judge calls (minimal change)

**File: `scripts/benchmarks/lib/llm.ts`**

Keep `cliChatCompletion` as-is. Rationale: the judge use case is fundamentally different from agent spawning:
- Uses `--output-format json` (not `stream-json`)
- Uses `--json-schema` + `--tools StructuredOutput` for structured output
- Pipes user message via stdin (to avoid `E2BIG`)
- No retry, no stream parsing, no `onEvent`

The library's `invokeClaudeCli` would require passing all of these via `claudeArgs` + switching to `stream-json` output + losing stdin piping. Not worth the complexity for ~50 lines of judge plumbing.

Remove: `BenchmarkConfig` → rename to `ExperimentConfig` for clarity (optional, cosmetic).

### Step 8: Delete dead code and update tests

**Delete files:**
- `scripts/benchmarks/lib/spawned_agent.ts` — replaced by `invokeClaudeCli`/`invokeCursorCli`
- `scripts/benchmarks/lib/spawned_agent_test.ts` — tests for deleted code
- `scripts/benchmarks/lib/usage.ts` — dead code (only used by `CursorAdapter.calculateUsage`, now deleted)
- `scripts/benchmarks/lib/types.ts` — `LLMMessage`/`LLMResponse` move into `llm.ts` (only consumer)

**Update test files:**
- `scripts/benchmarks/lib/adapters/claude_test.ts` — delete tests for removed methods (`buildArgs`, `parseOutput`). Keep tests for `writeMemoryFile`, `getCleanroomEnv`, `setupMocks`.
- `scripts/benchmarks/lib/adapters/cursor_test.ts` — same: delete `buildArgs`/`parseOutput` tests, keep `writeMemoryFile`/`setupMocks`.
- `scripts/experiments/lib/runner_test.ts` — update `MockAdapter` to implement narrowed `ExperimentAdapter` (remove `buildArgs`, `parseOutput`, `getEnv`, `calculateUsage`, `command`, `outputFormat`, `configDir`). Update `SpawnAgentFn` mock calls if signature changes.

**Verify:** `deno task check` passes. No dangling imports.

### Step 9: Update CLI entry point

**File: `scripts/task-experiment.ts`**

- `createAdapter(ideName)` returns `ExperimentAdapter` (narrower type).
- Pass `ide: ideName` and `experimentAdapter: adapter` separately to `runExperiment`.
- Rest unchanged.

### Step 10: Update `context-anatomy/shared.ts` (no changes needed)

`parseEvents()` splits on `\n`, filters `{`-prefixed lines, parses JSON. The `onEvent` callback in Step 4 produces exactly this format (`JSON.stringify(event)` per line). **Zero changes to shared.ts.**

### Step 11: Update SRS + SDS

**File: `documents/requirements.md`**
- §3.8 FR-EXP-ADAPTERS: update description to note `@korchasa/ai-ide-cli` as runtime substrate. Note that `ExperimentAdapter` is the project-local interface for experiment-specific concerns (memory files, cleanroom, mocks).
- §5 Interfaces: update env isolation description to cite library's `env` option.

**File: `documents/design.md`**
- §2 Arch diagram: replace `Adapter → Spawn[benchmarks/lib/spawned_agent.ts]` with `Runner → Library[@korchasa/ai-ide-cli]`.
- §3.7 Adapters: rename to "Experiment Adapters", describe narrowed interface. Note library handles process lifecycle.
- §3.x Add new subsystem: "Runtime Library" — `@korchasa/ai-ide-cli` handles CLI spawning, NDJSON parsing, retry, process registry.
- §7 Constraints: note `llm.ts` judge calls remain custom (library doesn't fit that use case).

### Step 12: Verify

1. `deno task check` — format + lint + tests pass.
2. Smoke: `deno task experiment claude-md-length --variant single-file --dry-run` — prints plan.
3. Smoke (live): `deno task experiment claude-md-length --variant single-file --axis tokens=0,500 --reps 1` — runs 2 trials, writes results.
4. Smoke (live): `deno task experiment context-anatomy --variant baseline --axis tokens=0 --reps 1` — metric table shows non-zero `cache_creation`, `tools`, `skills`.

### Files changed (summary)

- **Modified:**
  - `deno.json` — add library import
  - `scripts/benchmarks/lib/adapters/types.ts` — narrow to `ExperimentAdapter`
  - `scripts/benchmarks/lib/adapters/claude.ts` — delete spawning logic, keep experiment concerns
  - `scripts/benchmarks/lib/adapters/cursor.ts` — same
  - `scripts/benchmarks/lib/adapters/mod.ts` — update factory
  - `scripts/benchmarks/lib/llm.ts` — inline `LLMMessage`/`LLMResponse` from deleted `types.ts`
  - `scripts/experiments/lib/runner.ts` — rewrite `defaultSpawnAgent`, update `RunnerOptions`/`SpawnAgentFn`
  - `scripts/experiments/lib/types.ts` — `CellContext.adapter` type change
  - `scripts/experiments/claude-md-length/tree-sum.ts` — import `MemoryScope` from updated path
  - `scripts/task-experiment.ts` — pass `ide` + `experimentAdapter` separately
  - `documents/requirements.md` — cite library
  - `documents/design.md` — update arch diagram + subsystem descriptions
- **Modified (tests):**
  - `scripts/benchmarks/lib/adapters/claude_test.ts` — remove tests for deleted methods
  - `scripts/benchmarks/lib/adapters/cursor_test.ts` — same
  - `scripts/experiments/lib/runner_test.ts` — update `MockAdapter` to `ExperimentAdapter`, update mock `SpawnAgentFn` signature
- **Deleted:**
  - `scripts/benchmarks/lib/spawned_agent.ts`
  - `scripts/benchmarks/lib/spawned_agent_test.ts`
  - `scripts/benchmarks/lib/usage.ts`
  - `scripts/benchmarks/lib/types.ts`
