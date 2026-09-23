# Lean membership research site: plan A

User selected plan A on 2026-09-23 (Beijing). Target: owner-supplied research,
public/member visibility, member records, price tracking and basic operations;
web on the existing VPS, Supabase Free only after measured capacity acceptance.

## Bounded first release

Scope: `vercel.json`, an isolated schedule regression test and this record.
Remove eight standalone research/verification schedules: generate-daily-forecasts,
moonx-cycle, sync-verification, verify-daily, verify-weekly, prepare-focus-week,
crypto-beijing-reverify, watchlist-weekly-daily. Eight schedules remain.

No API implementation, database, environment variable, locked forecast, membership
entitlement, payment workflow, exchange order, execution switch or protection
cadence is changed. Historical records and manual endpoints remain intact.
Forecast/verification publications will no longer receive these scheduled updates;
their original dates must be respected. Do not interpret older records as fresh.
This release does not implement the simplified member UI or disable on-read
projection logic. Trading-internal research calls and authenticated manual
research remain possible. It is NOT a complete shutdown of all research logic.

Safety-related trading schedules and desk snapshots remain unchanged pending
fresh account/position/protection checks and a separately confirmed trading
retirement scope. Automatic payment reconciliation remains, rather than silently
changing to manual fulfillment. Basic price/projection refresh remains unchanged.

## Cancellation gates still open

- No independent database restore has been verified. The previously tested
  database password failed authentication; do not guess or bypass access.
- Supabase Auth and Storage are also used; a PostgreSQL dump alone is not a
  complete functional migration or file-object backup.
- Current production configuration must be provisioned via authorized normal
  channels. Do not extract write-only Vercel secrets via runtime code.
- VPS staging, fail-closed cron authorization, domain/TLS cutover, single-scheduler
  ownership, member access, price freshness and payment compatibility need tests.
- Database and sustained egress must fit Free with headroom. Historical logs may
  only be pruned after a verified archive and specific retention approval.
- Pro subscriptions are NOT cancelled or scheduled for cancellation by this file.

## Validation and rollback

Run both cost scheduling tests, TypeScript, production build and impact audit.
Before deployment verify upstream main is unchanged. After deployment inspect
production cron configuration and run the read-only release validator. Report
`UPGRADE VALIDATION PASSED` only from that actual production check.

Rollback only this release and redeploy; no database rollback is needed. A
rollback restores the eight removed schedules, so it must be a deliberate action,
not an automatic repair. No fixed-dollar savings or VPS migration is claimed.
