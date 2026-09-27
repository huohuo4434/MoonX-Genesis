# Statistics query projection: 2026-09-27

Scope: only `buildStrategyStats` in `lib/trading-signals/three-horizon-strategy.ts`, its regression test and this record. No API contract, schema, environment variable, schedule, order, direction, risk limit or trading-switch changes.

Read-only investigation found a large cumulative query returning 2,000 complete decision rows per call. Statistics use eight columns, not embedded research/technical payloads. Select only those eight columns, retaining the same ordering, limit and calculation. No historical rows are deleted or revised. Cumulative query counters do not establish present-day byte savings; measure the reduction separately.

Verification: regression compares existing calculation with legacy full rows and projected rows, including wins/losses, zero risk, old rows, error attempts, empty profiles, missing DB and query failure. Require independent review, TypeScript, targeted cost/scheduling tests and production build before deployment.

Rollback: revert this query projection and redeploy. No data restoration is needed. This optimization alone does not establish free-tier suitability or cancel either paid plan.

Read-only same-snapshot sample of 2,000 rows at 2026-09-27T13:07:35Z: original JSON representation 6,167,315 bytes, projected JSON representation 554,582 bytes (about 91% smaller). This is a serialization proxy, not measured provider wire bytes or a claim of 91% total savings. Independent reviewer passed the projection and regression tests without blocking findings.

Local verification: 8 targeted tests passed; TypeScript and production build passed (six existing lint warnings); impact audit includes all three files and reports zero blockers. The expanded `three-horizon-strategy.test.ts` suite has one pre-existing unrelated UI-source assertion expecting `MEMBER_FEED` in the unchanged `AiTradingDeskClient.tsx`; the other 24 checks passed. Neither that test nor that component differs from the baseline. Do not report the full suite as green or change unrelated UI to hide this failure.
