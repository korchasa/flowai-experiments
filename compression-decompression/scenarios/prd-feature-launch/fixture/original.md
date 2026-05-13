# PRD: Slack workspace onboarding for `slack-bots-flow`

- Document ID: PRD-2026-Q2-014
- Status: Approved for engineering
- Owner: Stanislav K. (PM-engineer hybrid)
- Last updated: 2026-04-22
- Target launch: 2026-06-30 (general availability)
- Engineering tracking: epic SBF-410 in JIRA

## TL;DR

`slack-bots-flow` lets a non-developer Slack admin describe a bot in natural language and receive a
working, deployed Slack app within five minutes. The first-launch experience is currently broken:
62% of trial workspaces never reach a working bot, primarily because the OAuth callback flow does
not survive a redirect through the marketplace. This PRD scopes a redesigned onboarding surface that
will lift the trial-to-first-bot conversion rate to at least 45% in 90 days post-launch.

## Goals

1. Lift the trial-to-first-bot conversion rate from 19% (current 30-day baseline, 2026-Q1) to at
   least 45% within 90 days of GA.
2. Reduce median time-to-first-deployed-bot from 38 minutes (P50) to under 8 minutes.
3. Eliminate the OAuth-redirect failure mode that currently accounts for 41% of trial drop-offs.
4. Provide a self-serve recovery path so that a workspace can finish onboarding without contacting
   support.

## Non-goals

- This document does not change the conversational bot-authoring experience after onboarding
  completes; that surface is owned by `prd-2026-q1-008` (the prompt-to-bot compiler).
- We will not support enterprise SSO providers (Okta, Azure AD, OneLogin) in this scope. Enterprise
  SSO is tracked separately as PRD-2026-Q3-005.
- We will not migrate existing onboarded workspaces to the new flow. The redesign applies only to
  new sign-ups starting on the GA date.

## Success metrics

The launch is considered successful if all of the following hold 90 days after GA:

| Metric                         | Baseline (2026-Q1) | Target            | Measurement                                    |
| ------------------------------ | ------------------ | ----------------- | ---------------------------------------------- |
| Trial → first deployed bot     | 19%                | ≥ 45%             | Mixpanel funnel `onboarding-v2`, 30-day window |
| Median time-to-first-bot       | 38 min             | < 8 min           | Server-side trace span `onboarding.complete`   |
| OAuth-redirect failure rate    | 41% of drop-offs   | < 5% of drop-offs | Sentry tag `oauth.failure-mode=redirect-loss`  |
| Support tickets per 100 trials | 6.2                | < 2.0             | Zendesk view `onboarding-trial`                |
| 7-day workspace retention      | 28%                | ≥ 50%             | Internal `workspace_active_after_7d` query     |

A launch will be reverted if any of the following hard-fail thresholds is hit during the first 14
days post-GA:

- Trial-to-first-bot conversion below 30% over a rolling 7-day window.
- More than 0.5% of completed onboardings produce a bot that fails its first message.
- Sentry rate for `slack.api.unauthorised` exceeds 1.5x the 7-day pre-launch baseline.

## User personas

1. **Primary: Slack admin who is not a developer.** Manages a workspace of 20–500 people. Has
   installed apps from the Slack marketplace before, but has never written code. Strongest pain:
   "the existing flow asked me to paste an XML manifest somewhere, and I gave up." Quote source:
   2026-03 user interviews, n=14.

2. **Secondary: Solo founder evaluating the product.** Technical, but time-pressed. Wants to see the
   bot working in their own workspace within 10 minutes or they will close the tab. Strongest pain:
   "OAuth redirected me to a 404 and I had to start over."

3. **Anti-persona: Enterprise security reviewer.** Will need SSO and audit logs. We explicitly do
   not optimise for this persona in this PRD.

## Functional requirements

- **FR-1.** A new Slack admin must be able to install the app from the Slack App Directory and
  complete onboarding without leaving the Slack web client.
- **FR-1.1.** The OAuth handshake must complete in a Slack-native modal (using `slack_app_oauth_v2`
  flow, not a third-party browser tab).
- **FR-1.2.** If the modal is closed mid-flow, a recovery banner must appear in Slack the next time
  the user opens the app's home tab.
- **FR-2.** The onboarding wizard must offer three pre-built bot templates: standup-bot, kudos-bot,
  and deploy-watcher. Each template must deploy in under 60 seconds.
- **FR-2.1.** The "deploy-watcher" template must be feature-gated behind the
  `deploy-watcher-template` flag and rolled out at 10% on day 0, ramping to 100% by day 14.
