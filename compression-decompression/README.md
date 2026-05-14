# Compression / Decompression Benchmark

Round-trip benchmark for technical-document compression and decompression by LLMs. Measures how much
information survives a `compress(original) → decompress(compressed) → restored` cycle, and how dense
/ readable the intermediate compressed form is.

## Motivation

Project documentation (SRS / SDS / design notes) often follows a compressed style to fit the AI
agent context window. Open question: does aggressive compression lose facts, invent abbreviations
the next reader cannot decode, or distort technical claims? This benchmark quantifies the trade-off.

## Goals

- Measure **fact preservation** through a compress→decompress round-trip.
- Measure **compression ratio** (chars / tokens / words).
- Measure **abbreviation density** of compressed output (new acronyms, undefined tokens).
- Compare **styles** (no instruction, "be concise", full compressed-style ruleset, custom prompts).
- Compare **models** (Claude Opus / Sonnet / Haiku, GPT-4o, Gemini Pro, etc.).
- Compare **document classes** (SRS, SDS, ADRs, runbooks, READMEs, post-mortems).

## Results

Retained runs copied to `results/`:

| Date | Scenario | Overall facts | Critical facts | Inventions | Compression ratio | Decompression ratio | Evidence |
|------|----------|--------------:|---------------:|-----------:|------------------:|--------------------:|----------|
| 2026-05-13 | `adr-record-decision--compressed-style--claude` | 100% | 100% | 0 | 0.713 | 1.635 | [md](results/2026-05-13-1119-compression-adr-record-decision.md) + [json](results/2026-05-13-1119-compression-adr-record-decision.json) |
| 2026-05-12 | `adr-record-decision--compressed-style--claude` | 100% | 100% | 0 | 0.713 | 1.635 | [md](results/2026-05-12-0152-compression-adr-record-decision.md) + [json](results/2026-05-12-0152-compression-adr-record-decision.json) |

Both retained artifacts report the same metrics for this scenario/style/model combination. This is
evidence for the named scenario only, not a broad compression benchmark matrix.

## Non-goals

- Generating new content (only compressing/decompressing existing).
- Code-only inputs (use `../code` for that).
- Translation — input and output are the same language.

## Architecture

Patterned after the `flowai` benchmark runner (Deno + TS, scenario-as-module, adapter layer, LLM
judge, cache). Each scenario is a self-contained `mod.ts` exporting a `CompressionScenario`
instance. A scenario describes input text, prompts, target ratio, and a fact-checklist. The runner
executes both stages, the judge scores survival of facts on the restored text, and per-stage metrics
are persisted.

```
                             ┌───────────────────────┐
                scenario ──▶ │       Runner          │
(mod.ts)                      └───────────┬───────────┘
                                          │
      original.md ─┐         ┌────────────┴────────────┐
                   ▼         ▼                         ▼
             ┌──────────┐  ┌──────────┐         ┌────────────┐
             │ compress │─▶│ artefact │────────▶│ decompress │
             │ adapter  │  │  store   │         │  adapter   │
             └──────────┘  └──────────┘         └─────┬──────┘
                   │             ▲                    │
                   ▼             │                    ▼
               metrics          cache             restored.md
                   │                                  │
                   └──────────────┬───────────────────┘
                                  ▼
                            ┌───────────┐
                            │ LLM Judge │
                            │ (fact-Δ)  │
                            └─────┬─────┘
                                  ▼
                              report.json + report.md
```

## Directory layout

