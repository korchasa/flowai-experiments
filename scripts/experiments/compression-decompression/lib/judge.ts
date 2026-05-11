import type { ChecklistItem, JudgeReport, JudgeVerdict, ModelRef } from "./types.ts";
import { getAdapter } from "./adapters/mod.ts";

const RETENTION_PROMPT = `
# ROLE
You are an impartial automated auditor for a document compression benchmark.

# TASK
For each fact in the checklist, decide whether the fact is recoverable from the
RESTORED text alone. You do NOT see the original or the compressed form.

# RULES
- "pass": true iff a careful reader of the restored text could state the fact
  using only the restored text, without external knowledge.
- "evidence_quote": a verbatim substring from the restored text that supports
  your verdict (or empty if pass=false).
- Be strict. If the fact requires inference beyond what is written, fail it.

# OUTPUT
Return a JSON array of { itemId, pass, reason, evidenceQuote } — one per item, in input order.
`.trim();

const INVENTION_PROMPT = `
# ROLE
You audit a document round-trip for INVENTED facts.

# TASK
Given the ORIGINAL text and the RESTORED text, list every technical claim
present in RESTORED that has NO support in ORIGINAL.

# RULES
- Only flag claims that could be verified or refuted by reading. Skip stylistic
  changes, reordering, paraphrasing.
- Each invention must include a quote from RESTORED.

# OUTPUT
JSON array of { itemId: "invent-N", pass: false, reason, evidenceQuote }.
Empty array means no inventions.
`.trim();

function defaultJudgeModel(compressorAdapter: string): ModelRef {
  // Cross-family rule: if compressor is Claude → judge with codex. Otherwise Claude.
  return compressorAdapter === "claude"
    ? { adapter: "codex", model: "gpt-4o" }
    : { adapter: "claude", model: "claude-opus-4-7" };
}

export async function judgeRoundtrip(args: {
  original: string;
  restored: string;
  checklist: ChecklistItem[];
  compressorAdapterId: string;
  judge?: ModelRef;
}): Promise<JudgeReport> {
  const judgeModel = args.judge ?? defaultJudgeModel(args.compressorAdapterId);
  const adapter = getAdapter(judgeModel.adapter);

  // Pass 1: fact retention against restored only.
  const retentionUserMsg = JSON.stringify({
    restored: args.restored,
    checklist: args.checklist.map((c) => ({ itemId: c.id, fact: c.fact })),
  });
  const retentionResp = await adapter.complete({
    systemPrompt: RETENTION_PROMPT,
    userMessage: retentionUserMsg,
    model: judgeModel.model,
    maxTokens: 8000,
    timeoutMs: 120_000,
  });
  const retention = parseVerdicts(retentionResp.text);

  // Pass 2: invention detection.
  const inventionUserMsg = JSON.stringify({
    original: args.original,
    restored: args.restored,
  });
  const inventionResp = await adapter.complete({
    systemPrompt: INVENTION_PROMPT,
    userMessage: inventionUserMsg,
    model: judgeModel.model,
    maxTokens: 8000,
    timeoutMs: 120_000,
  });
  const invented = parseVerdicts(inventionResp.text);

  const totalCritical = args.checklist.filter((c) => c.critical).length;
  const passedCritical = retention.filter((v) => {
    const item = args.checklist.find((c) => c.id === v.itemId);
    return item?.critical && v.pass;
  }).length;
  const factRetentionPct = retention.length
    ? (retention.filter((v) => v.pass).length / retention.length) * 100
    : 0;
  const criticalRetentionPct = totalCritical ? (passedCritical / totalCritical) * 100 : 100;

  return {
    factRetention: retention,
    invented,
    factRetentionPct: Math.round(factRetentionPct * 10) / 10,
    criticalRetentionPct: Math.round(criticalRetentionPct * 10) / 10,
    inventionCount: invented.length,
  };
}

function parseVerdicts(raw: string): JudgeVerdict[] {
  // Strip code fences if present.
  const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.map((v) => ({
      itemId: String(v.itemId ?? v.id ?? ""),
      pass: Boolean(v.pass),
      reason: String(v.reason ?? ""),
      evidenceQuote: String(v.evidenceQuote ?? v.evidence_quote ?? ""),
    }));
  } catch {
    return [];
  }
}
