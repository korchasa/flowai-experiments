/**
 * run-all.ts — Runs all 5 anchor-systems variants sequentially and
 * writes committed results under ./results/.
 *
 * Usage:
 *   deno task experiment:anchor-systems [--ide <id>] [--model-provider <id>] [--model <id>] [--reps <n>] [--dry-run]
 *
 * Defaults: ide=opencode, model/provider from config.json, reps=5
 */

import { parse } from "@std/flags";

const VARIANTS = ["mapping", "boundary", "multi-hop", "linting", "link-cost"];

const flags = parse(Deno.args, {
  string: ["ide", "model-provider", "model"],
  boolean: ["dry-run"],
  default: { ide: "opencode", reps: 5 },
});

const ide = flags.ide as string;
const modelProvider = flags["model-provider"] as string | undefined;
const model = flags.model as string | undefined;
const reps = Number(flags.reps);

console.log(`anchor-systems — all variants`);
console.log(`  ide:   ${ide}`);
console.log(`  provider: ${modelProvider ?? "(config)"}`);
console.log(`  model: ${model ?? "(config)"}`);
console.log(`  reps:  ${reps}/cell`);
console.log(`  dry-run: ${flags["dry-run"] ? "yes" : "no"}`);
console.log(`  variants: ${VARIANTS.join(", ")}\n`);

const results: Array<{ variant: string; ok: boolean; code: number }> = [];

for (const variant of VARIANTS) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶ ${variant}`);
  console.log(`${"─".repeat(60)}`);

  const args = [
    "task",
    "experiment",
    "anchor-systems",
    "--variant",
    variant,
    "--ide",
    ide,
    "--reps",
    String(reps),
  ];
  if (modelProvider) {
    args.push("--model-provider", modelProvider);
  }
  if (model) {
    args.push("--model", model);
  }
  if (flags["dry-run"]) {
    args.push("--dry-run");
  }

  const cmd = new Deno.Command("deno", {
    args,
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await cmd.output();
  results.push({ variant, ok: code === 0, code });
}

console.log(`\n${"═".repeat(60)}`);
console.log(`Summary`);
console.log(`${"═".repeat(60)}`);
for (const r of results) {
  const mark = r.ok ? "✓" : "✗";
  console.log(`  ${mark} ${r.variant}`);
}

const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} variant(s) failed.`);
  Deno.exit(1);
}
