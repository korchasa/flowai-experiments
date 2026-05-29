import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import type { Cell, ExperimentReport, TrialResult } from "../shared/types.ts";
import {
  buildContextProfile,
  buildJudgeRule,
  buildProjectFileMaterial,
  buildProjectMemory,
  buildQuery,
  buildReadme,
  extractFinalAnswer,
  headline,
  measureFinalAnswer,
  renderCustom,
} from "./shared.ts";

function cell(
  projectLanguage: "english",
  tokens: number,
  instruction: "baseline" | "guarded",
): Cell {
  return {
    axes: { project_language: projectLanguage, tokens, instruction },
    trial: 0,
  };
}

Deno.test("buildProjectFileMaterial: English core contains launch choice", () => {
  const material = buildProjectFileMaterial("english", 0);
  assertStringIncludes(material, "limited pilot");
  assertStringIncludes(material, "fast coverage versus safe verifiability");
});

Deno.test("buildProjectFileMaterial: positive target expands selected language", () => {
  const compact = buildProjectFileMaterial("english", 0);
  const expanded = buildProjectFileMaterial("english", 2_000);
  if (expanded.length <= compact.length) {
    throw new Error("expected expanded English material");
  }
  assertStringIncludes(expanded, "Additional Requirement Group");
});

Deno.test("buildProjectMemory: pins Russian chat language in root memory", () => {
  const memory = buildProjectMemory();
  assertStringIncludes(
    memory,
    "Видимый ответ в чат всегда пиши по-русски",
  );
  assertFalse(memory.includes("приоритетный план"));
  assertFalse(memory.includes("стиля внутри файлов"));
});

Deno.test("buildProjectFileMaterial: file_instruction embeds lower-priority source-language style", () => {
  const material = buildProjectFileMaterial("english", 0, "file_instruction");
  assertStringIncludes(material, "Executive Summary Style");
  assertStringIncludes(material, "preferred summary style");
});

Deno.test("buildProjectFileMaterial: mixed_code_switch includes mixed passages", () => {
  const material = buildProjectFileMaterial("english", 0, "mixed_code_switch");
  assertStringIncludes(material, "Mixed-Language Note");
  assertStringIncludes(material, "команда поддержки");
  assertStringIncludes(material, "support capacity");
});

Deno.test("buildProjectFileMaterial: middle_only_signal surrounds current signal with distractors", () => {
  const material = buildProjectFileMaterial(
    "english",
    2_000,
    "middle_only_signal",
  );
  assertStringIncludes(material, "Historical Note");
  assertStringIncludes(material, "limited pilot");
  assertStringIncludes(material, "obsolete");
});

Deno.test("buildProjectFileMaterial: label_transfer embeds English plan labels", () => {
  const material = buildProjectFileMaterial("english", 0, "label_transfer");
  assertStringIncludes(material, "Big Bang Launch");
  assertStringIncludes(material, "Pilot First");
  assertStringIncludes(material, "Freeze Until Ready");
});

Deno.test("buildQuery: term_transfer asks for translated concepts", () => {
  const query = buildQuery(cell("english", 0, "baseline"), "term_transfer");
  assertStringIncludes(query, "проверки доступа");
  assertStringIncludes(query, "пути отката");
  assertStringIncludes(query, "нагрузки поддержки");
  assertFalse(query.includes("исходные термины"));
  assertFalse(query.includes("англий"));
});

Deno.test("buildQuery: guarded mode adds file-language mitigation", () => {
  const baseline = buildQuery(cell("english", 0, "baseline"));
  const guarded = buildQuery(cell("english", 0, "guarded"));
  assertStringIncludes(baseline, "FINAL_ANSWER");
  assertStringIncludes(baseline, "ровно два коротких предложения");
  assertFalse(baseline.includes("русск"));
  assertFalse(baseline.includes("исходного языка"));
  assertFalse(baseline.includes("англий"));
  assertStringIncludes(
    guarded,
    "Файл проекта написан на английском языке",
  );
  assertStringIncludes(guarded, "избегай английских слов");
  assertStringIncludes(guarded, "исходные термины");
});

Deno.test("buildContextProfile: English file reports English pressure", () => {
  const profile = buildContextProfile(cell("english", 0, "guarded"));
  if (profile.englishContextTokens <= profile.russianContextTokens) {
    throw new Error("expected English file context to dominate");
  }
});

Deno.test("buildJudgeRule: requires Russian final answer without source-language leakage", () => {
  const rule = buildJudgeRule();
  assertStringIncludes(rule, "FINAL_ANSWER");
  assertStringIncludes(rule, "exactly two Russian sentences");
  assertStringIncludes(rule, "request-processing service for regional offices");
  assertStringIncludes(rule, "no English words");
});

Deno.test("buildJudgeRule: mechanism-specific rules mention the tested pressure", () => {
  assertStringIncludes(
    buildJudgeRule("file_instruction"),
    "source-language executive-summary style",
  );
  assertStringIncludes(
    buildJudgeRule("middle_only_signal"),
    "obsolete broad-launch",
  );
  assertStringIncludes(
    buildJudgeRule("term_transfer"),
    "translate their meaning",
  );
  assertStringIncludes(
    buildJudgeRule("label_transfer"),
    "English plan labels",
  );
  assertStringIncludes(
    buildJudgeRule("marker_readback"),
    "decision code 742",
  );
});

