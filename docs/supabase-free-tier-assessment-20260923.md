# Supabase free-tier assessment — 2026-09-23 (Beijing)

Status: authenticated provider inspection completed. Pro is NOT cancelled; no data deleted, keys exported, project paused, database schema changed or DNS migrated.

## Current provider evidence

- Organization huohuo4434: Pro, 2 projects; billing period August 28–September 28.
- Previous paid invoice August 28: USD 25. Upcoming total was not rendered, so do not claim it is exactly USD 25.
- Spend cap already enabled and left enabled. No read replicas; production uses Micro compute.
- Uncached egress: 240.755 / 250 GB (96%); cached egress 4.921 GB.
- Storage size: period average 0.218 GB; monthly active users 65 (not unique website visitors or daily users).
- Production database: 650 MB; WAL 128 MB; system 168.9 MB on 2 GB provisioned disk.
- September 19 tooltip: Shared Pooler 12.045 GB (99.7%). September 21: Shared Pooler 9.313 GB (99.5%). These samples establish the dominant source on those dates, not a full monthly attribution.

## Free-tier blockers

Provider plan selector shows 500 MB database, 5 GB uncached egress, 5 GB cached egress, 1 GB file storage, 50,000 MAU and 2 active projects. Free projects may pause after a week of inactivity. Current database and monthly egress do not fit; storage average/MAU fit, cached egress is close to the free allowance.

Official downgrade takes effect immediately, not at renewal. Do not click downgrade solely because the user wants lower costs while known capacity failures remain. Keep historical forecasts, failed samples, membership, orders and trading audit data.

- https://supabase.com/docs/guides/platform/manage-your-subscription
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/database-size
- https://supabase.com/docs/guides/platform/backups

Vercel Hobby is for noncommercial personal use; paid MOOX is not an appropriate Hobby migration. Existing VPS migration gates remain in `vps-migration-assessment-20260922.md`. Supabase dashboard login is now resolved, but production configuration, safe staging, database backup/restore and DNS acceptance remain incomplete.

## Read-only diagnostics

Only SELECTs against PostgreSQL statistics and snapshot aggregate sizes were executed via the authenticated provider SQL editor. No business rows or credentials exported.

Largest relations (including indexes):

| Relation | Size |
| --- | ---: |
| trade_three_horizon_decisions | 312 MB |
| trade_bitget_runtime_events | 183 MB |
| trade_ai_plan_events | 37 MB |
| trade_watchdog_runs | 16 MB |
| trade_external_analyst_posts | 15 MB |

These are candidates for a separately designed, backup-verified retention/archive policy, not permission to purge audit or trading state. No deletion or VACUUM FULL was attempted.

`pg_stat_statements` cumulative counters (reset start not verified, not daily metrics): full event read for 60 plans 13,281 calls / 163,074,539 returned rows. All-decisions SELECT with LIMIT 2,000: 13,197 calls / 26,394,000 rows. Byte attribution cannot be inferred exactly from row counts.

Before optimization the stored member snapshot (last_synced_at 2026-09-22T19:16:17.188Z) was 4,595,977 bytes of JSON text, 60 plans and 13,417 embedded events. This is uncompressed JSON size, not measured wire bytes.

## Bounded efficiency change

- Only member summary consumers request `includeEvents: false`; skip event SQL entirely, not merely serialization.
- Default/admin reads still return complete events. No deletion, change to event writes, trading controls, risk gates, direction, price feeds, schedule or environment variables.
- Changed runtime files: `ai-trade-plans.ts`, `member-ai-trading-desk.ts`, `member-trading-plan.server.ts` under lib/trading-signals. No changed API route or database migration.
- New isolated loader tests plus existing publishing/member/authority regression tests: `npm run test:cost-reads`, 88 passed. TypeScript and production build passed (six pre-existing lint warnings).
- Separate reviewer approved behavior and 69 independently run tests. Reviewer noted test registration, addressed with the named cost-read test script.
- Rollback: revert this cost-read commit and redeploy using the existing Git-to-Vercel route. No data rollback or migration is needed.
- Production deployment/actual snapshot reduction still pending at the time of this document. Do not claim free-tier readiness or measured billing savings from code alone.

## Path to removing subscriptions

Reduce repeated reads first and measure the resulting daily egress. Database still requires backup-verified archive/migration before a safe free-tier downgrade. If workloads remain above free limits, use the existing VPS with free software rather than deleting records or forcing an unsafe downgrade; self-hosting has backup/operations responsibilities and does not mean zero total costs. No subscription cancellation is scheduled by this report.

## Production follow-up — September 23, 03:27 Beijing

- Released commit `3803d43dbd9a05a7fd023288041fa4d40e5d0946` through configured GitHub main -> Vercel.
- Deployment `6mSJx2A7nMG3bEgQ3fnymrv9u6f8`, URL https://moon-x-genesis-5etk4uwel-huohuo2.vercel.app, production Ready, duration 2m 56s.
- Read-only release validator at 2026-09-22T19:23:45.040Z: home, pricing, login, anonymous member gate and auth health all HTTP 200 and passed; `UPGRADE VALIDATION PASSED`. No optional health report uploaded (local secrets unavailable).
- Logged-in member page renders, chart loaded and current research content available. No test payments or new membership changes performed.
- Runtime acceptance is PARTIAL: member snapshot cron at 03:24 and 03:26 returned HTTP 503 with `LIVE_STATE_READ_TIMEOUT` (5593/5401 ms). Logs contained 2 warnings, 0 Error-level and 0 Fatal-level entries in the inspected short window; the HTTP failures are real despite those level counts.
- Last checked stored snapshot was still pre-release, 03:20 Beijing, 4,596,934 JSON-text bytes and 13,420 embedded events. The post-release snapshot size reduction is NOT verified yet. Do not quote a realized egress or bill reduction.
- Other org project `huohuo4434's Project` is already paused. Provider states paused data is safe and inaccessible and compute billing resumes only when resumed; left it paused.
- User was asked to confirm copying the website database (member account records, orders, forecasts, trading audit) to their existing VPS for isolated backup/restore testing. No such transfer, database purge, production cutover, or subscription change has been performed.
- This acceptance addendum is retained locally rather than triggering a second documentation-only production build.
