import { CompressionScenario } from "@bench/types.ts";

class AdrRecordDecisionScenario extends CompressionScenario {
  id = "adr-record-decision--compressed-style--claude";
  name = "ADR-0007 record-decision, compressed-style, Claude Opus";

  sourcePath = "scenarios/adr-record-decision/fixture/original.md";
  documentClass = "ADR" as const;

  compress = {
    promptPath: "prompts/compress.compressed-style.md",
    model: { adapter: "claude" as const, model: "claude-opus-4-7" },
    maxTokens: 8000,
    targetRatio: 0.5,
    timeoutMs: 180_000,
  };

  decompress = {
    promptPath: "prompts/decompress.faithful.md",
    model: { adapter: "claude" as const, model: "claude-sonnet-4-6" },
    maxTokens: 16_000,
    timeoutMs: 180_000,
  };

  checklistPath = "scenarios/adr-record-decision/checklist.yaml";

  override judge = { adapter: "claude" as const, model: "claude-opus-4-7" };
}

export const Scenario = new AdrRecordDecisionScenario();
