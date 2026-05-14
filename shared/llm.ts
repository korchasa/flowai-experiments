import type { LLMMessage, LLMResponse } from "./llm_types.ts";

export interface ModelConfig {
  model: string;
  /** Model provider/routing prefix, e.g. "anthropic" for OpenCode. */
  model_provider?: string;
  /** Runtime used for this LLM call. Defaults to Claude for compatibility. */
  runtime?: "claude" | "opencode";
  temperature: number;
  jsonSchema?: Record<string, unknown>;
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
    data_collection?: "allow" | "deny";
  };
  [key: string]: unknown;
}

export interface IdeConfig {
  default_agent_model_provider?: string;
  default_agent_model: string;
  judge: ModelConfig;
}

export interface BenchmarkConfig {
  ides: Record<string, IdeConfig>;
}

/** Get IDE-specific config */
export function getIdeConfig(
  config: BenchmarkConfig,
  ide: string,
): IdeConfig {
  const ideSection = config.ides[ide];
  if (!ideSection) {
    throw new Error(
      `No configuration found for IDE "${ide}". Available: ${
        Object.keys(config.ides).join(", ")
      }`,
    );
  }
  return ideSection;
}

export async function loadConfig(
  path = "config.json",
): Promise<BenchmarkConfig> {
  try {
    const content = await Deno.readTextFile(path);
    const config = JSON.parse(content) as BenchmarkConfig;
    return config;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(
        `Configuration file not found at ${path}. Please create it to run benchmarks.`,
      );
    }
    throw e;
  }
}

/** Returns the runtime model reference, preserving bare model ids. */
export function modelRef(
  config: Pick<ModelConfig, "model" | "model_provider">,
): string {
  if (!config.model_provider || config.model.includes("/")) {
    return config.model;
  }
  return `${config.model_provider}/${config.model}`;
}

/** Chat completion via ai-ide-cli. No API key is read by this harness. */
export async function cliChatCompletion(
  messages: LLMMessage[],
  configOrModel: ModelConfig | string,
  _temperature?: number,
  signal?: AbortSignal,
  /** Path to a file whose content is appended to the system prompt via --append-system-prompt-file. */
  appendSystemPromptFile?: string,
): Promise<LLMResponse> {
  const config: ModelConfig = typeof configOrModel === "string"
    ? { model: configOrModel, temperature: 0 }
    : { ...configOrModel };

  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const userMsg = messages.filter((m) => m.role !== "system")
    .map((m) => m.content).join("\n\n");

  const userMsgBytes = new TextEncoder().encode(userMsg).length;
  if (userMsgBytes > 100_000) {
    console.warn(
      `  [llm] Large prompt payload: ${(userMsgBytes / 1024).toFixed(0)}KB`,
    );
  }

  const { invokeClaudeCli, invokeOpenCodeCli, defaultRegistry } = await import(
    "@korchasa/ai-ide-cli"
  );

  let structuredOutput: Record<string, unknown> | undefined;
  const claudeArgs: Record<string, string | null> = {
    "--no-session-persistence": "",
    "--strict-mcp-config": "",
  };
  if (config.jsonSchema) {
    claudeArgs["--tools"] = "StructuredOutput";
    claudeArgs["--json-schema"] = JSON.stringify(config.jsonSchema);
  }
  if (appendSystemPromptFile) {
    claudeArgs["--append-system-prompt-file"] = appendSystemPromptFile;
  }

  const runtime = config.runtime ?? "claude";
  const result = runtime === "opencode"
    ? await invokeOpenCodeCli({
      processRegistry: defaultRegistry,
      model: modelRef(config),
      taskPrompt: userMsg,
      systemPrompt: systemMsg,
      permissionMode: "bypassPermissions",
      maxRetries: 1,
      retryDelaySeconds: 2,
      timeoutSeconds: 300,
      env: {},
      signal,
      hooks: {
        onResult(event: unknown) {
          structuredOutput = (event as {
            structured_output?: Record<string, unknown>;
          }).structured_output;
        },
      },
    })
    : await invokeClaudeCli({
      processRegistry: defaultRegistry,
      model: config.model,
      taskPrompt: userMsg,
      systemPrompt: systemMsg,
      permissionMode: "bypassPermissions",
      maxRetries: 1,
      retryDelaySeconds: 2,
      timeoutSeconds: 300,
      strictMcpConfig: true,
      claudeArgs,
      env: { CLAUDECODE: "" },
      signal,
      hooks: {
        onResult(event: unknown) {
          structuredOutput = (event as {
            structured_output?: Record<string, unknown>;
          }).structured_output;
        },
      },
    });

  if (result.error || !result.output) {
    throw new Error(
      `${runtime} CLI failed via ai-ide-cli: ${
        result.error ?? "missing output"
      }`,
    );
  }

  if (config.jsonSchema && structuredOutput) {
    return {
      content: JSON.stringify(structuredOutput),
      usage: undefined,
    };
  }

  return { content: result.output.result, usage: undefined };
}
