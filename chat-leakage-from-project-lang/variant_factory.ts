// FR-EXP.RUSSIAN-CHAT-LEAKAGE

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
  type LeakageMechanism,
  PROJECT_LANGUAGE_AXIS,
  renderCustomFor,
  TOKEN_AXIS,
} from "./shared.ts";

interface BuildExperimentOptions {
  variant: string;
  mechanism: LeakageMechanism;
  label: string;
  description: string;
  axes?: Experiment["axes"];
  reps?: number;
}

export function buildProjectLanguageExperiment(
  options: BuildExperimentOptions,
): Experiment {
  const axes = options.axes ?? {
    project_language: PROJECT_LANGUAGE_AXIS,
    tokens: TOKEN_AXIS,
    instruction: INSTRUCTION_AXIS,
  };
  return {
    id: `chat-leakage-from-project-lang-${options.variant}`,
    name: `Chat leakage from project-file language (${options.label})`,
    description: options.description,
    axes,
    defaults: {
      reps: options.reps ?? 3,
      ide: "claude",
    },

    async setupCell(cell: Cell, ctx) {
      const profile = buildContextProfile(cell, options.mechanism);
      await Deno.writeTextFile(
        join(ctx.sandboxPath, "README.md"),
        buildReadme(
          profile.projectLanguage,
          profile.targetTokens,
          options.mechanism,
        ),
      );
      await ctx.adapter.writeMemoryFile(
        ctx.sandboxPath,
        "root",
        buildProjectMemory(),
      );
    },

    query(cell) {
      return buildQuery(cell, options.mechanism);
    },

    judgePrompt(cell) {
      return {
        rule: buildJudgeRule(options.mechanism),
        userQuery: buildQuery(cell, options.mechanism),
      };
    },

    headline,
    renderCustom: renderCustomFor(options.mechanism),
  };
}
