/**
 * Experiment: anchor-systems — link-cost variant (Bench 7).
 *
 * Token Cost of Link Resolution: compare each anchor system's natural
 * reference syntax. File-qualified systems (native, heading-refs, wikilinks)
 * can route directly to a file; path-free systems (zettelkasten, salp,
 * salp-short) require locating the target anchor before doing the same task.
 *
 * Axes:  system × operation.
 * Reps:  5.
 * Metric: average visible-token delta (task prompt + final agent output)
 *         between the natural file-qualified and path-free system classes,
 *         reported alongside correctness.
 */

import type { Cell, Experiment, ExperimentReport } from "../shared/types.ts";
import type { TrialResult } from "../shared/types.ts";
import { estimateTokens } from "../shared/tokens.ts";
import {
  ANCHOR_SYSTEMS,
  loadGroundTruth,
  shortId,
  surfaceId,
  writeFixtures,
} from "./shared.ts";

const gt = loadGroundTruth();

type Operation = "lookup" | "boundary" | "reference-hop";
type LinkClass = "file-qualified" | "path-free";

interface OperationSpec {
  id: Operation;
  anchorId: string;
  file: string;
  label: string;
  task: string;
  schema: string;
  judge: string;
}

const OPERATIONS: Record<Operation, OperationSpec> = {
  lookup: {
    id: "lookup",
    anchorId: "auth:session-timeout",
    file: "session.md",
    label: "session timeout policy",
    task: "Return the maximum idle session timeout value.",
    schema: '{"file": "...", "anchor": "...", "value": "..."}',
    judge:
      "The correct answer is session.md, anchor auth:session-timeout, value 30 minutes.",
  },
  boundary: {
    id: "boundary",
    anchorId: "impl:token-generator-v1",
    file: "auth_service.py",
    label: "token generator",
    task:
      "Return the file and inclusive line range of the function containing the anchor.",
    schema: '{"file": "...", "anchor": "...", "start_line": N, "end_line": N}',
    judge:
      "The correct answer is auth_service.py, anchor impl:token-generator-v1, " +
      "function generate_reset_token, start_line=7, end_line=18. " +
      "Accept line ranges with inclusive IoU >= 0.8 against 7..18.",
  },
  "reference-hop": {
    id: "reference-hop",
    anchorId: "rate:otp-window",
    file: "ratelimit.md",
    label: "OTP rate window",
    task:
      "Resolve the referenced policy and return the OTP validity window value.",
    schema: '{"file": "...", "anchor": "...", "value": "..."}',
    judge:
      "The correct answer is ratelimit.md, anchor rate:otp-window, value 90 seconds.",
  },
};

function operationFromCell(cell: Cell): OperationSpec {
  const operation = String(cell.axes.operation) as Operation;
  const spec = OPERATIONS[operation];
  if (!spec) throw new Error(`Unknown link-cost operation: ${operation}`);
  return spec;
}

function linkClass(system: string): LinkClass {
  switch (system) {
    case "native":
    case "heading-refs":
    case "wikilinks":
      return "file-qualified";
    case "zettelkasten":
    case "salp":
    case "salp-short":
      return "path-free";
    default:
      throw new Error(`Unknown anchor system: ${system}`);
  }
}

function naturalReference(system: string, spec: OperationSpec): string {
  const heading = gt.native_headings[spec.anchorId];
  switch (system) {
    case "native":
      return `[${spec.label}](${spec.file}#${heading?.slug ?? spec.anchorId})`;
    case "heading-refs":
      return `[${spec.file}:${heading?.heading ?? spec.anchorId}]`;
    case "wikilinks":
      return `[[${fileStem(spec.file)}#^${
        spec.anchorId.replaceAll(":", "-")
      }]]`;
    case "zettelkasten":
      return `[[${gt.zettelkasten_uids[spec.anchorId]}]]`;
    case "salp-short":
      return `[REF:${shortId(gt, spec.anchorId)} | ${spec.label}]`;
    case "salp":
    default:
      return `[REF:${spec.anchorId} | ${spec.label}]`;
  }
}

function fileStem(file: string): string {
  return file.replace(/\.(md|py)$/u, "");
}

