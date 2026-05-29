/**
 * Sweep runner for experiments.
 *
 * Iterates the cartesian product of axes × reps, runs one agent trial
 * per cell, judges adherence, and aggregates into an ExperimentReport.
 *
 * Designed for testability: the agent spawn and judge calls are
 * injected via function parameters (defaults hit the selected runtime through ai-ide-cli).
 */

import { join } from "@std/path";
import type {
  Cell,
  CellContext,
  Experiment,
  ExperimentReport,
  TrialResult,
} from "./types.ts";
import type { AgentAdapter } from "./adapters/types.ts";
import type { ModelConfig } from "./llm.ts";
import { modelRef } from "./llm.ts";
import { judgeAdherence, type JudgeVerdict } from "./judge.ts";
import {
  computeAdherenceByAxis,
  computeHeadlineMaxSafeTokens,
} from "./report.ts";

/** Result of spawning one agent trial (abstracts SpawnedAgent for testability). */
export interface AgentTrialOutcome {
  output: string;
  exitCode: number;
  tokens?: TokenUsage;
}

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export type SpawnAgentFn = (opts: {
  sandbox: string;
  model: string;
  modelProvider?: string;
  prompt: string;
  adapter: AgentAdapter;
  stepTimeoutMs: number;
  name?: string;
  /** Extra env vars merged into the spawned process (cleanroom isolation). */
  env?: Record<string, string>;
}) => Promise<AgentTrialOutcome>;

export type JudgeFn = (
  rule: string,
  userQuery: string,
  agentOutput: string,
  judgeConfig: ModelConfig,
) => Promise<JudgeVerdict>;

export interface RunnerOptions {
  experiment: Experiment;
  /** Variant label for the result filename (e.g. "single-file"). */
  variant: string;
  model: string;
  modelProvider?: string;
  ide: string;
  adapter: AgentAdapter;
  reps: number;
  /** Base seed for deterministic trial setup. */
  seed: number;
  /** Optional filter — override experiment.axes (e.g. from CLI --axis tokens=500,1000). */
  axesFilter?: Record<string, ReadonlyArray<string | number>>;
  /** Judge model config. */
  judgeConfig: ModelConfig;
  /** Timeout per single trial. Default 300s. */
  stepTimeoutMs?: number;
  /** Progress callback (cell + result). */
  onProgress?: (index: number, total: number, result: TrialResult) => void;
  /** Injection points for testing. */
  spawnAgent?: SpawnAgentFn;
  judge?: JudgeFn;
}

/**
 * Expands an axes map into the full cartesian product of cells.
 * Order of keys determines nesting order (first key outermost loop).
 */
export function expandCells(
  axes: Record<string, ReadonlyArray<string | number>>,
  reps: number,
): Cell[] {
  const keys = Object.keys(axes);
  if (keys.length === 0) {
    return Array.from({ length: reps }, (_, trial) => ({
      axes: {},
      trial,
    }));
  }
  const combos: Array<Record<string, string | number>> = [{}];
  for (const key of keys) {
    const values = axes[key];
    const next: Array<Record<string, string | number>> = [];
    for (const combo of combos) {
      for (const v of values) {
        next.push({ ...combo, [key]: v });
      }
    }
    combos.length = 0;
    combos.push(...next);
  }
  const cells: Cell[] = [];
  for (const combo of combos) {
    for (let trial = 0; trial < reps; trial++) {
      cells.push({ axes: combo, trial });
    }
  }
  return cells;
}

/**
 * Deterministic seed derived from cell axes + trial index.
 * Ensures that re-running the same (cell, trial) produces the same setup.
 */
