import { CompressionScenario } from "@bench/types.ts";

class PrdFeatureLaunchScenario extends CompressionScenario {
  id = "prd-feature-launch--compressed-style--claude";
  name = "slack-bots-flow onboarding PRD, compressed-style, Claude Opus";

  sourcePath = "scenarios/prd-feature-launch/fixture/original.md";
  documentClass = "PRD" as const;

  compress = {
    promptPath: "prompts/compress.compressed-style.md",
    model: { adapter: "claude" as const, model: "claude-opus-4-7" },
    maxTokens: 16_000,
    targetRatio: 0.45,
    timeoutMs: 360_000,
  };

  decompress = {
    promptPath: "prompts/decompress.faithful.md",
    model: { adapter: "claude" as const, model: "claude-sonnet-4-6" },
    maxTokens: 32_000,
    timeoutMs: 360_000,
  };

  checklistPath = "scenarios/prd-feature-launch/checklist.yaml";

  override judge = { adapter: "claude" as const, model: "claude-opus-4-7" };
}

export const Scenario = new PrdFeatureLaunchScenario();
