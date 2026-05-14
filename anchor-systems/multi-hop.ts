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

import type { Cell, Experiment, ExperimentReport } from "../shared/types.ts";
import {
  acceptedIds,
  loadGroundTruth,
  surfaceId,
  writeFixtures,
} from "./shared.ts";

const gt = loadGroundTruth();

const TARGET_ANCHOR_CHAINS: Record<string, string[]> = {
  shallow: ["auth:session-timeout"],
  medium: ["auth:mfa-required", "mfa:totp-window", "rate:otp-window"],
  deep: [
    "auth:mfa-required",
    "mfa:totp-window",
    "rate:otp-window",
    "session:otp-ttl",
  ],
};

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

  defaults: { reps: 5, ide: "opencode" },

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
    const fileChain = t.chain.join(" → ");
    const canonicalChain = TARGET_ANCHOR_CHAINS[target] ?? [t.anchor_id];
    const surfaceChain = canonicalChain.map((id) => surfaceId(gt, system, id));
    const q = buildQuery(system, target);
    const finalAnchorId = surfaceId(gt, system, t.anchor_id);
    const finalAccepted = acceptedIds(gt, system, t.anchor_id).join(", ");
    const intermediate = surfaceChain.slice(0, -1);
    return {
      rule:
        `The agent was asked to answer "${t.description}" by traversing references ` +
        `in a "${system}" project. The correct file traversal is: ${fileChain}. ` +
        `The expected surface anchor chain is: ${surfaceChain.join(" -> ")}. ` +
        `The final answer anchor is "${finalAnchorId}" (also accept: ${finalAccepted}). ` +
        `Pass if: (a) the agent mentions an accepted final anchor ID, ` +
        `(b) the agent's explanation is factually consistent with the anchor's description ` +
        `("${
          gt.anchors.find((a) => a.id === t.anchor_id)?.description ?? ""
        }"), ` +
        `(c) for medium/deep targets, at least one expected intermediate anchor is named ` +
        `(${intermediate.join(", ") || "none required"}). ` +
        `Do not fail merely because the agent uses a canonical ID instead of a surface ID. ` +
        `Fail if the agent invents non-existent anchors or gives a contradictory final answer.`,
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