- **FR-3.** The wizard must persist progress to Deno KV, keyed by `workspace_id`, so that a
  returning admin can resume from the last completed step.
- **FR-4.** A diagnostic endpoint `GET /onboarding/health/:workspace_id` must return JSON describing
  which onboarding steps are completed, in progress, or blocked.
- **FR-5.** A self-serve recovery flow must be available at `https://slack-bots-flow.app/recover`,
  accepting only the `workspace_id` and an admin OAuth re-confirmation.
- **FR-6.** All onboarding events must be emitted to OpenTelemetry under the trace name
  `onboarding.<stepname>` for offline analysis.

## Non-functional requirements

- **NFR-1.** Median onboarding API latency under 200 ms; p99 under 1 s.
- **NFR-2.** All onboarding writes must be idempotent on `workspace_id + step_name` so retries from
  the Slack client cannot duplicate state.
- **NFR-3.** No personal data beyond the Slack admin's email address may be persisted server-side.
  Workspace member lists must not leave the Slack API surface.
- **NFR-4.** The flow must work on Slack desktop, Slack web, and Slack iOS. Slack Android is
  best-effort for v1.
- **NFR-5.** The recovery endpoint must be rate-limited to 10 requests per `workspace_id` per hour.

## Out of scope (v1)

- Bulk onboarding via CSV import.
- Integrations with workforce-management tools (BambooHR, Rippling).
- Localisation beyond English. Localised copy will follow in PRD-2026-Q3-009.
- Migration of bots authored on the legacy onboarding flow to the new wizard structure.

## Open questions

- **OQ-1.** Should we deprecate the old onboarding URL (`/onboarding/legacy`) on the GA date, or run
  it in parallel for 30 days? Decision owner: Stanislav K. by 2026-05-15.
- **OQ-2.** Do we display the recovery banner in the channel sidebar, or only in the app home tab?
  UX research is scheduled for 2026-05-08.
- **OQ-3.** Slack rate-limits OAuth calls to 50 per minute per workspace. If a workspace hits the
  limit during onboarding, what is the user-facing message?

## Acceptance criteria

The feature ships to GA when all of the following are true:

1. All FR-* and NFR-* requirements pass automated acceptance tests under `tests/onboarding/` and the
   Cypress suite `cypress/e2e/onboarding-v2.cy.ts`.
2. A 14-day soak in the staging workspace `slack-bots-flow-staging.slack.com` produces zero Sentry
   errors tagged `oauth.failure-mode=redirect-loss`.
3. Mixpanel funnel `onboarding-v2-staging` shows trial-to-first-bot above 50% on synthetic traffic,
   with a sample size of at least 200 simulated workspaces.
4. The runbook `runbook-slack-bots-flow-onboarding.md` is reviewed and signed off by the SRE
   on-call.
5. The privacy review issue PRIV-118 is closed with a verdict of "approved with no caveats."

## Risks

| ID  | Risk                                            | Probability | Mitigation                                                                                                  |
| --- | ----------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| R-1 | Slack changes the OAuth modal API mid-launch    | Low         | Pin to API version `2026-02-01`; subscribe to Slack platform changelog.                                     |
| R-2 | Deno KV regional outage during onboarding       | Medium      | Fall back to read-only mode with an in-app banner; cache the last 100 onboarding states in memory per node. |
| R-3 | Migration of legacy workspaces leaks into scope | High        | Explicitly excluded; product manager guards scope at sprint planning.                                       |
| R-4 | Privacy review uncovers PII concerns late       | Low         | Privacy review scheduled for 2026-05-12, eight weeks before GA.                                             |

## Rollout plan

- 2026-05-08 — code-freeze for onboarding work that requires Slack API additions.
- 2026-05-12 — privacy review (PRIV-118) due.
- 2026-05-29 — staging soak begins; a 14-day window starts.
- 2026-06-15 — internal-only cohort enabled (Slack workspace `4ra-internal.slack.com`).
- 2026-06-22 — 5% public rollout via the `onboarding-v2` feature flag.
- 2026-06-30 — General availability; old `/onboarding/legacy` URL marked deprecated.
- 2026-07-30 — Hard sunset of `/onboarding/legacy`. The route returns HTTP 410 with a redirect to
  `/onboarding/`.

## Stakeholders

- **Engineering lead:** Stanislav K. (also PM in this PRD)
- **Design:** Anna L. (Slack-native UX surface)
- **SRE:** Marek P.
- **Privacy:** Lena G.
- **Customer success:** Tomáš K.
- **Executive sponsor:** N/A (founder-led)
