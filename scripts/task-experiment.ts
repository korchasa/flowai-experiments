/**
 * task-experiment.ts — Runs one experiment variant and writes committed
 * results (JSON + Markdown) under the top-level `./results/` directory.
 *
 * Usage:
 *   deno task experiment <name> --variant <v> [options]
 *
 * Options:
 *   --variant <name>        Variant file (e.g., "single-file"). Required.
 *   -m, --model <id>        Agent model (default: IDE default from config)
 *   -i, --ide <id>          IDE adapter (default: claude)
 *   -r, --reps <n>          Repetitions per cell (default: experiment default)
 *   --axis <name>=<csv>     Override one axis (repeatable). Axis names and
 *                           values are experiment-specific — check the
 *                           experiment's README. Example:
 *                             --axis tokens=500,1000 --axis rule=format
 *   --seed <n>              Base seed (default: 1)
 *   --dry-run               Print plan without running trials
 *   --help                  Show usage
 */

import { join } from "@std/path";
import { parse } from "@std/flags";
import { existsSync } from "@std/fs";
import {
  createAdapter,
  SUPPORTED_IDES,
} from "./benchmarks/lib/adapters/mod.ts";
import {
  getIdeConfig,
  loadConfig,
  type ModelConfig,
} from "./benchmarks/lib/llm.ts";
import type { Experiment } from "./experiments/lib/types.ts";
import { expandCells, runExperiment } from "./experiments/lib/runner.ts";
import { writeReport } from "./experiments/lib/report.ts";
import { ansi } from "./utils.ts";

function printHelp() {
  console.log(`
Usage: deno task experiment <name> --variant <variant> [options]

Arguments:
  <name>                  Experiment directory under scripts/experiments/

Options:
  --variant <name>        Variant file (e.g., "single-file"). Required.
  -m, --model <id>        Agent model (default: IDE default)
  -i, --ide <id>          IDE adapter (${
    SUPPORTED_IDES.join(", ")
  }) (default: claude)
  -r, --reps <n>          Repetitions per cell
  --axis <name>=<csv>     Override one axis (repeatable). Axis names and
                          values are experiment-specific — check the
                          experiment's README.
  --seed <n>              Base seed (default: 1)
  --dry-run               Print plan without running trials
  --help                  Show this help

Examples:
  deno task experiment claude-md-length --variant single-file --model claude-opus-4-6
  deno task experiment claude-md-length --variant tree-sum --reps 3 --axis tokens=1500,3000
  deno task experiment claude-md-length --variant single-file --dry-run
`);
}

async function loadExperiment(
  name: string,
  variant: string,
): Promise<Experiment> {
  const file = join(
    Deno.cwd(),
    "scripts",
    "experiments",
    name,
    `${variant}.ts`,
  );
  if (!existsSync(file)) {
    throw new Error(`Experiment file not found: ${file}`);
  }
  const mod = await import(`file://${file}`);
  // Find exported Experiment instance
  for (const exportName in mod) {
    const value = mod[exportName];
    if (
      value && typeof value === "object" && "id" in value && "axes" in value &&
      typeof (value as Experiment).setupCell === "function"
    ) {
      return value as Experiment;
    }
  }
  throw new Error(`No Experiment export found in ${file}`);
}

/**
 * Parses repeated `--axis name=v1,v2,...` flags into an override map.
 *
 * Each value is coerced to a number when it parses as one, else kept as a
 * string — so numeric axes (e.g. `tokens`) and string axes (e.g. `rule`)
 * share the same flag. The runner treats unknown keys as a hard error at
 * expand time, so typos surface immediately.
 */
function parseAxisOverrides(
  raw: readonly string[],
): Record<string, Array<string | number>> | undefined {
  if (raw.length === 0) return undefined;
  const out: Record<string, Array<string | number>> = {};
  for (const spec of raw) {
    const eq = spec.indexOf("=");
    if (eq <= 0) {
      throw new Error(
        `Invalid --axis value ${
          JSON.stringify(spec)
        } — expected "<name>=<csv>"`,
      );
    }
    const name = spec.slice(0, eq).trim();
    const csv = spec.slice(eq + 1);
    const values = csv.split(",").map((s) => s.trim()).filter((s) =>
      s.length > 0
    ).map((s) => {
      const n = Number(s);
      return Number.isFinite(n) && s !== "" ? n : s;
    });
    if (values.length === 0) {
      throw new Error(`--axis ${name} has no values`);
    }
    out[name] = values;
  }
  return out;
}

