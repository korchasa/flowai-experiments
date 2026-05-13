/**
 * Experiment: anchor-systems — linting variant (Bench 6).
 *
 * Graph Diagnostics: the agent audits a corrupted fixture set that contains
 * three planted anomalies and reports them as structured JSON.
 *
 * Anomalies in fixtures/corrupted/:
 *   1. duplicate_anchor — [ANC:db:user-schema] declared in both
 *      session_store.py and auth.md.
 *   2. orphaned_ref     — [REF:api:oauth-callback] in oauth.md has no
 *      corresponding anchor anywhere in the project.
 *   3. shadowed_anchor  — [ANC:legacy:md5-hash] inside a commented-out
 *      block in password.md (unreachable anchor).
 *
 * Note: all systems (including salp-short) receive the SALP-based corrupted
 * fixtures, since the linting task tests anomaly-type detection, not syntax
 * familiarity. This makes the test harder for non-SALP systems and is
 * intentional.
 *
 * Axis:   system (5 linking systems — same anomaly content, different familiarity).
 * Reps:   5.
 * Metric: pass if agent reports all 3 anomaly types (F₁ ≥ 0.67, i.e. ≥ 2/3).
 */

import type { Cell, Experiment, ExperimentReport } from "../shared/types.ts";
import { loadGroundTruth, writeCorruptedFixtures } from "./shared.ts";

const gt = loadGroundTruth();

const ANOMALY_SUMMARY = gt.anomalies
  .map((a, i) => `${i + 1}. type="${a.type}" — ${a.description}`)
  .join("\n");

const QUERY = "Read all .md and .py files in this directory. " +
  "Audit the anchor/reference graph for errors. Look for: " +
  "(a) duplicate anchor IDs declared in more than one place, " +
  "(b) references that point to a non-existent anchor, " +
  "(c) anchors declared inside commented-out code blocks. " +
  'Respond with ONLY a JSON array: [{"type": "...", "id": "...", "details": "..."}]. ' +
  "Raw JSON only.";

export const experiment: Experiment = {
  id: "anchor-systems-linting",
  name: "Anchor Systems — Graph Diagnostics & Linting (Bench 6)",
  description:
    "Measures whether an AI agent can detect three classes of anchor-graph " +
    "anomalies (duplicate, orphaned, shadowed) in a corrupted project. " +
    "All five systems receive the same SALP-based corrupted fixtures. " +
    "Pass if the agent identifies at least 2 of 3 anomaly types.",

  axes: {
    system: [
      "native",
      "wikilinks",
      "zettelkasten",
      "salp",
      "salp-short",
    ] as const,
  },

  defaults: { reps: 5, ide: "claude" },

  async setupCell(_cell: Cell, ctx) {
    await writeCorruptedFixtures(ctx.sandboxPath);
  },

  query(_cell) {
    return QUERY;
  },

  judgePrompt(cell) {
    const system = String(cell.axes.system);
    return {
      rule:
        `The agent audited a "${system}" project with 3 planted anomalies:\n` +
        `${ANOMALY_SUMMARY}\n\n` +
        `Pass if the agent's JSON output identifies at least 2 of these 3 anomaly types. ` +
        `Matching on type name is sufficient ("duplicate_anchor", "orphaned_ref", ` +
        `"shadowed_anchor") — exact IDs or file names are a bonus. ` +
        `Fail if the agent reports fewer than 2 anomaly types ` +
        `or fabricates anomalies that do not exist.`,
      userQuery: QUERY,
    };
  },

  headline(report: ExperimentReport) {
    const bySystem = report.adherenceByAxis["system"] ?? {};
    const parts = Object.entries(bySystem)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sys, rate]) => `${sys}=${(rate * 100).toFixed(0)}%`);
    return `Linting adherence (≥2/3 anomalies found) — ${
      parts.join(" / ")
    } (n=${report.reps}/cell)`;
  },
};
