# Cron timeout repair — 2026-09-05

Baseline: ebb69974bd9781c900a08bfb82bc6f143306ce9a.

## Scope

- Three routes: verify-daily, crypto-beijing-reverify, x-intelligence-report.
- Verification batching and crypto Beijing-session provenance; no scoring rule changes.
- Sync and review write batches, with deferred counts rather than fabricated outcomes.
- No database schema, environment variable, trading permission, leverage or protection changes.

## Runtime contract

- Routes allow 300 seconds. Daily/stock verification stop starting records after 180 seconds,
  leaving room to finish in-flight provider retries and sequential writes. This is a cooperative
  cutoff, not a guarantee that an unresponsive storage provider can never hit the platform limit.
- Daily maximum eight records, stock maximum four; source sync maximum twelve per source and
  a shared 45-second start cutoff; review maximum four new reviews within the daily cutoff.
- Crypto migration rotates at most two candidates hourly. Explicit IDs skip source sync and
  reviews. Unavailable, non-auditable or unmarked results are rejected before writes; forecasts
  themselves are never mutated by migration. Corrections may lower as well as raise hit rate.
- X report only generates its two reports. Full freshness repair remains in the existing
  generate-daily-forecasts schedule (every three hours) and authenticated content-freshness
  endpoint. The former 15-minute X hook is removed, including its redundant Gann/full-site repair.
- No detached promises or record-level parallel writes to JSON stores are introduced.
- Normal daily runs skip finalized records before late-cutoff handling, retaining historical
  verdicts unless explicitly reopened. Not-yet-closed sessions stay published without a
  premature verifying-status write. Existing retry ordering prioritizes unattempted records.
- A failed storage write can be a partial primary/alias commit. It is reported as
  writeOutcomeUnknown, never as a proven preservation or a successfully upgraded sample.
- Responses explicitly expose partial/deferred work. Optional post-run dashboard aggregates are
  no longer recomputed on the daily Cron critical path; legacy keys remain null with a flag.
- All three routes require CRON_SECRET; User-Agent is not authentication.

## Verification / rollback

Run `node --import tsx --test tests/cron-timeout-repair.test.ts` plus existing daily/session/
crypto/pattern regressions, typecheck, production build, impact audit and independent review.
After deploy verify the source commit, scheduled route completions and absence of new 60-second
timeouts; run `npm run release:validate -- --site https://mooxintel.com`.
Build success alone is not production acceptance.

Rollback by reverting this isolated commit or restoring the preceding Vercel deployment. No
historical records are deleted. Existing upgraded verification results retain provenance.
The pre-existing cross-invocation JSON-store lost-update risk is not a new transactional lock
implementation and remains outside this timeout repair.
