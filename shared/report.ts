/**
 * JSON + Markdown report writers for experiments.
 *
 * Result lifecycle: the runner invokes `writeReport()` which saves two
 * sibling files under the top-level `./results/` directory:
 *   <YYYY-MM-DD>-<HHMM>-<provider-model-slug>-<variant>.json
 *   <YYYY-MM-DD>-<HHMM>-<provider-model-slug>-<variant>.md
 *
 * The `HHMM` time is derived from `report.startedAt` in UTC so multiple
 * runs on the same day never collide.
 */

import { join } from "@std/path";
import type { ExperimentReport, TrialResult } from "./types.ts";

/**
 * Computes mean adherence (0..1) grouped by the value of a single axis.
 * Other axes are marginalized: all trials sharing the same value of the
 * primary axis are pooled regardless of the values of other axes.
 */
export function computeAdherenceByAxis(
  trials: ReadonlyArray<TrialResult>,
  axis: string,
): Record<string, number> {
  const counts: Record<string, { pass: number; total: number }> = {};
  for (const t of trials) {
    const raw = t.cell.axes[axis];
    if (raw === undefined) continue;
    const key = String(raw);
    const bucket = counts[key] ?? { pass: 0, total: 0 };
    bucket.total += 1;
    if (t.pass) bucket.pass += 1;
    counts[key] = bucket;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    out[k] = v.total > 0 ? v.pass / v.total : 0;
  }
  return out;
}

/**
 * Renders the experiment report as Markdown with a headline number and
 * an adherence curve table.
 */
export function renderMarkdown(report: ExperimentReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.experimentName}`);
  lines.push("");
  lines.push(`**Headline:** ${report.headline}`);
  lines.push("");
  lines.push(`## Run Metadata`);
  lines.push("");
  lines.push(`- **Experiment ID:** \`${report.experimentId}\``);
  if (report.modelProvider) {
    lines.push(`- **Model provider:** \`${report.modelProvider}\``);
  }
  lines.push(`- **Model:** \`${report.model}\``);
  lines.push(`- **IDE:** \`${report.ide}\``);
  if (report.judgeModel || report.judgeModelProvider || report.judgeRuntime) {
    lines.push(`- **Judge runtime:** \`${report.judgeRuntime ?? report.ide}\``);
    if (report.judgeModelProvider) {
      lines.push(
        `- **Judge model provider:** \`${report.judgeModelProvider}\``,
      );
    }
    if (report.judgeModel) {
      lines.push(`- **Judge model:** \`${report.judgeModel}\``);
    }
  }
  lines.push(`- **Reps per cell:** ${report.reps}`);
  lines.push(`- **Seed:** ${report.seed}`);
  lines.push(`- **Started:** ${report.startedAt}`);
  lines.push(`- **Finished:** ${report.finishedAt}`);
  lines.push(
    `- **Duration:** ${(report.durationMs / 1000 / 60).toFixed(1)} min`,
  );
  lines.push(`- **Total trials:** ${report.trials.length}`);
  lines.push("");

  // Adherence curve — show tokens axis if present, else first axis.
  const primaryAxis = "tokens" in report.adherenceByAxis
    ? "tokens"
    : Object.keys(report.adherenceByAxis)[0];

  if (primaryAxis) {
    lines.push(`## Adherence by ${primaryAxis}`);
    lines.push("");
    lines.push(`| ${primaryAxis} | adherence | trials | pass | fail |`);
    lines.push(`|---|---|---|---|---|`);
    const axisValues = report.adherenceByAxis[primaryAxis] ?? {};
    const sortedKeys = Object.keys(axisValues).sort(
      (a, b) => Number(a) - Number(b),
    );
    for (const key of sortedKeys) {
      const trials = report.trials.filter(
        (t) => String(t.cell.axes[primaryAxis]) === key,
      );
      const total = trials.length;
      const pass = trials.filter((t) => t.pass).length;
      const fail = total - pass;
      const rate = axisValues[key];
      lines.push(
        `| ${key} | ${
          (rate * 100).toFixed(1)
        }% | ${total} | ${pass} | ${fail} |`,
      );
    }
    lines.push("");
  }

  // Per-rule breakdown (if rule axis present)
  if ("rule" in report.adherenceByAxis) {
    lines.push(`## Adherence by rule`);
    lines.push("");
    lines.push(`| rule | adherence |`);
    lines.push(`|---|---|`);
    for (const [rule, rate] of Object.entries(report.adherenceByAxis.rule)) {
      lines.push(`| ${rule} | ${(rate * 100).toFixed(1)}% |`);
    }
    lines.push("");
  }

  // Failure samples — up to 5 failures with reasons
  const failures = report.trials.filter((t) => !t.pass).slice(0, 5);
  if (failures.length > 0) {
    lines.push(`## Sample failures`);
    lines.push("");
    for (const f of failures) {
      const axes = Object.entries(f.cell.axes)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      lines.push(`- **${axes}** (trial ${f.cell.trial}): ${f.judgeReason}`);
    }
    lines.push("");
  }

  // Experiment-specific section (e.g., numeric metrics for context
  // anatomy). Appended verbatim so the experiment can control the
  // formatting without framework changes.
  if (report.customMarkdown && report.customMarkdown.trim().length > 0) {
    lines.push(report.customMarkdown.trim());
    lines.push("");
  }

  lines.push(`## Caveats`);
  lines.push("");
  lines.push(
    `- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).`,
  );
  lines.push(
    `- Repetitions per cell: ${report.reps}. Statistical confidence at this sample size is limited.`,
  );
  lines.push(
    `- Prompt caching on the provider side may reduce variance across reps within a cell.`,
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Computes the headline number: the maximum primary-axis value at which
 * mean adherence is still ≥ threshold. Falls back to reporting no safe
 * value if even the smallest cell is below threshold.
 */
export function computeHeadlineMaxSafeTokens(
  adherenceByAxis: Record<string, Record<string, number>>,
  primaryAxis: string,
  threshold = 0.8,
): number | null {
  const axisValues = adherenceByAxis[primaryAxis];
  if (!axisValues) return null;
  const sortedKeys = Object.keys(axisValues).sort(
    (a, b) => Number(a) - Number(b),
  );
  let maxSafe: number | null = null;
  for (const key of sortedKeys) {
    if (axisValues[key] >= threshold) {
      maxSafe = Number(key);
    } else {
      // First failure: stop (we report the last safe value, not the max overall).
      break;
    }
  }
  return maxSafe;
}

/** Writes both JSON and Markdown reports to the results directory. */
export async function writeReport(
  report: ExperimentReport,
  resultsDir: string,
  variant: string,
): Promise<{ jsonPath: string; mdPath: string }> {
  await Deno.mkdir(resultsDir, { recursive: true });
  // startedAt is ISO8601 UTC (e.g. "2026-04-11T17:34:05.123Z"); take
  // date (chars 0..10) and HHMM (chars 11..13 + 14..16) from it.
  const date = report.startedAt.slice(0, 10);
  const hh = report.startedAt.slice(11, 13);
  const mm = report.startedAt.slice(14, 16);
  const time = `${hh}${mm}`;
  const modelSlug = [report.modelProvider, report.model].filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
  const baseName = `${date}-${time}-${modelSlug}-${variant}`;
  const jsonPath = join(resultsDir, `${baseName}.json`);
  const mdPath = join(resultsDir, `${baseName}.md`);
  await Deno.writeTextFile(jsonPath, JSON.stringify(report, null, 2));
  await Deno.writeTextFile(mdPath, renderMarkdown(report));
  return { jsonPath, mdPath };
}
