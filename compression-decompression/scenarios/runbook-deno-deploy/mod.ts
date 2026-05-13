import { CompressionScenario } from "@bench/types.ts";

class RunbookDenoDeployScenario extends CompressionScenario {
  id = "runbook-deno-deploy--compressed-style--claude";
  name = "tldrist-digester Deno Deploy runbook, compressed-style, Claude Opus";

  sourcePath = "scenarios/runbook-deno-deploy/fixture/original.md";
  documentClass = "runbook" as const;

  compress = {
    promptPath: "prompts/compress.compressed-style.md",
    model: { adapter: "claude" as const, model: "claude-opus-4-7" },
    maxTokens: 10_000,
    targetRatio: 0.5,
    timeoutMs: 240_000,
  };

  decompress = {
    promptPath: "prompts/decompress.faithful.md",
    model: { adapter: "claude" as const, model: "claude-sonnet-4-6" },
    maxTokens: 20_000,
    timeoutMs: 240_000,
  };

  checklistPath = "scenarios/runbook-deno-deploy/checklist.yaml";

  override judge = { adapter: "claude" as const, model: "claude-opus-4-7" };
}

export const Scenario = new RunbookDenoDeployScenario();
