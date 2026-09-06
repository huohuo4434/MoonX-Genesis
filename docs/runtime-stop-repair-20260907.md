# Accidental-stop audit, second pass — 2026-09-07

Base commit: `f24ff7cad0e1eab0a2bf34697bb98679aad4b2d1`.

## Scope

- `lib/trading-signals/unified-live-custody-core.ts`: distinguish expired live exposure from a confirmed absent exchange position.
- `lib/bitget/demo-runtime.ts`: serialize runtime settlement, fence stale owners, deduplicate one run's error accounting, preserve pause severity, distinguish system errors from Bitget API errors.
- Regression tests execute real functions with mocked IO; no real order submissions or manual account switches.
- No API route, authorization, schema, environment variable, budget, leverage, position or protection-limit changes.
- Rollback: restore the preceding code deployment/commit only. Do not reset account permissions, positions, or historical evidence.

## Evidence and behavior

At Beijing 2026-09-07 00:02:54.510, the same SOL ledger entry produced both `SITE_ONLY_POSITION` and blocking `TIME_EXIT_DUE`. The later audit now excludes a confirmed absent slice from time-exit blockers; actual overdue exposure and unknown exchange state still block. Existing two-read confirmation remains required before reconciliation side effects. This refines the earlier audit: earlier TIME_EXIT events with actual exposure may be genuine, whereas a confirmed-flat late event is not.

Runtime previously read pause state and wrote it later without serialization. Settlement now takes a short row lock before reading current controls. Administrator UPDATEs serialize on the same row. No network or order work is performed in that transaction.

Final state can commit before FINISH persistence or owner release fails. The run ID in the committed report prevents counting those failures as another cycle. A row-owner check also rejects late writes after a newer run replaces the report. Early health writes have the same owner fence and fail if no matching row was updated.

`AUTO_ORDER` and manual pauses cannot degrade into an API pause that later auto-recovers. A known critical/system error does not increment healthy recovery counts. Log/database/finalization errors are diagnostic system errors, not invented Bitget API failures. Actual consecutive order and API failure thresholds are unchanged.

## Validation

- Targeted tests include real finalizer failure callbacks, ambiguous commit retry, owner replacement, manual interleaving, failed engine health, actual overdue exposure and unknown exchange state. Final counts are recorded in production acceptance.
- Commands: `node --import tsx --test` with runtime-pause-settlement, unified-live-trading-custody-race, unified-live-orphan-protection, live-duration-runtime, trading-reliability-phase4, three-horizon-strategy, unified-live-admin-control, unified-live-control-mode, runtime-resume-gate-v71513, runtime-admin-action-gate-v71510 and live-runtime-scheduling-v7185 test files.
- A separate older `unified-live-trading-v72034.test.mjs` static assertion expects `if (!database) return [];` in the store. The baseline store already fails closed instead; neither that store nor the old test changed in this patch. This legacy failure is disclosed, not silently removed or reported as passing.
- Final targeted run: 164 passed, zero failed. Final `npm run typecheck` passed; `npm run build` passed (65 generated static pages, six existing unrelated lint warnings). Strict impact audit: HIGH risk, zero blockers.
- Independent reviewer approved the final diff, reran 32 targeted cases plus the final 10-case settlement suite. Production validation remains separate from this local review/build record.

## Boundaries

- No automatic re-enable of the unified LIVE account has been added or performed.
- API auto-recovery retains the existing critical market/account-health semantics. A later FINISH log failure resets healthy accounting and records a diagnostic; it does not undo a prior recovery or overwrite an administrator action. Do not claim FINISH and recovery are one atomic transaction.
- Two exchange snapshots are not an atomic exchange/database transaction. Genuine missing protections, unavailable snapshots, risk thresholds and overdue live exposure still block new entries.
- Production acceptance requires the deployed commit, `UPGRADE VALIDATION PASSED`, authenticated read-only current state and a scheduled post-deployment runtime result. Unit tests alone are not production acceptance.