export function cellSeed(baseSeed: number, cell: Cell): number {
  let hash = baseSeed >>> 0;
  const str = JSON.stringify(cell.axes) + `|${cell.trial}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Runs all cells and produces an ExperimentReport. */
export async function runExperiment(
  opts: RunnerOptions,
): Promise<ExperimentReport> {
  const {
    experiment,
    variant,
    model,
    modelProvider,
    ide,
    adapter,
    reps,
    seed,
    axesFilter,
    judgeConfig,
    stepTimeoutMs = 300_000,
    onProgress,
  } = opts;

  const spawnAgent = opts.spawnAgent ?? defaultSpawnAgent;
  const judge = opts.judge ?? defaultJudge;

  // Cleanroom: create one empty config dir for the whole run and ask
  // the adapter for env vars to pass to every trial. Adapters are
  // responsible for deciding whether they need the dir at all.
  // Credentials are NOT sourced here — the caller must authorize the
  // underlying CLI externally.
  // cleanroomEnv is passed to opts.env for runtimes that support environment
  // isolation. ai-ide-cli handles each runtime's auth through native config.
  let cleanroomEnv: Record<string, string> = {};
  let cleanroomConfigDir: string | undefined;
  try {
    cleanroomConfigDir = await Deno.makeTempDir({
      prefix: "flowai-exp-cleanroom-",
    });
    cleanroomEnv = await adapter.getCleanroomEnv(cleanroomConfigDir);
  } catch (e) {
    if (cleanroomConfigDir) {
      try {
        await Deno.remove(cleanroomConfigDir, { recursive: true });
      } catch (_) { /* ignore */ }
    }
    throw new Error(
      `Cannot start experiment: cleanroom env setup failed for IDE "${adapter.ide}": ${
        (e as Error).message
      }`,
    );
  }

  const effectiveAxes = axesFilter ?? experiment.axes;
  const cells = expandCells(effectiveAxes, reps);
  const total = cells.length;
  const trials: TrialResult[] = [];
  const startedAt = new Date().toISOString();
  const t0 = performance.now();

  try {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const result = await runSingleCell({
        cell,
        experiment,
        model,
        modelProvider,
        adapter,
        seed: cellSeed(seed, cell),
        judgeConfig,
        stepTimeoutMs,
        spawnAgent,
        judge,
        variant,
        cleanroomEnv,
      });
      trials.push(result);
      onProgress?.(i + 1, total, result);
    }
  } finally {
    if (cleanroomConfigDir) {
      try {
        await Deno.remove(cleanroomConfigDir, { recursive: true });
      } catch (_) { /* ignore */ }
    }
  }

  const finishedAt = new Date().toISOString();
  const durationMs = performance.now() - t0;

  const adherenceByAxis: Record<string, Record<string, number>> = {};
  for (const key of Object.keys(effectiveAxes)) {
    adherenceByAxis[key] = computeAdherenceByAxis(trials, key);
  }

  const report: ExperimentReport = {
    schemaVersion: 1,
    experimentId: experiment.id,
    experimentName: experiment.name,
    modelProvider,
    model,
    ide,
    judgeModelProvider: judgeConfig.model_provider,
    judgeModel: judgeConfig.model,
    judgeRuntime: judgeConfig.runtime ?? "claude",
    startedAt,
    finishedAt,
    seed,
    reps,
    axes: effectiveAxes,
    trials,
    adherenceByAxis,
    durationMs,
    headline: "", // filled below
  };

  report.headline = experiment.headline(report) ||
    defaultHeadline(adherenceByAxis);

  if (experiment.renderCustom) {
    report.customMarkdown = experiment.renderCustom(report);
  }

  return report;
}

/** Runs one trial end-to-end: setup → agent → judge. */
async function runSingleCell(input: {
  cell: Cell;
  experiment: Experiment;
  model: string;
  modelProvider?: string;
  adapter: AgentAdapter;
  seed: number;
  judgeConfig: ModelConfig;
  stepTimeoutMs: number;
  spawnAgent: SpawnAgentFn;
  judge: JudgeFn;
  variant: string;
  cleanroomEnv: Record<string, string>;
}): Promise<TrialResult> {
  const {
    cell,
    experiment,
    model,
    modelProvider,
    adapter,
    seed,
    judgeConfig,
    stepTimeoutMs,
    spawnAgent,
    judge,
    variant,
    cleanroomEnv,
  } = input;

  const sandbox = await Deno.makeTempDir({
    prefix: `flowai-exp-${experiment.id}-`,
  });
  const t0 = performance.now();
  try {
    // Minimal bootstrap: drop a README.md so the neutral query has something to read.
    await Deno.writeTextFile(
      join(sandbox, "README.md"),
      `# Project\n\nA small project used for an experiment trial.\n`,
    );

    const ctx: CellContext = {
      sandboxPath: sandbox,
      adapter,
      seed,
    };
    await experiment.setupCell(cell, ctx);

    const prompt = experiment.query(cell);
    const agentName = `${experiment.id}/${variant}/${
      JSON.stringify(cell.axes)
    }/${cell.trial}`;

    let outcome: AgentTrialOutcome;
    try {
      outcome = await spawnAgent({
        sandbox,
        model,
        modelProvider,
        prompt,
        adapter,
        stepTimeoutMs,
        name: agentName,
        env: cleanroomEnv,
      });
    } catch (e) {
      return {
        cell,
        pass: false,
        judgeReason: `agent spawn error: ${(e as Error).message}`,
        agentOutput: "",
        durationMs: performance.now() - t0,
        exitCode: -1,
        error: (e as Error).message,
      };
    }

    if (outcome.exitCode !== 0) {
      return {
        cell,
        pass: false,
        judgeReason: `agent exited with code ${outcome.exitCode}`,
        agentOutput: outcome.output,
        durationMs: performance.now() - t0,
        exitCode: outcome.exitCode,
        error: `agent exited with code ${outcome.exitCode}`,
        tokensUsed: outcome.tokens,
      };
    }

    const judgeReq = experiment.judgePrompt(cell);
    let verdict: JudgeVerdict;
    try {
      verdict = await judge(
        judgeReq.rule,
        judgeReq.userQuery,
        outcome.output,
        judgeConfig,
      );
    } catch (e) {
      return {
        cell,
        pass: false,
        judgeReason: `judge error: ${(e as Error).message}`,
        agentOutput: outcome.output,
        durationMs: performance.now() - t0,
        exitCode: outcome.exitCode,
        error: (e as Error).message,
      };
    }

    return {
      cell,
      pass: verdict.pass,
      judgeReason: verdict.reason,
      agentOutput: outcome.output,
      durationMs: performance.now() - t0,
      exitCode: outcome.exitCode,
      tokensUsed: outcome.tokens,
    };
  } finally {
    try {
      await Deno.remove(sandbox, { recursive: true });
    } catch (_) {
      // best-effort cleanup
    }
  }
}

