# Post-mortem: Payments outage on 2026-03-12

- Incident ID: INC-2026-0312-01
- Severity: SEV-2
- Duration: 47 minutes (14:03 UTC – 14:50 UTC)
- Author: Stanislav K. (SRE on-call)
- Reviewers: Anna L. (Payments lead), Marek P. (Platform lead)
- Status: Reviewed, action items tracked in JIRA epic PAY-2417

## Summary

On 2026-03-12 at 14:03 UTC, the `payments-api` service in the `eu-west-1` region started returning
HTTP 503 for roughly 38% of incoming requests. Customer-facing checkout flows on `crore.com` and
`starkbet.com` saw a 12.4% conversion drop during the window. Mitigation completed at 14:50 UTC
after rolling back commit `f3a91d4` on the `payments-api` deployment. No customer data was lost.
Estimated revenue impact: 41,200 EUR, derived from the conversion delta against the trailing 4-hour
baseline.

## Impact

- 38% of `payments-api` requests in `eu-west-1` returned 503 between 14:03 and 14:50 UTC.
- 12.4% conversion drop on checkout flows for two brands during the same window.
- 0 affected requests in `us-east-1` (different deployment cohort, see Cohorts below).
- 0 data corruption events; the failure path returned 503 before writing to the ledger.
- Approximately 6,800 retried requests succeeded after the rollback completed.

## Timeline (UTC)

- 13:58 — Deploy of `payments-api` v2.78.0 (commit `f3a91d4`) starts in `eu-west-1`. Cohort A
  receives traffic first.
- 14:01 — Cohort A reaches 25% traffic share; latency p95 climbs from 180 ms to 410 ms.
- 14:03 — First 503s observed. Datadog monitor `payments-api-error-rate-eu-west-1` triggers at the
  5% threshold.
- 14:04 — On-call (Stanislav) acknowledges page from PagerDuty; opens war-room channel
  `#inc-2026-0312-01` in Slack.
- 14:08 — Anna L. joins; provides context that `f3a91d4` includes a connection-pool refactor.
- 14:11 — Marek P. paged for platform-side correlation; confirms upstream `auth-service` is healthy.
- 14:14 — Decision: roll back to v2.77.4 (commit `9c11ee2`). Argo Rollouts revert initiated.
- 14:22 — Rollback reaches 50% traffic; error rate begins to drop.
- 14:33 — Rollback at 100%; error rate returns below the 0.5% baseline.
- 14:42 — Latency p95 stabilises at 175 ms; conversion telemetry recovers.
- 14:50 — Incident closed; communications sent to `#status-internal`. Public statuspage entry
  resolved.

## Root cause

Commit `f3a91d4` introduced a new HikariCP-style connection pool configured with `maximumPoolSize=8`
and `connectionTimeout=2_000` ms. The previous configuration in v2.77.4 used `maximumPoolSize=24`
and `connectionTimeout=10_000` ms. Under typical EU-region traffic of approximately 280 RPS, the
smaller pool combined with the shorter timeout caused thread starvation in the request-handling
tier, surfacing as HTTP 503 responses from the upstream Envoy sidecar.

Two compounding factors:

1. The new pool size was copy-pasted from a load test profile that targeted a 50 RPS scenario, not
   the production baseline.
2. Synthetic load tests in staging used a 60 RPS profile, which masked the regression: at 60 RPS the
   smaller pool was sufficient.

The configuration constants live in `services/payments-api/internal/db/pool.go`, lines 42–55. They
were tagged with a TODO comment that the pull request author intended to revisit before merge, but
the comment was removed during a rebase on `main`.

## Detection

- Datadog monitor `payments-api-error-rate-eu-west-1` (threshold: error rate > 5% over 2-minute
  window).
- PagerDuty escalation policy `payments-eu-sev2` paged on-call within 60 seconds.
- No customer-facing detection (statuspage manual update at 14:18 UTC).

## Cohorts

The deploy used the standard 4-cohort layout:

- Cohort A: `eu-west-1` canary (10% of regional traffic during the first 5 minutes).
- Cohort B: `eu-west-1` general (90% of regional traffic).
- Cohort C: `us-east-1` canary.
- Cohort D: `us-east-1` general.

Cohorts C and D were unaffected because the rollout had not yet reached `us-east-1` when the
rollback was triggered. The deploy controller correctly halted further cohorts after Argo Rollouts
saw the analysis-template failure.

## What went well

- Detection latency: 0 minutes from first symptom to PagerDuty page.
- Mean time to acknowledge: 1 minute.
- Rollback tooling (Argo Rollouts) executed cleanly without manual `kubectl` intervention.
- The runbook `runbook-deno-deploy` rollback section was followed without deviation.
- No data integrity events; idempotency keys prevented double-charges on retried checkouts.

## What went wrong

- Staging load profile did not match production traffic; the regression was undetectable in
  pre-prod.
- The connection-pool change was not flagged for explicit reviewer attention in the PR description.
- Statuspage update lagged the internal acknowledgement by 14 minutes, leaving public communications
  stale.
- The TODO comment that would have signalled "revisit pool sizes before merge" was lost during
  rebase.

## Action items

| ID   | Action                                                                                        | Owner        | Due        | Tracking  |
| ---- | --------------------------------------------------------------------------------------------- | ------------ | ---------- | --------- |
| AI-1 | Add a production-traffic load profile (≥ 250 RPS) to the staging pipeline.                    | Marek P.     | 2026-03-26 | PAY-2418  |
| AI-2 | Require explicit reviewer sign-off on changes to `services/payments-api/internal/db/pool.go`. | Anna L.      | 2026-03-19 | PAY-2419  |
| AI-3 | Wire statuspage automation to PagerDuty incident creation (no manual update).                 | SRE platform | 2026-04-02 | PLAT-1842 |
| AI-4 | Add a CODEOWNERS entry for the connection-pool module mapping to the database guild.          | Anna L.      | 2026-03-19 | PAY-2420  |
| AI-5 | Backfill a regression test that fails at `maximumPoolSize=8` and 250 RPS.                     | Stanislav K. | 2026-03-26 | PAY-2421  |
| AI-6 | Document the rebase-loses-comments failure mode in the engineering handbook.                  | Marek P.     | 2026-04-09 | PLAT-1843 |

## Lessons

- Performance-sensitive constants must be reviewed against the production traffic shape, not the
  staging shape.
- Inline TODO markers are not durable across rebases; gating mechanisms (CODEOWNERS, required
  reviewers, regression tests) must replace them.
- Statuspage automation is now a SEV-2 prerequisite, not a nice-to-have.

## Appendix: Datadog dashboard links

- Error rate: <https://app.datadoghq.eu/dashboard/abc-123/payments-api-errors>
- Latency p50/p95/p99: <https://app.datadoghq.eu/dashboard/abc-124/payments-api-latency>
- Connection pool gauges: <https://app.datadoghq.eu/dashboard/abc-125/payments-api-pool>

## Appendix: Related changes

- PR `#8421` — "feat(db): adopt HikariCP-style pool" — merged 2026-03-12 13:42 UTC.
- PR `#8429` — "revert: HikariCP-style pool" — merged 2026-03-12 14:30 UTC.
