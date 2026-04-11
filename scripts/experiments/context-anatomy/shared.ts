/**
 * Shared helpers for the context-anatomy experiment family.
 *
 * This experiment does not measure adherence — it measures what the
 * spawned claude CLI loads into its context window. The raw signal is
 * the stream-json NDJSON emitted by the CLI, captured verbatim in
 * TrialResult.agentOutput. This module extracts the structured bits we
 * care about (init event counts + final result event token usage) and
 * aggregates them across trials for the report.
 */

import type { ExperimentReport, TrialResult } from "../lib/types.ts";

/** Per-trial context metrics extracted from the NDJSON stream. */
export interface ContextMetrics {
  /** Count of tools advertised in the init event (built-in + MCP). */
  toolsCount: number;
  /** Count of skills advertised in the init event. */
  skillsCount: number;
  /** Count of slash commands advertised in the init event. */
  slashCommandsCount: number;
  /** Count of MCP servers listed in the init event. */
  mcpServersCount: number;
  /** cache_creation_input_tokens from the final result event. */
  cacheCreationInputTokens: number;
  /** cache_read_input_tokens from the final result event. */
  cacheReadInputTokens: number;
  /** input_tokens from the final result event (non-cached user input). */
  inputTokens: number;
  /** output_tokens from the final result event. */
  outputTokens: number;
}

/**
 * Parses an NDJSON stream and returns the array of successfully parsed
 * events. Lines that fail JSON.parse (e.g. `[Timeout Error] ...`
 * markers written by SpawnedAgent on errors) are silently skipped —
 * non-JSON lines are expected in real CLI output.
 */
export function parseEvents(ndjson: string): Array<Record<string, unknown>> {
  const events: Array<Record<string, unknown>> = [];
  for (const line of ndjson.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        events.push(parsed);
      }
    } catch (_) {
      // Skip malformed lines — the stream occasionally contains
      // interleaved stderr fragments or truncated events on timeout.
    }
  }
  return events;
}

/**
 * Extracts `ContextMetrics` from a single trial's NDJSON output.
 *
 * Returns `null` only if neither an init event nor a result event was
 * seen — that means the agent process never started, and the trial
 * produced no usable signal. Partial extraction is preferred over
 * failure: if init is present but result is missing (e.g. timeout), we
 * still report the init counts and leave token fields at 0.
 */
export function extractContextMetrics(ndjson: string): ContextMetrics | null {
  const events = parseEvents(ndjson);
  const init = events.find(
    (e) => e.type === "system" && e.subtype === "init",
  );
  // Use the last result event in case there are multiple (shouldn't
  // happen with maxSteps=1, but be defensive).
  let result: Record<string, unknown> | undefined;
  for (const e of events) {
    if (e.type === "result") result = e;
  }
  if (!init && !result) return null;

  const arrayLen = (v: unknown): number => Array.isArray(v) ? v.length : 0;
  const usage = (result?.usage ?? {}) as Record<string, unknown>;
  const numField = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  return {
    toolsCount: arrayLen(init?.tools),
    skillsCount: arrayLen(init?.skills),
    slashCommandsCount: arrayLen(init?.slash_commands),
    mcpServersCount: arrayLen(init?.mcp_servers),
    cacheCreationInputTokens: numField(usage.cache_creation_input_tokens),
    cacheReadInputTokens: numField(usage.cache_read_input_tokens),
    inputTokens: numField(usage.input_tokens),
    outputTokens: numField(usage.output_tokens),
  };
}

/** Metric aggregate across several trials sharing the same axis value. */
export interface MetricAggregate extends ContextMetrics {
  /** Total baseline context: cache_creation + cache_read, pre-output. */
  baselineContextTokens: number;
  /** Number of trials that contributed to the mean. */
  sampleCount: number;
}

/**
 * Groups trials by a single axis value, extracts metrics from each
 * trial's `agentOutput`, and averages them. Trials whose NDJSON could
 * not be parsed are excluded from the count (and produce no entry for
 * that axis value if all trials failed).
 */
