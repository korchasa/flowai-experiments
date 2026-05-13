import type { AdapterId, StageResult } from "../types.ts";

export interface CompletionRequest {
  systemPrompt: string;
  userMessage: string;
  model: string;
  maxTokens: number;
  timeoutMs: number;
}

export interface CompressionAdapter {
  id: AdapterId;
  complete(req: CompletionRequest): Promise<StageResult>;
}
