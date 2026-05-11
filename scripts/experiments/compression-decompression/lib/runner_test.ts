import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { CompressionScenario } from "@bench/types.ts";
import { registerAdapter } from "@bench/adapters/mod.ts";
import type { CompressionAdapter } from "@bench/adapters/types.ts";
import { runScenario } from "@bench/runner.ts";

const ORIGINAL = `# ADR-1: pick X

Status: Accepted. Date: 2026-04-01.
We pick X over Y because reasons.
`;

class StubScenario extends CompressionScenario {
  id = "stub-test";
  name = "stub";
  sourcePath = "";
  documentClass = "ADR" as const;
  compress = {
    promptPath: "",
    model: { adapter: "claude" as const, model: "stub" },
    maxTokens: 100,
  };
  decompress = {
    promptPath: "",
    model: { adapter: "claude" as const, model: "stub" },
    maxTokens: 100,
  };
  checklistPath = "";
  override judge = { adapter: "claude" as const, model: "stub" };
}

function makeStub(out: string): CompressionAdapter {
  return {
    id: "claude",
    complete: () =>
      Promise.resolve({
        text: out,
        usage: { inputTokens: 1, outputTokens: 1, costUsd: 0.0001 },
        rawLog: "stub",
        durationMs: 1,
      }),
  };
}

Deno.test("runs_two_stages_and_emits_artefacts", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "compress-bench-test-" });
  const sourcePath = join(tmp, "original.md");
  const compressPrompt = join(tmp, "c.md");
  const decompressPrompt = join(tmp, "d.md");
  const checklist = join(tmp, "ck.yaml");
  await Deno.writeTextFile(sourcePath, ORIGINAL);
  await Deno.writeTextFile(compressPrompt, "compress");
  await Deno.writeTextFile(decompressPrompt, "decompress");
  await Deno.writeTextFile(
    checklist,
    '- id: t1\n  fact: "ADR-1 picks X over Y"\n  critical: true\n',
  );

  const scenario = new StubScenario();
  scenario.sourcePath = sourcePath;
  scenario.compress.promptPath = compressPrompt;
  scenario.decompress.promptPath = decompressPrompt;
  scenario.checklistPath = checklist;

  // Compressor: returns a JSON verdict array AND short text.
  // Decompressor: returns prose. Judge: returns proper JSON verdicts.
  let call = 0;
  registerAdapter("claude", {
    id: "claude",
    complete: (req) => {
      call++;
      // call 1 = compress, 2 = decompress, 3 = judge retention, 4 = invention
      if (call === 1) return makeStub("ADR-1 X>Y").complete(req);
      if (call === 2) return makeStub("ADR-1 picks X over Y for stated reasons.").complete(req);
      if (call === 3) {
        return makeStub(
          JSON.stringify([
            { itemId: "t1", pass: true, reason: "stated", evidenceQuote: "ADR-1 picks X over Y" },
          ]),
        ).complete(req);
      }
      return makeStub("[]").complete(req);
    },
  });

  const runsRoot = join(tmp, "runs");
  const report = await runScenario(scenario, { runsRoot, noCache: true });

  assertEquals(report.judge.criticalRetentionPct, 100);
  assertEquals(report.judge.factRetention.length, 1);
  assertExists(await Deno.stat(join(report.artefactsDir, "report.md")));
  assertExists(await Deno.stat(join(report.artefactsDir, "metrics.json")));
  assertExists(await Deno.stat(join(report.artefactsDir, "judge.json")));
  assertExists(await Deno.stat(join(report.artefactsDir, "compressed.md")));
  assertExists(await Deno.stat(join(report.artefactsDir, "restored.md")));
});
