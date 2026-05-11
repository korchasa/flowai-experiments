// Core types for the compression/decompression benchmark.
// Mirrors the flowai BenchmarkScenario pattern: scenario-as-module,
// adapter-layer, LLM judge, cache.

export type DocumentClass =
  | "SRS"
  | "SDS"
  | "ADR"
  | "runbook"
  | "readme"
  | "postmortem"
  | "PRD"
  | "design-doc";

export type AdapterId = "claude" | "codex" | "gemini" | "ollama";

export interface ModelRef {
  adapter: AdapterId;
  model: string; // e.g. "claude-opus-4-7"
}

export interface StageConfig {
  promptPath: string;
  model: ModelRef;
  maxTokens: number;
  targetRatio?: number; // optional hint for compressor
  timeoutMs?: number;
}

export interface ChecklistItem {
  id: string;
  fact: string;
  critical: boolean;
}

export abstract class CompressionScenario {
  abstract id: string;
  abstract name: string;

  abstract sourcePath: string;
  abstract documentClass: DocumentClass;

  abstract compress: StageConfig;
  abstract decompress: StageConfig;

  /** YAML file with ChecklistItem[]. Loaded by runner. */
  abstract checklistPath: string;

  totalTimeoutMs = 600_000;

  /** Override for ad-hoc judge model (default: cross-family of compressor). */
  judge?: ModelRef;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface StageResult {
  text: string;
  usage: TokenUsage;
  rawLog: string;
  durationMs: number;
}

export interface DocMetrics {
  chars: number;
  words: number;
  sentences: number;
  avgSentenceWords: number;
  newAbbreviations: string[]; // present in compressed but not in original
  undefinedAbbreviations: string[]; // new + not expanded inline
}

export interface RoundtripMetrics {
  original: DocMetrics;
  compressed: DocMetrics;
  restored: DocMetrics;
  compressionRatio: number; // compressed.chars / original.chars
  decompressionRatio: number; // restored.chars / original.chars
  totalCostUsd: number;
  totalDurationMs: number;
}

export interface JudgeVerdict {
  itemId: string;
  pass: boolean;
  reason: string;
  evidenceQuote: string;
}

export interface JudgeReport {
  factRetention: JudgeVerdict[]; // graded against restored
  invented: JudgeVerdict[]; // facts in restored absent from original
  factRetentionPct: number;
  criticalRetentionPct: number;
  inventionCount: number;
}

export interface RunReport {
  scenarioId: string;
  metrics: RoundtripMetrics;
  judge: JudgeReport;
  artefactsDir: string;
}
