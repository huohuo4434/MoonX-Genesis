# Custody read-skew repair — 2026-09-07

## Scope and safety

Base: `fbe97db9e827b80fb1a00aa306ecb8e521adcca1`.

- Only unified custody runtime, its store, and regression tests change.
- No exchange order submission, account toggle, position modification, risk-limit change, environment change, or schema migration was performed during this repair.
- The existing manual LIVE control and genuine custody blockers remain in force. There is no automatic re-enable.
- Rollback is the preceding code deployment/commit; do not reset trading records, orders, or account permissions.

## Failure evidence

Historical timestamps below are Beijing time, 2026-09-06:

- SOL submission: 22:55:47.622; custody registration: 22:55:51.333.
- An `ORPHAN_EXCHANGE_POSITION` blocker was recorded at 22:55:52.817.
- Runtime subsequently recorded `ACCOUNT_NEW_ENTRIES_DISABLED` from 22:57:07.

The old runtime persisted `MANAGE_ONLY` from one non-atomic exchange/ledger snapshot. The close timestamps strongly support read skew around registration; they do not prove the exact start time of every read. Later `TIME_EXIT_DUE` events were genuine separate blockers and are not disabled by this patch.

## Changes

1. Both inspection and reconciliation read exchange state before the ledger. Suspect snapshots, WARN-only missing positions, and pending promotions receive one fresh confirmation read before reconciliation side effects. Healthy steady-state scans still read once.
2. Confirmation failure does not reuse the first snapshot's closure, cancellation, or promotion lists. Persistent unknown exposure remains blocked.
3. A freeze compares account ID, original `updatedAt`, LIVE mode, and enabled state. It preserves the management setting and records `CUSTODY_NEW_ENTRIES_FROZEN` atomically with the successful freeze. Concurrent user changes cannot be overwritten by that stale authority version.
4. The 200-row display history cap no longer excludes older active custody slices.

## Validation

- New custody race suite plus existing orphan-protection suite: 21 passed.
- Related three-horizon, reliability, duration, continuous-transition, market-session, and protection-outbox suites: 103 passed.
- `npm run typecheck`: passed.
- Independent Builder/Reviewer separation: reviewer reran the 21 custody tests and approved the limited patch with no new blocking finding.
- Impact audit: HIGH risk, zero blockers; no new environment variables.
- `npm run build`: passed (Next.js 15.5.22; 65 static pages generated). Six pre-existing unused-variable lint warnings remain in unrelated files; no lint/type/build errors.

## Production boundary

The read-only account check during this repair showed LIVE with both new entries and position management enabled. The ledger showed SPYUSDT and INTCUSDT MEDIUM LONG OPEN. SOLUSDT was closed with `EXCHANGE_POSITION_ABSENT`; this ledger reason does not independently establish whether the exchange close was a stop-loss or manual action.

Deployment has NOT been completed. The connected Vercel deployment lookup returned HTTP 403 for this project's team scope. No alternative deployment path was used to bypass that permission failure. No `UPGRADE VALIDATION PASSED` production acceptance is claimed.

## Remaining limitation

Two reads reduce transient registration errors; they do not make exchange/DB operations atomic. A registration delay spanning both reads still fails closed. Full atomic coordination would require separately reviewed pre-submission intent and a shared execution/custody lock. This patch does not promise that legitimate time exits, missing protection, or API failures can never halt new entries.
