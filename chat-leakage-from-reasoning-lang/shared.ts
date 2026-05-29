/**
 * Shared helpers for the reasoning-language chat-leakage experiment.
 *
 * The experiment observes visible reasoning, not hidden reasoning. It
 * creates a controlled Russian analytical task, asks the model to emit
 * a visible English analysis block, then judges leakage only in the
 * separate final Russian answer block.
 */

import { estimateTokens, fitToTokenBudget } from "../shared/tokens.ts";
import type { Cell, ExperimentReport, TrialResult } from "../shared/types.ts";

export type InstructionMode = "baseline" | "guarded";

export const TOKEN_AXIS = [0, 50_000, 100_000, 200_000, 400_000] as const;
export const INSTRUCTION_AXIS = ["baseline", "guarded"] as const;

const CORE_REQUIREMENTS = `
# Требования к запуску

## Главная цель

Команда должна запустить новую службу обработки заявок для региональных отделов так, чтобы первые пользователи получили рабочий маршрут без потери данных, ручных обходов и спорных решений по доступу.

## Кандидаты на план запуска

1. Быстрый общий запуск для всех отделов в один день дает широкий охват, но переносит неготовые правила доступа, слабую поддержку и незавершенный аудит прямо в рабочий контур.
2. Ограниченный пилот в двух подготовленных отделах дает меньше охвата, зато проверяет права, журналирование, обучение операторов и восстановление после ошибок на реальных заявках.
3. Полная отсрочка снижает риск поломки, но задерживает обязательные отчеты, оставляет ручную сверку и увеличивает нагрузку на поддержку.

## Обязательные ограничения

- Приоритетом считается надежный контролируемый запуск, а не максимальная скорость распространения.
- Нельзя включать отдел без назначенного владельца, обученной первой линии и проверенного журнала действий.
- Любой запуск должен сохранять возможность ручного отката без потери заявок.
- Юридический аудит требует объяснимых решений по доступу раньше широкого включения.
- Поддержка готова сопровождать только ограниченную первую волну.

## Конфликт

Главный компромисс проходит между быстрым охватом и безопасной проверяемостью: общий запуск быстрее показывает эффект, но повышает риск неверных прав, неполного журнала и перегрузки поддержки. Приоритетный план должен выбрать ограниченный пилот, потому что он сохраняет движение к цели и одновременно проверяет самые опасные условия до расширения.
`.trim();

const MEMORY_TEXT = `
# Память проекта

Все материалы испытания описывают русскоязычный проектный контекст. При ответе на пользовательскую задачу опирайся на требования из корневого файла, выбирай один приоритетный план запуска и строго соблюдай запрошенные блоки ответа.
`.trim();

function expansionBlock(index: number): string {
  const department = (index % 7) + 1;
  const risk = (index % 5) + 1;
  const audit = (index % 4) + 1;
  return `
## Дополнительная группа требований ${index}

Отдел ${department} готов участвовать только при наличии ответственного владельца смены, обученного заместителя и ежедневной сверки спорных заявок. Если запускать службу сразу во всех отделах, группа риска ${risk} получит непроверенные права раньше завершения контрольной проверки.

Исключение ${audit}: срочные заявки можно провести через новый маршрут только после ручного подтверждения, потому что автоматическое правило еще не покрывает ночные смены, временные роли и возврат ошибочно созданной заявки. Это усиливает выбор пилота: он дает реальные данные, но оставляет поддержку в пределах заранее согласованной нагрузки.

Заметка аудита ${index}: решение по запуску должно явно предпочитать проверяемость, обучение и откат широте охвата, если эти цели конфликтуют в одной волне. Отложенный запуск допустим только при обнаружении блокирующей ошибки в журнале действий; во всех остальных случаях ограниченный пилот лучше сохраняет темп и снижает необратимый риск.
`.trim();
}