/**
 * Default agent spawner — uses @korchasa/ai-ide-cli runtime invokers.
 * Auth is handled by the selected runtime's native configuration.
 * Note: ~/.claude/CLAUDE.md leaks into trials because settingSources is not
 * set; this is acceptable for experiments that don't test memory injection.
 */
const defaultSpawnAgent: SpawnAgentFn = async (opts) => {
  const { invokeClaudeCli, invokeOpenCodeCli, defaultRegistry } = await import(
    "@korchasa/ai-ide-cli"
  );
  if (opts.adapter.ide === "opencode") {
    const model = modelRef({
      model: opts.model,
      model_provider: opts.modelProvider,
    });
    const eventUsages: TokenUsage[] = [];
    const result = await invokeOpenCodeCli({
      processRegistry: defaultRegistry,
      cwd: opts.sandbox,
      model,
      taskPrompt: opts.prompt,
      permissionMode: "bypassPermissions",
      maxRetries: 1,
      retryDelaySeconds: 2,
      timeoutSeconds: Math.ceil(opts.stepTimeoutMs / 1000),
      env: opts.env,
      onEvent(event: unknown) {
        const usage = normalizeCliTokenUsage(event);
        if (usage) eventUsages.push(usage);
      },
    });
    const out = result.output;
    const tokens = normalizeCliTokenUsage(out?.usage) ??
      sumTokenUsages(eventUsages);
    return {
      output: out?.result ?? result.error ?? "",
      exitCode: out?.is_error || !out ? 1 : 0,
      tokens,
    };
  }

  const extraArgs: Record<string, string | null> = {
    "--disable-slash-commands": "",
  };
  if (opts.name) extraArgs["--name"] = opts.name;
  const result = await invokeClaudeCli({
    processRegistry: defaultRegistry,
    cwd: opts.sandbox,
    model: opts.model,
    taskPrompt: opts.prompt,
    permissionMode: "bypassPermissions",
    maxRetries: 1,
    retryDelaySeconds: 2,
    timeoutSeconds: Math.ceil(opts.stepTimeoutMs / 1000),
    strictMcpConfig: true,
    claudeArgs: extraArgs,
  });
  const out = result.output;
  const tokens = normalizeCliTokenUsage(out?.usage);
  return {
    output: out?.result ?? result.error ?? "",
    exitCode: out?.is_error || !out ? 1 : 0,
    tokens,
  };
};

