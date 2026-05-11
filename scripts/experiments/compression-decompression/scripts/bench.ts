import { walk } from "@std/fs";
import { fromFileUrl, resolve } from "@std/path";
import type { CompressionScenario, RunReport } from "@bench/types.ts";
import { runScenario } from "@bench/runner.ts";

interface CliOptions {
  filter?: string;
  noCache: boolean;
  styles?: string[];
  compressModels?: string[];
  decompressModels?: string[];
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { noCache: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eat = (flag: string) => {
      if (a === flag) return argv[++i];
      if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
      return undefined;
    };
    const list = (flag: string) => {
      const v = eat(flag);
      return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    };

    if (a === "-f" || a === "--filter") opts.filter = argv[++i];
    else if (a.startsWith("--filter=")) opts.filter = a.slice("--filter=".length);
    else if (a === "--no-cache") opts.noCache = true;
    else if (a.startsWith("--styles")) opts.styles = list("--styles");
    else if (a.startsWith("--compress-models")) opts.compressModels = list("--compress-models");
    else if (a.startsWith("--decompress-models")) {
      opts.decompressModels = list("--decompress-models");
    } else if (a.startsWith("-")) throw new Error(`Unknown flag: ${a}`);
    else opts.filter = a;
  }
  return opts;
}

async function discoverScenarios(): Promise<string[]> {
  const out: string[] = [];
  for await (const e of walk("scenarios", { exts: [".ts"], includeDirs: false })) {
    if (e.path.endsWith("/mod.ts") || e.path.endsWith("\\mod.ts")) out.push(e.path);
  }
  return out.sort();
}

async function loadScenario(path: string): Promise<CompressionScenario> {
  const url = new URL(`file://${resolve(path)}`);
  const mod = await import(url.href);
  const s = mod.Scenario;
  if (!s || typeof s !== "object") {
    throw new Error(`${path}: missing exported "Scenario"`);
  }
  return s as CompressionScenario;
}

interface MatrixCombo {
  style: string;
  compressModel: string;
  decompressModel?: string;
}

function expandMatrix(opts: CliOptions): MatrixCombo[] | null {
  if (!opts.styles && !opts.compressModels && !opts.decompressModels) return null;
  const styles = opts.styles ?? ["compressed-style"];
  const compress = opts.compressModels ?? ["claude-opus-4-7"];
  const decompress = opts.decompressModels ?? [undefined];
  const out: MatrixCombo[] = [];
  for (const s of styles) {
    for (const c of compress) {
      for (const d of decompress) {
        out.push({ style: s, compressModel: c, decompressModel: d });
      }
    }
  }
  return out;
}

function deriveScenario(base: CompressionScenario, combo: MatrixCombo): CompressionScenario {
  const baseId = base.id.split("--")[0];
  const id = `${baseId}--${combo.style}--${combo.compressModel}`;
  const derived = Object.create(Object.getPrototypeOf(base));
  Object.assign(derived, base, {
    id,
    compress: {
      ...base.compress,
      promptPath: `prompts/compress.${combo.style}.md`,
      model: { ...base.compress.model, model: combo.compressModel },
    },
    decompress: combo.decompressModel
      ? { ...base.decompress, model: { ...base.decompress.model, model: combo.decompressModel } }
      : base.decompress,
  });
  return derived as CompressionScenario;
}

function formatRow(r: RunReport): string {
  const m = r.metrics;
  return [
    r.scenarioId.padEnd(60),
    `src=${m.original.chars}c`,
    `ratio=${m.compressionRatio.toFixed(2)}`,
    `crit=${r.judge.criticalRetentionPct}%`,
    `fact=${r.judge.factRetentionPct}%`,
    `inv=${r.judge.inventionCount}`,
    `undef=${m.compressed.undefinedAbbreviations.length}`,
    `$${m.totalCostUsd.toFixed(3)}`,
    `${(m.totalDurationMs / 1000).toFixed(1)}s`,
  ].join(" ");
}

function styleOf(scenarioId: string): string {
  const parts = scenarioId.split("--");
  return parts[1] ?? "(unknown)";
}

function printStyleSummary(rows: RunReport[]): void {
  if (!rows.length) return;
  const groups = new Map<string, RunReport[]>();
  for (const r of rows) {
    const k = styleOf(r.scenarioId);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  console.log("");
  console.log("=== summary by compression style ===");
  const head = ["style", "n", "ratio̅", "crit̅%", "fact̅%", "inv̅", "undef̅", "Σ$", "Σs"];
  const data: string[][] = [];
  const styles = [...groups.keys()].sort();
  for (const s of styles) {
    const g = groups.get(s)!;
    data.push([
      s,
      String(g.length),
      mean(g.map((r) => r.metrics.compressionRatio)).toFixed(2),
      mean(g.map((r) => r.judge.criticalRetentionPct)).toFixed(0),
      mean(g.map((r) => r.judge.factRetentionPct)).toFixed(0),
      mean(g.map((r) => r.judge.inventionCount)).toFixed(1),
      mean(g.map((r) => r.metrics.compressed.undefinedAbbreviations.length)).toFixed(1),
      sum(g.map((r) => r.metrics.totalCostUsd)).toFixed(3),
      (sum(g.map((r) => r.metrics.totalDurationMs)) / 1000).toFixed(1),
    ]);
  }
  const widths = head.map((h, i) => Math.max(h.length, ...data.map((row) => row[i].length)));
  const fmt = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  console.log(fmt(head));
  console.log(fmt(widths.map((w) => "-".repeat(w))));
  for (const row of data) console.log(fmt(row));
}

async function main(): Promise<void> {
  const opts = parseArgs(Deno.args);
  const paths = await discoverScenarios();
  const filtered = opts.filter ? paths.filter((p) => p.includes(opts.filter!)) : paths;
  if (!filtered.length) {
    console.error(`No scenarios match filter "${opts.filter ?? ""}"`);
    Deno.exit(2);
  }

  const matrix = expandMatrix(opts);
  let exit = 0;
  const collected: RunReport[] = [];

  for (const p of filtered) {
    const base = await loadScenario(p);
    const variants = matrix ? matrix.map((c) => deriveScenario(base, c)) : [base];
    for (const scenario of variants) {
      console.error(`▶ ${scenario.id}`);
      try {
        const r = await runScenario(scenario, { noCache: opts.noCache });
        console.log(formatRow(r));
        collected.push(r);
      } catch (err) {
        console.error(`✖ ${scenario.id}: ${(err as Error).message}`);
        exit = 1;
      }
    }
  }
  printStyleSummary(collected);
  Deno.exit(exit);
}

if (import.meta.url === `file://${fromFileUrl(import.meta.url)}` || import.meta.main) {
  await main();
}