/** Builds the Russian analytical material for `README.md`. */
export function buildAnalyticalMaterial(targetTokens: number): string {
  if (targetTokens <= 0) return CORE_REQUIREMENTS;

  const parts = [CORE_REQUIREMENTS];
  let index = 1;
  while (estimateTokens(parts.join("\n\n")) < targetTokens) {
    parts.push(expansionBlock(index));
    index += 1;
  }
  return fitToTokenBudget(parts.join("\n\n"), targetTokens);
}

/** Builds the root project memory used by all cells. */
export function buildProjectMemory(): string {
  return `${MEMORY_TEXT}\n`;
}

/** Builds the trial README, including the controlled analytical material. */
export function buildReadme(targetTokens: number): string {
  const material = buildAnalyticalMaterial(targetTokens);
  return `${material}\n`;
}

function assertInstructionMode(value: string | number): InstructionMode {
  if (value === "baseline" || value === "guarded") return value;
  throw new Error(`Unknown instruction mode: ${value}`);
}

function targetTokensFromCell(cell: Cell): number {
  const raw = cell.axes.tokens;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new Error(`Invalid tokens axis value: ${String(raw)}`);
  }
  return raw;
}

/** Builds the Russian user query for a cell. */
export function buildQuery(cell: Cell): string {
  const mode = assertInstructionMode(cell.axes.instruction);
  const base = [
    "Прочитай требования в README.md.",
    "Сначала напиши строку VISIBLE_ANALYSIS и под ней открытые аналитические заметки на английском языке: 6-10 коротких пунктов, которые сопоставляют цель, ограничения, риски, исключения и заметки аудита, затем выбирают приоритетный план запуска.",
    "После этого напиши строку FINAL_ANSWER и под ней ровно два коротких русских предложения, где названы главная цель, конфликт или компромисс и выбранный план.",
  ];

  if (mode === "guarded") {
    base.push(
      "Не позволяй языку открытого английского рассуждения влиять на блок FINAL_ANSWER; в финальном блоке отвечай только естественным русским языком, избегай английских слов, кальки и транслитерации, переведи все понятия перед записью ответа и сохрани ровно два русских предложения.",
    );
  }

  return base.join(" ");
}

/** Judge rule shared by all cells. */
export function buildJudgeRule(): string {
  return [
    "The output must contain a visible analysis section headed VISIBLE_ANALYSIS and a separate final answer section headed FINAL_ANSWER.",
    "The VISIBLE_ANALYSIS section may be English because it is the controlled visible reasoning pressure; do not treat English in that section as leakage.",
    "Judge leakage only in the FINAL_ANSWER section.",
    "Pass only if FINAL_ANSWER is exactly two Russian sentences.",
    "FINAL_ANSWER must make a meaningful launch-plan choice grounded in the requirements: the priority plan is an ограниченный пилот / staged limited pilot rather than a broad immediate launch or full delay.",
    "FINAL_ANSWER must mention the relevant conflict, trade-off, or priority decision: speed and coverage versus safety, auditability, access correctness, support capacity, or rollback.",
    "FINAL_ANSWER must contain no English words, no untranslated foreign fragments, and no avoidable transliterated English leakage.",
    "Technical names, file paths, commands, and normal Russian loanwords are allowed in FINAL_ANSWER only when genuinely necessary.",
    "FINAL_ANSWER must not quote the English visible-analysis instruction.",
  ].join(" ");
}

/** Controlled input profile for one cell. Final answer is excluded. */
export interface ContextProfile {
  targetTokens: number;
  instruction: InstructionMode;
  totalMeasuredContextTokens: number;
  analyticalMaterialTokens: number;
  projectFileTokens: number;
  memoryTokens: number;
  chatQueryTokens: number;
  russianContextTokens: number;
  englishContextTokens: number;
  japaneseContextTokens: number;
}

interface ScriptTokenCounts {
  russian: number;
  english: number;
  japanese: number;
}

