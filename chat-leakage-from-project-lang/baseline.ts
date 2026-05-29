import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "baseline",
  mechanism: "plain",
  label: "baseline",
  description:
    "Sweeps project-file language, analytical-material size, and instruction " +
    "mitigation to measure whether non-Russian file context leaks into a final Russian chat answer.",
});
