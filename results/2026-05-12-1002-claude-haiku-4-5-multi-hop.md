# Anchor Systems — Multi-Hop Reasoning (Bench 4)

**Headline:** Multi-hop (deep) adherence — native=0% / wikilinks=0% / zettelkasten=100% / salp=100% / salp-short=100% (n=1/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-multi-hop`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 1
- **Seed:** 1
- **Started:** 2026-05-12T10:02:48.072Z
- **Finished:** 2026-05-12T10:15:16.461Z
- **Duration:** 12.5 min
- **Total trials:** 15

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| native | 0.0% | 3 | 0 | 3 |
| wikilinks | 0.0% | 3 | 0 | 3 |
| zettelkasten | 33.3% | 3 | 1 | 2 |
| salp | 66.7% | 3 | 2 | 1 |
| salp-short | 66.7% | 3 | 2 | 1 |

## Sample failures

- **system=native, target=shallow** (trial 0): The agent hallucinated the final anchor ID as "session.md#session-timeout-policy" instead of the required "auth:session-timeout", and cited "overview.md" as an intermediate anchor rather than the correct "auth.md" from the required chain (auth.md → session.md).
- **system=native, target=medium** (trial 0): The agent never mentions the required final anchor ID "rate:otp-window" and instead hallucinates anchor IDs such as "session.md#session-otp-ttl" and "ratelimit.md#otp-rate-window" that are not present in the correct chain, failing criteria (a) and the explicit rule against hallucinated anchor IDs.
- **system=native, target=deep** (trial 0): The agent hallucinated `ratelimit.md#otp-rate-window` as the final anchor (not in the chain), misidentified `session.md#session-otp-ttl` as merely intermediate rather than the final answer anchor, violating the explicit fail condition about hallucinated anchor IDs.
- **system=wikilinks, target=shallow** (trial 0): The agent did not mention the required final anchor ID "auth:session-timeout" (instead providing "session#^auth-session-timeout"), and hallucinated multiple intermediate anchor IDs (session#^session-otp-ttl, token#^token-access-ttl, refresh#^token-refresh-ttl, ratelimit#^rate-otp-window) that are not part of the correct chain (auth.md → session.md).
- **system=wikilinks, target=medium** (trial 0): The agent cited `^rate-otp-window` instead of the required anchor ID `rate:otp-window`, and hallucinated additional anchor IDs (`^mfa-totp-window`, `^session-otp-ttl` from session.md) that are not present in the correct traversal chain (auth.md → mfa.md → ratelimit.md).

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 1. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
