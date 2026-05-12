/**
 * Experiment: anchor-systems — multi-hop variant (Bench 4).
 *
 * Multi-Hop Reasoning: agent must traverse 1–3 reference hops to answer a
 * semantic question. Tests whether the linking system helps or hinders
 * chain traversal.
 *
 * Axes:  system × target (shallow=1 hop, medium=2 hops, deep=3 hops).
 * Reps:  5.
 * Metric: adherence = fraction of trials where agent identifies all
 *         intermediate anchor IDs in the chain AND answers correctly.
 */

import type { Cell, Experiment, ExperimentReport } from "../lib/types.ts";
import { loadGroundTruth, shortId, writeFixtures } from "./shared.ts";

const gt = loadGroundTruth();

function buildQuery(system: string, target: string): string {
  const t = gt.multi_hop_targets[target];
  if (!t) throw new Error(`Unknown multi-hop target: ${target}`);

  const systemHints: Record<string, string> = {
    native: "Follow markdown links to navigate between documents.",
    wikilinks: "Follow [[wikilink]] references to navigate.",
    zettelkasten: "Follow UID references (e.g. [[202605121XXX]]) to navigate.",
    salp: "Follow [REF:ns:id] references to navigate.",
    "salp-short": "Follow [REF:id] references to navigate.",
  };

  return (
    `Using the project files in this directory, answer: ` +
    `"${t.description}." ` +
    `${systemHints[system] ?? ""} ` +
    `Include in your answer: (1) the anchor ID where the final answer is defined, ` +
    `(2) the IDs of any intermediate anchors you traversed, ` +
    `(3) a plain-English explanation of the answer.`
  );
}

export const experiment: Experiment = {
  id: "anchor-systems-multi-hop",
  name: "Anchor Systems — Multi-Hop Reasoning (Bench 4)",
  description:
    "Measures whether an AI agent can follow chains of cross-references " +
    "(1–3 hops) to answer a semantic question. Each target requires the agent " +
    "to traverse intermediate anchors before reaching the answer node. " +
    "Pass if the agent names all chain anchors and provides a correct answer.",

  axes: {
    system: [
      "native",
      "wikilinks",
      "zettelkasten",
      "salp",
      "salp-short",
    ] as const,
    target: ["shallow", "medium", "deep"] as const,
  },

  defaults: { reps: 5, ide: "claude" },

  async setupCell(cell: Cell, ctx) {
    await writeFixtures(ctx.sandboxPath, String(cell.axes.system));
  },

  query(cell: Cell) {
    return buildQuery(String(cell.axes.system), String(cell.axes.target));
  },

  judgePrompt(cell: Cell) {
    const system = String(cell.axes.system);
    const target = String(cell.axes.target);
    const t = gt.multi_hop_targets[target];
    const chainStr = t.chain.join(" → ");
    const q = buildQuery(system, target);
    // For salp-short, anchors appear as short IDs in fixture files.
    const finalAnchorId = system === "salp-short"
      ? shortId(gt, t.anchor_id)
      : t.anchor_id;
    return {
      rule:
        `The agent was asked to answer "${t.description}" by traversing references ` +
        `in a "${system}" project. The correct chain is: ${chainStr}. ` +
        `The final answer anchor is: ${finalAnchorId}. ` +
        `Pass if: (a) the agent mentions the final anchor ID "${finalAnchorId}", ` +
        `(b) the agent's explanation is factually consistent with the anchor's description ` +
        `("${
          gt.anchors.find((a) => a.id === t.anchor_id)?.description ?? ""
        }"), ` +
        `(c) for medium/deep targets, at least one intermediate anchor from the chain is named. ` +
        `Fail if the agent hallucinates anchor IDs not present in the chain.`,
      userQuery: q,
    };
  },

  headline(report: ExperimentReport) {
    const rows: string[] = [];
    for (
      const sys of ["native", "wikilinks", "zettelkasten", "salp", "salp-short"]
    ) {
      const rate = report.trials
        .filter((t) =>
          t.cell.axes.system === sys && t.cell.axes.target === "deep"
        )
        .reduce((acc, t, _i, arr) => acc + (t.pass ? 1 / arr.length : 0), 0);
      rows.push(`${sys}=${(rate * 100).toFixed(0)}%`);
    }
    return `Multi-hop (deep) adherence — ${
      rows.join(" / ")
    } (n=${report.reps}/cell)`;
  },
};
