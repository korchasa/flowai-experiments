# Anchor Systems — Multi-Hop Reasoning (Bench 4)

**Headline:** Multi-hop (deep) adherence — native=0% / wikilinks=0% / zettelkasten=33% / salp=100% / salp-short=67% (n=3/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-multi-hop`
- **Model:** `haiku`
- **IDE:** `claude`
- **Reps per cell:** 3
- **Seed:** 1
- **Started:** 2026-05-12T07:41:56.255Z
- **Finished:** 2026-05-12T08:20:37.744Z
- **Duration:** 38.7 min
- **Total trials:** 45

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| native | 0.0% | 9 | 0 | 9 |
| wikilinks | 0.0% | 9 | 0 | 9 |
| zettelkasten | 11.1% | 9 | 1 | 8 |
| salp | 77.8% | 9 | 7 | 2 |
| salp-short | 44.4% | 9 | 4 | 5 |

## Sample failures

- **system=native, target=shallow** (trial 0): The agent never mentions the required final anchor ID "auth:session-timeout"; instead it names "session.md#session-timeout-policy" as the final anchor and fabricates additional IDs ("auth.md#mfa-requirement", "token.md#access-token-lifetime", "overview.md") that are not part of the correct chain (auth.md → session.md), violating the rule's prohibition on hallucinated anchor IDs.
- **system=native, target=shallow** (trial 1): The agent never mentions the required final anchor ID "auth:session-timeout," instead fabricating "session.md#session-timeout-policy," and the intermediate anchors it cites ("token.md#access-token-lifetime," "refresh.md#refresh-token-lifetime") are not part of the correct auth.md → session.md chain, constituting hallucinated anchor IDs.
- **system=native, target=shallow** (trial 2): The agent fails condition (a) by never mentioning the required final anchor ID "auth:session-timeout"; instead it hallucinated "session-timeout-policy" as the anchor, and also fabricated an intermediate anchor from "overview.md" rather than the correct chain (auth.md → session.md).
- **system=native, target=medium** (trial 0): The agent never mentions the required final anchor ID "rate:otp-window"; instead it invents "ratelimit.md#otp-rate-window" and several other fabricated anchor IDs (e.g., "mfa.md#SMS OTP Rules", "mfa.md#TOTP Time Window", "session.md#session-otp-ttl", "auth.md#mfa-requirement", "overview.md") that are not present in the specified chain, violating the explicit rule that hallucinated anchor IDs cause a fail.
- **system=native, target=medium** (trial 1): The agent never mentions the required final anchor ID "rate:otp-window"; instead it cites the hallucinated ID "ratelimit.md#otp-rate-window," which is not present in the correct chain, violating the rule's explicit fail condition for hallucinated anchor IDs.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 3. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
