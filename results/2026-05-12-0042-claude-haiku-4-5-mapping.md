# Anchor Systems — Extraction & Mapping (Bench 1)

**Headline:** Mapping adherence — salp=0% (n=1/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-mapping`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 1
- **Seed:** 1
- **Started:** 2026-05-12T00:42:59.239Z
- **Finished:** 2026-05-12T00:44:02.388Z
- **Duration:** 1.1 min
- **Total trials:** 1

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| salp | 0.0% | 1 | 0 | 1 |

## Sample failures

- **system=salp** (trial 0): The agent's response contains 7 hallucinated reference entries not present in the ground truth (e.g., auth:session-timeout→refresh.md, token:access-ttl→revocation.md, mfa:sms-otp→ratelimit.md, auth:session-timeout→session_store.py, etc.), which violates the rule that hallucinated entries cause an automatic fail.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