```
benchmarks/compression-decompression/
├── README.md                 # this file
├── deno.json                 # tasks: bench, check, test
├── lib/
│   ├── types.ts              # CompressionScenario, ChecklistItem, ...
│   ├── runner.ts             # two-stage runner
│   ├── adapters/             # one file per LLM CLI
│   │   ├── claude.ts
│   │   ├── codex.ts          # OpenAI codex / GPT-4o
│   │   ├── gemini.ts
│   │   └── mod.ts
│   ├── judge.ts              # LLM-judged fact-survival
│   ├── metrics.ts            # ratio, abbreviation density, sentence length
│   ├── cache.ts              # round-trip cache (keyed by src hash + prompts + model)
│   ├── llm.ts                # shared LLM CLI wrapper
│   ├── usage.ts              # token & cost accounting
│   ├── format_logs.ts        # render run artefacts
│   └── utils.ts
├── scenarios/                # scenarios live here
│   ├── srs-flowai-full/
│   │   ├── mod.ts
│   │   ├── fixture/original.md
│   │   └── checklist.yaml
│   ├── sds-flowai-full/
│   ├── adr-record-decision/
│   ├── postmortem-incident-2026-03-12/
│   ├── runbook-deno-deploy/
│   └── readme-public-overview/
├── prompts/                  # reusable system prompts
│   ├── compress.compressed-style.md
│   ├── compress.concise.md
│   ├── compress.naive.md
│   └── decompress.faithful.md
├── runs/                     # one dir per run, gitignored
│   └── latest/<scenario-id>/run-1/
└── cache/                    # round-trip cache, gitignored
```

## Scenario format

Mirrors the flowai pattern (`BenchmarkScenario` → `mod.ts` exporting a class instance). One scenario
= one source document × one compression style × one decompression style. To compare matrices (style
× model × document), generate scenario instances or pass matrix flags to the runner.

```ts
// scenarios/srs-flowai-full/mod.ts
import { CompressionScenario } from "@bench/types.ts";

export const Scenario = new class extends CompressionScenario {
  id = "srs-flowai-full--compressed-style--claude-opus";
  name = "flowai SRS, full compressed-style, Claude Opus";

  // Stage 1 input
  sourcePath = "scenarios/srs-flowai-full/fixture/original.md";
  documentClass = "SRS"; // SRS | SDS | ADR | runbook | readme | postmortem

  // Stage 1: compression
  compress = {
    promptPath: "prompts/compress.compressed-style.md",
    model: "claude-opus-4-7",
    targetRatio: 0.4, // optional hint to the model; not enforced
    maxTokens: 16_000,
  };

  // Stage 2: decompression
  // NOTE: decompressor MUST NOT see the original. Different model encouraged
  // (cross-model decoding stresses abbreviation clarity).
  decompress = {
    promptPath: "prompts/decompress.faithful.md",
    model: "claude-sonnet-4-6",
    maxTokens: 32_000,
  };

  // Fact checklist used by the judge against the RESTORED text.
  // Each fact is a binary claim. Source: hand-authored from the original
  // OR auto-extracted by a one-shot fact-extraction pass (then human-reviewed).
  checklistPath = "scenarios/srs-flowai-full/checklist.yaml";

  // Optional structural assertions on the COMPRESSED text.
  compressedAssertions = {
    minRatio: 0.2, // restored ≥ original × 0.2 => compression too aggressive
    maxRatio: 0.7, // not actually compressing
    maxNewUndefinedAbbreviations: 5, // see metrics.ts
  };

  totalTimeoutMs = 600_000;
}();
```

### Checklist file (`checklist.yaml`)

Hand-authored facts that MUST be recoverable from the restored text. Each item is binary (pass/fail)
and judged by the LLM judge against the restored output only.

```yaml
- id: requirement-numbering-2-levels
  fact: "SRS requirements use exactly 2 levels: FR-x and FR-x.y. No FR-x.y.z."
  critical: true

- id: status-markers
  fact: "Status markers are [x] for implemented and [ ] for pending."
  critical: true

- id: traceability-code-evidence
  fact: "Code-evidenced criteria require // FR-<ID> or # FR-<ID> comments near implementing logic."
  critical: true

- id: acceptance-as-gate
  fact: "Every FR declares a runnable Acceptance reference (benchmark id, test path::name, command, or 'manual — <reviewer>')."
  critical: true

# … one item per atomic fact in the source document
```

## Two-stage runner

```
1. Resolve source file → compute SHA-256 → cache key.
2. Cache hit → load (compressed, restored, metrics) → skip to judge?
   Cache hit including judge → skip everything → emit report.
3. Stage 1 (compress):
     a. Render system prompt (compress.promptPath) + user-message: original.
     b. Spawn `compress.model` via adapter, capture output as `compressed.md`.
     c. Compute structural metrics on `compressed.md` (see Metrics).
     d. Apply `compressedAssertions`. Hard-fail on violation (skip stage 2).
4. Stage 2 (decompress):
     a. Spawn `decompress.model` with prompt + `compressed.md` ONLY (no original!).
     b. Capture output as `restored.md`.
5. Judge:
     a. Pass `restored.md` + `checklistPath` → LLM judge.
     b. Per item: { pass: bool, reason: string, evidence_quote: string }.
6. Emit run artefacts:
     run-N/
       original.md
       compressed.md
       restored.md
       metrics.json     # ratios, abbrev density, timing, tokens, cost
       judge.json       # per-item verdicts
       report.md        # human-readable summary
       transcript.log   # raw adapter stdout/stderr
7. Update cache.
```

