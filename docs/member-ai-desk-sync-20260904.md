# Member trading snapshot synchronization

## Scope

`/api/cron/member-ai-desk-sync` runs every two minutes using the existing
`CRON_SECRET` bearer authentication. It runs only in LIVE_EXPERIMENT mode and
updates only the existing `trade_member_ai_desk_snapshot` row. There are no new
environment variables, schema changes or migrations. The trading cron schedule,
runtime switches, experiment dates, positions, leverage and risk limits are unchanged.

The LIVE publisher reads stored runtime/experiment state, stored plans/profiles
and exchange positions/history/protection orders. It does not run a trading cycle,
initialize profiles, expire plans, submit orders or renew the experiment.
Existing administration paths continue to own table initialization.

## Failure and privacy contract

- Strict readers never substitute a fallback or empty list for a rejected query.
- Failed synchronization retains the last successful payload and timestamp.
- Timestamp comparison prevents a slower old publisher or error from replacing
  a newer successful snapshot. Work older than 50 seconds is not published.
- Data-read failure is separate from a healthy MANAGE_ONLY state; neither grants
  trading permission. Snapshot timestamps and heartbeat/quote timestamps are
  checked against the actual read time.
- Member access remains device/membership gated. Cache hits re-read display
  settings; responses use private no-store. Old and new payloads use the same
  privacy filtering. Account totals, quantities and internal order audit are not
  member-facing. Absolute PnL respects the administrator's setting.
- Missing exchange protection prices remain missing, never estimated from a
  generic percentage and advertised as an actual protection order.

## Verification and rollback

Run `node --import tsx --test tests/member-ai-trading-desk-sync.test.ts`, the
existing trading reliability, scheduling, publishing, diagnostics and member
reading/polling regressions, followed by typecheck, production build and impact audit.
The sync tests replace database/exchange boundaries and make no live requests.
One old public-verification test still requires inline starBreakdown/cache strings;
the same failure was reproduced on the unchanged baseline and is unrelated.

After deployment, verify unauthorized cron requests return 401 and two scheduled
successful snapshot timestamps advance. Recheck runtime permissions independently.
Do not run RUN_NOW or a trading cron merely to validate the member page.

Rollback by reverting this release commit and redeploying. Existing snapshots
remain intact; no account state, history or trading settings require restoration.
If synchronization does not run, report that production verification is incomplete;
a successful build is not proof of scheduler success.
