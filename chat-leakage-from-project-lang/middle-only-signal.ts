import { buildProjectLanguageExperiment } from "./variant_factory.ts";

export const experiment = buildProjectLanguageExperiment({
  variant: "middle-only-signal",
  mechanism: "middle_only_signal",
  label: "middle-only signal",
  description:
    "Tests whether the model preserves Russian answer language when the current launch decision is surrounded by obsolete distractors.",
});