export function aggregateMetricsByAxis(
  trials: ReadonlyArray<TrialResult>,
  axis: string,
): Record<string, MetricAggregate> {
  const buckets = new Map<string, ContextMetrics[]>();
  for (const t of trials) {
    const raw = t.cell.axes[axis];
    if (raw === undefined) continue;
    const key = String(raw);
    const metrics = extractContextMetrics(t.agentOutput);
    if (!metrics) continue;
    const arr = buckets.get(key) ?? [];
    arr.push(metrics);
    buckets.set(key, arr);
  }

  const out: Record<string, MetricAggregate> = {};
  for (const [key, samples] of buckets.entries()) {
    if (samples.length === 0) continue;
    const mean = <K extends keyof ContextMetrics>(field: K): number =>
      samples.reduce((acc, s) => acc + s[field], 0) / samples.length;
    const entry: MetricAggregate = {
      toolsCount: mean("toolsCount"),
      skillsCount: mean("skillsCount"),
      slashCommandsCount: mean("slashCommandsCount"),
      mcpServersCount: mean("mcpServersCount"),
      cacheCreationInputTokens: mean("cacheCreationInputTokens"),
      cacheReadInputTokens: mean("cacheReadInputTokens"),
      inputTokens: mean("inputTokens"),
      outputTokens: mean("outputTokens"),
      baselineContextTokens: mean("cacheCreationInputTokens") +
        mean("cacheReadInputTokens"),
      sampleCount: samples.length,
    };
    out[key] = entry;
  }
  return out;
}

/** Formats a number with thousands separators for readability. */
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/**
 * Renders the experiment-specific markdown section: a table of
 * averaged context metrics by axis value (usually "tokens" — the size
 * of the AGENTS.md memory file in the sandbox).
 */
export function renderMetricsTable(
  report: ExperimentReport,
  axis: string,
): string {
  const agg = aggregateMetricsByAxis(report.trials, axis);
  const keys = Object.keys(agg).sort((a, b) => Number(a) - Number(b));
  if (keys.length === 0) {
    return "## Context metrics\n\n_No parseable trial output — nothing to report._";
  }

  const lines: string[] = [];
  lines.push(`## Context metrics by \`${axis}\``);
  lines.push("");
  lines.push(
    `Each row averages \`n\` trials at the given axis value. ` +
      `**baseline** = cache_creation + cache_read (everything the model ` +
      `saw in its prompt before generating a response). **tools/skills/` +
      `slash/mcp** come from the CLI's init event.`,
  );
  lines.push("");
  lines.push(
    `| ${axis} | n | baseline | cache_create | cache_read | input | output | tools | skills | slash | mcp |`,
  );
  lines.push(
    `|---|---|---|---|---|---|---|---|---|---|---|`,
  );
  for (const key of keys) {
    const m = agg[key];
    lines.push(
      `| ${key} | ${m.sampleCount} | ${fmtInt(m.baselineContextTokens)} | ${
        fmtInt(m.cacheCreationInputTokens)
      } | ${fmtInt(m.cacheReadInputTokens)} | ${fmtInt(m.inputTokens)} | ${
        fmtInt(m.outputTokens)
      } | ${fmtInt(m.toolsCount)} | ${fmtInt(m.skillsCount)} | ${
        fmtInt(m.slashCommandsCount)
      } | ${fmtInt(m.mcpServersCount)} |`,
    );
  }
  return lines.join("\n");
}

/**
 * Returns the aggregate row at the minimum axis value, or null if the
 * axis is empty. Used by the headline to report "the baseline".
 */
export function baselineRow(
  report: ExperimentReport,
  axis: string,
): MetricAggregate | null {
  const agg = aggregateMetricsByAxis(report.trials, axis);
  const keys = Object.keys(agg).sort((a, b) => Number(a) - Number(b));
  if (keys.length === 0) return null;
  return agg[keys[0]];
}
