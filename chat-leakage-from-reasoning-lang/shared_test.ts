import { assertEquals, assertStringIncludes } from "@std/assert";
import type { Cell, ExperimentReport, TrialResult } from "../shared/types.ts";
import {
  buildAnalyticalMaterial,
  buildContextProfile,
  buildJudgeRule,
  buildQuery,
  extractFinalAnswer,
  extractVisibleReasoning,
  headline,
  measureFinalAnswer,
  measureVisibleReasoning,
  renderCustom,
} from "./shared.ts";

function cell(tokens: number, instruction: "baseline" | "guarded"): Cell {
  return { axes: { tokens, instruction }, trial: 0 };
}

Deno.test("buildAnalyticalMaterial: zero token cell keeps compact core brief", () => {
  const material = buildAnalyticalMaterial(0);
  assertStringIncludes(material, "ограниченный пилот");
  assertStringIncludes(material, "быстрым охватом");
});

Deno.test("buildAnalyticalMaterial: positive token target expands material", () => {
  const compact = buildAnalyticalMaterial(0);
  const expanded = buildAnalyticalMaterial(2_000);
  if (expanded.length <= compact.length) {
    throw new Error(
      "expected expanded material to be longer than compact brief",
    );
  }
  assertStringIncludes(expanded, "Дополнительная группа требований");
});

Deno.test("buildQuery: guarded mode adds explicit leakage mitigation", () => {
  const baseline = buildQuery(cell(0, "baseline"));
  const guarded = buildQuery(cell(0, "guarded"));
  assertStringIncludes(baseline, "английском языке");
  assertStringIncludes(baseline, "VISIBLE_ANALYSIS");
  assertStringIncludes(baseline, "FINAL_ANSWER");
  assertStringIncludes(guarded, "английском языке");
  assertStringIncludes(guarded, "избегай английских слов");
});

Deno.test("buildContextProfile: excludes final answer and reports language profile", () => {
  const profile = buildContextProfile(cell(0, "guarded"));
  if (profile.totalMeasuredContextTokens <= profile.chatQueryTokens) {
    throw new Error("expected project context to dominate query-only size");
  }
  if (profile.russianContextTokens <= 0) {
    throw new Error("expected Russian context tokens");
  }
  assertEquals(profile.japaneseContextTokens, 0);
});

Deno.test("buildJudgeRule: requires Russian two-sentence launch-plan answer", () => {
  const rule = buildJudgeRule();
  assertStringIncludes(rule, "exactly two Russian sentences");
  assertStringIncludes(rule, "VISIBLE_ANALYSIS");
  assertStringIncludes(rule, "FINAL_ANSWER");
  assertStringIncludes(rule, "limited pilot");
  assertStringIncludes(rule, "no English words");
});

Deno.test("extractVisibleReasoning: extracts text between stable headings", () => {
  const output = [
    "VISIBLE_ANALYSIS:",
    "The pilot is safer because audit and support capacity are constrained.",
    "FINAL_ANSWER:",
    "Главная цель — безопасно запустить службу. Поэтому нужен ограниченный пилот.",
  ].join("\n");
  assertEquals(
    extractVisibleReasoning(output),
    "The pilot is safer because audit and support capacity are constrained.",
  );
});

Deno.test("extractVisibleReasoning: accepts common markdown heading variants", () => {
  const output = [
    "## **VISIBLE_ANALYSIS:** The pilot reduces audit and support risk.",
    "It also keeps rollback practical.",
    "### **FINAL_ANSWER:**",
    "Главная цель — безопасный запуск службы. Поэтому нужен ограниченный пилот.",
  ].join("\n");
  assertEquals(
    extractVisibleReasoning(output),
    [
      "The pilot reduces audit and support risk.",
      "It also keeps rollback practical.",
    ].join("\n"),
  );
});