## Metrics

Defined in `lib/metrics.ts`. Computed per artefact (original, compressed, restored).

- **chars / words / sentences** — raw size.
- **avg sentence length** — readability signal.
- **compression ratio** — `compressed.chars / original.chars`. Target band 0.3–0.6.
- **decompression ratio** — `restored.chars / original.chars`. Target near 1.0.
- **fact retention %** — `passed_checklist / total_checklist`. Primary score.
- **fact retention % (critical only)** — primary gate.
- **new abbreviation count** — uppercase tokens in compressed output that do NOT appear in the
  original AND are not in the industry stoplist (RFC2119, IDE, JSON, ...). See `audit-docs-abbr.ts`
  in flowai for the classifier.
- **undefined abbreviation count** — new abbreviations not expanded inline `(Full Form)` or in a
  glossary section.
- **decompression collision rate** — facts that the decompressor invented (false positives): claims
  in restored that were absent in the original. Judged separately.
- **token usage** — input/output tokens per stage; cost in USD via the adapter's price table.

## Judge

Single-call LLM grader (similar to flowai's `judge.ts`). Receives:

- the user's compression intent (prompt summary),
- the restored text only (NOT the compressed, NOT the original),
- the fact checklist.

Returns one verdict per checklist item: `{ pass, reason, evidence_quote }`. The judge model SHOULD
be different from both the compressor and the decompressor to avoid same-family bias. Default:
GPT-4o or Gemini Pro when compressor/decompressor are Claude.

A second judge pass scores **invented facts** in restored (collision rate): the judge is asked to
flag any technical claim in `restored.md` that has no support in `original.md`. This pass needs the
original.

## Adapters

One adapter per CLI, mirroring `flowai/scripts/benchmarks/lib/adapters/`. Required surface:

```ts
export interface CompressionAdapter {
  id: "claude" | "codex" | "gemini" | "ollama";
  // One-shot: send system prompt + user message, return assistant output.
  complete(opts: {
    systemPrompt: string;
    userMessage: string;
    model: string;
    maxTokens: number;
    timeoutMs: number;
  }): Promise<{ text: string; usage: TokenUsage; rawLog: string }>;
}
```

Reuse the OAuth/Keychain isolation trick from `flowai/scripts/benchmarks/lib/adapters/claude.ts`
(`HOME=<workDir>/bench-home`) for Claude CLI runs, otherwise user-level skill/config drift
contaminates the run.

## Cache

`lib/cache.ts`. Key:

```
sha256(
  scenario.id |
  source_sha256 |
  compress.model |
  compress.prompt_sha |
  decompress.model |
  decompress.prompt_sha |
  judge.model
)
```

Value: `{ compressed.md, restored.md, metrics.json, judge.json }`. A scenario re-run with identical
inputs is a cache hit. Editing any prompt or bumping a model invalidates.

## Tasks (`deno.json`)

```json
{
  "tasks": {
    "bench": "deno run -A scripts/bench.ts",
    "bench-only": "deno run -A scripts/bench.ts -f",
    "report": "deno run -A scripts/report.ts runs/latest",
    "test": "deno test -A lib/",
    "check": "deno fmt --check && deno lint && deno test -A lib/"
  }
}
```

CLI:

- `deno task bench` — run all scenarios.
- `deno task bench-only <substring>` — last-wins single substring filter (matches flowai semantics).
- `deno task bench --models=claude-opus,claude-sonnet --styles=compressed,concise` — matrix mode:
  cartesian product over scenario × model × style.
- `deno task report runs/latest` — render aggregate report (table per scenario × style × model).

## Scoring

Per scenario per (style, model, judge):

- **PASS** iff: critical-fact retention = 100% AND compression ratio in `[minRatio, maxRatio]` AND
  new-undefined-abbreviation count ≤ `maxNewUndefinedAbbreviations`.
- **WARN**: critical retention 100% but soft assertions violated.
- **FAIL**: any critical fact missing OR compressed text shorter than the configured floor.

Aggregate (one report row per `style`):

- mean fact retention %
- mean compression ratio
- mean undefined-abbreviation count
- mean cost USD
- pass / warn / fail counts

## Initial scenario set (proposed)

- `srs-flowai-full` — flowai SRS (the live `documents/requirements.md`, ~165 KB).
- `sds-flowai-full` — flowai SDS.
- `adr-record-decision` — short ADR template (≤ 5 KB).
- `postmortem-incident` — multi-section postmortem (~25 KB).
- `runbook-deno-deploy` — operational runbook (~10 KB).
- `readme-public-overview` — public-facing README (~15 KB).
- `prd-feature-launch` — product spec.
- `architecture-design-ml-pipeline` — long-form design doc.

For each: × 4 styles (`naive`, `concise`, `compressed-style`, `glossary-first`) × 3 compressors × 2
decompressors = 192 runs initial matrix.

## Hypotheses to test (so the benchmark has direction)

- H1: Heavier compression style (`compressed-style`) reduces critical-fact retention vs `concise` by
  ≥ 10 percentage points on documents > 50 KB.
- H2: Cross-model decompression (Claude→GPT) loses more facts than same-family (Claude→Claude),
  revealing model-specific abbreviation conventions.
- H3: Explicit glossary requirement (`glossary-first` style) restores fact retention to within 2 pp
  of `concise` while keeping compression ratio under 0.5.
- H4: Sentence-length expansion in compressed output (avg > 35 words) correlates with decompression
  invention rate (collision % rises).

## Out-of-scope (v1)

- Multi-turn refinement (compressor cannot ask the human / judge questions).
- Lossy-but-acceptable compressions (binary fact judging only; partial credit deferred to v2).
- Streaming or interactive runs.
- Non-text artefacts (Mermaid → image, code blocks beyond first line preservation).

## Open questions

- Authoring the fact checklist by hand is expensive on large docs. Consider an offline two-pass
  extraction with reviewer sign-off, persisted as `checklist.yaml`. Versioning rule: bumping
  `original.md` SHA invalidates the checklist until re-approved.
- Should the judge see `metrics.json` (e.g. compression ratio) when scoring? Probably no — keeps
  fact retention orthogonal to ratio.
- License of source documents — only put OSS / own docs into `scenarios/*/fixture/`; everything else
  stays out-of-tree and is referenced by absolute path.

## Definition of Done (for the benchmark itself)

- [ ] `lib/types.ts` defines `CompressionScenario`, `ChecklistItem`, `Metrics`, `JudgeVerdict`.
- [ ] `lib/runner.ts` runs the two-stage pipeline end-to-end and emits the `run-N/` directory
      exactly as specified above. **Test:**
      `lib/runner_test.ts::runs_two_stages_and_emits_artefacts`.
- [ ] `lib/adapters/{claude,codex,gemini}.ts` each pass an integration smoke test against a 200-byte
      fixture. **Test:** `lib/adapters/<id>_test.ts::smoke`.
- [ ] `lib/judge.ts` returns a verdict for every checklist item, with `evidence_quote` citing a
      substring present in the restored text. **Test:** `lib/judge_test.ts::cites_restored_only`.
- [ ] `lib/metrics.ts` reproduces the abbreviation classifier from flowai's `audit-docs-abbr.ts`.
      **Test:** `lib/metrics_test.ts::flags_undefined_abbreviations`.
- [ ] `lib/cache.ts` is keyed on the exact tuple above; prompt-edit invalidates. **Test:**
      `lib/cache_test.ts::prompt_edit_invalidates`.
- [ ] `scenarios/srs-flowai-full/` runs to completion under all four styles using Claude Opus as
      compressor. **Evidence:** `runs/latest/srs-flowai-full--*/report.md` exists with non-empty
      judge verdicts.
- [ ] `deno task report` renders an aggregate table grouped by style × model. **Evidence:**
      `deno task report runs/latest | head` shows the table.
- [ ] `deno task check` passes (fmt + lint + tests).
