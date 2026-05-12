# Anchor Systems — Extraction & Mapping (Bench 1)

**Headline:** Mapping adherence — native=0% / salp=0% / salp-short=0% / wikilinks=0% / zettelkasten=0% (n=3/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-mapping`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 3
- **Seed:** 1
- **Started:** 2026-05-12T00:44:08.532Z
- **Finished:** 2026-05-12T00:59:33.791Z
- **Duration:** 15.4 min
- **Total trials:** 15

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| native | 0.0% | 3 | 0 | 3 |
| wikilinks | 0.0% | 3 | 0 | 3 |
| zettelkasten | 0.0% | 3 | 0 | 3 |
| salp | 0.0% | 3 | 0 | 3 |
| salp-short | 0.0% | 3 | 0 | 3 |

## Sample failures

- **system=native** (trial 0): The agent invented entirely different anchor/reference IDs (e.g., "session-timeout-policy" instead of "auth:session-timeout", "access-token-lifetime" instead of "token:access-ttl") — all 20 anchors and all 25 references use IDs not found in the ground truth, far exceeding the 3-entry tolerance, and the output also contains hallucinated references in source files like "revocation.md" and "session_store.py" that do not appear in the ground truth at all.
- **system=native** (trial 1): All 20 anchor IDs in the agent's response are hallucinated (e.g., "session-timeout-policy" instead of "auth:session-timeout", "mfa-requirement" instead of "auth:mfa-required"), and the agent also includes hallucinated references from a non-existent file "revocation.md", far exceeding the allowed 3 missing/wrong entries.
- **system=native** (trial 2): The agent invented a completely different ID naming scheme (e.g., "session-timeout-policy" instead of "auth:session-timeout"), hallucinated multiple anchor and reference entries (e.g., "expire_session", "test_lockout_duration", references from non-existent "revocation.md"), and is missing more than 3 ground truth entries in total — far exceeding the allowed 3-entry tolerance and violating the no-hallucination rule.
- **system=wikilinks** (trial 0): The agent's response contains at least 7 hallucinated reference entries not present in the ground truth (e.g., audit-retention→password.md, mfa-sms-otp→ratelimit.md, token-access-ttl→revocation.md, token-refresh-ttl→revocation.md, etc.), which violates the rule that hallucinated entries cause an automatic fail.
- **system=wikilinks** (trial 1): The agent's output contains 5 hallucinated reference entries (e.g., auth-session-timeout→refresh.md, mfa-sms-otp→ratelimit.md, audit-retention→session_store.py) that do not exist in the ground truth, which is an explicit fail condition per the rule.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 3. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
