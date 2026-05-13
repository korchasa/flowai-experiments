import type { AdapterId } from "../types.ts";
import type { CompressionAdapter } from "./types.ts";
import { ClaudeAdapter } from "./claude.ts";
import { CodexAdapter } from "./codex.ts";
import { GeminiAdapter } from "./gemini.ts";

const REGISTRY: Record<AdapterId, CompressionAdapter> = {
  claude: ClaudeAdapter,
  codex: CodexAdapter,
  gemini: GeminiAdapter,
  ollama: {
    id: "ollama",
    complete: () => {
      throw new Error("OllamaAdapter: not implemented");
    },
  },
};

export function getAdapter(id: AdapterId): CompressionAdapter {
  return REGISTRY[id];
}

/** Override an adapter (used by tests to inject stubs). */
export function registerAdapter(id: AdapterId, adapter: CompressionAdapter): void {
  REGISTRY[id] = adapter;
}
