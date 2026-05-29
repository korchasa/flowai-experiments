import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "term-transfer",
  mechanism: "term_transfer",
  label: "term transfer",
  description:
    "Tests whether source-language project terms are translated into natural Russian instead of copied into FINAL_ANSWER.",
});
