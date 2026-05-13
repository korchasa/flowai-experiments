/**
 * Experiment: context-anatomy — baseline variant.
 *
 * Measures what occupies the spawned claude CLI's context window at
 * the start of a trial, as a function of root AGENTS.md size. Unlike
 * `claude-md-length`, this experiment does not test rule adherence —
 * the agent is given a trivial prompt and we extract init-event tool
 * counts and result-event cache token usage from the raw NDJSON stream.
 *
 * Purpose: understand the fixed baseline ("what's always loaded") vs
 * the variable contribution from AGENTS.md, so subsequent experiments
 * that claim to measure "effect of CLAUDE.md size" can account for it.
 */

import type { Cell, Experiment } from "../shared/types.ts";
import { buildNoise } from "../shared/noise.ts";
import { loadNoiseCorpus } from "../claude-md-length/shared.ts";
import { baselineRow, renderMetricsTable } from "./shared.ts";

const TRIVIAL_QUERY = "Reply with exactly the single word: pong";

export const experiment: Experiment = {
  id: "context-anatomy-baseline",
  name: "Context anatomy — baseline (effect of AGENTS.md size)",
  description:
    "Sweeps the size of the root AGENTS.md file and captures, per trial, the " +
    "spawned CLI's init-event counts (tools, skills, slash commands, MCP " +
    "servers) plus cache/input/output token usage from the final result " +
    "event. Produces a table that decomposes the trial context into fixed " +
    "baseline and AGENTS.md contribution.",
  axes: {
    tokens: [0, 500, 2000, 8000, 16000],
  },
  defaults: {
    reps: 2,
    ide: "claude",
  },

  async setupCell(cell: Cell, ctx) {
    const targetTokens = Number(cell.axes.tokens);
    if (targetTokens <= 0) {
      // Zero-size cell: no AGENTS.md at all. Lets us measure the
      // "floor" context cost with nothing in project memory.
      return;
    }
    const corpus = loadNoiseCorpus();
    const noise = buildNoise({
      corpus,
      targetTokens,
      seed: ctx.seed,
    });
    // No rule injection — this experiment doesn't test adherence, so
    // the memory file is pure noise. A brief heading keeps it looking
    // like a plausible project memory file.
    const content = `# Project memory\n\n${noise}\n`;
    await ctx.adapter.writeMemoryFile(ctx.sandboxPath, "root", content);
  },

  query(_cell) {
    return TRIVIAL_QUERY;
  },

  judgePrompt(_cell) {
    // Stub rule: always passes for any non-empty response. The judge
    // is wired into the runner and cannot be skipped, so we use a
    // vacuous rule to keep adherence bookkeeping quiet. The real
    // payload of this experiment is in `renderCustom`.
    return {
      rule:
        "The agent's response must contain at least one non-whitespace character.",
      userQuery: TRIVIAL_QUERY,
    };
  },

  headline(report) {
    const row = baselineRow(report, "tokens");
    if (!row) {
      return "No parseable trials — cannot compute baseline.";
    }
    const zeroKey = String(report.axes.tokens?.[0] ?? 0);
    return (
      `Baseline context at tokens=${zeroKey}: ` +
      `${Math.round(row.baselineContextTokens).toLocaleString("en-US")} ` +
      `tokens (${Math.round(row.toolsCount)} tools, ${
        Math.round(row.skillsCount)
      } skills, ` +
      `${Math.round(row.mcpServersCount)} MCP servers, ${
        Math.round(row.slashCommandsCount)
      } slash commands; ` +
      `model=${report.model}, n=${row.sampleCount})`
    );
  },

  renderCustom(report) {
    return renderMetricsTable(report, "tokens");
  },
};