function countScriptTokens(text: string): ScriptTokenCounts {
  const totalTokens = estimateTokens(text);
  if (totalTokens === 0) {
    return { russian: 0, english: 0, japanese: 0 };
  }

  const chars = Array.from(text);
  let russianChars = 0;
  let englishChars = 0;
  let japaneseChars = 0;
  for (const ch of chars) {
    if (/\p{Script=Cyrillic}/u.test(ch)) russianChars += 1;
    if (/\p{Script=Latin}/u.test(ch)) englishChars += 1;
    if (
      /\p{Script=Hiragana}/u.test(ch) ||
      /\p{Script=Katakana}/u.test(ch) ||
      /\p{Script=Han}/u.test(ch)
    ) {
      japaneseChars += 1;
    }
  }

  const scriptChars = russianChars + englishChars + japaneseChars;
  if (scriptChars === 0) {
    return { russian: 0, english: 0, japanese: 0 };
  }

  return {
    russian: Math.round((totalTokens * russianChars) / scriptChars),
    english: Math.round((totalTokens * englishChars) / scriptChars),
    japanese: Math.round((totalTokens * japaneseChars) / scriptChars),
  };
}

/** Builds the controlled profile for the exact input text of a cell. */
export function buildContextProfile(cell: Cell): ContextProfile {
  const targetTokens = targetTokensFromCell(cell);
  const instruction = assertInstructionMode(cell.axes.instruction);
  const analyticalMaterial = buildAnalyticalMaterial(targetTokens);
  const readme = buildReadme(targetTokens);
  const memory = buildProjectMemory();
  const query = buildQuery(cell);
  const controlledInput = [readme, memory, query].join("\n\n");
  const script = countScriptTokens(controlledInput);

  return {
    targetTokens,
    instruction,
    totalMeasuredContextTokens: estimateTokens(controlledInput),
    analyticalMaterialTokens: estimateTokens(analyticalMaterial),
    projectFileTokens: estimateTokens(readme),
    memoryTokens: estimateTokens(memory),
    chatQueryTokens: estimateTokens(query),
    russianContextTokens: script.russian,
    englishContextTokens: script.english,
    japaneseContextTokens: script.japanese,
  };
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function fmtTelemetry(n: number | undefined): string {
  return n === undefined ? "-" : fmtInt(n);
}

/** Text-block metrics extracted from one agent output. */
export interface TextBlockMetrics {
  present: boolean;
  charCount: number;
  estimatedTokens: number;
  russianTokens: number;
  englishTokens: number;
  japaneseTokens: number;
}

function headingRest(line: string, heading: string): string | null {
  const cleaned = line
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*/g, "")
    .trim();
  const re = new RegExp(`^${heading}\\s*:?\\s*(.*)$`, "i");
  const match = re.exec(cleaned);
  return match ? match[1].trim() : null;
}

function extractSection(
  agentOutput: string,
  heading: string,
  stopHeading?: string,
): string {
  const lines = agentOutput.split("\n");
  const startIndex = lines.findIndex((line) =>
    headingRest(line, heading) !== null
  );
  if (startIndex < 0) return "";

  const firstLineRest = headingRest(lines[startIndex], heading) ?? "";
  const sectionLines = firstLineRest.length > 0 ? [firstLineRest] : [];

  for (let i = startIndex + 1; i < lines.length; i++) {
    if (stopHeading && headingRest(lines[i], stopHeading) !== null) break;
    sectionLines.push(lines[i]);
  }
  return sectionLines.join("\n").trim();
}

/** Extracts text between VISIBLE_ANALYSIS and FINAL_ANSWER headings. */
export function extractVisibleReasoning(agentOutput: string): string {
  return extractSection(agentOutput, "VISIBLE_ANALYSIS", "FINAL_ANSWER");
}

/** Extracts text after the FINAL_ANSWER heading. */
export function extractFinalAnswer(agentOutput: string): string {
  return extractSection(agentOutput, "FINAL_ANSWER");
}

function measureTextBlock(text: string): TextBlockMetrics {
  const script = countScriptTokens(text);
  return {
    present: text.length > 0,
    charCount: Array.from(text).length,
    estimatedTokens: estimateTokens(text),
    russianTokens: script.russian,
    englishTokens: script.english,
    japaneseTokens: script.japanese,
  };
}

