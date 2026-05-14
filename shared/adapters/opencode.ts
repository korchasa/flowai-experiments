import { join } from "@std/path";
import type { AgentAdapter, MemoryScope, ParsedAgentOutput } from "./types.ts";
import { MemoryScopeNotSupportedError } from "./types.ts";
import type { SessionUsage } from "../usage.ts";

interface OpenCodeEvent {
  type?: string;
  sessionID?: string;
  session_id?: string;
  text?: string;
  message?: string;
  output?: string;
  error?: { message?: string };
}

/** Adapter for OpenCode CLI. Runtime execution goes through @korchasa/ai-ide-cli. */
export class OpenCodeAdapter implements AgentAdapter {
  readonly ide = "opencode" as const;
  readonly configDir = ".opencode";
  readonly command = "opencode";
  readonly outputFormat = "json" as const;

  getEnv(): Record<string, string> {
    return {};
  }

  buildArgs(opts: {
    model: string;
    workspace: string;
    prompt: string;
    sessionId?: string;
    name?: string;
  }): string[] {
    const args = [
      "run",
      "--model",
      opts.model,
      "--dangerously-skip-permissions",
      "--format",
      "json",
    ];
    if (opts.sessionId) {
      args.push("--session", opts.sessionId);
    }
    if (opts.prompt) {
      args.push("--", opts.prompt);
    }
    return args;
  }

  parseOutput(stdout: string): ParsedAgentOutput {
    const result: ParsedAgentOutput = {
      sessionId: null,
      result: null,
      subtype: null,
      assistantText: null,
      raw: null,
    };
    const events: OpenCodeEvent[] = [];
    const texts: string[] = [];
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed) as OpenCodeEvent;
        events.push(event);
        result.sessionId = event.sessionID ?? event.session_id ??
          result.sessionId;
        const text = event.text ?? event.output ?? event.message;
        if (typeof text === "string" && text.length > 0) {
          texts.push(text);
        }
        if (event.error?.message) {
          result.subtype = "error";
        }
      } catch (_) {
        texts.push(trimmed);
      }
    }
    result.raw = events.length > 0 ? events : null;
    result.result = texts.length > 0 ? texts.join("\n") : null;
    result.assistantText = result.result;
    return result;
  }

  setupMocks(
    _sandboxPath: string,
    mocks: Record<string, string>,
  ): Promise<void> {
    if (Object.keys(mocks).length > 0) {
      throw new Error(
        "OpenCode mock hooks are not implemented in this harness",
      );
    }
    return Promise.resolve();
  }

  calculateUsage(_sessionId: string): Promise<SessionUsage | null> {
    return Promise.resolve(null);
  }

  getCleanroomEnv(_configDir: string): Promise<Record<string, string>> {
    return Promise.resolve({});
  }

  writeMemoryFile(
    sandboxPath: string,
    scope: MemoryScope,
    content: string,
  ): Promise<void> {
    if (scope !== "root") {
      throw new MemoryScopeNotSupportedError(this.ide, scope);
    }
    return Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), content);
  }
}
