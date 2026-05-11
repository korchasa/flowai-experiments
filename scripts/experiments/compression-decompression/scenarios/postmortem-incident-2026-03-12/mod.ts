import { CompressionScenario } from "@bench/types.ts";

class PostmortemScenario extends CompressionScenario {
  id = "postmortem-incident-2026-03-12--compressed-style--claude";
  name = "Payments outage postmortem 2026-03-12, compressed-style, Claude Opus";

  sourcePath = "scenarios/postmortem-incident-2026-03-12/fixture/original.md";
  documentClass = "postmortem" as const;

  compress = {
    promptPath: "prompts/compress.compressed-style.md",
    model: { adapter: "claude" as const, model: "claude-opus-4-7" },
    maxTokens: 12000,
    targetRatio: 0.5,
    timeoutMs: 300_000,
  };

  decompress = {
    promptPath: "prompts/decompress.faithful.md",
    model: { adapter: "claude" as const, model: "claude-sonnet-4-6" },
    maxTokens: 24_000,
    timeoutMs: 300_000,
  };

  checklistPath = "scenarios/postmortem-incident-2026-03-12/checklist.yaml";

  override judge = { adapter: "claude" as const, model: "claude-opus-4-7" };
}

export const Scenario = new PostmortemScenario();
