# Anchor Systems — Multi-Hop Reasoning (Bench 4)

**Headline:** Multi-hop (deep) adherence — native=33% / wikilinks=33% / zettelkasten=33% / salp=67% / salp-short=100% (n=3/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-multi-hop`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 3
- **Seed:** 1
- **Started:** 2026-05-12T01:05:37.763Z
- **Finished:** 2026-05-12T01:43:59.049Z
- **Duration:** 38.4 min
- **Total trials:** 45

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| native | 11.1% | 9 | 1 | 8 |
| wikilinks | 11.1% | 9 | 1 | 8 |
| zettelkasten | 11.1% | 9 | 1 | 8 |
| salp | 66.7% | 9 | 6 | 3 |
| salp-short | 66.7% | 9 | 6 | 3 |

## Sample failures

- **system=native, target=shallow** (trial 0): The agent hallucinated the final anchor ID ("session.md#session-timeout-policy" instead of the required "auth:session-timeout") and fabricated an incorrect traversal path through "overview.md" rather than the correct "auth.md → session.md" chain, violating the explicit fail condition against hallucinated anchor IDs.
- **system=native, target=shallow** (trial 1): The agent hallucinated the final anchor ID as "session-timeout-policy" instead of the correct "auth:session-timeout", and also fabricated an incorrect intermediate chain referencing "overview.md" rather than the correct "auth.md", failing condition (a) and violating the rule against hallucinating anchor IDs.
- **system=native, target=shallow** (trial 2): The agent never mentions the required final anchor ID "auth:session-timeout"; instead it fabricates "session.md#session-timeout-policy" as the final anchor and hallucinates additional non-existent anchors ("auth.md#mfa-requirement", "token.md#access-token-lifetime", "overview.md") that are not part of the correct chain (auth.md → session.md, anchor: auth:session-timeout).
- **system=native, target=medium** (trial 0): The agent fails condition (a) because it cites "ratelimit.md#otp-rate-window" as the final anchor instead of the required "rate:otp-window", and it also hallucinates multiple anchor IDs not present in the correct chain (auth.md → mfa.md → ratelimit.md), such as "mfa.md#sms-otp-rules", "mfa.md#totp-time-window", and "session.md#session-otp-ttl".
- **system=native, target=medium** (trial 1): The agent never mentions the required final anchor ID "rate:otp-window"; instead it hallucinated "otp-rate-window" and incorrectly identified "session.md#session-otp-ttl" as the final definition anchor, neither of which matches the correct chain's final anchor.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 3. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
