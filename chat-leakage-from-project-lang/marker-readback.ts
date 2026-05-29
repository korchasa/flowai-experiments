import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "marker-readback",
  mechanism: "marker_readback",
  label: "marker readback",
  description:
    "Tests whether the model reads and carries through a neutral decision code for the selected plan.",
});
