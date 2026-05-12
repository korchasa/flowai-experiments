/**
 * run-all.ts — Runs all 5 anchor-systems variants sequentially and
 * writes committed results under ./results/.
 *
 * Usage:
 *   deno task experiment:anchor-systems [--model <id>] [--reps <n>]
 *
 * Defaults: model=haiku, reps=5
 */

import { parse } from "@std/flags";

const VARIANTS = ["mapping", "boundary", "multi-hop", "linting", "rag-noise"];

const flags = parse(Deno.args, {
  string: ["model"],
  default: { model: "haiku", reps: 5 },
});

const model = flags.model as string;
const reps = Number(flags.reps);

console.log(`anchor-systems — all variants`);
console.log(`  model: ${model}`);
console.log(`  reps:  ${reps}/cell`);
console.log(`  variants: ${VARIANTS.join(", ")}\n`);

const results: Array<{ variant: string; ok: boolean; code: number }> = [];

for (const variant of VARIANTS) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶ ${variant}`);
  console.log(`${"─".repeat(60)}`);

  const cmd = new Deno.Command("deno", {
    args: [
      "task",
      "experiment",
      "anchor-systems",
      "--variant",
      variant,
      "--model",
      model,
      "--reps",
      String(reps),
    ],
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
