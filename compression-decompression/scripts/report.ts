import { walk } from "@std/fs";
import { join } from "@std/path";
import type { JudgeReport, RoundtripMetrics } from "@bench/types.ts";

interface Row {
  scenarioId: string;
  run: string;
  metrics: RoundtripMetrics;
  judge: JudgeReport;
}

async function readRunDir(dir: string): Promise<Row | null> {
  try {
    const metrics = JSON.parse(
      await Deno.readTextFile(join(dir, "metrics.json")),
    ) as RoundtripMetrics;
    const judge = JSON.parse(await Deno.readTextFile(join(dir, "judge.json"))) as JudgeReport;
    const segments = dir.split("/");
    const run = segments[segments.length - 1];
    const scenarioId = segments[segments.length - 2];
    return { scenarioId, run, metrics, judge };
  } catch {
    return null;
  }
}

async function collect(root: string): Promise<Row[]> {
  const rows: Row[] = [];
  for await (const e of walk(root, { includeDirs: true, includeFiles: false, maxDepth: 3 })) {
    if (!/run-\d+$/.test(e.path)) continue;
    const r = await readRunDir(e.path);
    if (r) rows.push(r);
  }
  rows.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId) || a.run.localeCompare(b.run));
  return rows;
}

function table(rows: Row[]): string {
  const head = [
    "scenario",
    "run",
    "src",
    "ratio",
    "crit%",
    "fact%",
    "inv",
    "undef",
    "cost$",
    "ms",
  ];
  const data = rows.map((r) => [
    r.scenarioId,
    r.run,
    String(r.metrics.original.chars),
    r.metrics.compressionRatio.toFixed(3),
    String(r.judge.criticalRetentionPct),
    String(r.judge.factRetentionPct),
    String(r.judge.inventionCount),
    String(r.metrics.compressed.undefinedAbbreviations.length),
    r.metrics.totalCostUsd.toFixed(4),
    String(r.metrics.totalDurationMs),
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...data.map((row) => row[i].length)));
  const fmt = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  return [fmt(head), fmt(widths.map((w) => "-".repeat(w))), ...data.map(fmt)].join("\n");
}

async function main(): Promise<void> {
  const root = Deno.args[0] ?? "runs/latest";
  const rows = await collect(root);
  if (!rows.length) {
    console.error(`No runs under ${root}`);
    Deno.exit(2);
  }
  console.log(table(rows));
}

if (import.meta.main) await main();
