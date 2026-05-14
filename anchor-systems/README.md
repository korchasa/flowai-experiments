# Anchor Systems Benchmark

Empirical study of how anchor/link systems in technical documentation affect AI agent navigation.
Compares five linking strategies across five task types on a synthetic Auth Service project.

## Motivation

AI agents consuming project documentation need to follow cross-references reliably. The choice of
linking system (plain Markdown paths, Wikilinks, Zettelkasten UIDs, or SALP tokens) directly affects
how deterministically an agent can extract, traverse, and verify the reference graph. This benchmark
produces numeric evidence: does explicit tokenisation (`[ANC:ns:id]`) outperform path-based links
for AI navigation, and by how much?

## Systems Under Test

- **native** — standard Markdown links `[text](file.md#heading-slug)`. Path + heading coupling.
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
| `rag-noise` | 7 | Identify anchored function amid N noise functions | Pass if check_strength named, no noise fn named | system × noise_count |

## Fixture Structure

```
fixtures/
  ground-truth.json          — canonical ground truth (20 anchors, 31 refs, chains, targets, salp_short_ids map)
  salp/                      — 19 files: SALP syntax ([ANC:ns:id] / [REF:ns:id])
  salp-short/                — 19 files: simplified SALP ([ANC:id] / [REF:id], no namespace)
  native/                    — 19 files: Markdown heading links
  wikilinks/                 — 19 files: ^block-id / [[file#^block-id]]
  zettelkasten/              — 19 files: **UID: 2026051210NN** timestamps
```

Each system directory contains the same synthetic Auth Service docs rewritten in that system's syntax:
- 15 Markdown docs: `overview.md auth.md session.md token.md mfa.md password.md lockout.md audit.md rbac.md oauth.md refresh.md revocation.md ratelimit.md recovery.md glossary.md`
- 4 Python files: `auth_service.py password_utils.py session_store.py test_auth.py`

Key structural invariants (identical across all systems):
- `auth_service.py`: `generate_reset_token()` at lines 7–18 (anchor on line 8)
- `password_utils.py`: `check_strength()` anchored, plus `check_history check_complexity check_format` as noise

## Running

```sh
# All systems, 5 reps (via @korchasa/ai-ide-cli; OpenCode defaults from config.json)
deno task experiment anchor-systems --variant mapping
deno task experiment anchor-systems --variant boundary
deno task experiment anchor-systems --variant multi-hop
deno task experiment anchor-systems --variant linting
deno task experiment anchor-systems --variant rag-noise

# Full suite wrapper (defaults to --ide opencode)
deno task experiment:anchor-systems

# Single system, 1 rep, dry-run (no API calls)
deno task experiment anchor-systems --variant mapping --dry-run --axis system=salp --reps 1

# Specific noise level
deno task experiment anchor-systems --variant rag-noise --axis noise_count=9 --reps 3
```

## Ground Truth

See `fixtures/ground-truth.json` for the complete reference graph. Key targets:

- **multi-hop chains**:
  - shallow (1 hop): auth.md → session timeout rule
  - medium (2 hops): session.md → mfa.md → OTP window
  - deep (3 hops): session.md → mfa.md → ratelimit.md → session OTP TTL
- **boundary**: `generate_reset_token` in `auth_service.py`, lines 7–18
- **noise target**: `sec:password-strength` / `check_strength()`, distractors: `check_history check_complexity check_format`
- **anomalies**: `duplicate_anchor` (db:user-schema), `orphaned_ref` (api:oauth-callback), `shadowed_anchor` (legacy:md5-hash)

## Running

```sh
deno task experiment anchor-systems --variant mapping --ide opencode
deno task experiment anchor-systems --variant rag-noise --ide opencode
```

## Results

Retained OpenCode sweep, `reps=5`, seed `1`.

