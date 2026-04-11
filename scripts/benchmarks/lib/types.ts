/**
 * LLM wire types used by `llm.ts` (chat completion) and by experiment
 * `judge.ts` (structured prompts). Trimmed from the flow benchmark `types.ts`
 * to the two structural types the experiment subsystem actually consumes —
 * the `Benchmark*Scenario` classes and `BenchmarkResult` live only in flow.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: number;
  };
}
