import type { CompletionRequest, CompressionAdapter } from "./types.ts";
import type { StageResult } from "../types.ts";

// OpenAI codex CLI adapter. Stub — wire to `codex exec` or equivalent.
export const CodexAdapter: CompressionAdapter = {
  id: "codex",
  complete(_req: CompletionRequest): Promise<StageResult> {
    throw new Error("CodexAdapter: not implemented");
  },
};