Deno.test("buildContextProfile: accepts mechanism-specific README construction", () => {
  const profile = buildContextProfile(
    cell("english", 400_000, "guarded"),
    "combined",
  );
  const readme = buildReadme("english", 400_000, "combined");
  if (profile.projectFileTokens <= 0) {
    throw new Error("expected positive combined file profile");
  }
  assertStringIncludes(readme, "Executive Summary Style");
  assertStringIncludes(readme, "Terminology That Must Be Translated");
  assertStringIncludes(readme, "Pilot First");
  assertStringIncludes(readme, "decision code 742");
});

Deno.test("extractFinalAnswer: extracts text after final heading", () => {
  const output = [
    "FINAL_ANSWER:",
    "Главная цель — безопасно запустить службу. Приоритет — ограниченный пилот.",
  ].join("\n");
  assertEquals(
    extractFinalAnswer(output),
    "Главная цель — безопасно запустить службу. Приоритет — ограниченный пилот.",
  );
});

Deno.test("measureFinalAnswer: counts generated final answer", () => {
  const output = [
    "FINAL_ANSWER:",
    "Главная цель — контролируемый запуск. Приоритет — ограниченный пилот.",
  ].join("\n");
  const metrics = measureFinalAnswer(output);
  assertEquals(metrics.present, true);
  if (metrics.russianTokens <= 0) {
    throw new Error("expected Russian final answer tokens");
  }
  assertEquals(metrics.englishTokens, 0);
});

function trial(
  projectLanguage: "english",
  tokens: number,
  instruction: "baseline" | "guarded",
  pass: boolean,
  trialIndex: number,
): TrialResult {
  return {
    cell: {
      axes: { project_language: projectLanguage, tokens, instruction },
      trial: trialIndex,
    },
    pass,
    judgeReason: pass ? "pass" : "fail",
    agentOutput: pass
      ? "FINAL_ANSWER:\nГлавная цель — контролируемый запуск. Приоритет — ограниченный пилот."
      : "bad",
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
    experimentId: "chat-leakage-from-project-lang-baseline",
    experimentName: "Chat leakage from project-file language",
    model: "mock-model",
    ide: "claude",
    startedAt: "2026-05-20T10:00:00Z",
    finishedAt: "2026-05-20T10:01:00Z",
    seed: 1,
    reps: 2,
    axes: {
      project_language: ["english"],
      tokens: [0, 100],
      instruction: ["baseline", "guarded"],
    },
    trials,
    adherenceByAxis: {},
    durationMs: 1,
    headline: "",
  };
}

Deno.test("headline: computes max safe tokens per language and instruction", () => {
  const r = report([
    trial("english", 0, "baseline", true, 0),
    trial("english", 0, "baseline", true, 1),
    trial("english", 100, "baseline", false, 0),
    trial("english", 100, "baseline", true, 1),
  ]);
  assertEquals(
    headline(r),
    "Max target tokens at >=80% adherence: english/baseline=0, english/guarded=none.",
  );
});

Deno.test("renderCustom: includes adherence, final answer, and context profile", () => {
  const r = report([
    trial("english", 0, "baseline", true, 0),
    trial("english", 0, "baseline", false, 1),
  ]);
  const md = renderCustom(r);
  assertStringIncludes(md, "Adherence by project language");
  assertStringIncludes(md, "Final answer profile");
  assertStringIncludes(md, "Diagnostic failure dimensions");
  assertStringIncludes(md, "Controlled input context profile");
  assertStringIncludes(md, "runtime_input");
  assertStringIncludes(md, "| english | 0 | baseline |");
});

Deno.test("renderCustom: diagnostics accept Russian pilot inflections", () => {
  const t = trial("english", 0, "baseline", true, 0);
  t.agentOutput = [
    "FINAL_ANSWER",
    "",
    "Цель запуска — обеспечить прозрачную проверку доступа и не перегрузить службу поддержки. Выбран приоритетный план — ограниченная пилотная волна.",
  ].join("\n");
  const md = renderCustom(report([t]));
  assertStringIncludes(
    md,
    "| english | 0 | baseline | 1 | 0 | 0 | 0 | 0 | 0 |",
  );
});

Deno.test("renderCustom: diagnostics accept Russian trial-launch synonyms", () => {
  const t = trial("english", 0, "baseline", true, 0);
  t.agentOutput = [
    "FINAL_ANSWER",
    "",
    "Главная цель — проверить права доступа и сохранность заявок до расширения охвата. Приоритетный план — ограниченная пробная эксплуатация в двух подготовленных подразделениях.",
  ].join("\n");
  const md = renderCustom(report([t]));
  assertStringIncludes(
    md,
    "| english | 0 | baseline | 1 | 0 | 0 | 0 | 0 | 0 |",
  );
});