| Variant | Result | Model | IDE | Judge | Trials | Duration |
|---------|--------|-------|-----|-------|--------|----------|
| `mapping` | [md](results/2026-05-13-2101-openai-gpt-5.4-mini-mapping.md) + [json](results/2026-05-13-2101-openai-gpt-5.4-mini-mapping.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 25 | 32.4 min |
| `boundary` | [md](results/2026-05-13-2134-openai-gpt-5.4-mini-boundary.md) + [json](results/2026-05-13-2134-openai-gpt-5.4-mini-boundary.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 25 | 14.3 min |
| `multi-hop` | [md](results/2026-05-13-2148-openai-gpt-5.4-mini-multi-hop.md) + [json](results/2026-05-13-2148-openai-gpt-5.4-mini-multi-hop.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 75 | 70.0 min |
| `linting` | [md](results/2026-05-13-2258-openai-gpt-5.4-mini-linting.md) + [json](results/2026-05-13-2258-openai-gpt-5.4-mini-linting.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 25 | 31.3 min |
| `rag-noise` | [md](results/2026-05-13-2329-openai-gpt-5.4-mini-rag-noise.md) + [json](results/2026-05-13-2329-openai-gpt-5.4-mini-rag-noise.json) | `openai/gpt-5.4-mini` | `opencode` | `openai/gpt-5.4` via `opencode` | 75 | 22.3 min |

### Adherence by Variant and System

| Variant | System | Adherence | Trials | Pass | Fail |
|---------|--------|-----------|--------|------|------|
| `mapping` | `native` | 0.0% | 5 | 0 | 5 |
| `mapping` | `wikilinks` | 60.0% | 5 | 3 | 2 |
| `mapping` | `zettelkasten` | 80.0% | 5 | 4 | 1 |
| `mapping` | `salp` | 80.0% | 5 | 4 | 1 |
| `mapping` | `salp-short` | 80.0% | 5 | 4 | 1 |
| `boundary` | `native` | 100.0% | 5 | 5 | 0 |
| `boundary` | `wikilinks` | 100.0% | 5 | 5 | 0 |
| `boundary` | `zettelkasten` | 100.0% | 5 | 5 | 0 |
| `boundary` | `salp` | 100.0% | 5 | 5 | 0 |
| `boundary` | `salp-short` | 80.0% | 5 | 4 | 1 |
| `multi-hop` | `native` | 13.3% | 15 | 2 | 13 |
| `multi-hop` | `wikilinks` | 13.3% | 15 | 2 | 13 |
| `multi-hop` | `zettelkasten` | 13.3% | 15 | 2 | 13 |
| `multi-hop` | `salp` | 40.0% | 15 | 6 | 9 |
| `multi-hop` | `salp-short` | 26.7% | 15 | 4 | 11 |
| `linting` | `native` | 20.0% | 5 | 1 | 4 |
| `linting` | `wikilinks` | 80.0% | 5 | 4 | 1 |
| `linting` | `zettelkasten` | 60.0% | 5 | 3 | 2 |
| `linting` | `salp` | 100.0% | 5 | 5 | 0 |
| `linting` | `salp-short` | 60.0% | 5 | 3 | 2 |
| `rag-noise` | `native` | 100.0% | 15 | 15 | 0 |
| `rag-noise` | `wikilinks` | 100.0% | 15 | 15 | 0 |
| `rag-noise` | `zettelkasten` | 93.3% | 15 | 14 | 1 |
| `rag-noise` | `salp` | 100.0% | 15 | 15 | 0 |
| `rag-noise` | `salp-short` | 100.0% | 15 | 15 | 0 |

### Multi-Hop by Target

| System | Target | Adherence | Trials | Pass | Fail |
|--------|--------|-----------|--------|------|------|
| `native` | `shallow` | 0.0% | 5 | 0 | 5 |
| `native` | `medium` | 0.0% | 5 | 0 | 5 |
| `native` | `deep` | 40.0% | 5 | 2 | 3 |
| `wikilinks` | `shallow` | 20.0% | 5 | 1 | 4 |
| `wikilinks` | `medium` | 0.0% | 5 | 0 | 5 |
| `wikilinks` | `deep` | 20.0% | 5 | 1 | 4 |
| `zettelkasten` | `shallow` | 0.0% | 5 | 0 | 5 |
| `zettelkasten` | `medium` | 0.0% | 5 | 0 | 5 |
| `zettelkasten` | `deep` | 40.0% | 5 | 2 | 3 |
| `salp` | `shallow` | 60.0% | 5 | 3 | 2 |
| `salp` | `medium` | 0.0% | 5 | 0 | 5 |
| `salp` | `deep` | 60.0% | 5 | 3 | 2 |
| `salp-short` | `shallow` | 40.0% | 5 | 2 | 3 |
| `salp-short` | `medium` | 0.0% | 5 | 0 | 5 |
| `salp-short` | `deep` | 40.0% | 5 | 2 | 3 |

### RAG Noise by Noise Count

| System | Noise count | Adherence | Trials | Pass | Fail |
|--------|-------------|-----------|--------|------|------|
| `native` | 3 | 100.0% | 5 | 5 | 0 |
| `native` | 6 | 100.0% | 5 | 5 | 0 |
| `native` | 9 | 100.0% | 5 | 5 | 0 |
| `wikilinks` | 3 | 100.0% | 5 | 5 | 0 |
| `wikilinks` | 6 | 100.0% | 5 | 5 | 0 |
| `wikilinks` | 9 | 100.0% | 5 | 5 | 0 |
| `zettelkasten` | 3 | 100.0% | 5 | 5 | 0 |
| `zettelkasten` | 6 | 80.0% | 5 | 4 | 1 |
| `zettelkasten` | 9 | 100.0% | 5 | 5 | 0 |
| `salp` | 3 | 100.0% | 5 | 5 | 0 |
| `salp` | 6 | 100.0% | 5 | 5 | 0 |
| `salp` | 9 | 100.0% | 5 | 5 | 0 |
| `salp-short` | 3 | 100.0% | 5 | 5 | 0 |
| `salp-short` | 6 | 100.0% | 5 | 5 | 0 |
| `salp-short` | 9 | 100.0% | 5 | 5 | 0 |

## Corrected Logic Checks

Last verified on 2026-05-13 with `deno test -A anchor-systems/shared_test.ts`: 5 passed, 0 failed.

| Check | Protects |
|-------|----------|
| `ground truth references match SALP fixture refs` | Prevents missing or extra reference entries in `ground-truth.json`. |
| `mapping judge uses system surface identifiers` | Prevents judging Native Markdown, Wikilinks, and Zettelkasten against SALP-only IDs. |
| `boundary judge requires inclusive IoU` | Prevents broad ranges from passing without meeting the actual IoU threshold. |
| `multi-hop judge lists expected anchor chain` | Prevents file-path chains from being treated as anchor chains. |
| `corrupted fixtures are system-specific` | Prevents linting from measuring SALP familiarity under every system label. |
