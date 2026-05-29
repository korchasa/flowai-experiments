// FR-EXP.RUSSIAN-CHAT-LEAKAGE

/**
 * Experiment: chat-leakage-from-reasoning-lang — baseline variant.
 *
 * Measures whether visible English analysis pressure leaks into the
 * final Russian chat answer. Project files and project memory stay
 * Russian or language-neutral; the pressure source is the required
 * VISIBLE_ANALYSIS block in English.
 */

import { join } from "@std/path";
import type { Cell, Experiment } from "../shared/types.ts";
import {
  buildContextProfile,
  buildJudgeRule,
  buildProjectMemory,
  buildQuery,
  buildReadme,
  headline,
  INSTRUCTION_AXIS,
  renderCustom,
  TOKEN_AXIS,
} from "./shared.ts";

export const experiment: Experiment = {
  id: "chat-leakage-from-reasoning-lang-baseline",
  name: "Chat leakage from reasoning language",
  description:
    "Sweeps analytical-material size and instruction mitigation to measure whether " +
    "English visible-analysis pressure leaks into a final Russian chat answer.",
  axes: {
    tokens: TOKEN_AXIS,
    instruction: INSTRUCTION_AXIS,
  },
  defaults: {
    reps: 3,
    ide: "claude",
  },

  async setupCell(cell: Cell, ctx) {
    const profile = buildContextProfile(cell);
    await Deno.writeTextFile(
      join(ctx.sandboxPath, "README.md"),
      buildReadme(profile.targetTokens),
    );
    await ctx.adapter.writeMemoryFile(
      ctx.sandboxPath,
      "root",
      buildProjectMemory(),
    );
  },

  query(cell) {
    return buildQuery(cell);
  },

  judgePrompt(cell) {
    return {
      rule: buildJudgeRule(),
      userQuery: buildQuery(cell),
    };
  },

  headline,
  renderCustom,
};
