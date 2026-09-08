# Live control authority fence and pause visibility

## Scope

- Trading store/runtime: capture authority before exchange IO; compare-and-set persistent freezes and LIVE changes; transactionally audit administrator mode changes.
- Admin GET/POST: authenticated reads; stops do not depend on exchange availability; concurrent LIVE conflicts return 409 without retries.
- Admin UI/presenter: safe, fixed-label historical reason with Beijing timestamp; distinguish historical pause, current preflight and permission; read-only refresh.
- Different second-snapshot anomalies block the current execution but are not falsely described as repeated anomalies. Repeated same code/symbol/position/slice still freezes; unavailable snapshots fail closed immediately.
- No database migration, environment changes, strategy direction changes, limit changes, implicit enabling, order submission or history deletion.

## Verification

- 46 targeted behavior tests passed across control-history, admin-control, control-mode, custody-race and orphan-protection suites. Includes direct LIVE-permission + custody-blocker entry-gate rejection.
- TypeScript no-emit passed; Next.js production build passed (pre-existing unrelated lint warnings).
- Separate reviewer `review_entry_pause` reviewed code and real entry-gate call chains and independently passed the initial 45 tests; no blocking findings.
- Impact audit: CRITICAL scope, zero blockers. Critical reflects trading paths, not a failed check.
- Additional legacy v72034 static suite still requires `if (!database) return [];` in the store. That obsolete source-string assertion already fails on the unchanged baseline; it is not a behavioral regression introduced here. Not changed to manufacture a green result.
- Production deployment, read-only installer validation, authenticated UI and unchanged-account verification remain release-time acceptance steps; this file does not assert orders were enabled or placed.

## Incident evidence

Read-only production audit on 2026-09-08: authority MANAGE_ONLY / entries false / management true, last changed 2026-09-07 05:50:43.917 UTC. The adjacent freeze event names PROTECTION_MISSING(INTCUSDT); a later event reports site-only position. This is consistent with a close transition but does not prove protection was never missing.

## Rollback

Revert only the commit containing this patch and redeploy using the normal Git integration. Do not reset the account mode, alter current positions, delete audit records, or weaken risk controls as part of rollback. Any live enable remains a separate explicit administrator action through the existing UI.
