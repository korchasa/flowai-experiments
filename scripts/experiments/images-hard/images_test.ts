import { assert } from "@std/assert";
import { run } from "./run.ts";

Deno.test("smoke: dry-run exits cleanly and prints plan", async () => {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => lines.push(args.join(" "));
  try {
    await run(["--dry-run"]);
  } finally {
    console.log = orig;
  }
  const out = lines.join("\n");
  assert(out.includes("dry-run"), "output must mention dry-run");
  assert(out.includes("images-hard"), "output must mention experiment name");
  assert(out.includes("results/"), "output must mention results path");
});
