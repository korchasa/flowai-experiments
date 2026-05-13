import { ensureDir } from "@std/fs";
import { dirname, fromFileUrl, join } from "@std/path";

const EXPERIMENT_DIR = dirname(fromFileUrl(import.meta.url));
const RESULTS_DIR = join(EXPERIMENT_DIR, "results");
const RESULTS_LABEL = "images-hard/results";

function slugify(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${
    p(d.getHours())
  }${p(d.getMinutes())}`;
}

interface PromptResult {
  promptId: string;
  promptName: string;
  results: Array<{ success: boolean; error?: string }>;
}

interface ModelReport {
  modelId: string;
  results: PromptResult[];
  stats: {
    totalPrompts: number;
    successfulGenerations: number;
    errors: string[];
  };
}

interface Report {
  createdAt: string;
  models: ModelReport[];
  summary: {
    totalModels: number;
    processedModels: number;
    totalPrompts: number;
    totalSuccessfulGenerations: number;
    totalErrors: number;
  };
}

function renderMarkdown(report: Report, title: string): string {
  const lines: string[] = [
    `# ${title}`,
    "",
    `created: ${report.createdAt}`,
    "",
  ];
  lines.push("## Models", "");
  for (const m of report.models) {
    const s = m.stats;
    lines.push(
      `- ${m.modelId}: ${s.successfulGenerations}/${s.totalPrompts} prompts succeeded` +
        (s.errors.length > 0 ? `, ${s.errors.length} errors` : ""),
    );
  }
  const sm = report.summary;
  lines.push("", "## Summary", "");
  lines.push(`- models processed: ${sm.processedModels} / ${sm.totalModels}`);
  lines.push(
    `- prompts: ${sm.totalSuccessfulGenerations} / ${sm.totalPrompts} succeeded`,
  );
  if (sm.totalErrors > 0) lines.push(`- errors: ${sm.totalErrors}`);
  return lines.join("\n") + "\n";
}

export async function run(args: string[]): Promise<void> {
  const dryRun = args.includes("--dry-run");
  const modelIdx = args.indexOf("--model");
  const modelArg = modelIdx !== -1 && modelIdx + 1 < args.length
    ? args[modelIdx + 1]
    : "all";
  const stamp = dateStamp();
  const outBase = `${stamp}-images-hard-${slugify(modelArg)}`;

  if (dryRun) {
    console.log(`[images-hard dry-run] model=${modelArg}`);
    console.log(`  output: ${RESULTS_LABEL}/${outBase}.{json,md}`);
    return;
  }

  if (!Deno.env.get("OPENROUTER_API_KEY")) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const tmpDir = await Deno.makeTempDir({ prefix: "flowai-images-hard-" });
  try {
    await Deno.mkdir(tmpDir, { recursive: true });
    const proc = new Deno.Command(Deno.execPath(), {
      args: ["run", "-A", "bench.ts", tmpDir, ...args],
      cwd: EXPERIMENT_DIR,
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    const status = await proc.status;
    if (!status.success) {
      throw new Error(`bench.ts failed (exit ${status.code})`);
    }

    await ensureDir(RESULTS_DIR);
    for await (const entry of Deno.readDir(tmpDir)) {
      if (!entry.name.endsWith(".json") || entry.name === "reports.json") {
        continue;
      }
      const srcPath = join(tmpDir, entry.name);
      const report: Report = JSON.parse(await Deno.readTextFile(srcPath));
      await Deno.copyFile(srcPath, join(RESULTS_DIR, `${outBase}.json`));
      await Deno.writeTextFile(
        join(RESULTS_DIR, `${outBase}.md`),
        renderMarkdown(report, outBase),
      );
      console.log(`Saved: ${RESULTS_LABEL}/${outBase}.md`);
    }
  } finally {
    await Deno.remove(tmpDir, { recursive: true }).catch(() => {});
  }
}

if (import.meta.main) {
  await run(Deno.args);
}
