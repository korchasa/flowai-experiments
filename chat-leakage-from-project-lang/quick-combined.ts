import {
  INSTRUCTION_AXIS,
  PROJECT_LANGUAGE_AXIS,
  TOKEN_AXIS,
} from "./shared.ts";
import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "quick-combined",
  mechanism: "combined",
  label: "quick combined",
  description:
    "Fast stress check combining file instruction, code-switching, middle signal, term-transfer, label-transfer, and marker-readback pressure.",
  axes: {
    project_language: PROJECT_LANGUAGE_AXIS,
    tokens: [TOKEN_AXIS[TOKEN_AXIS.length - 1]],
    instruction: INSTRUCTION_AXIS,
  },
  reps: 1,
});