/** Counts actual visible analysis length from generated agent output. */
export function measureVisibleReasoning(
  agentOutput: string,
): TextBlockMetrics {
  return measureTextBlock(extractVisibleReasoning(agentOutput));
}

/** Counts actual final-answer length from generated agent output. */
export function measureFinalAnswer(agentOutput: string): TextBlockMetrics {
  return measureTextBlock(extractFinalAnswer(agentOutput));
}

function mean(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function matchingTrials(
  report: ExperimentReport,
  targetTokens: number,
  instruction: InstructionMode,
): TrialResult[] {
  return report.trials.filter((trial) =>
    trial.cell.axes.tokens === targetTokens &&
    trial.cell.axes.instruction === instruction
  );
}

function adherenceForTrials(trials: readonly TrialResult[]): number {
  if (trials.length === 0) return 0;
  return trials.filter((trial) => trial.pass).length / trials.length;
}

function maxSafeTokensForInstruction(
  report: ExperimentReport,
  instruction: InstructionMode,
  threshold = 0.8,
): number | null {
  const tokens = [...(report.axes.tokens ?? [])]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  let maxSafe: number | null = null;
  for (const tokenValue of tokens) {
    const trials = matchingTrials(report, tokenValue, instruction);
    if (trials.length === 0) continue;
    if (adherenceForTrials(trials) >= threshold) {
      maxSafe = tokenValue;
    } else {
      break;
    }
  }
  return maxSafe;
}

/** Headline summarising the safe token budget per instruction mode. */
export function headline(report: ExperimentReport): string {
  const baseline = maxSafeTokensForInstruction(report, "baseline");
  const guarded = maxSafeTokensForInstruction(report, "guarded");
  const value = (n: number | null) => n === null ? "none" : fmtInt(n);
  return `Max target tokens at >=80% adherence: baseline=${
    value(baseline)
  }, guarded=${value(guarded)}.`;
}

/** Renders adherence and controlled-context metrics by tokens x instruction. */
export function renderCustom(report: ExperimentReport): string {
  const lines: string[] = [];
  lines.push("## Adherence by instruction and tokens");
  lines.push("");
  lines.push("| tokens | instruction | trials | pass | adherence |");
  lines.push("|---|---|---|---|---|");

  const tokenValues = [...(report.axes.tokens ?? [])]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const instructions = (report.axes.instruction ?? [])
    .map((value) => String(value))
    .filter((value): value is InstructionMode =>
      value === "baseline" || value === "guarded"
    );

  for (const tokenValue of tokenValues) {
    for (const instruction of instructions) {
      const trials = matchingTrials(report, tokenValue, instruction);
      const pass = trials.filter((trial) => trial.pass).length;
      const adherence = adherenceForTrials(trials);
      lines.push(
        `| ${tokenValue} | ${instruction} | ${trials.length} | ${pass} | ${
          (adherence * 100).toFixed(1)
        }% |`,
      );
    }
  }

  lines.push("");
  lines.push("## Visible reasoning profile");
  lines.push("");
  lines.push(
    "Visible reasoning is extracted from generated text between `VISIBLE_ANALYSIS` and `FINAL_ANSWER`. Token counts use the repository heuristic; character counts are exact.",
  );
  lines.push("");
  lines.push(
    "| tokens | instruction | trials | present | chars | tokens_est | russian | english | japanese |",
  );
  lines.push("|---|---|---|---|---|---|---|---|---|");

  for (const tokenValue of tokenValues) {
    for (const instruction of instructions) {
      const trials = matchingTrials(report, tokenValue, instruction);
      const metrics = trials.map((trial) =>
        measureVisibleReasoning(trial.agentOutput)
      );
      const present = metrics.filter((metric) => metric.present).length;
      const avgChars = mean(metrics.map((metric) => metric.charCount));
      const avgTokens = mean(metrics.map((metric) => metric.estimatedTokens));
      const avgRussian = mean(metrics.map((metric) => metric.russianTokens));
      const avgEnglish = mean(metrics.map((metric) => metric.englishTokens));
      const avgJapanese = mean(metrics.map((metric) => metric.japaneseTokens));
      lines.push(
        `| ${tokenValue} | ${instruction} | ${trials.length} | ${present} | ${
          fmtTelemetry(avgChars)
        } | ${fmtTelemetry(avgTokens)} | ${fmtTelemetry(avgRussian)} | ${
          fmtTelemetry(avgEnglish)
        } | ${fmtTelemetry(avgJapanese)} |`,
      );
    }
  }

  lines.push("");
  lines.push("## Final answer profile");
  lines.push("");
  lines.push(
    "Final answer is extracted from generated text after `FINAL_ANSWER`. Leakage adherence is judged only on this block.",
  );
  lines.push("");
  lines.push(
    "| tokens | instruction | trials | present | chars | tokens_est | russian | english | japanese |",
  );
  lines.push("|---|---|---|---|---|---|---|---|---|");

  for (const tokenValue of tokenValues) {
    for (const instruction of instructions) {
      const trials = matchingTrials(report, tokenValue, instruction);
      const metrics = trials.map((trial) =>
        measureFinalAnswer(trial.agentOutput)
      );
      const present = metrics.filter((metric) => metric.present).length;
      const avgChars = mean(metrics.map((metric) => metric.charCount));
      const avgTokens = mean(metrics.map((metric) => metric.estimatedTokens));
      const avgRussian = mean(metrics.map((metric) => metric.russianTokens));
      const avgEnglish = mean(metrics.map((metric) => metric.englishTokens));
      const avgJapanese = mean(metrics.map((metric) => metric.japaneseTokens));
      lines.push(
        `| ${tokenValue} | ${instruction} | ${trials.length} | ${present} | ${
          fmtTelemetry(avgChars)
        } | ${fmtTelemetry(avgTokens)} | ${fmtTelemetry(avgRussian)} | ${
          fmtTelemetry(avgEnglish)
        } | ${fmtTelemetry(avgJapanese)} |`,
      );
    }
  }

  lines.push("");
  lines.push("## Controlled input context profile");
  lines.push("");
  lines.push(
    "Measured context below is rebuilt from the controlled trial input and excludes the final answer. Runtime token columns are shown only when the selected adapter exposes telemetry.",
  );
  lines.push("");
  lines.push(
    "| tokens | instruction | measured | analytical | project_file | memory | chat | russian | english | japanese | runtime_input | cache_read | cache_write |",
  );
  lines.push(
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  );

  for (const tokenValue of tokenValues) {
    for (const instruction of instructions) {
      const cell: Cell = {
        axes: { tokens: tokenValue, instruction },
        trial: 0,
      };
      const profile = buildContextProfile(cell);
      const trials = matchingTrials(report, tokenValue, instruction);
      const runtimeInput = mean(
        trials
          .map((trial) => trial.tokensUsed?.input)
          .filter((value): value is number => value !== undefined),
      );
      const cacheRead = mean(
        trials
          .map((trial) => trial.tokensUsed?.cacheRead)
          .filter((value): value is number => value !== undefined),
      );
      const cacheWrite = mean(
        trials
          .map((trial) => trial.tokensUsed?.cacheWrite)
          .filter((value): value is number => value !== undefined),
      );

      lines.push(
        `| ${tokenValue} | ${instruction} | ${
          fmtInt(profile.totalMeasuredContextTokens)
        } | ${fmtInt(profile.analyticalMaterialTokens)} | ${
          fmtInt(profile.projectFileTokens)
        } | ${fmtInt(profile.memoryTokens)} | ${
          fmtInt(profile.chatQueryTokens)
        } | ${fmtInt(profile.russianContextTokens)} | ${
          fmtInt(profile.englishContextTokens)
        } | ${fmtInt(profile.japaneseContextTokens)} | ${
          fmtTelemetry(runtimeInput)
        } | ${fmtTelemetry(cacheRead)} | ${fmtTelemetry(cacheWrite)} |`,
      );
    }
  }

  return lines.join("\n");
}
