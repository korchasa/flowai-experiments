import { assertEquals } from "@std/assert";
import {
  aggregateMetricsByAxis,
  baselineRow,
  extractContextMetrics,
  parseEvents,
  renderMetricsTable,
} from "./shared.ts";
import type { ExperimentReport, TrialResult } from "../shared/types.ts";

// Real-shaped NDJSON sample derived from claude-haiku-4-5 output for
// a "ping → pong" round trip. Values trimmed for readability but
// fields match the production schema this experiment parses.
const INIT_EVENT =
  `{"type":"system","subtype":"init","cwd":"/tmp/sandbox","session_id":"sess-1",` +
  `"tools":["Task","Bash","Edit","Read","Write","Grep","Glob","WebFetch","WebSearch",` +
  `"NotebookEdit","TodoWrite","ToolSearch","AskUserQuestion","Skill","Monitor",` +
  `"ScheduleWakeup","CronCreate","CronDelete","CronList","RemoteTrigger","EnterPlanMode",` +
  `"ExitPlanMode","EnterWorktree","ExitWorktree"],` +
  `"mcp_servers":[],"slash_commands":[],` +
  `"skills":["update-config","debug","simplify","batch","loop","schedule"],` +
  `"model":"claude-haiku-4-5"}`;

const RESULT_EVENT =
  `{"type":"result","subtype":"success","is_error":false,"session_id":"sess-1",` +
  `"result":"pong","usage":{"input_tokens":10,"cache_creation_input_tokens":26164,` +
  `"cache_read_input_tokens":0,"output_tokens":5}}`;

const SAMPLE_STREAM = `${INIT_EVENT}
{"type":"assistant","message":{"content":[{"type":"text","text":"pong"}]},"session_id":"sess-1"}
${RESULT_EVENT}`;

Deno.test("parseEvents: extracts valid JSON lines and skips garbage", () => {
  const mixed = `${INIT_EVENT}
not json at all
[stderr] something went wrong
${RESULT_EVENT}`;
  const events = parseEvents(mixed);
  assertEquals(events.length, 2);
  assertEquals(events[0].type, "system");
  assertEquals(events[1].type, "result");
});

Deno.test("parseEvents: handles empty input", () => {
  assertEquals(parseEvents(""), []);
  assertEquals(parseEvents("\n\n  \n"), []);
});

Deno.test("extractContextMetrics: reads init counts and result usage", () => {
  const m = extractContextMetrics(SAMPLE_STREAM);
  if (!m) throw new Error("expected metrics, got null");
  assertEquals(m.toolsCount, 24);
  assertEquals(m.skillsCount, 6);
  assertEquals(m.slashCommandsCount, 0);
  assertEquals(m.mcpServersCount, 0);
  assertEquals(m.cacheCreationInputTokens, 26164);
  assertEquals(m.cacheReadInputTokens, 0);
  assertEquals(m.inputTokens, 10);
  assertEquals(m.outputTokens, 5);
});

Deno.test("extractContextMetrics: returns null for empty/unusable output", () => {
  assertEquals(extractContextMetrics(""), null);
  assertEquals(extractContextMetrics("not a stream"), null);
});

Deno.test("extractContextMetrics: handles partial stream (init only, no result)", () => {
  const m = extractContextMetrics(INIT_EVENT);
  if (!m) throw new Error("expected metrics, got null");
  assertEquals(m.toolsCount, 24);
  assertEquals(m.skillsCount, 6);
  // Usage fields default to 0 when result event is absent.
  assertEquals(m.cacheCreationInputTokens, 0);
  assertEquals(m.outputTokens, 0);
});

Deno.test("extractContextMetrics: prefers the last result event when multiple present", () => {
  const second =
    `{"type":"result","subtype":"success","usage":{"input_tokens":99,` +
    `"cache_creation_input_tokens":12345,"cache_read_input_tokens":111,"output_tokens":7}}`;
  const stream = `${INIT_EVENT}\n${RESULT_EVENT}\n${second}`;
  const m = extractContextMetrics(stream);
  if (!m) throw new Error("expected metrics, got null");
  assertEquals(m.cacheCreationInputTokens, 12345);
  assertEquals(m.inputTokens, 99);
});

function mkTrial(tokens: number, ndjson: string, trial = 0): TrialResult {
  return {
    cell: { axes: { tokens }, trial },
    pass: true,
    judgeReason: "stub",
    agentOutput: ndjson,
    durationMs: 1000,
    exitCode: 0,
  };
}

