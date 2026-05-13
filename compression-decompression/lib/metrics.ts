import type { DocMetrics, RoundtripMetrics, StageResult, TokenUsage } from "./types.ts";

const RFC2119 = new Set([
  "MUST",
  "MUST-NOT",
  "SHOULD",
  "SHOULD-NOT",
  "MAY",
  "SHALL",
  "REQUIRED",
  "OPTIONAL",
  "NOT",
]);
const INDUSTRY = new Set([
  "AI",
  "API",
  "CLI",
  "IDE",
  "JSON",
  "YAML",
  "TOML",
  "HTML",
  "CSS",
  "URL",
  "URI",
  "HTTP",
  "HTTPS",
  "CI",
  "CD",
  "PR",
  "SHA",
  "MD",
  "ID",
  "FS",
  "OS",
  "UX",
  "UI",
  "PID",
  "TLS",
  "SSH",
  "JSR",
  "NPM",
  "JS",
  "TS",
  "ANSI",
  "NDJSON",
  "TDD",
  "MCP",
  "LLM",
  "ADR",
  "SDK",
  "README",
  "AGENTS",
  "SKILL",
  "GFM",
  "PRD",
  "SRS",
  "SDS",
]);
const STOPLIST = new Set([
  "I",
  "A",
  "AN",
  "THE",
  "OR",
  "AND",
  "OF",
  "TO",
  "IN",
  "ON",
  "AT",
  "BY",
  "AS",
  "IS",
  ...RFC2119,
  ...INDUSTRY,
]);

const ABBR_RE = /\b[A-Z][A-Z0-9]{1,5}(?:-[A-Z0-9]+)*\b/g;

/** Tokens that look like abbreviations after stoplist filtering. */
export function extractAbbrevs(text: string): Set<string> {
  const out = new Set<string>();
  // Strip code spans first — they're noise here.
  const cleaned = text.replace(/`[^`]*`/g, "").replace(/```[\s\S]*?```/g, "");
  for (const m of cleaned.matchAll(ABBR_RE)) {
    const t = m[0];
    if (STOPLIST.has(t)) continue;
    if (/^\d+$/.test(t)) continue;
    out.add(t);
  }
  return out;
}

/** True iff `token` is expanded inline somewhere in `text`. */
export function isExpanded(text: string, token: string): boolean {
  const a = new RegExp(`[A-Za-z][A-Za-z ]+\\s*\\(${token}\\)`).test(text);
  const b = new RegExp(`${token}\\s*\\([A-Za-z][A-Za-z ,\\-]+\\)`).test(text);
  return a || b;
}

export function computeDocMetrics(text: string, originalAbbrevs?: Set<string>): DocMetrics {
  const chars = text.length;
  const words = text.split(/\s+/).filter((w) => /\w/.test(w)).length;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).filter((s) => s.trim()).length;
  const avgSentenceWords = sentences ? words / sentences : 0;

  const abbrevs = extractAbbrevs(text);
  const isCompressed = originalAbbrevs !== undefined;
  const newAbbreviations: string[] = [];
  const undefinedAbbreviations: string[] = [];
  if (isCompressed) {
    for (const t of abbrevs) {
      if (originalAbbrevs!.has(t)) continue;
      newAbbreviations.push(t);
      if (!isExpanded(text, t)) undefinedAbbreviations.push(t);
    }
  }

  return {
    chars,
    words,
    sentences,
    avgSentenceWords: Math.round(avgSentenceWords * 10) / 10,
    newAbbreviations,
    undefinedAbbreviations,
  };
}

export function combineUsage(...stages: TokenUsage[]): TokenUsage {
  return {
    inputTokens: stages.reduce((s, x) => s + x.inputTokens, 0),
    outputTokens: stages.reduce((s, x) => s + x.outputTokens, 0),
    costUsd: stages.reduce((s, x) => s + x.costUsd, 0),
  };
}

export function buildRoundtripMetrics(
  original: string,
  compress: StageResult,
  decompress: StageResult,
): RoundtripMetrics {
  const originalAbbrevs = extractAbbrevs(original);
  const originalMetrics = computeDocMetrics(original);
  const compressedMetrics = computeDocMetrics(compress.text, originalAbbrevs);
  const restoredMetrics = computeDocMetrics(decompress.text);

  return {
    original: originalMetrics,
    compressed: compressedMetrics,
    restored: restoredMetrics,
    compressionRatio: compressedMetrics.chars / Math.max(originalMetrics.chars, 1),
    decompressionRatio: restoredMetrics.chars / Math.max(originalMetrics.chars, 1),
    totalCostUsd: compress.usage.costUsd + decompress.usage.costUsd,
    totalDurationMs: compress.durationMs + decompress.durationMs,
  };
}
