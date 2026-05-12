# Anchor Systems — Extraction & Mapping (Bench 1)

**Headline:** Mapping adherence — native=0% / salp=0% / salp-short=0% / wikilinks=0% / zettelkasten=0% (n=5/cell)

## Run Metadata

- **Experiment ID:** `anchor-systems-mapping`
- **Model:** `claude-haiku-4-5`
- **IDE:** `claude`
- **Reps per cell:** 5
- **Seed:** 1
- **Started:** 2026-05-12T07:17:08.519Z
- **Finished:** 2026-05-12T07:42:54.606Z
- **Duration:** 25.8 min
- **Total trials:** 25

## Adherence by system

| system | adherence | trials | pass | fail |
|---|---|---|---|---|
| native | 0.0% | 5 | 0 | 5 |
| wikilinks | 0.0% | 5 | 0 | 5 |
| zettelkasten | 0.0% | 5 | 0 | 5 |
| salp | 0.0% | 5 | 0 | 5 |
| salp-short | 0.0% | 5 | 0 | 5 |

## Sample failures

- **system=native** (trial 0): The agent's anchor IDs are completely different from the ground truth (using names like "session-timeout-policy" instead of "auth:session-timeout"), and the references use a different format with hallucinated source files (revocation.md, refresh.md, ratelimit.md, session_store.py) not present in the ground truth, resulting in far more than 3 missing/hallucinated entries.
- **system=native** (trial 1): The agent's response contains numerous hallucinated entries not present in the ground truth, including a fabricated anchor "token-revocation" in a non-existent "revocation.md" file and at least 10 fabricated references (e.g., references from revocation.md, session_store.py, refresh.md, and ratelimit.md that have no match in the ground truth), which violates the explicit rule to fail on any hallucinated entries.
- **system=native** (trial 2): The agent invented its own anchor ID scheme (e.g., "session-timeout-policy" instead of "auth:session-timeout") and reference format (e.g., "session.md#session-timeout-policy" instead of "auth:session-timeout"), resulting in zero matching ground truth anchors or references and numerous hallucinated entries — far exceeding the 3-entry tolerance.
- **system=native** (trial 3): The agent invented its own anchor ID naming convention (e.g., "mfa-requirement", "session-timeout-policy") instead of extracting the actual IDs from the ground truth (e.g., "auth:mfa-required", "auth:session-timeout"), causing all 20 ground-truth anchors to be missing and introducing numerous hallucinated anchor IDs and reference entries.
- **system=native** (trial 4): The agent produced completely fabricated anchor IDs and reference ref_ids (e.g., "authentication-requirements", "session.md#session-timeout-policy") that match none of the 20 ground-truth anchors or 25 ground-truth references, resulting in 45 missing entries and a response consisting entirely of hallucinated entries.

## Caveats

- Token count is estimated via a 1-token≈4-char heuristic (±15% accuracy).
- Repetitions per cell: 5. Statistical confidence at this sample size is limited.
- Prompt caching on the provider side may reduce variance across reps within a cell.
