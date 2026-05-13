import { parse as parseYaml } from "@std/yaml";
import { dirname, join } from "@std/path";
import { ensureDir } from "@std/fs";
import type {
  ChecklistItem,
  CompressionScenario,
  RoundtripMetrics,
  RunReport,
  StageResult,
} from "@bench/types.ts";
import { getAdapter } from "@bench/adapters/mod.ts";
import { buildRoundtripMetrics } from "@bench/metrics.ts";
import { judgeRoundtrip } from "@bench/judge.ts";
import { cacheKey, readCache, writeCache } from "@bench/cache.ts";
import { assertHealthy, describeHealth } from "@bench/system_health.ts";

export interface RunnerOptions {
  /** Root for run artefacts. Default: runs/latest */
  runsRoot?: string;
  /** Skip cache lookup; always run end-to-end. */
  noCache?: boolean;
}

export async function runScenario(
  scenario: CompressionScenario,
  opts: RunnerOptions = {},
): Promise<RunReport> {
  const runsRoot = opts.runsRoot ?? "runs/latest";
  const artefactsDir = await nextRunDir(join(runsRoot, scenario.id));

  const original = await Deno.readTextFile(scenario.sourcePath);
  const checklist = await loadChecklist(scenario.checklistPath);

  const key = await cacheKey(scenario);
  const cached = opts.noCache ? null : await readCache(key);

  let compressedText: string;
  let restoredText: string;
  let metrics: RoundtripMetrics;
  let judge: RunReport["judge"];

  if (cached) {
    compressedText = cached.compressed;
    restoredText = cached.restored;
    metrics = cached.metrics;
    judge = cached.judge;
  } else {
    const compressPrompt = await Deno.readTextFile(scenario.compress.promptPath);
    const decompressPrompt = await Deno.readTextFile(scenario.decompress.promptPath);

    const h0 = await assertHealthy(undefined, `compress(${scenario.id})`);
    console.error(`  health: ${describeHealth(h0)}`);

    const compressAdapter = getAdapter(scenario.compress.model.adapter);
    const compressResult = await compressAdapter.complete({
      systemPrompt: compressPrompt,
      userMessage: original,
      model: scenario.compress.model.model,
      maxTokens: scenario.compress.maxTokens,
      timeoutMs: scenario.compress.timeoutMs ?? scenario.totalTimeoutMs,
    });
    compressedText = compressResult.text;

    await assertHealthy(undefined, `decompress(${scenario.id})`);

    const decompressAdapter = getAdapter(scenario.decompress.model.adapter);
    const decompressResult = await decompressAdapter.complete({
      systemPrompt: decompressPrompt,
      userMessage: compressedText,
      model: scenario.decompress.model.model,
      maxTokens: scenario.decompress.maxTokens,
      timeoutMs: scenario.decompress.timeoutMs ?? scenario.totalTimeoutMs,
    });
    restoredText = decompressResult.text;

    await assertHealthy(undefined, `judge(${scenario.id})`);

    metrics = buildRoundtripMetrics(original, compressResult, decompressResult);
    judge = await judgeRoundtrip({
      original,
      restored: restoredText,
      checklist,
      compressorAdapterId: scenario.compress.model.adapter,
      judge: scenario.judge,
    });

    await writeArtefactLogs(artefactsDir, compressResult, decompressResult);
    await writeCache({
      key,
      compressed: compressedText,
      restored: restoredText,
      metrics,
      judge,
      createdAt: new Date().toISOString(),
    });
  }

  await writeArtefacts(artefactsDir, {
    original,
    compressed: compressedText,
    restored: restoredText,
    metrics,
    judge,
    scenarioId: scenario.id,
  });

  return {
    scenarioId: scenario.id,
    metrics,
    judge,
    artefactsDir,
  };
}

