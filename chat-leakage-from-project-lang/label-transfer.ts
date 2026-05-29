import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "label-transfer",
  mechanism: "label_transfer",
  label: "label transfer",
  description:
    "Tests whether English plan labels from the project file are translated into Russian instead of copied into FINAL_ANSWER.",
});
