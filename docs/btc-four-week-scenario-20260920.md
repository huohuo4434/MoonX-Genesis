# BTC four-week conditional review — 2026-09-20

User explicitly requested the website change after reviewing the proposed
consolidation-then-pullback scenario. This is RESEARCH_ONLY, not a change to a
locked teacher publication or trading authority. No order/cron/admin API,
database schema, permissions, environment variables or trading switch changes.

Scope: research scenario helper, technical-engine wiring, projection type/cache
version, shared member chart labels, regression tests, this release note.

The default BTCUSDT spot MONTH chart adds a labelled conditional hypothesis;
the unchanged technical MONTH baseline remains selectable. WEEK is unchanged.
The Sep 20 authenticated chart snapshot supplied resistance 81,272.62–81,478.87
and 82,300; support 79,500–79,890, 76,888, 76,046.58–76,264 and 74,967.97.
These are fixed dated references, not new orders or guaranteed targets.
Background: existing crypto-september-revisions-20260823 and
member-source-cross-check-20260901 records discuss September highs / later
pullback risk. The newly drawn dates and prices are not attributed to teachers.

Phase allocation: Sep 26 tests the resistance reference; Oct 3 tests 79,500;
Oct 10 tests 76,888; Oct 17 tests 76,264. These are illustrative assumptions,
not externally sourced turning dates or calibrated forecasts. The decline
assumes a failed rally and failed recovery of lost support; those events are
not inferred merely because time passed. Show CONDITIONAL unless the actual
daily close loses 79,500; SUPPORT_LOST still requires retest confirmation.

At/above 82,300 or at/below 74,967.97 withdraw the path for fresh review.
A post-publication daily boundary breach also withdraws it on later refreshes.
The review expires Oct 17; phases do not restart daily. Stale/invalid inputs,
other assets, other quote symbols and pre-publication requests cannot use it.
Existing immutable archive routing is unchanged; the new engine and distinct
scenario/withdrawal source IDs give new archive identities, retaining history.

Tests: btc-four-week-scenario, technical-candle-outlook, daily-candle-projection;
typecheck; production build; zero-blocker impact audit. Production acceptance
requires deployed commit, authenticated MONTH chart and baseline/WEEK checks,
and existing release validator UPGRADE VALIDATION PASSED.

Rollback: revert this release commit and redeploy the previous verified version.
No database rollback and no trading-state restoration is required.
