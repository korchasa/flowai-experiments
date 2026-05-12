# Anchor Systems — Extraction & Mapping (Bench 1)

**Headline:** Mapping adherence — native=0% / salp=0% / salp-short=0% / wikilinks=0% / zettelkasten=0% (n=1/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-mapping`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 1
- **Seed:** 1
- **Started:** 2026-05-12T09:55:26.057Z
- **Finished:** 2026-05-12T10:00:44.727Z
- **Duration:** 5.3 min
- **Total trials:** 5

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| native | 0.0% | 1 | 0 | 1 |
| wikilinks | 0.0% | 1 | 0 | 1 |
| zettelkasten | 0.0% | 1 | 0 | 1 |
| salp | 0.0% | 1 | 0 | 1 |
| salp-short | 0.0% | 1 | 0 | 1 |

## Sample failures

- **system=native** (trial 0): All 20 anchor IDs use a completely different naming scheme (e.g., "mfa-requirement" vs "auth:mfa-required") that matches none of the ground truth IDs, meaning all anchors and their corresponding references are effectively missing or hallucinated, far exceeding the 3-entry tolerance; additionally, the response includes hallucinated reference entries (e.g., from "revocation.md") that do not exist in the ground truth.
- **system=wikilinks** (trial 0): The agent's response contains at least 7 hallucinated reference entries with source files (refresh.md, revocation.md, ratelimit.md, session_store.py) that do not exist in the ground truth references, which violates the explicit rule against hallucinated entries.
- **system=zettelkasten** (trial 0): The agent used entirely different numeric timestamp IDs (e.g., "202605121001") instead of the semantic IDs in the ground truth (e.g., "auth:session-timeout"), meaning none of the 20 anchors or 25+ references match the ground truth — all entries are hallucinated per the rule's criteria.
- **system=salp** (trial 0): The agent's output contains 5 hallucinated reference entries not present in the ground truth (mfa:sms-otp→ratelimit.md, auth:session-timeout→refresh.md, token:access-ttl→refresh.md, auth:session-timeout→session_store.py, audit:retention→session_store.py), which violates the explicit rule that hallucinated entries cause failure.
- **system=salp-short** (trial 0): The agent's output contains at least 10 hallucinated reference entries not present in the ground truth (e.g., access-ttl/overview.md, otp-window/overview.md, session-timeout/session.md, access-ttl/refresh.md, refresh-ttl/revocation.md, sms-otp/ratelimit.md, session-timeout/session_store.py, retention/session_store.py, etc.), which directly violates the rule that hallucinated entries cause a fail.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