Deno.test("extractFinalAnswer: extracts text after final heading", () => {
  const output = [
    "VISIBLE_ANALYSIS:",
    "The limited pilot is the best option.",
    "FINAL_ANSWER:",
    "Главная цель — безопасно запустить службу. Приоритетный план — ограниченный пилот.",
  ].join("\n");
  assertEquals(
    extractFinalAnswer(output),
    "Главная цель — безопасно запустить службу. Приоритетный план — ограниченный пилот.",
  );
});

Deno.test("measureVisibleReasoning: counts generated visible analysis", () => {
  const output = [
    "VISIBLE_ANALYSIS:",
    "The limited pilot resolves the speed versus safety trade-off.",
    "FINAL_ANSWER:",
    "Главная цель — контролируемый запуск. Приоритет — ограниченный пилот.",
  ].join("\n");
  const metrics = measureVisibleReasoning(output);
  assertEquals(metrics.present, true);
  if (metrics.charCount <= 0 || metrics.estimatedTokens <= 0) {
    throw new Error("expected positive visible reasoning length");
  }
  if (metrics.englishTokens <= 0) {
    throw new Error("expected English visible reasoning tokens");
  }
});

Deno.test("measureFinalAnswer: counts generated final answer separately", () => {
  const output = [
    "VISIBLE_ANALYSIS:",
    "The limited pilot resolves the speed versus safety trade-off.",
    "FINAL_ANSWER:",
    "Главная цель — контролируемый запуск. Приоритет — ограниченный пилот.",
  ].join("\n");
  const metrics = measureFinalAnswer(output);
  assertEquals(metrics.present, true);
  if (metrics.charCount <= 0 || metrics.estimatedTokens <= 0) {
    throw new Error("expected positive final answer length");
  }
  if (metrics.russianTokens <= 0) {
    throw new Error("expected Russian final answer tokens");
  }
});

function trial(
  tokens: number,
  instruction: "baseline" | "guarded",
  pass: boolean,
  trialIndex: number,
): TrialResult {
  return {
    cell: { axes: { tokens, instruction }, trial: trialIndex },
    pass,
    judgeReason: pass ? "pass" : "fail",
    agentOutput: pass ? "ok" : "bad",
    durationMs: 1,
    exitCode: 0,
    tokensUsed: {
      input: 100 + tokens,
      output: 10,
      cacheRead: 20,
      cacheWrite: 30,
    },
  };
}

function report(trials: TrialResult[]): ExperimentReport {
  return {
    schemaVersion: 1,
    experimentId: "chat-leakage-from-reasoning-lang-baseline",
    experimentName: "Chat leakage from reasoning language",
    model: "mock-model",
    ide: "claude",
    startedAt: "2026-05-20T10:00:00Z",
    finishedAt: "2026-05-20T10:01:00Z",
    seed: 1,
    reps: 2,
    axes: {
      tokens: [0, 100],
      instruction: ["baseline", "guarded"],
    },
    trials,
    adherenceByAxis: {},
    durationMs: 1,
    headline: "",
  };
}

Deno.test("headline: computes max safe tokens per instruction", () => {
  const r = report([
    trial(0, "baseline", true, 0),
    trial(0, "baseline", true, 1),
    trial(100, "baseline", false, 0),
    trial(100, "baseline", true, 1),
    trial(0, "guarded", true, 0),
    trial(0, "guarded", true, 1),
    trial(100, "guarded", true, 0),
    trial(100, "guarded", true, 1),
  ]);
  assertEquals(
    headline(r),
    "Max target tokens at >=80% adherence: baseline=0, guarded=100.",
  );
});

Deno.test("renderCustom: includes context profile and runtime telemetry", () => {
  const r = report([
    trial(0, "baseline", true, 0),
    trial(0, "baseline", false, 1),
  ]);
  const md = renderCustom(r);
  assertStringIncludes(md, "Adherence by instruction and tokens");
  assertStringIncludes(md, "Visible reasoning profile");
  assertStringIncludes(md, "Final answer profile");
  assertStringIncludes(md, "Controlled input context profile");
  assertStringIncludes(md, "runtime_input");
  assertStringIncludes(md, "| 0 | baseline |");
});
