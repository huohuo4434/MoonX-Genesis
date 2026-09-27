# Source-backed member charts · 2026-09-27

User approved removing unsupported future price simulation, retaining observed market data and reconnecting traceable research.

## Scope
- `lib/market-data/key-date-daily.server.ts`: retains original daily providers/finalization; returns zero synthetic projections, source records, and BTC-only existing annual editorial context. No extra 4h simulation fetch.
- `lib/research/source-research-view.ts`: original source direction, horizon, dates/version; reject expired, future-locked and cross-asset sources; explicit future windows only; coverage gaps without filling them.
- `lib/research/daily-candle-projection-core.ts`: new cache namespace and additive source fields. Historical generator functions/archives retained, not used by the live member loader.
- `components/member/DailyCandleChart.tsx`: both layouts and locales use actual OHLC only, even with old payloads. Latest editorial context is separate from old locked records; missing sources fail closed.
- `components/member/ResearchCandleTerminal.tsx`: actual-only accessible label; hide unavailable simulation focus control.
- Relevant tests and this record only. No database/schema/environment/auth/payment/order/cron configuration changes. Member API authorization unchanged.
- Live acceptance found retired simulation wording in `KeyDatePriceChart`, `MemberWayfinding` and the stock-picks help text. A scoped follow-up updates those labels only, with a regression test; the full chart already uses the same actual-only component.

## Integrity
No replacement synthetic bearish path, fabricated targets, probability or daily turning dates. Annual background is not weekly authority. ETH/SOL/HYPE do not inherit BTC targets. Existing predictions and failed samples are not edited. An empty projections list takes the existing no-archive-write branch; no historical archive is removed.

## Verification / rollback
Run source-view render tests (`--conditions=import` for the ESM chart library), mocked provider loader tests (`--conditions=react-server`), impacted legacy regressions, TypeScript, production build, impact audit, live Chinese/English BTC/ETH browser checks and read-only upgrade validator.
Code-review-graph is not installed in the available Python runtime. No installation or unrelated dependency change.
Local gates passed: 45 source-view / impacted regression tests, 1 mocked live-loader test, `npx tsc --noEmit`, and `npm run build` (Next.js 15.5.22). Build reports only existing unused-variable warnings in unrelated files. The explicit 14-file impact audit has zero blockers. Production/browser acceptance remains a separate post-release gate, not implied by these local results.
Pre-change release: `b4aeaa9bac6f75bf124437caed8f043a74674eef`. Revert this scoped commit or route back to that release only if needed; doing so would restore the old unwanted simulations. Prefer a forward fix. No data rollback required.