function buildQuery(system: string, spec: OperationSpec) {
  const reference = naturalReference(system, spec);
  const klass = linkClass(system);
  const resolutionRule = klass === "file-qualified"
    ? "Use the file-qualified target encoded in the reference."
    : "The reference intentionally has no file path; locate the matching anchor across the project before answering.";
  const systemHint = {
    native: "Native references use standard Markdown links.",
    "heading-refs": "Heading references use [file.md:Heading].",
    wikilinks: "Wikilinks use [[file#^block-id]].",
    zettelkasten: "Zettelkasten references use [[UID]].",
    salp: "SALP references use [REF:namespace:id | label].",
    "salp-short": "SALP-short references use [REF:id | label].",
  }[system] ?? "";

  return (
    `Resolve this ${system} reference: ${reference}\n` +
    `${resolutionRule}\n` +
    `${systemHint}\n` +
    `Task: ${spec.task}\n` +
    `Respond with ONLY raw JSON matching this schema: ${spec.schema}. ` +
    `No prose and no code fences.`
  );
}

export const experiment: Experiment = {
  id: "anchor-systems-link-cost",
  name: "Anchor Systems — Link Resolution Token Cost (Bench 7)",
  description:
    "Measures the token cost of resolving common documentation references " +
    "using each system's natural syntax. Native Markdown, Heading refs, and " +
    "Wikilinks carry a file target; Zettelkasten, SALP, and SALP-short are " +
    "path-free and require anchor discovery before the same lookup, boundary, " +
    "or reference-hop operation.",

  axes: {
    system: ANCHOR_SYSTEMS,
    operation: ["lookup", "boundary", "reference-hop"] as const,
  },

  defaults: { reps: 5, ide: "opencode" },

  async setupCell(cell: Cell, ctx) {
    await writeFixtures(ctx.sandboxPath, String(cell.axes.system));
  },

  query(cell: Cell) {
    const system = String(cell.axes.system);
    return buildQuery(system, operationFromCell(cell));
  },

  judgePrompt(cell: Cell) {
    const system = String(cell.axes.system);
    const spec = operationFromCell(cell);
    const q = buildQuery(system, spec);
    const expectedSurface = surfaceId(gt, system, spec.anchorId);
    return {
      rule:
        `The agent resolved a ${linkClass(system)} "${system}" reference. ` +
        `Reference shown to the agent: ${naturalReference(system, spec)}. ` +
        `${spec.judge} Also accept the system surface anchor ${expectedSurface}. ` +
        `Pass only if the JSON answer identifies the correct file and gives the correct value or line range. ` +
        `Fail if the answer names a different anchor or avoids resolving the reference.`,
      userQuery: q,
    };
  },

  headline(report: ExperimentReport) {
    const visibleStats = classTokenStats(report);
    if (!visibleStats) {
      return `Link-cost visible-token estimate unavailable — file-qualified adherence ${
        pct(adherenceForClass(report, "file-qualified"))
      }, path-free adherence ${
        pct(adherenceForClass(report, "path-free"))
      } (n=${report.reps}/cell)`;
    }
    return `Path-free overhead vs file-qualified — +${
      Math.round(visibleStats.meanDeltaTotal)
    } visible tokens (${
      visibleStats.meanRatio.toFixed(2)
    }x, n=${report.reps}/cell)`;
  },

  renderCustom(report: ExperimentReport) {
    return renderTokenCost(report);
  },
};

function tokenTotal(
  t: { input: number; output: number; cacheRead: number; cacheWrite: number },
) {
  return t.input + t.output + t.cacheRead + t.cacheWrite;
}

function classTokenStats(report: ExperimentReport) {
  const rows = operationRows(report);
  const usable = rows
    .map((row) => {
      const fileQualified = avgTokens(row.fileQualified);
      const pathFree = avgTokens(row.pathFree);
      if (!fileQualified || !pathFree) return undefined;
      const directTotal = tokenTotal(fileQualified);
      const pathFreeTotal = tokenTotal(pathFree);
      return {
        delta: pathFreeTotal - directTotal,
        ratio: directTotal > 0 ? pathFreeTotal / directTotal : 0,
      };
    })
    .filter((x): x is { delta: number; ratio: number } => x !== undefined);
  if (usable.length === 0) return undefined;
  return {
    meanDeltaTotal: mean(usable.map((x) => x.delta)),
    meanRatio: mean(usable.map((x) => x.ratio)),
  };
}

