# Owner-authorized trading retirement, 2026-09-28

Owner requested minimal content operations and confirmed all exchange positions,
ordinary orders, trigger orders and TPSL orders were zero. This is owner evidence,
not an independently completed all-order exchange API audit. The preceding production
snapshot showed zero positions and unsettled/retryable tasks; the all-order browser
read was blocked. No order was placed, closed, cancelled or repaired by this change.

Deployment-level retirement blocks ALL signed Bitget POSTs (including demo), forces
effective PAUSED/management=false independent of old environment/account flags,
short-circuits custody before side effects, and refuses admin trading control writes.
No schema, credential or stored ledger/account-history changes. No new environment keys.
Five schedules removed: prediction-auto-trader, trading-watchdog,
bitget-runtime-health, live-trading-custodian, member-ai-desk-sync. Their authenticated
routes return an explicit skipped response, so old callers cannot resume them.

Retained: daily-candle-projections (existing sourced research/market refresh, not a
trading executor), expire-memberships, member content, manual payments and public
market-price readers. This is not a forum redesign or subscription cancellation.

Verification: retirement tests, updated scheduling expectations, TypeScript,
production build, impact audit, independent review; production deployment and public
read-only upgrade validator must pass before declaring delivery. Check Vercel's
actual schedules and the existing VPS for an independent execution scheduler.

Rollback must PRESERVE the retirement gates and removed trading schedules. Do not
roll back to an old trade-enabled deployment. Any restoration requires fresh explicit
owner authorization and exchange safety checks. Historic records remain immutable.
