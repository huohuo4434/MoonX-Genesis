# Trading software repair — 2026-09-05

## Scope

- AdminNav: disable speculative route prefetch, expose the existing live-control page, use a mode-neutral Bitget diagnostic label.
- Admin Bitget page and client: replace stale 100/500 USDT loss/drawdown, ten-position and unlimited-daily-order prose with actual environment limits. Displayed configuration is not an active lease or permission. No limits change.
- Three-horizon engine: preserve unknown opening time instead of resetting it to the observation time. Explicitly report missing/invalid holding metadata, prohibit scale-in, and propagate the existing management-error stop to new entries. Continue protection management, TP1 and other positions. Preserve valid frozen deadlines and pending closing requests.
- Intraday calendar helper: validate timestamps before ISO formatting; evaluate the existing Beijing 23:45 / date-rollover exit once.
- Member holding description: SWING is 2–3 days with a 72-hour new-position cap, not 1–7 days. POSITION remains 1–4 weeks within the annual window.

No API, database schema, migration, forecast, environment variable, budget, leverage, account mode, experiment expiry, loss limit, drawdown limit or protection-order setting is changed. Existing environment references in the large engine file are unchanged.

## Safety boundaries

Unknown metadata does not authorize an immediate market order or a fresh holding window. Valid frozen deadlines remain enforceable even when an opening timestamp is missing. Missing deadlines require reconciliation against original order evidence; this patch does not manufacture or silently migrate them. Exchange protection is retained. The management error prevents new entries via the existing engine gate and does not set account LIVE/MANAGE_ONLY.

The production read-only check on September 5 showed the original experiment expired September 3 at 23:30:36 Beijing time. A saved continuous-operation configuration is a draft, not an active lease. This patch does not renew authority. Tests do not establish actual exchange fills or profitability.

## Verification

Targeted coverage includes trading-holding-clock-core, admin-navigation-load, trading-horizon-policy, live-horizon-display, member-horizon-consistency, three-horizon-strategy, unified-live-control-mode, live-trading-renewal-preview, ultra-short-execution-core, live-scale-in-safety-core, trading-reliability-phase4, live-trading-market-session-exposure, bitget-protection-outbox-preflight, unified-live-orphan-protection and live-renewal-preview-route. Run with `node --import tsx --test`, followed by typecheck, production build and independent review. Test stubs/pure checks must not call an exchange write API.

## Rollback

Revert the isolated repair commit or return the production alias to the previously validated `6504f0e` deployment. No database rollback or account-state change is needed. Do not deploy the unrelated dirty legacy checkout. Production acceptance requires the read-only release validator plus authenticated navigation and runtime-log checks; a passing build alone is not production acceptance.
