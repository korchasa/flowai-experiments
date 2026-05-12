# Anchor Systems — Multi-Hop Reasoning (Bench 4)

**Headline:** Multi-hop (deep) adherence — native=20% / wikilinks=0% / zettelkasten=80% / salp=60% / salp-short=100% (n=5/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-multi-hop`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 5
- **Seed:** 1
- **Started:** 2026-05-12T07:52:03.071Z
- **Finished:** 2026-05-12T09:01:52.501Z
- **Duration:** 69.8 min
- **Total trials:** 75

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| native | 6.7% | 15 | 1 | 14 |
| wikilinks | 0.0% | 15 | 0 | 15 |
| zettelkasten | 26.7% | 15 | 4 | 11 |
| salp | 53.3% | 15 | 8 | 7 |
| salp-short | 60.0% | 15 | 9 | 6 |

## Sample failures

- **system=native, target=shallow** (trial 0): The agent hallucinated the final anchor ID as "session.md#session-timeout-policy" instead of the required "auth:session-timeout", and also cited "overview.md" as an intermediate anchor rather than the correct "auth.md" from the chain auth.md → session.md.
- **system=native, target=shallow** (trial 1): The agent hallucinated the final anchor ID as "#session-timeout-policy" instead of the required "auth:session-timeout", and the intermediate anchor "#session-management" is not part of the correct chain (auth.md → session.md), failing both condition (a) and the hallucination check.
- **system=native, target=shallow** (trial 2): The agent hallucinated the final anchor ID as "session.md#session-timeout-policy" instead of the required "auth:session-timeout", and cited "overview.md" as the intermediate anchor rather than the correct "auth.md", failing both the anchor ID requirement and the intermediate anchor requirement.
- **system=native, target=shallow** (trial 3): The agent hallucinated the final anchor ID as "session.md#session-timeout-policy" instead of the required "auth:session-timeout", and fabricated multiple intermediate anchors (overview.md#session-timeout-policy, token.md#access-token-lifetime, auth.md#mfa-requirement, refresh.md#refresh-token-lifetime) that are not present in the correct chain (auth.md → session.md).
- **system=native, target=shallow** (trial 4): The agent fails on multiple criteria: it reports the final anchor ID as "#session-timeout-policy" instead of the required "auth:session-timeout", and it hallucinates multiple intermediate anchors (overview.md, token.md, refresh.md, session_store.py) that are not part of the correct chain (auth.md → session.md).

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 5. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
