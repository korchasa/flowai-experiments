import { ensureDir } from "@std/fs";
import { dirname, fromFileUrl, join } from "@std/path";

const EXPERIMENT_DIR = dirname(fromFileUrl(import.meta.url));
const RESULTS_DIR = join(EXPERIMENT_DIR, "results");
const RESULTS_LABEL = "compression-decompression/results";

function slugify(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${
    p(d.getMinutes())
  }`;
}

export async function run(args: string[]): Promise<void> {
  const dryRun = args.includes("--dry-run");
  const filterIdx = args.indexOf("--filter");
  const filterArg = filterIdx !== -1 && filterIdx + 1 < args.length ? args[filterIdx + 1] : "all";
  const stamp = dateStamp();
  const outBase = `${stamp}-compression-${slugify(filterArg)}`;

  if (dryRun) {
    console.log(`[compression-decompression dry-run] filter=${filterArg}`);
    console.log(`  output: ${RESULTS_LABEL}/${outBase}.{json,md}`);
    console.log(
      "  scenarios: adr-record-decision, postmortem-incident-2026-03-12, prd-feature-launch, runbook-deno-deploy",
    );
    return;
  }

  const benchArgs = args.filter((a) => a !== "--dry-run");
  const proc = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      `--config=${join(EXPERIMENT_DIR, "deno.json")}`,
      "-A",
      "scripts/bench.ts",
      ...benchArgs,
    ],
    cwd: EXPERIMENT_DIR,
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const status = await proc.status;
  if (!status.success) throw new Error(`scripts/bench.ts failed (exit ${status.code})`);

  // Collect run reports from runs/latest/
  const runsRoot = join(EXPERIMENT_DIR, "runs", "latest");
  const allReports: Array<
    { scenarioId: string; metricsJson: string; judgeJson: string; reportMd: string }
  > = [];

  try {
    for await (const scenarioEntry of Deno.readDir(runsRoot)) {
      if (!scenarioEntry.isDirectory) continue;
      const scenarioDir = join(runsRoot, scenarioEntry.name);
      // Find the latest run-N dir
      let maxN = 0;
      for await (const runEntry of Deno.readDir(scenarioDir)) {
        const m = runEntry.name.match(/^run-(\d+)$/);
        if (m) maxN = Math.max(maxN, parseInt(m[1]));
      }
      if (maxN === 0) continue;
      const runDir = join(scenarioDir, `run-${maxN}`);
      const metricsJson = await Deno.readTextFile(join(runDir, "metrics.json")).catch(() => "{}");
      const judgeJson = await Deno.readTextFile(join(runDir, "judge.json")).catch(() => "{}");
      const reportMd = await Deno.readTextFile(join(runDir, "report.md")).catch(() => "");
      allReports.push({ scenarioId: scenarioEntry.name, metricsJson, judgeJson, reportMd });
    }
  } catch {
    // runs/latest may not exist if no scenarios ran
  }

  if (allReports.length === 0) {
    console.error("No run reports found in runs/latest/");
    return;
  }

  await ensureDir(RESULTS_DIR);

  // Write combined JSON
  const combined = {
    createdAt: new Date().toISOString(),
    scenarios: allReports.map((r) => ({
      id: r.scenarioId,
      metrics: JSON.parse(r.metricsJson),
      judge: JSON.parse(r.judgeJson),
    })),
  };
  await Deno.writeTextFile(
    join(RESULTS_DIR, `${outBase}.json`),
    JSON.stringify(combined, null, 2),
  );

  // Write combined Markdown
  const mdLines: string[] = [`# ${outBase}`, "", `created: ${combined.createdAt}`, ""];
  for (const r of allReports) {
    mdLines.push(`## ${r.scenarioId}`, "");
    mdLines.push(r.reportMd, "");
  }
  await Deno.writeTextFile(join(RESULTS_DIR, `${outBase}.md`), mdLines.join("\n"));
  console.log(`Saved: ${RESULTS_LABEL}/${outBase}.md`);
}

if (import.meta.main) {
  await run(Deno.args);
}
