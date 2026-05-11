# Runbook: Deno Deploy production rollout for `tldrist-digester`

- Service: `tldrist-digester`
- Runtime: Deno Deploy (project ID `tldrist-digester-prod`)
- Repo: `personal/news.korchasa-dev-news-digester`
- Owner: Stanislav K.
- Last reviewed: 2026-04-30

## When to use this runbook

Use this document for the standard production rollout of `tldrist-digester` after a green pull
request lands on `main`. Do NOT use it for hot-fix rollouts; those follow
`runbook-tldrist-hotfix.md` and require an explicit approval from the on-call SRE.

## Pre-flight checklist

Run all checks before promoting any build to production. Each item is binary; if any item fails,
abort and post in `#tldrist-eng`.

1. CI on the merge commit is green (`deno task check` and the integration suite under
   `tests/integration/`).
2. The `news-digester-canary` Deno Deploy environment has been live for at least 30 minutes with no
   error spikes in Logs Explorer.
3. There are no open issues tagged `release-blocker` in the GitHub project.
4. The Telegram bot token rotation date is at least 7 days away. Check the `BOT_TOKEN_ROTATION_AT`
   environment variable in the Build context.
5. The OpenRouter cost dashboard shows the trailing 24-hour spend below the 18 USD daily ceiling.

## Promotion steps

1. **Pull the latest production manifest.**
   ```sh
   cd personal/news.korchasa-dev-news-digester
   git fetch origin main
   git checkout origin/main
   ```

2. **Verify the deploy ID.** The production deploy ID must match the canary that completed the soak
   window.
   ```sh
   deployctl deployments list --project=tldrist-digester-prod --limit=5
   ```
   Confirm the most recent canary entry has status `success` and matches the local commit SHA.

3. **Promote the canary to production.**
   ```sh
   deployctl deployments promote \
     --project=tldrist-digester-prod \
     --deployment=<canary-id> \
     --to=production
   ```
   The promotion is atomic; traffic shifts to the new revision in under 10 seconds.

4. **Watch logs for 5 minutes.**
   ```sh
   deployctl logs follow --project=tldrist-digester-prod --env=production
   ```
   Abort and roll back if any of the following appear in the first 5 minutes:
   - More than 3 occurrences of `OPENROUTER_RATE_LIMITED` per minute.
   - Any `panic`, `Uncaught (in promise)`, or `KV write failed` lines.
   - A drop in the `digest_items_processed_total` counter relative to the trailing 1-hour rate.

5. **Confirm the digest pipeline.** Within 10 minutes of promotion, confirm the latest scheduled run
   completed by checking the Telegram channel `@tldrist_news` for a new digest and inspecting the
   `last_digest_at` KV key:
   ```sh
   deployctl kv get --project=tldrist-digester-prod --env=production last_digest_at
   ```
   The timestamp should be within the last cron interval (15 minutes).

## Rollback

Rollback is the inverse of promotion. The previous production deploy ID is preserved by Deno Deploy
for at least 30 days.

1. **Identify the prior deploy ID.**
   ```sh
   deployctl deployments list --project=tldrist-digester-prod --env=production --limit=5
   ```
   Pick the entry immediately preceding the current `production` deploy.

2. **Promote the prior deploy to production.**
   ```sh
   deployctl deployments promote \
     --project=tldrist-digester-prod \
     --deployment=<prior-id> \
     --to=production
   ```

3. **Notify the channel.** Post in `#tldrist-eng` with the rolled-back commit SHA and the reason for
   rollback. If the rollback is in response to a SEV-2 or higher incident, also page the SRE on-call
   via PagerDuty service `tldrist-prod-sev2`.

4. **File a follow-up ticket.** Create a GitHub issue labelled `rollback` documenting the symptom,
   the rollback timestamp, and the next investigation steps.

## Common failure modes

- **`deployctl: deployment not found`** — the deploy ID was mistyped or the canary was already
  overwritten by a newer build. Re-run step 2 of the promotion to fetch the current list.
- **`openrouter: 429 Too Many Requests`** — the cost ceiling has been reached or the OpenRouter
  account is throttled. Check the OpenRouter dashboard and, if needed, swap to the backup API key
  stored in Deno Deploy secret `OPENROUTER_API_KEY_BACKUP`.
- **`kv write failed: timeout`** — Deno KV regional outage. Check <https://status.deno.com> and
  consider deferring the rollout until the regional status is green.
- **`telegram: Bot was blocked by the user`** — the bot token has been revoked. Rotate via the
  BotFather workflow and update the `TELEGRAM_BOT_TOKEN` secret.

## Approvals required

- Pre-flight: self-approval by the deployer.
- Promotion: a second pair of eyes from the team in `#tldrist-eng` (informal LGTM in chat is
  sufficient).
- Rollback: no approval; safety wins.

## Out of scope

- Schema migrations on the analytics Postgres instance (separate runbook
  `runbook-tldrist-postgres-migration.md`).
- Telegram channel ownership transfers.
- OpenRouter contract renegotiation.

## Appendix: environment variables

| Name                        | Source             | Notes                                |
| --------------------------- | ------------------ | ------------------------------------ |
| `OPENROUTER_API_KEY`        | Deno Deploy secret | Primary key.                         |
| `OPENROUTER_API_KEY_BACKUP` | Deno Deploy secret | Used during throttling.              |
| `TELEGRAM_BOT_TOKEN`        | Deno Deploy secret | Rotated quarterly.                   |
| `BOT_TOKEN_ROTATION_AT`     | Build context      | ISO-8601 timestamp; pre-flight gate. |
| `DAILY_COST_CEILING_USD`    | Build context      | Default 18 USD.                      |
| `DIGEST_CRON`               | Build context      | Default `*/15 * * * *`.              |
