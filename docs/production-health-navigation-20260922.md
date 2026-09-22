# Production health and on-demand navigation — 2026-09-22

## Evidence and scope

- Production baseline: `6a0c43b`, deployment `dpl_4ERTEEddz86GCndSuYYsxbNToCiG`.
- Authenticated English member page loaded BTC and ETH daily candles (100 closed bars through September 21), source/checked timestamp and explicit simulation markings. This is not verification of every asset or an executed trade.
- Runtime logs in the 22:20–22:50 UTC+8 window included successful member, auth, payment-reconciliation and snapshot requests, but also snapshot cron 503 responses at 22:24, 22:32 and 22:34. The 22:34 request lasted 6.07 seconds; no underlying exception was recorded. Timeout is a hypothesis, not a confirmed cause. Snapshot runs at 22:46 and 22:48 returned 200.
- Hourly candle projection at 22:25 returned partial failure: `lian-tech` and `lexin-medical` were not ready; the other listed assets succeeded. Do not describe all feeds as healthy or fabricate missing candles.
- Loading the member page also requested unseen `/admin`, `/en/account` and other navigation destinations. Global navbar links used default prefetch; menus explicitly prefetched on hover/focus.

## Changes

- `Navbar.tsx` and `NavbarSession.tsx`: disable speculative link and menu prefetch. Keep actual navigation, locale links, keyboard controls and session/admin gating. First click may take longer; price/safety polling is unchanged.
- `member-ai-desk-sync` cron: log only a fixed diagnostic category and duration on failure, with no raw provider message, URL, stack or credential. Keep auth, cadence, generic 503 and snapshot-only behavior unchanged. This is diagnostic coverage, **not a claimed fix of intermittent sync failures**.
- No database/schema, environment, billing, trading-authority, price-frequency or forecast edits.

## Verification before deployment

- 44 targeted snapshot, freshness, read-only publication, privacy, heartbeat and navigation tests passed.
- TypeScript passed; full Next.js production build passed with existing unrelated lint warnings.
- Independent reviewer `cost_health_review`: no blockers; independently ran all 4 new tests.
- Broader run: 46/47 passed; existing `admin-navigation-load.test.ts` fixed-duration literal assertion fails (`liveDurationDays`). Test and both referenced admin components are byte-equivalent after line-ending normalization to production baseline. No weakening/editing of that test or trading implementation.
- Impact audit required immediately before commit; production acceptance recorded separately after deploy.

## Rollback

Revert this code commit and redeploy through the existing Git-to-Vercel flow, or reassign the previously validated production deployment if necessary. No DB rollback or credential changes are required. Reversion restores speculative navbar reads and removes fixed-category diagnostics; it does not alter trading settings.

## Production acceptance

- Code commit `db00fb712ba9c65445d9a7e570826b5e0e03da8c` pushed to main through normal Git transport.
- Vercel `dpl_5c2Ti7amFjUknDxtQ8QHwgm1dw5u` became Ready, production domain `mooxintel.com` assigned; build duration 3m04s.
- Public validator at `2026-09-22T15:06:36.615Z`: home, pricing, login, anonymous-member gate and auth health all passed; `UPGRADE VALIDATION PASSED`. `stored:false`: local timestamped result only, no provider credentials exported.
- Reloaded authenticated English member page: current 23:06 UTC+8 desk snapshot and BTC chart loaded, browser warnings/errors empty. Actual navbar Guide click navigated successfully.
- Switched to Simplified Chinese using the language menu: member page loaded, desk snapshot advanced to 23:08, chart checked at 23:07:06. Four-week toggle selected successfully; existing September 21 V2 revision remained visible. No research content was changed by this release.
- New-deployment log sample through 23:08: 37 HTTP200, two HTTP404 for `/api/session/properties`, zero warning/error/fatal and no 5xx in that sample. Those 404s are not a known application route/call in app/components/lib/public; source not established, not silently suppressed.
- Final refresh through 23:13: current deployment showed 75 HTTP200 and the same two404, zero warning/error/fatal; snapshot cron and member/chart requests appeared in the successful sample. This is a short observation window, not a sustained reliability guarantee. Other page links can still prefetch; this change is scoped to the global navbar, not an assertion of zero speculative requests site-wide.
- Older deployment logged a member API504 at 23:00:43 (20-second platform timeout). Existing intermittent failures remain an open issue, not a claimed repair. New diagnostics and fewer speculative navigation requests do not prove a root cause or lasting resolution.
- Payment transactions, mail delivery, every market feed and sustained-load stability were not tested. No real transaction, member change or order was submitted.
