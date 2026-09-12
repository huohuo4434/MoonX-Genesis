# Member operation desk

Scope: member home, daily/key-date/sector default presentation, shared concise cards,
compact chart and header/footer/mobile catalogue. No API, DB, environment, cron,
order execution, live state or historical forecast edits.

One asset selection controls exact-symbol plan filtering and reference-market OHLC.
Three strategy horizons retain actual validity/confirmation and missing-plan states.
Reference candles are explicitly not interchangeable with the plan's contract;
do not project contract stop/target lines onto a different spot/futures feed.
Daily bars are context, not an intraday execution confirmation. Future candles are
labeled scenarios; stale data suppresses scenarios. No fabricated prices.

Research is retained at daily?research=1, key-dates?research=1,
sector-resonance?detail=1. Primary navigation is desk, notes, videos, review, services.
Existing deep links to old section anchors should use these archive query parameters.
No records deleted. No new dependencies. API authentication/rate limiting unchanged.

Validation: operation-desk and existing concise/chart tests, TypeScript, production
build, impact audit, bilingual desktop/mobile fixture and live member acceptance.
Rollback: revert this presentation commit, rebuild and validate; no data rollback.