function renderTokenCost(report: ExperimentReport): string {
  const lines = ["## Token Cost", ""];
  lines.push(
    "Visible-token estimate: sent task prompt + final agent text only. This excludes system prompts, tool call payloads, tool results, file contents read by tools, and hidden runtime context.",
  );
  lines.push("");

  lines.push("### By Link Class");
  lines.push("");
  lines.push(
    "| operation | file-qualified tokens | path-free tokens | delta | ratio | file-qualified pass | path-free pass |",
  );
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const row of operationRows(report)) {
    const fileQualified = avgTokens(row.fileQualified);
    const pathFree = avgTokens(row.pathFree);
    const fileTotal = fileQualified ? tokenTotal(fileQualified) : NaN;
    const pathTotal = pathFree ? tokenTotal(pathFree) : NaN;
    const delta = Number.isFinite(fileTotal) && Number.isFinite(pathTotal)
      ? pathTotal - fileTotal
      : NaN;
    const ratio = Number.isFinite(delta) && fileTotal > 0
      ? pathTotal / fileTotal
      : NaN;
    lines.push(
      `| ${row.operation} | ${fmtNum(fileTotal)} | ${fmtNum(pathTotal)} | ${
        fmtSigned(delta)
      } | ${fmtRatio(ratio)} | ${passCell(row.fileQualified)} | ${
        passCell(row.pathFree)
      } |`,
    );
  }

  lines.push("");
  lines.push("### By System");
  lines.push("");
  lines.push(
    "| system | class | operation | tokens | pass |",
  );
  lines.push("|---|---|---|---:|---:|");
  for (const row of systemRows(report)) {
    const tokens = avgTokens(row.trials);
    lines.push(
      `| ${row.system} | ${linkClass(row.system)} | ${row.operation} | ${
        fmtNum(tokens ? tokenTotal(tokens) : NaN)
      } | ${passCell(row.trials)} |`,
    );
  }

  lines.push("");
  lines.push(
    "Visible-token columns average estimated prompt + final output tokens over all trials in the cell. Pass columns show adherence so cheap failures are visible.",
  );
  return lines.join("\n");
}

function operationRows(report: ExperimentReport) {
  const operations = report.axes.operation?.map(String) ??
    Object.keys(OPERATIONS);
  return operations.map((operation) => {
    const trials = report.trials.filter((trial) =>
      trial.cell.axes.operation === operation
    );
    const fileQualified = trials.filter((trial) =>
      linkClass(String(trial.cell.axes.system)) === "file-qualified"
    );
    const pathFree = trials.filter((trial) =>
      linkClass(String(trial.cell.axes.system)) === "path-free"
    );
    return { operation, fileQualified, pathFree };
  });
}

function systemRows(report: ExperimentReport) {
  const systems = report.axes.system?.map(String) ?? ANCHOR_SYSTEMS;
  const operations = report.axes.operation?.map(String) ??
    Object.keys(OPERATIONS);
  return systems.flatMap((system) =>
    operations.map((operation) => {
      const trials = report.trials.filter((trial) =>
        trial.cell.axes.system === system &&
        trial.cell.axes.operation === operation
      );
      return { system, operation, trials };
    })
  );
}

function avgTokens(
  trials: readonly TrialResult[],
) {
  const withTokens = trials.map((trial) => tokenUsageFor(trial))
    .filter((usage): usage is {
      input: number;
      output: number;
      cacheRead: number;
      cacheWrite: number;
    } => usage !== undefined);
  if (withTokens.length === 0) return undefined;
  return {
    input: mean(withTokens.map((usage) => usage.input)),
    output: mean(withTokens.map((usage) => usage.output)),
    cacheRead: mean(withTokens.map((usage) => usage.cacheRead)),
    cacheWrite: mean(withTokens.map((usage) => usage.cacheWrite)),
  };
}

function tokenUsageFor(
  trial: TrialResult,
): {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
} | undefined {
  const system = String(trial.cell.axes.system);
  const spec = operationFromCell(trial.cell);
  return {
    input: estimateTokens(buildQuery(system, spec)),
    output: estimateTokens(trial.agentOutput),
    cacheRead: 0,
    cacheWrite: 0,
  };
}

function passCell(trials: readonly { pass: boolean }[]) {
  if (trials.length === 0) return "n/a";
  const pass = trials.filter((trial) => trial.pass).length;
  return `${pass}/${trials.length}`;
}

function adherenceForClass(report: ExperimentReport, klass: LinkClass) {
  const trials = report.trials.filter((trial) =>
    linkClass(String(trial.cell.axes.system)) === klass
  );
  if (trials.length === 0) return 0;
  return trials.filter((trial) => trial.pass).length / trials.length;
}

function mean(values: readonly number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function fmtNum(value: number) {
  return Number.isFinite(value) ? Math.round(value).toString() : "n/a";
}

function fmtSigned(value: number) {
  if (!Number.isFinite(value)) return "n/a";
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function fmtRatio(value: number) {
  return Number.isFinite(value) ? `${value.toFixed(2)}x` : "n/a";
}
