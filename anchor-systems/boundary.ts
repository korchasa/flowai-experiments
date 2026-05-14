/**
 * Experiment: anchor-systems — boundary variant (Bench 2).
 *
 * Context Boundary Detection: given an anchor, can the agent identify the
 * exact line range of the code block it belongs to?
 *
 * Ground truth: generate_reset_token() in auth_service.py spans lines 7–18
 * (anchor [ANC:impl:token-generator-v1] on line 8).
 *
 * Axis:   system (5 linking systems).
 * Reps:   5.
 * Metric: pass if reported (start_line, end_line) satisfy IoU ≥ 0.8 with
 *         ground truth (7, 18). With 12 lines, IoU=0.8 requires at least
 *         ~10 overlapping lines — the agent may be off by ±1 line on each end.
 */

import type { Cell, Experiment, ExperimentReport } from "../shared/types.ts";
import { loadGroundTruth, writeFixtures } from "./shared.ts";

const gt = loadGroundTruth();
const BT = gt.boundary_targets[0]; // generate_reset_token

function anchorRef(system: string): string {
  switch (system) {
    case "salp":
      return "[ANC:impl:token-generator-v1]";
    case "salp-short":
      return "[ANC:token-generator-v1]";
    case "wikilinks":
      return "^impl-token-generator-v1";
    case "zettelkasten":
      return "UID 202605121017";
    case "native":
      return "# generate_reset_token (in auth_service.py)";
    default:
      return BT.anchor_id;
  }
}

const QUERY_BASE =
  `Read auth_service.py. Identify the exact line range of the code block ` +
  `anchored at ANCHOR_REF. ` +
  `Respond with ONLY a JSON object: {"start_line": N, "end_line": N}. ` +
  `Raw JSON only — no prose, no code fences.`;

export const experiment: Experiment = {
  id: "anchor-systems-boundary",
  name: "Anchor Systems — Context Boundary Detection (Bench 2)",
  description:
    "Measures whether agents correctly identify the line range of a code block " +
    "when given its anchor reference. Tests Context Association Score: the agent " +
    "must find the anchor and determine the boundaries of the containing function " +
    "(generate_reset_token, lines 7–18). Pass threshold: IoU ≥ 0.8 with ground truth.",

  axes: {
    system: [
      "native",
      "wikilinks",
      "zettelkasten",
      "salp",
      "salp-short",
    ] as const,
  },

  defaults: { reps: 5, ide: "opencode" },

  async setupCell(cell: Cell, ctx) {
    await writeFixtures(ctx.sandboxPath, String(cell.axes.system));
  },

  query(cell: Cell) {
    return QUERY_BASE.replace(
      "ANCHOR_REF",
      anchorRef(String(cell.axes.system)),
    );
  },

  judgePrompt(cell: Cell) {
    const system = String(cell.axes.system);
    const q = QUERY_BASE.replace("ANCHOR_REF", anchorRef(system));
    const { start_line, end_line } = BT;
    return {
      rule:
        `The agent was asked to identify the line range of the function anchored at ` +
        `"${anchorRef(system)}" in auth_service.py. ` +
        `Ground truth: start_line=${start_line}, end_line=${end_line} ` +
        `(function generate_reset_token). ` +
        `Parse the agent's JSON start_line/end_line and compute inclusive range IoU: ` +
        `intersection_len = max(0, min(reported_end, ${end_line}) - max(reported_start, ${start_line}) + 1); ` +
        `union_len = max(reported_end, ${end_line}) - min(reported_start, ${start_line}) + 1; ` +
        `IoU = intersection_len / union_len. Pass only if IoU >= 0.8. ` +
        `Fail if the agent reports a range that covers a different function ` +
        `or the entire file, or if it cannot parse the anchor.`,
      userQuery: q,
    };
  },

  headline(report: ExperimentReport) {
    const bySystem = report.adherenceByAxis["system"] ?? {};
    const parts = Object.entries(bySystem)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sys, rate]) => `${sys}=${(rate * 100).toFixed(0)}%`);
    return `Boundary detection adherence (IoU≥0.8) — ${
      parts.join(" / ")
    } (n=${report.reps}/cell)`;
  },
};
