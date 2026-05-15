# Anchor Systems Benchmark

Empirical study of how anchor/link systems in technical documentation affect AI agent navigation.
Compares six linking strategies across five task types on a synthetic Auth Service project.

## Motivation

AI agents consuming project documentation need to follow cross-references reliably. The choice of
linking system (plain Markdown paths, Wikilinks, Zettelkasten UIDs, or SALP tokens) directly affects
how deterministically an agent can extract, traverse, and verify the reference graph. This benchmark
produces numeric evidence: does explicit tokenisation (`[ANC:ns:id]`) outperform path-based links
for AI navigation, and by how much?

## Systems Under Test

- **native** — standard Markdown links `[text](file.md#heading-slug)`. Path + heading coupling.
- **heading-refs** — ordinary Markdown headings as targets, referenced as `[file.md:Heading]`.
- **wikilinks** — block-anchors `^block-id` at paragraph tail, referenced as `[[file#^block-id]]`.
- **zettelkasten** — timestamp UIDs (`**UID: 202605121001**`) embedded in every anchor block.
- **salp** — explicit tokens `[ANC:namespace:id]` / `[REF:namespace:id | display]`. Path-free.
- **salp-short** — simplified SALP: `[ANC:id]` / `[REF:id | display]` (no namespace). Tests whether the namespace prefix adds navigational value or is noise.

## Variants

| Variant | Bench | Task | Metric | Axes |
|---------|-------|------|--------|------|
| `mapping` | 1 | Extract all 20 anchors + 31 refs → JSON | Pass if ≤ 3 missing | system |
| `boundary` | 2 | Identify line range of anchored function | Pass if IoU ≥ 0.8 with truth (lines 7–18) | system |
| `multi-hop` | 4 | Traverse 1–3 hops to answer semantic question | Pass if final anchor + intermediates named | system × target |
| `linting` | 6 | Detect 3 planted graph anomalies → JSON | Pass if ≥ 2/3 anomaly types found | system |
| `link-cost` | 7 | Compare natural file-qualified formats vs natural path-free formats | Token delta + adherence | system × operation |

## Fixture Structure

```
fixtures/
  ground-truth.json          — canonical ground truth (20 anchors, 31 refs, chains, targets, heading map)
  salp/                      — 19 files: SALP syntax ([ANC:ns:id] / [REF:ns:id])
  salp-short/                — 19 files: simplified SALP ([ANC:id] / [REF:id], no namespace)
  native/                    — 19 files: Markdown heading links
  heading-refs/              — 19 files: ordinary headings + [file.md:Heading] references
  wikilinks/                 — 19 files: ^block-id / [[file#^block-id]]
  zettelkasten/              — 19 files: **UID: 2026051210NN** timestamps
```

Each system directory contains the same synthetic Auth Service docs rewritten in that system's syntax:
- 15 Markdown docs: `overview.md auth.md session.md token.md mfa.md password.md lockout.md audit.md rbac.md oauth.md refresh.md revocation.md ratelimit.md recovery.md glossary.md`
- 4 Python files: `auth_service.py password_utils.py session_store.py test_auth.py`

Key structural invariants (identical across all systems):
- `auth_service.py`: `generate_reset_token()` at lines 7–18 (anchor on line 8)
- `password_utils.py`: password validation helpers including anchored `check_strength()`

## Running

```sh
# All systems, 5 reps (via @korchasa/ai-ide-cli; OpenCode defaults from config.json)
deno task experiment anchor-systems --variant mapping
deno task experiment anchor-systems --variant boundary
deno task experiment anchor-systems --variant multi-hop
deno task experiment anchor-systems --variant linting
deno task experiment anchor-systems --variant link-cost

# Full suite wrapper (defaults to --ide opencode)
deno task experiment:anchor-systems

# Single system, 1 rep, dry-run (no API calls)
deno task experiment anchor-systems --variant mapping --dry-run --axis system=salp --reps 1
deno task experiment anchor-systems --variant link-cost --dry-run --axis system=salp --axis operation=lookup --reps 1
```

## Ground Truth

