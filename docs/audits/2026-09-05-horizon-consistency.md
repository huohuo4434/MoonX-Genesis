# Member guidance and trading horizon audit — 2026-09-05

## Scope

Base: `1f800d28781eb13e2db3fb3267c690e699d4a346` in the isolated
`codex/live-two-buttons-20260904` worktree. Changes cover member hub/day/week/month
guidance, current sector/key-date scope, strategy horizon presentation, entry
holding deadlines, POSITION context vetoes and closing-position custody.

No API route, authorization, schema, migration or environment variable was added.
No locked prediction, historical verification sample, active account setting,
leverage/risk limit or live on/off switch was edited by this task. Existing profile
initialization now uses a 72-hour SWING default; runtime clamps new holding limits.
Existing position deadlines and stored custody slices are not rewritten.

## Invariants

- INTRADAY uses the formal weekly direction and a maximum 90-minute holding cap.
- SWING uses the formal weekly direction and a maximum 72-hour holding cap.
- POSITION uses the formal monthly plan, requires an independently valid aligned
  weekly leg, and only considers the supplied annual low/high candidate month for
  LONG/SHORT respectively. This is a veto, never an authority grant or a claim
  that an annual extreme has been confirmed.
- New orders use the earlier of their holding cap and the exact approved plan's
  expiry. The deadline is frozen before submission and shared with custody.
- Exit submission retains exchange protection. CLOSING stays in management after
  a failed close; retries use the existing stable idempotency key. Orphan protection
  cleanup remains the custody reconciler's responsibility after no-position checks.
- Current daily/weekly surfaces exclude retired prediction symbols from the
  existing effective date; older records and monthly research remain intact.
- Daily assessment is not a daily order quota. Signals still require market,
  direction, position, loss, drawdown, protection, custody and idempotency checks.

## Validation

- Targeted and adjacent regressions: 197/197 passed.
- `npm run typecheck`: passed.
- `npm run build`: passed, 65/65 static pages; six pre-existing unused-variable
  warnings in unrelated files remain.
- `git diff --cached --check`: passed.
- Impact audit: CRITICAL scope, zero blockers (before this documentation addition).
- Separate reviewer: final result recorded in the task, not inferred from tests.
- Local build is not evidence of production deployment or successful orders.

## Read-only production observation

At inspection, `/admin/live-trading` reported that its switch was already on but
the experiment had expired, so new entries were blocked. Continuous operation,
1000 USDT and 2x were displayed as a saved, not-yet-activated configuration. This
task did not activate it or renew the experiment. A fresh runtime check and the
explicit activation workflow are still required before claiming new entries run.

## Follow-up inventory, not claimed fixed

Some monthly research/display selectors still contain explicitly dated August /
September 2026 datasets and defaults. They need a separately tested rolling-cycle
selection update before later months; this patch does not fabricate missing future
forecasts. Existing longer-lived positions need read-only case-by-case review;
this release only freezes deadlines for new entries.

## Rollback

Revert this task's commit through the normal reviewed release path, then build and
run production acceptance again. Do not reset the legacy worktree or rewrite the
database. A software rollback must not toggle LIVE or erase trade/forecast history.