/** Normalize token telemetry from runtime-specific `ai-ide-cli` usage shapes. */
export function normalizeCliTokenUsage(value: unknown): TokenUsage | undefined {
  const seen = new Set<unknown>();
  return normalizeCliTokenUsageInner(value, seen);
}

function normalizeCliTokenUsageInner(
  value: unknown,
  seen: Set<unknown>,
): TokenUsage | undefined {
  if (!isRecord(value) || seen.has(value)) return undefined;
  seen.add(value);

  const direct = readTokenUsageObject(value);
  const nestedKeys = [
    "usage",
    "modelUsage",
    "tokenUsage",
    "tokens",
    "inputTokenDetails",
    "outputTokenDetails",
    "part",
  ];
  const nested = nestedKeys
    .map((key) => normalizeCliTokenUsageInner(value[key], seen))
    .filter((usage): usage is TokenUsage => usage !== undefined);

  return sumTokenUsages([direct, ...nested]);
}

function readTokenUsageObject(
  value: Record<string, unknown>,
): TokenUsage | undefined {
  const input = firstNumber(value, [
    "input_tokens",
    "inputTokens",
    "inputTokenCount",
    "prompt_tokens",
    "promptTokens",
    "promptTokenCount",
  ]);
  const output = firstNumber(value, [
    "output_tokens",
    "outputTokens",
    "outputTokenCount",
    "completion_tokens",
    "completionTokens",
    "completionTokenCount",
  ]);
  const cacheRead = firstNumber(value, [
    "cached_tokens",
    "cachedTokens",
    "cachedInputTokens",
    "cache_read_input_tokens",
    "cacheReadInputTokens",
    "cacheReadTokens",
  ]);
  const cacheWrite = firstNumber(value, [
    "cache_creation_input_tokens",
    "cacheCreationInputTokens",
    "cache_write_input_tokens",
    "cacheWriteInputTokens",
    "cacheWriteTokens",
  ]);

  if (
    input === undefined && output === undefined && cacheRead === undefined &&
    cacheWrite === undefined
  ) {
    return undefined;
  }

  return {
    input: input ?? 0,
    output: output ?? 0,
    cacheRead: cacheRead ?? 0,
    cacheWrite: cacheWrite ?? 0,
  };
}

function firstNumber(
  value: Record<string, unknown>,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const raw = value[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim() !== "") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function sumTokenUsages(
  usages: readonly (TokenUsage | undefined)[],
): TokenUsage | undefined {
  let out: TokenUsage | undefined;
  for (const usage of usages) {
    if (!usage) continue;
    out ??= { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    out.input += usage.input;
    out.output += usage.output;
    out.cacheRead += usage.cacheRead;
    out.cacheWrite += usage.cacheWrite;
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const defaultJudge: JudgeFn = async (
  rule,
  userQuery,
  agentOutput,
  judgeConfig,
) => {
  return await judgeAdherence(
    { rule, userQuery, agentOutput },
    judgeConfig,
  );
};

function defaultHeadline(
  adherenceByAxis: Record<string, Record<string, number>>,
): string {
  const primary = "tokens" in adherenceByAxis
    ? "tokens"
    : Object.keys(adherenceByAxis)[0];
  if (!primary) return "no data";
  const safe = computeHeadlineMaxSafeTokens(adherenceByAxis, primary);
  if (safe === null) {
    return `no ${primary} value met the 80% adherence threshold`;
  }
  return `Max safe ${primary}: ${safe} at ≥80% adherence`;
}
