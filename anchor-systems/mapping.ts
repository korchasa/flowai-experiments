/**
 * Experiment: anchor-systems — mapping variant (Bench 1).
 *
 * Extraction Precision: given all 19 project files, can the agent produce
 * the complete anchor→reference JSON graph?
 *
 * Axis:   system (5 linking systems).
 * Reps:   5.
 * Metric: adherence = fraction of trials where JSON contains all 20 anchors
 *         and 31 references (judge uses ≤3 missing entries → pass/fail).
 */

import type { Cell, Experiment, ExperimentReport } from "../shared/types.ts";
import { loadGroundTruth, surfaceId, writeFixtures } from "./shared.ts";

const gt = loadGroundTruth();

function expectedJson(system: string): string {
  const anchors = gt.anchors.map((a) => ({
    id: surfaceId(gt, system, a.id),
    file: a.file,
  }));
  const references = gt.references.map((r) => ({
    ref_id: surfaceId(gt, system, r.ref_id),
    source_file: r.source_file,
  }));
  return JSON.stringify({ anchors, references }, null, 2);
}

const QUERY = "Read all .md and .py files in this directory. " +
  "Extract every anchor definition and every cross-reference. " +
  "Respond with ONLY a JSON object: " +
  '{"anchors": [{"id": "...", "file": "..."}], ' +
  '"references": [{"ref_id": "...", "source_file": "..."}]}. ' +
  "Raw JSON only — no prose, no code fences.";

export const experiment: Experiment = {
  id: "anchor-systems-mapping",
  name: "Anchor Systems — Extraction & Mapping (Bench 1)",
  description:
    "Measures how precisely an AI agent extracts all anchor definitions and " +
    "cross-references from 19 project files expressed in five linking systems " +
    "(Native Markdown, Wikilinks, Zettelkasten UID, SALP, SALP-short). " +
    "Pass if extracted JSON contains nearly all ground-truth anchors and references.",

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

  query(_cell) {
    return QUERY;
  },

  judgePrompt(cell) {
    const system = String(cell.axes.system);
    const expected = expectedJson(system);
    return {
      rule:
        `The agent extracted anchor/reference pairs from a "${system}" project. ` +
        `Ground truth for this system's surface IDs (20 anchors, 31 references):\n${expected}\n\n` +
        `Pass if the agent's JSON is missing no more than 3 entries total ` +
        `(anchors + references combined). Minor formatting differences are OK. ` +
        `Canonical IDs are also acceptable when they unambiguously map to these surface IDs. ` +
        `Fail if it contains hallucinated entries that do not exist in the ground truth.`,
      userQuery: QUERY,
    };
  },

  headline(report: ExperimentReport) {
    const bySystem = report.adherenceByAxis["system"] ?? {};
    const parts = Object.entries(bySystem)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sys, rate]) => `${sys}=${(rate * 100).toFixed(0)}%`);
    return `Mapping adherence — ${parts.join(" / ")} (n=${report.reps}/cell)`;
  },
};
