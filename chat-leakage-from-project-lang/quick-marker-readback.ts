import {
  INSTRUCTION_AXIS,
  PROJECT_LANGUAGE_AXIS,
  TOKEN_AXIS,
} from "./shared.ts";
import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "quick-marker-readback",
  mechanism: "marker_readback",
  label: "quick marker readback",
  description:
    "Fast stress check for carrying through the selected plan's neutral decision code.",
  axes: {
    project_language: PROJECT_LANGUAGE_AXIS,
    tokens: [TOKEN_AXIS[TOKEN_AXIS.length - 1]],
    instruction: INSTRUCTION_AXIS,
  },
  reps: 1,
});
