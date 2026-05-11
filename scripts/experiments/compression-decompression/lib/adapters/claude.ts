import type { CompletionRequest, CompressionAdapter } from "./types.ts";
import type { StageResult, TokenUsage } from "../types.ts";

// Claude CLI adapter. Spawns the `claude` binary in non-interactive mode.
//
// Contamination control: real HOME is preserved so OAuth/keychain auth keeps
// working. To suppress user-level rules, skills, plugins, and MCP servers we
// pass `--system-prompt` (replaces the default system prompt and the
// CLAUDE.md auto-discovery that comes with it), `--setting-sources ""` (no
// user/project settings), `--disable-slash-commands` (no skills), and
// `--strict-mcp-config --mcp-config "{}"` (no MCP servers).
export const ClaudeAdapter: CompressionAdapter = {
  id: "claude",

  async complete(req: CompletionRequest): Promise<StageResult> {
    const start = performance.now();

    const cmd = new Deno.Command("claude", {
      args: [
        "--model",
        req.model,
        "--print",
        "--output-format",
        "json",
        "--system-prompt",
        req.systemPrompt,
        "--setting-sources",
        "",
        "--disable-slash-commands",
        "--strict-mcp-config",
        "--mcp-config",
        '{"mcpServers":{}}',
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
      env: { ...Deno.env.toObject(), NO_COLOR: "1" },
    });

    const child = cmd.spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(req.userMessage));
    await writer.close();

    const timeout = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch { /* ignore */ }
    }, req.timeoutMs);

    const { stdout, stderr } = await child.output();
    clearTimeout(timeout);

    const stdoutText = new TextDecoder().decode(stdout);
    const stderrText = new TextDecoder().decode(stderr);
    const rawLog = `STDOUT:\n${stdoutText}\n\nSTDERR:\n${stderrText}`;

    const { text, usage } = parseClaudeJson(stdoutText);

    return {
      text: text.trim(),
      usage,
      rawLog,
      durationMs: Math.round(performance.now() - start),
    };
  },
};

interface ClaudeResultRecord {
  type?: string;
  result?: string;
  total_cost_usd?: number;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function parseClaudeJson(stdout: string): { text: string; usage: TokenUsage } {
  const empty: TokenUsage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { text: stdout, usage: empty };
  }
  if (!Array.isArray(parsed)) {
    const r = parsed as ClaudeResultRecord;
    return {
      text: r.result ?? "",
      usage: {
        inputTokens: r.usage?.input_tokens ?? 0,
        outputTokens: r.usage?.output_tokens ?? 0,
        costUsd: r.total_cost_usd ?? 0,
      },
    };
  }
  const result = (parsed as ClaudeResultRecord[]).find((r) => r.type === "result");
  if (!result) return { text: "", usage: empty };
  return {
    text: result.result ?? "",
    usage: {
      inputTokens: result.usage?.input_tokens ?? 0,
      outputTokens: result.usage?.output_tokens ?? 0,
      costUsd: result.total_cost_usd ?? 0,
    },
  };
}
