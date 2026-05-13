import type { CompletionRequest, CompressionAdapter } from "./types.ts";
import type { StageResult } from "../types.ts";

// Gemini CLI adapter. Stub — wire to `gemini` or REST when available.
export const GeminiAdapter: CompressionAdapter = {
  id: "gemini",
  complete(_req: CompletionRequest): Promise<StageResult> {
    throw new Error("GeminiAdapter: not implemented");
  },
};
