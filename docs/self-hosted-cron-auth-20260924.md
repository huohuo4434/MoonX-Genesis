# Self-hosted cron authorization migration gate

## Scope

Ten route-local guards now fail closed when CRON_SECRET is absent or blank:
content-freshness, external-analysts, generate-daily-forecasts, moonx-cycle,
prepare-focus-week, sync-verification, trading-watchdog, vibe-refresh,
verify-weekly and verify-daily-late. A spoofable cron User-Agent is not authority.

No database, schedule, dependency, trading direction, execution switch, risk
limit, payment or membership changes. CRON_SECRET already exists; no new
environment variable. Valid Bearer comparison semantics remain unchanged.

The regression test is tests/self-hosted-trading-cron-auth-20260924.test.mjs.
It runs actual denied GET/POST handlers with stubbed business dependencies and
asserts 401 plus zero business calls. Correct Bearer is tested at guard level,
not by executing authenticated production jobs.

## Verification and deployment boundary

- Targeted cron authorization plus lean scheduling tests: 22 passed.
- Independent read-only reviewer: no code blocker; valid authenticated runtime
  still requires a separately authorized commissioning check.
- TypeScript: passed.
- Production build: passed; six pre-existing lint warnings remain.
- Full changed-file impact audit including untracked test and documentation:
  CRITICAL classification (cron/trading-watchdog scope), zero blockers. The
  default audit omits untracked files, so --files was supplied the actual full
  tracked-diff plus untracked file list, without changing audit rules.
- Local changes only. Not a deployment or paid-plan cancellation confirmation.

Before deploying, provision a nonblank CRON_SECRET in the server and use the
matching Authorization: Bearer header from the sole authorized scheduler.
Verify retained watchdog scheduling and protection health without placing new
orders or changing trade switches. Do not invoke production cron endpoints as
an unauthenticated health probe until the deployed guard is confirmed.

## Rollback

No data rollback is needed. If a retained job is unauthorized after migration,
keep the prior production host and scheduler until the staging key mismatch is
corrected. Do not restore keyless access or run duplicate schedulers. Only after
authenticated website, payments, memberships, price freshness, protection and
single scheduler acceptance may hosting cut over and Pro cancellation proceed.

## Fresh capacity check (read-only)

At 2026-09-23 22:41:53 UTC (2026-09-24 06:41:53 Beijing), Supabase organization
still reports Pro. Production database: 682,822,803 bytes (about 651 MiB);
storage: 1,621 objects, 442,653,354 bytes (about 422 MiB). This differs from the
September 23 backup baseline and requires a fresh/incremental backup before
any approved production retention operation. Official Free limits remain
500 MB database, 1 GB storage and 5 GB ordinary egress; current ongoing egress
has not been re-measured in this check. See https://supabase.com/pricing .

No production rows, credentials, DNS, subscriptions or runtime switches were
changed in this hardening step. Server credential/backup transfer and production
archive/pruning were requested as separate explicit approvals. The user approved
both in the next turn on September 24. The migration checkpoint and protected
backup evidence are kept outside Git; approval does not imply completed cleanup,
commissioning or subscription cancellation.
