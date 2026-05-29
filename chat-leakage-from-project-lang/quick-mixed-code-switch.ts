import {
  INSTRUCTION_AXIS,
  PROJECT_LANGUAGE_AXIS,
  TOKEN_AXIS,
} from "./shared.ts";
import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "quick-mixed-code-switch",
  mechanism: "mixed_code_switch",
  label: "quick mixed code-switch",
  description:
    "Fast stress check for mixed Russian/source-language project-file passages.",
  axes: {
    project_language: PROJECT_LANGUAGE_AXIS,
    tokens: [TOKEN_AXIS[TOKEN_AXIS.length - 1]],
    instruction: INSTRUCTION_AXIS,
  },
  reps: 1,
});
