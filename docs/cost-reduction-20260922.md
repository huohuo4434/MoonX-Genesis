# Cost reduction — 2026-09-22

User authorized stopping optional automated monitoring while retaining price tracking and the rented VPS.

## This release

- Remove seven Vercel schedules: external analysts, X reports, Vibe evidence, social cards, lesson processing, strategy ensemble research, Qimen shadow research.
- Remove X freshness polling and automatic repair, so retained forecast checks cannot restart blogger collection. Show an explicit stopped notice; historical records are not fresh evidence.
- Preserve all other schedules for this first phase, including prices, member desk, payments, expiry, verification and trading protection. This is not a claim that only prices remain scheduled.
- No API authorization, environment variables, schema, stored forecasts, membership privileges, exchange positions, or execution switches are changed.
- Manual authenticated research endpoints remain available; external callers must separately stay disabled.

## Runtime work verified separately

VPS `moox-x-collector.timer` disabled and stopped; collector service stopped. Stone browser was already failed/static and was stopped. Local X tasks disabled and Codex growth/Substack automations paused. VPS network proxy and security maintenance retained.

## Billing boundary

Vercel billing displayed Pro through 2026-10-01, upcoming invoice $22.76 ($20 plan plus $2.76 on-demand as observed). AI credit auto-reload is off. These are a snapshot, not guaranteed final charges. Pro cancellation has NOT been completed. The commercial membership website still depends on Vercel; migrate and verify before cancelling. No other provider cancellation is claimed.

## Verification and rollback

Local acceptance: TypeScript and production build passed; 70 scheduling/research/safety tests plus 38 existing freshness/verification tests passed. An additional legacy shadow-scan regex test fails identically on the unchanged ba1c210 baseline; trading implementation was not changed to accommodate it. Impact audit: LOW, nine files, zero blockers. Vercel connector project lookup returned 403 for team huohuo2; no deployment or production acceptance was attempted after that authorization blocker. Website changes are LOCAL ONLY until a separately authorized release succeeds.

Run `node --test tests/cost-reduction-scheduling-20260922.test.mjs`, targeted existing tests, TypeScript, production build, impact audit, then the production release validator. Deploy through the existing GitHub/Vercel route. Roll back only this commit if needed; no database rollback. A rollback restores old schedules, so reapply the cancellation configuration before resuming normal operations. Do not re-enable the VPS collector without renewed user authorization.
