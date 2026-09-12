# Concise member trade plans — 2026-09-12

## Scope

- Shared bilingual plan view on daily, key dates, sector focus and AI desk pages.
- Reads the existing authenticated, rate-limited `/api/member/ai-trading-desk` snapshot. No new endpoints, dependencies, environment variables or database migrations.
- Uses published plan versions, entry zones, stops, targets, trigger rules and valid windows. Never invents prices from a forecast direction or support/resistance reference.
- Separates intraday, swing and position plans, live versus demo, conditional entries versus submitted orders and positions. Stale, incomplete, invalid or expired plans hide entry prices.
- Collapses background narratives without removing records. Shared research anchors reveal their containing disclosure.
- Read-only database timeout: 2.5s → 6s; member GET runtime budget: 10s → 20s. Concurrent settings reads share only a pending SELECT; subsequent requests reread privacy settings. Original database errors remain server-side.
- No forecast revisions, trade directions, account switches, leverage or protection limits changed.

## Acceptance

- Targeted tests: `node --import tsx --test tests/concise-trade-plan.test.ts tests/member-ai-trading-desk-sync.test.ts tests/member-ai-desk-polling-v723.test.ts`.
- TypeScript: `npx tsc --noEmit`; production build: `npm run build`.
- Browser fixture: `node tests/fixtures/concise-plan-qa-server.mjs` after a build. Bound only to localhost:8769, synthetic prices, no exchange calls. Chinese/English, 390px layout, stale-state hiding, empty horizons and old anchors checked. `?fetch` simulates two timeouts then successful recovery.
- Independent Reviewer approved the read-only backend and UI patch; production acceptance remains separate.
- Production must show the new shared cards, a successful authenticated snapshot read (or an explicitly diagnosed upstream failure), and release validator `UPGRADE VALIDATION PASSED` before claiming rollout success.

## Rollback

Revert this release commit and redeploy through the existing Git/Vercel integration. No database rollback, environment reset, forecast deletion or trading-state change is required.

## Production follow-up: cache capacity

- First UI deployment: `5413196`; public release validator passed at 2026-09-12T09:14:46Z.
- Authenticated production acceptance found the pre-existing snapshot cache could not write a 4,715,495-byte entry (Next.js 2 MB item limit). The UI correctly withheld points while the read failed.
- Follow-up stores the identical JSON snapshot as native async gzip/base64 inside the server cache, with a new isolated cache key. No history, forecast, risk, privacy, or execution fields are deleted. Fresh privacy settings are still read outside the cache on every request.
- Cache transport is bounded to 1.9 MB encoded / 32 MB expanded; damaged or excessive data fails closed. No public HTTP caching, schema changes, new dependencies or new environment settings.
- Added `tests/desk-cache-codec.test.ts`: a multi-megabyte snapshot round-trips exactly, stays below cache capacity, and damaged data rejects. Production read recovery still requires verification after the follow-up deployment.

## Boundaries

This release does not establish Discord ingestion or prove a profitable strategy. Original free-form rule text is preserved; the interface labels are bilingual, but unstructured source text is not silently translated or reinterpreted. A missing plan remains waiting.
