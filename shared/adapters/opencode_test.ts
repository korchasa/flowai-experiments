import { assertEquals, assertThrows } from "@std/assert";
import { OpenCodeAdapter } from "./opencode.ts";

Deno.test("OpenCodeAdapter - properties", () => {
  const adapter = new OpenCodeAdapter();
  assertEquals(adapter.ide, "opencode");
  assertEquals(adapter.command, "opencode");
  assertEquals(adapter.outputFormat, "json");
});

Deno.test("OpenCodeAdapter - buildArgs initial prompt", () => {
  const adapter = new OpenCodeAdapter();
  assertEquals(
    adapter.buildArgs({
      model: "anthropic/claude-haiku-4-5",
      workspace: "/tmp/project",
      prompt: "Find anchors",
    }),
    [
      "run",
      "--model",
      "anthropic/claude-haiku-4-5",
      "--dangerously-skip-permissions",
      "--format",
      "json",
      "--",
      "Find anchors",
    ],
  );
});

Deno.test("OpenCodeAdapter - writeMemoryFile root writes AGENTS.md", async () => {
  const adapter = new OpenCodeAdapter();
  const dir = await Deno.makeTempDir();
  try {
    await adapter.writeMemoryFile(dir, "root", "rules");
    assertEquals(await Deno.readTextFile(`${dir}/AGENTS.md`), "rules");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("OpenCodeAdapter - writeMemoryFile non-root throws", async () => {
  const adapter = new OpenCodeAdapter();
  const dir = await Deno.makeTempDir();
  try {
    assertThrows(
      () => adapter.writeMemoryFile(dir, "documents", "rules"),
      Error,
      'IDE "opencode" does not support memory scope "documents"',
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
