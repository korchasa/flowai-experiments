import {
  INSTRUCTION_AXIS,
  PROJECT_LANGUAGE_AXIS,
  TOKEN_AXIS,
} from "./shared.ts";
import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "quick-term-transfer",
  mechanism: "term_transfer",
  label: "quick term transfer",
  description:
    "Fast stress check for translating source-language project terms into Russian.",
  axes: {
    project_language: PROJECT_LANGUAGE_AXIS,
    tokens: [TOKEN_AXIS[TOKEN_AXIS.length - 1]],
    instruction: INSTRUCTION_AXIS,
  },
  reps: 1,
});
