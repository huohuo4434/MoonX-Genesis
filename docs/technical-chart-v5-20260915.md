# Technical-first member chart — 2026-09-15

User-directed prospective methodology change; overrides the old source-locked *chart* direction only. Published source records, results, live direction locks, trading permissions and risk controls are unchanged.

## Scope

- New pure technical research engine and same-venue spot 4h loader; daily loader wiring.
- Existing member GET auth/rate limits unchanged; shared engine-versioned 300s cache unchanged.
- Chart copy, window selection and tab-visibility refresh. No schema, migration, new environment variables, cron frequency, secrets or new dependencies.
- Private archive key includes technical inputs, including closed 4h snapshot. Upload remains create-only; old objects and failed predictions are retained.

## Rules

- At least 65 valid chronological closed daily candles. EMA60 trend (2 parts), EMA20 slope, MACD DIF, MACD histogram, five-bar displacement, prior-20-bar breakout (2 parts), normalized to [-1,1]. This is a heuristic score, not hit probability.
- Crypto adds the latest contiguous, closed same-venue UTC 4h history. Daily/4h = 70/30 for next 7 calendar days; 90/10 for next 28. No live/unfinished OHLC used as closed data. Missing/stale 4h explicitly falls back to daily-only.
- Score >= .2: choppy rise; <= -.2: choppy decline; otherwise range. No externally supplied bullish or bearish direction input.
- Daily historical pivots define support/resistance. Near a barrier (0.5 ATR) decreases path extent, not confirmation of a breakout or entry.
- Only available, pre-existing, dated explicit windows contribute local +/-0.15 ATR offsets. Final endpoint unchanged. Metaphysical source IDs/versions retained. No source => technical scenario still available, no invented metaphysical dates.
- Real historical daily bars remain unchanged. Projection can anchor to the most recent closed 4h price, explicitly shown in UI. Future candles remain a deterministic illustrative scenario, not actual quotes or demonstrated profitable forecasts.
- Exchange calendar validation retained; unsupported dates are not drawn. Refresh every 5 minutes while visible and on returning to tab. UTC crypto daily close is 08:00 Beijing.

## Validation / rollback

Run technical-candle-outlook and existing daily-candle/forecast/calendar tests; tsc; production build; impact audit; authenticated BTC/ETH CN/EN browser checks; anonymous API gate; release validator. Deployment uses existing GitHub main -> Vercel. Revert this release commit if necessary; old publications/storage remain intact. No change to live trading is authorized by this release.