async function main() {
  const args = parse(Deno.args, {
    string: ["variant", "model", "ide", "reps", "seed", "axis"],
    boolean: ["help", "dry-run"],
    collect: ["axis"],
    alias: {
      m: "model",
      i: "ide",
      r: "reps",
      h: "help",
    },
    unknown: (arg) => {
      if (arg.startsWith("-")) {
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        Deno.exit(1);
      }
      return true;
    },
  });

  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  const name = args._[0] as string | undefined;
  if (!name) {
    console.error("Missing experiment name.");
    printHelp();
    Deno.exit(1);
  }
  if (!args.variant) {
    console.error("Missing --variant.");
    printHelp();
    Deno.exit(1);
  }

  const experiment = await loadExperiment(name, args.variant);

  const ideName = (args.ide as string) || experiment.defaults.ide || "claude";
  const adapter = createAdapter(ideName);
  const config = await loadConfig();
  const ideConfig = getIdeConfig(config, ideName);

  const model = (args.model as string) || experiment.defaults.model ||
    ideConfig.default_agent_model;
  const judgeConfig: ModelConfig = { ...ideConfig.judge };

  const reps = args.reps ? parseInt(args.reps, 10) : experiment.defaults.reps;
  const seed = args.seed ? parseInt(args.seed, 10) : 1;

  // Build axesFilter from repeated --axis name=v1,v2 flags. Unknown axis
  // names are rejected here so typos don't silently produce an empty sweep.
  const axisFlags = (args.axis as string[] | undefined) ?? [];
  const overrides = parseAxisOverrides(axisFlags);
  let axesFilter: Record<string, ReadonlyArray<string | number>> | undefined;
  if (overrides) {
    for (const axisName of Object.keys(overrides)) {
      if (!(axisName in experiment.axes)) {
        console.error(
          `Unknown axis "${axisName}" for experiment "${experiment.id}". ` +
            `Known axes: ${
              Object.keys(experiment.axes).join(", ") || "(none)"
            }`,
        );
        Deno.exit(1);
      }
    }
    axesFilter = { ...experiment.axes, ...overrides };
  }

  const effectiveAxes = axesFilter ?? experiment.axes;
  const cells = expandCells(effectiveAxes, reps);

  console.log(
    `${ansi("\x1b[1m")}Experiment:${ansi("\x1b[0m")} ${experiment.name}`,
  );
  console.log(`  id:         ${experiment.id}`);
  console.log(`  variant:    ${args.variant}`);
  console.log(`  model:      ${model}`);
  console.log(`  ide:        ${ideName}`);
  console.log(`  judge:      ${judgeConfig.model}`);
  console.log(`  reps/cell:  ${reps}`);
  console.log(`  seed:       ${seed}`);
  console.log(`  total cells:${cells.length}`);
  console.log(`  axes:`);
  for (const [k, v] of Object.entries(effectiveAxes)) {
    console.log(`    ${k}: [${v.join(", ")}]`);
  }

  if (args["dry-run"]) {
    console.log("\nDry run — no trials executed.");
    Deno.exit(0);
  }

  console.log(`\nRunning ${cells.length} trials...\n`);

  const report = await runExperiment({
    experiment,
    variant: args.variant as string,
    model,
    ide: ideName,
    adapter,
    reps,
    seed,
    axesFilter,
    judgeConfig,
    onProgress: (i, total, result) => {
      const axes = Object.entries(result.cell.axes)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ");
      const status = result.pass
        ? ansi("\x1b[32m✓\x1b[0m")
        : ansi("\x1b[31m✗\x1b[0m");
      const durationS = (result.durationMs / 1000).toFixed(1);
      console.log(
        `  [${i}/${total}] ${status} ${axes} trial=${result.cell.trial} ${durationS}s — ${
          result.judgeReason.slice(0, 80)
        }`,
      );
    },
  });

  console.log(`\n${ansi("\x1b[1m")}${report.headline}${ansi("\x1b[0m")}`);

  const resultsDir = join(Deno.cwd(), "results");
  const { jsonPath, mdPath } = await writeReport(
    report,
    resultsDir,
    args.variant as string,
  );
  console.log(`\nResults written:`);
  console.log(`  ${jsonPath}`);
  console.log(`  ${mdPath}`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    Deno.exit(1);
  });
}
