import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "file-instruction",
  mechanism: "file_instruction",
  label: "file instruction",
  description:
    "Tests whether a lower-priority project-file summary style convention pulls source-language wording into FINAL_ANSWER.",
});
