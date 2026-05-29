import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "mixed-code-switch",
  mechanism: "mixed_code_switch",
  label: "mixed code-switch",
  description:
    "Tests whether mixed Russian/source-language project-file passages leak source-language terms into the Russian final answer.",
});