async function loadChecklist(path: string): Promise<ChecklistItem[]> {
  const text = await Deno.readTextFile(path);
  const parsed = parseYaml(text);
  if (!Array.isArray(parsed)) {
    throw new Error(`Checklist at ${path} is not a YAML list`);
  }
  return parsed.map((row): ChecklistItem => ({
    id: String((row as { id: unknown }).id),
    fact: String((row as { fact: unknown }).fact),
    critical: Boolean((row as { critical?: unknown }).critical),
  }));
}

async function nextRunDir(base: string): Promise<string> {
  await ensureDir(base);
  let n = 1;
  for (;;) {
    const candidate = join(base, `run-${n}`);
    try {
      await Deno.stat(candidate);
      n++;
    } catch {
      await ensureDir(candidate);
      return candidate;
    }
  }
}

async function writeArtefactLogs(
  dir: string,
  compress: StageResult,
  decompress: StageResult,
): Promise<void> {
  await ensureDir(dir);
  await Deno.writeTextFile(
    join(dir, "transcript.log"),
    [
      "=== compress ===",
      compress.rawLog,
      `\nduration_ms=${compress.durationMs}`,
      "\n=== decompress ===",
      decompress.rawLog,
      `\nduration_ms=${decompress.durationMs}`,
    ].join("\n"),
  );
}

interface ArtefactBundle {
  original: string;
  compressed: string;
  restored: string;
  metrics: RoundtripMetrics;
  judge: RunReport["judge"];
  scenarioId: string;
}

async function writeArtefacts(dir: string, b: ArtefactBundle): Promise<void> {
  await ensureDir(dir);
  await Promise.all([
    Deno.writeTextFile(join(dir, "original.md"), b.original),
    Deno.writeTextFile(join(dir, "compressed.md"), b.compressed),
    Deno.writeTextFile(join(dir, "restored.md"), b.restored),
    Deno.writeTextFile(join(dir, "metrics.json"), JSON.stringify(b.metrics, null, 2)),
    Deno.writeTextFile(join(dir, "judge.json"), JSON.stringify(b.judge, null, 2)),
    Deno.writeTextFile(join(dir, "report.md"), renderReport(b)),
  ]);
}

function renderReport(b: ArtefactBundle): string {
  const m = b.metrics;
  const j = b.judge;
  const lines: string[] = [];
  lines.push(`# ${b.scenarioId}`);
  lines.push("");
  lines.push("## Metrics");
  lines.push("");
  lines.push(`- compression ratio: ${m.compressionRatio.toFixed(3)}`);
  lines.push(`- decompression ratio: ${m.decompressionRatio.toFixed(3)}`);
  lines.push(`- original chars/words: ${m.original.chars} / ${m.original.words}`);
  lines.push(`- compressed chars/words: ${m.compressed.chars} / ${m.compressed.words}`);
  lines.push(`- restored chars/words: ${m.restored.chars} / ${m.restored.words}`);
  lines.push(`- new abbreviations: ${m.compressed.newAbbreviations.join(", ") || "—"}`);
  lines.push(
    `- undefined abbreviations: ${m.compressed.undefinedAbbreviations.join(", ") || "—"}`,
  );
  lines.push(`- total cost USD: ${m.totalCostUsd.toFixed(4)}`);
  lines.push(`- total duration ms: ${m.totalDurationMs}`);
  lines.push("");
  lines.push("## Fact retention");
  lines.push("");
  lines.push(`- overall: ${j.factRetentionPct}%`);
  lines.push(`- critical: ${j.criticalRetentionPct}%`);
  lines.push(`- inventions: ${j.inventionCount}`);
  lines.push("");
  lines.push("| item | pass | reason |");
  lines.push("| --- | --- | --- |");
  for (const v of j.factRetention) {
    const reason = v.reason.replace(/\|/g, "\\|").slice(0, 120);
    lines.push(`| ${v.itemId} | ${v.pass ? "✅" : "❌"} | ${reason} |`);
  }
  return lines.join("\n") + "\n";
}

// re-export for callers wiring scripts/bench.ts
export { dirname };
