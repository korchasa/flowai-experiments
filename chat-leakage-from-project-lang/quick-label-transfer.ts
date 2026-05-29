import {
  INSTRUCTION_AXIS,
  PROJECT_LANGUAGE_AXIS,
  TOKEN_AXIS,
} from "./shared.ts";
import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "quick-label-transfer",
  mechanism: "label_transfer",
  label: "quick label transfer",
  description:
    "Fast stress check for copying English plan labels from the project file into FINAL_ANSWER.",
  axes: {
    project_language: PROJECT_LANGUAGE_AXIS,
    tokens: [TOKEN_AXIS[TOKEN_AXIS.length - 1]],
    instruction: INSTRUCTION_AXIS,
  },
  reps: 1,
});
