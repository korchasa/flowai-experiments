import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "combined",
  mechanism: "combined",
  label: "combined",
  description:
    "Combines file instruction, mixed code-switching, middle-only signal, term-transfer, label-transfer, and marker-readback pressure.",
});
