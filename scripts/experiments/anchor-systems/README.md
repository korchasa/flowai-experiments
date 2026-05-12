# Anchor Systems Benchmark

Empirical study of how anchor/link systems in technical documentation affect AI agent navigation.
Compares four linking strategies across five task types on a synthetic Auth Service project.

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
| `mapping` | 1 | Extract all 20 anchors + 25 refs → JSON | Pass if ≤ 3 missing (F₁ ≥ 0.85) | system |
| `boundary` | 2 | Identify line range of anchored function | Pass if IoU ≥ 0.8 with truth (lines 7–18) | system |
| `multi-hop` | 4 | Traverse 1–3 hops to answer semantic question | Pass if final anchor + intermediates named | system × target |
| `linting` | 6 | Detect 3 planted graph anomalies → JSON | Pass if ≥ 2/3 anomaly types found | system |
| `rag-noise` | 7 | Identify anchored function amid N noise functions | Pass if check_strength named, no noise fn named | system × noise_count |

## Fixture Structure

```
fixtures/
  ground-truth.json          — canonical ground truth (20 anchors, 25 refs, chains, targets, salp_short_ids map)
  salp/                      — 19 files: SALP syntax ([ANC:ns:id] / [REF:ns:id])
  salp-short/                — 19 files: simplified SALP ([ANC:id] / [REF:id], no namespace)
  native/                    — 19 files: Markdown heading links
  wikilinks/                 — 19 files: ^block-id / [[file#^block-id]]
  zettelkasten/              — 19 files: **UID: 2026051210NN** timestamps
  corrupted/                 — 19 files: SALP base + 3 planted anomalies
    (duplicate db:user-schema in session_store.py + auth.md)
    (orphaned [REF:api:oauth-callback] in oauth.md)
    (shadowed [ANC:legacy:md5-hash] in commented block in password.md)
```

Each system directory contains the same synthetic Auth Service docs rewritten in that system's syntax:
- 15 Markdown docs: `overview.md auth.md session.md token.md mfa.md password.md lockout.md audit.md rbac.md oauth.md refresh.md revocation.md ratelimit.md recovery.md glossary.md`
- 4 Python files: `auth_service.py password_utils.py session_store.py test_auth.py`

Key structural invariants (identical across all systems):
- `auth_service.py`: `generate_reset_token()` at lines 7–18 (anchor on line 8)
- `password_utils.py`: `check_strength()` anchored, plus `check_history check_complexity check_format` as noise

## Running

```sh
# All systems, 5 reps (live Claude CLI required)
deno task experiment anchor-systems --variant mapping
deno task experiment anchor-systems --variant boundary
deno task experiment anchor-systems --variant multi-hop
deno task experiment anchor-systems --variant linting
deno task experiment anchor-systems --variant rag-noise

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
deno task experiment anchor-systems --variant mapping --model claude-haiku-4-5
deno task experiment anchor-systems --variant rag-noise --model claude-haiku-4-5
```

## Hypothesis

SALP outperforms native/wikilinks/zettelkasten on all five tasks because:
1. `[ANC:...]` / `[REF:...]` are unambiguous token prefixes that trigger reliable attention.
2. SALP is path-free — no breakage on file moves.
3. Namespace+id structure provides semantic context without relying on heading text or file position.

salp-short vs salp comparison isolates the namespace contribution: if salp-short ≈ salp, namespaces are noise; if salp > salp-short, namespaces aid disambiguation.
