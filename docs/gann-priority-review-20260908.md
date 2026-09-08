# Time-price research integration V1 — 2026-09-08

## Scope

Member sector-resonance (six core assets) and Gann (13 assets), plus the existing admin intelligence review queue. Curated records join `listResearchRecords()` with private traceable source references. No API routes, schema, environment variables, dependencies, cron frequency, forecasts, scores or trading configuration change.

The administrator queue actually sorts active records with core Bingwu evidence first and BTCTW0 second. Other sources retain relative order. This is editorial priority, **not** a newly calibrated percentage vote. Existing Gann forward-verification and execution gates remain unchanged.

## Evidence and time boundary

Original post: https://x.com/BTCTW0/status/2096898294320656565 (2026-09-07T09:48:06Z). Local report reviewed 2026-09-08T04:04Z; 26 supplied screenshots plus transcript. New structured records use the review timestamp, never the earlier post timestamp. Review expiry is 2026-09-13T16:00Z, an editorial reassessment deadline, not an analyst's predicted top.

Research-only/provisional, consensus ineligible, no-direction-score, no order levels. No source claims become independently confirmed market facts. Numeric screenshot levels are withheld from the member overlay because venue and adjustment bases are not reconciled. SPCX 134/151 vs earlier 138/152 remains unresolved. SPX retired coverage stays retired; no TSLA/HYPE/ASTEROID extrapolation.

## Server update flow

Existing VPS collector runs every 15 minutes and persists original X posts. Admin-only inbox reads up to 20 newer BTCTW0 posts after the reviewed video, newest first, using the existing Prisma connection and parameterized read-only SQL. New posts appear after refresh; a query error is unavailable, never zero pending. Do not add another local/VPS scheduler. Existing single-asset eligible text continues through `getVerifiedGannPredictionSignals`; multi-asset video transcription/QA remains a separate review, not unattended publication.

## Validation / rollback

Run new targeted test plus crypto/semiconductor and Gann regression tests, TypeScript, production build and impact audit. Verify member zh/en, anonymous access and admin pending state in production. Run the existing read-only release validator; do not claim acceptance before `UPGRADE VALIDATION PASSED`.

Rollback: revert this release commit and redeploy through existing Git integration. No data, environment or trading rollback required. Historic material is retained.

Production acceptance exposed a legacy parser problem: unsupported stock mentions could leave BTC as the only detected symbol, and decimals/price ranges could become dates. A Gann-consumer guard now rejects conflicting cashtags/equity names and punctuation-only date extractions. Raw promotional summaries and unreconciled price arrays are no longer rendered in the recent member feed. Existing locked forward samples are preserved; no shared trading parser or order code changes. MU/MSFT/LITE use existing canonical asset IDs.