See `fixtures/ground-truth.json` for the complete reference graph. Key targets:

- **multi-hop chains**:
  - shallow (1 hop): auth.md → session timeout rule
  - medium (2 hops): session.md → mfa.md → OTP window
  - deep (3 hops): session.md → mfa.md → ratelimit.md → session OTP TTL
- **boundary**: `generate_reset_token` in `auth_service.py`, lines 7–18
- **anomalies**: `duplicate_anchor` (db:user-schema), `orphaned_ref` (api:oauth-callback), `shadowed_anchor` (legacy:md5-hash)
- **link-cost**: `native`, `heading-refs`, and `wikilinks` use their natural file-qualified references; `zettelkasten`, `salp`, and `salp-short` use their natural path-free references

## Running

```sh
deno task experiment anchor-systems --variant mapping --ide opencode
```

## Results

Retained OpenCode sweeps, `reps=5`, seed `1`. The 2026-05-13 sweep covers the original five
formats. The 2026-05-14 incremental sweep covers the added `heading-refs` format for benches 1,
2, 4, and 6.

| Variant | Result | Model | IDE | Judge | Trials | Duration |
|---------|--------|-------|-----|-------|--------|----------|
| `mapping` | [md](results/2026-05-13-2101-openai-gpt-5.4-mini-mapping.md) + [json](results/2026-05-13-2101-openai-gpt-5.4-mini-mapping.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 25 | 32.4 min |
| `boundary` | [md](results/2026-05-13-2134-openai-gpt-5.4-mini-boundary.md) + [json](results/2026-05-13-2134-openai-gpt-5.4-mini-boundary.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 25 | 14.3 min |
| `multi-hop` | [md](results/2026-05-13-2148-openai-gpt-5.4-mini-multi-hop.md) + [json](results/2026-05-13-2148-openai-gpt-5.4-mini-multi-hop.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 75 | 70.0 min |
| `linting` | [md](results/2026-05-13-2258-openai-gpt-5.4-mini-linting.md) + [json](results/2026-05-13-2258-openai-gpt-5.4-mini-linting.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 25 | 31.3 min |
| `mapping` (`heading-refs`) | [md](results/2026-05-14-0821-openai-gpt-5.4-mini-mapping.md) + [json](results/2026-05-14-0821-openai-gpt-5.4-mini-mapping.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 5 | 6.8 min |
| `boundary` (`heading-refs`) | [md](results/2026-05-14-0828-openai-gpt-5.4-mini-boundary.md) + [json](results/2026-05-14-0828-openai-gpt-5.4-mini-boundary.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 5 | 1.7 min |
| `multi-hop` (`heading-refs`) | [md](results/2026-05-14-0829-openai-gpt-5.4-mini-multi-hop.md) + [json](results/2026-05-14-0829-openai-gpt-5.4-mini-multi-hop.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 15 | 13.7 min |
| `linting` (`heading-refs`) | [md](results/2026-05-14-0843-openai-gpt-5.4-mini-linting.md) + [json](results/2026-05-14-0843-openai-gpt-5.4-mini-linting.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 5 | 9.3 min |
| `link-cost` | [md](results/2026-05-15-0026-openai-gpt-5.4-mini-link-cost.md) + [json](results/2026-05-15-0026-openai-gpt-5.4-mini-link-cost.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 90 | 31.4 min |

### Link-Cost Summary

Token figures below are visible-text estimates: sent task prompt + final agent text only. They do
not include hidden runtime context, tool payloads, tool results, or file contents read by tools.

| Operation | File-qualified tokens | Path-free tokens | Delta | Ratio | File-qualified pass | Path-free pass |
|-----------|----------------------:|-----------------:|------:|------:|--------------------:|---------------:|
| `lookup` | 151 | 171 | +20 | 1.13x | 12/15 | 6/15 |
| `boundary` | 166 | 182 | +16 | 1.10x | 8/15 | 14/15 |
| `reference-hop` | 150 | 176 | +26 | 1.17x | 6/15 | 2/15 |

### Format Summary

Use this table to compare one anchor format across all task types. Values are adherence
(`pass/trials`).

| Format | Mapping | Boundary | Multi-hop | Linting |
|--------|--------:|---------:|----------:|--------:|
| `native` | 0.0% (0/5) | 100.0% (5/5) | 13.3% (2/15) | 20.0% (1/5) |
| `heading-refs` | 0.0% (0/5) | 100.0% (5/5) | 20.0% (3/15) | 0.0% (0/5) |
| `wikilinks` | 60.0% (3/5) | 100.0% (5/5) | 13.3% (2/15) | 80.0% (4/5) |
| `zettelkasten` | 80.0% (4/5) | 100.0% (5/5) | 13.3% (2/15) | 60.0% (3/5) |
| `salp` | 80.0% (4/5) | 100.0% (5/5) | 40.0% (6/15) | 100.0% (5/5) |
| `salp-short` | 80.0% (4/5) | 80.0% (4/5) | 26.7% (4/15) | 60.0% (3/5) |

### Format Details

#### `native`

| Task | Overall | Detail |
|------|--------:|--------|
| `mapping` | 0.0% (0/5) | system axis only |
| `boundary` | 100.0% (5/5) | system axis only |
| `multi-hop` | 13.3% (2/15) | shallow 0/5; medium 0/5; deep 2/5 |
| `linting` | 20.0% (1/5) | system axis only |

#### `heading-refs`

| Task | Overall | Detail |
|------|--------:|--------|
| `mapping` | 0.0% (0/5) | system axis only |
| `boundary` | 100.0% (5/5) | system axis only |
| `multi-hop` | 20.0% (3/15) | shallow 2/5; medium 0/5; deep 1/5 |
| `linting` | 0.0% (0/5) | system axis only |

#### `wikilinks`

| Task | Overall | Detail |
|------|--------:|--------|
| `mapping` | 60.0% (3/5) | system axis only |
| `boundary` | 100.0% (5/5) | system axis only |
| `multi-hop` | 13.3% (2/15) | shallow 1/5; medium 0/5; deep 1/5 |
| `linting` | 80.0% (4/5) | system axis only |

#### `zettelkasten`

| Task | Overall | Detail |
|------|--------:|--------|
| `mapping` | 80.0% (4/5) | system axis only |
| `boundary` | 100.0% (5/5) | system axis only |
| `multi-hop` | 13.3% (2/15) | shallow 0/5; medium 0/5; deep 2/5 |
| `linting` | 60.0% (3/5) | system axis only |

#### `salp`

| Task | Overall | Detail |
|------|--------:|--------|
| `mapping` | 80.0% (4/5) | system axis only |
| `boundary` | 100.0% (5/5) | system axis only |
| `multi-hop` | 40.0% (6/15) | shallow 3/5; medium 0/5; deep 3/5 |
| `linting` | 100.0% (5/5) | system axis only |

#### `salp-short`

| Task | Overall | Detail |
|------|--------:|--------|
| `mapping` | 80.0% (4/5) | system axis only |
| `boundary` | 80.0% (4/5) | system axis only |
| `multi-hop` | 26.7% (4/15) | shallow 2/5; medium 0/5; deep 2/5 |
| `linting` | 60.0% (3/5) | system axis only |

## Corrected Logic Checks

Last verified on 2026-05-15 with `deno test -A anchor-systems/shared_test.ts`: 6 passed, 0 failed.

| Check | Protects |
|-------|----------|
| `ground truth references match SALP fixture refs` | Prevents missing or extra reference entries in `ground-truth.json`. |
| `mapping judge uses system surface identifiers` | Prevents judging Native Markdown, Wikilinks, and Zettelkasten against SALP-only IDs. |
| `boundary judge requires inclusive IoU` | Prevents broad ranges from passing without meeting the actual IoU threshold. |
| `multi-hop judge lists expected anchor chain` | Prevents file-path chains from being treated as anchor chains. |
| `corrupted fixtures are system-specific` | Prevents linting from measuring SALP familiarity under every system label. |
| `link-cost uses each system's natural reference syntax` | Prevents the token-cost variant from inventing file-qualified SALP/Zettelkasten refs or path-free Wikilinks. |
