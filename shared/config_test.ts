import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { type BenchmarkConfig, getIdeConfig, loadConfig } from "./llm.ts";
import { join } from "@std/path";

Deno.test("loadConfig - should load valid config", async () => {
  const tempConfig = join(Deno.cwd(), "config.json.test");
  const configData = {
    ides: {
      opencode: {
        default_agent_model_provider: "openai",
        default_agent_model: "gpt-5.4-mini",
        judge: {
          runtime: "opencode",
          model_provider: "openai",
          model: "gpt-5.4",
          temperature: 0,
        },
      },
      cursor: {
        default_agent_model_provider: "google",
        default_agent_model: "gemini-3-flash",
        judge: {
          runtime: "opencode",
          model_provider: "google",
          model: "gemini-2.5-flash",
          temperature: 0,
        },
      },
      claude: {
        default_agent_model_provider: "anthropic",
        default_agent_model: "sonnet",
        judge: {
          runtime: "claude",
          model_provider: "anthropic",
          model: "sonnet",
          temperature: 0,
        },
      },
    },
  };

  await Deno.writeTextFile(tempConfig, JSON.stringify(configData));

  try {
    const config = await loadConfig(tempConfig);

    const opencodeConfig = getIdeConfig(config, "opencode");
    assertEquals(opencodeConfig.default_agent_model_provider, "openai");
    assertEquals(opencodeConfig.default_agent_model, "gpt-5.4-mini");
    assertEquals(opencodeConfig.judge.runtime, "opencode");
    assertEquals(opencodeConfig.judge.model_provider, "openai");
    assertEquals(opencodeConfig.judge.model, "gpt-5.4");

    const cursorConfig = getIdeConfig(config, "cursor");
    assertEquals(cursorConfig.default_agent_model_provider, "google");
    assertEquals(cursorConfig.default_agent_model, "gemini-3-flash");
    assertEquals(cursorConfig.judge.model_provider, "google");
    assertEquals(cursorConfig.judge.model, "gemini-2.5-flash");

    const claudeConfig = getIdeConfig(config, "claude");
    assertEquals(claudeConfig.default_agent_model_provider, "anthropic");
    assertEquals(claudeConfig.default_agent_model, "sonnet");
    assertEquals(claudeConfig.judge.runtime, "claude");
    assertEquals(claudeConfig.judge.model, "sonnet");
  } finally {
    await Deno.remove(tempConfig);
  }
});

Deno.test("getIdeConfig - should throw for unknown IDE", () => {
  const config: BenchmarkConfig = {
    ides: {
      cursor: {
        default_agent_model_provider: "provider",
        default_agent_model: "model",
        judge: {
          runtime: "opencode",
          model_provider: "provider",
          model: "judge",
          temperature: 0,
        },
      },
    },
  };
  assertThrows(
    () => getIdeConfig(config, "unknown-ide"),
    Error,
    'No configuration found for IDE "unknown-ide"',
  );
});

Deno.test("loadConfig - should throw error if file not found (fail fast)", async () => {
  await assertRejects(
    () => loadConfig("non-existent.json"),
    Error,
    "Configuration file not found",
  );
});