function mkReport(trials: TrialResult[]): ExperimentReport {
  return {
    schemaVersion: 1,
    experimentId: "context-anatomy-baseline",
    experimentName: "Context anatomy",
    model: "claude-haiku-4-5",
    ide: "claude",
    startedAt: "2026-04-11T10:00:00Z",
    finishedAt: "2026-04-11T10:05:00Z",
    seed: 1,
    reps: 1,
    axes: { tokens: [0, 500] },
    trials,
    adherenceByAxis: { tokens: {} },
    durationMs: 5000,
    headline: "",
  };
}

Deno.test("aggregateMetricsByAxis: averages across reps in a cell", () => {
  // Two trials at tokens=0 with different cache totals.
  const trial1 = mkTrial(
    0,
    `${INIT_EVENT}\n{"type":"result","usage":{"cache_creation_input_tokens":20000,"cache_read_input_tokens":0,"input_tokens":10,"output_tokens":5}}`,
    0,
  );
  const trial2 = mkTrial(
    0,
    `${INIT_EVENT}\n{"type":"result","usage":{"cache_creation_input_tokens":30000,"cache_read_input_tokens":0,"input_tokens":10,"output_tokens":5}}`,
    1,
  );
  const agg = aggregateMetricsByAxis([trial1, trial2], "tokens");
  const row = agg["0"];
  assertEquals(row.sampleCount, 2);
  assertEquals(row.cacheCreationInputTokens, 25000);
  assertEquals(row.baselineContextTokens, 25000);
});

Deno.test("aggregateMetricsByAxis: groups by axis value", () => {
  const smallStream =
    `${INIT_EVENT}\n{"type":"result","usage":{"cache_creation_input_tokens":26000,"cache_read_input_tokens":0,"input_tokens":10,"output_tokens":5}}`;
  const bigStream =
    `${INIT_EVENT}\n{"type":"result","usage":{"cache_creation_input_tokens":42000,"cache_read_input_tokens":0,"input_tokens":10,"output_tokens":5}}`;
  const trials = [
    mkTrial(0, smallStream, 0),
    mkTrial(16000, bigStream, 0),
  ];
  const agg = aggregateMetricsByAxis(trials, "tokens");
  assertEquals(Object.keys(agg).sort(), ["0", "16000"]);
  assertEquals(agg["0"].cacheCreationInputTokens, 26000);
  assertEquals(agg["16000"].cacheCreationInputTokens, 42000);
});

Deno.test("aggregateMetricsByAxis: skips trials with unparseable output", () => {
  const trials = [
    mkTrial(0, "", 0),
    mkTrial(0, SAMPLE_STREAM, 1),
  ];
  const agg = aggregateMetricsByAxis(trials, "tokens");
  assertEquals(agg["0"].sampleCount, 1);
});

Deno.test("renderMetricsTable: contains axis header, rows sorted by numeric value", () => {
  const small =
    `${INIT_EVENT}\n{"type":"result","usage":{"cache_creation_input_tokens":26000,"cache_read_input_tokens":0,"input_tokens":10,"output_tokens":5}}`;
  const big =
    `${INIT_EVENT}\n{"type":"result","usage":{"cache_creation_input_tokens":42000,"cache_read_input_tokens":0,"input_tokens":10,"output_tokens":5}}`;
  const report = mkReport([
    mkTrial(16000, big, 0),
    mkTrial(0, small, 0),
  ]);
  const md = renderMetricsTable(report, "tokens");
  if (!md.includes("Context metrics by `tokens`")) {
    throw new Error("section header missing");
  }
  const firstRow = md.indexOf("| 0 |");
  const secondRow = md.indexOf("| 16000 |");
  if (firstRow < 0 || secondRow < 0 || firstRow > secondRow) {
    throw new Error("rows not sorted ascending by tokens");
  }
});

Deno.test("renderMetricsTable: empty trials → 'nothing to report'", () => {
  const report = mkReport([]);
  const md = renderMetricsTable(report, "tokens");
  if (!md.includes("nothing to report")) {
    throw new Error("expected empty-state message");
  }
});

Deno.test("baselineRow: returns the lowest-axis row", () => {
  const small =
    `${INIT_EVENT}\n{"type":"result","usage":{"cache_creation_input_tokens":26000,"cache_read_input_tokens":0,"input_tokens":10,"output_tokens":5}}`;
  const big =
    `${INIT_EVENT}\n{"type":"result","usage":{"cache_creation_input_tokens":42000,"cache_read_input_tokens":0,"input_tokens":10,"output_tokens":5}}`;
  const report = mkReport([mkTrial(16000, big, 0), mkTrial(0, small, 0)]);
  const row = baselineRow(report, "tokens");
  if (!row) throw new Error("expected a baseline row");
  assertEquals(row.cacheCreationInputTokens, 26000);
});

Deno.test("baselineRow: returns null when no trials parseable", () => {
  const report = mkReport([mkTrial(0, "", 0)]);
  assertEquals(baselineRow(report, "tokens"), null);
});
