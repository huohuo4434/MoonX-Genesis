# Four-week member chart context revision — 2026-09-20

Scope: research-only chart loaders, source-path presentation, deterministic candle
composition and bilingual member UI. No order, account, cron, API authorization,
database schema, membership or environment-variable changes.

## Root cause and policy

The old four-week default reused a short-term EMA/MACD score. Published source
direction was retained only as timing annotations and could disappear from the
plotted medium-term path. A single BTC conditional patch did not address the
other assets.

The new default uses the active monthly/stage record as context and already
published independent weeks as local direction. Otherwise narrower structured
calendar phases precede broader months. Raw prose is not parsed into invented
dates. Price amplitude, anchor, historical residuals, support/resistance and wicks
remain derived from closed market data. This is not a measured probability model.
The pure technical momentum baseline remains selectable with its differences
visible. Existing BTC review and withdrawal rules are preserved.

Future weekly selection uses today's publication cutoff, not future knowledge.
No current monthly/stage record means no source-based scenario. Sources expiring
before the four-week window are truncated, not extrapolated. Phase geometry keeps
the original source interval and elapsed progress. Source transitions integrate
local increments and do not reset the quote.

## Source coverage reviewed

- ETH: September 21–27 weakness, September 28–October 4 limited recovery, stage
  coverage ends October 7. The remaining tail is pending new evidence.
- SOL: September weakness versus October rise in the existing autumn source.
- HYPE: independent weekly variation followed by its October rising phase; not
  treated as a uniform bearish crypto forecast.
- SPCX/LITE: their differing weekly phases are retained, with coverage to October 7.
- TSLA: existing stage expires October 4.
- GOOGL: multi-month range context is retained, not force-converted to decline.
- September-only equities, metals, WTI and other sources end September 30.
- All 26 current source-backed chart assets are covered by synthetic regression
  fixtures for finite OHLC, continuity, immutability, phase differences and expiry.
  Synthetic fixtures test mechanics, not market accuracy or production feeds.

## Verification and rollback

Run the horizon-context, technical-candle, forecast-path, daily-candle and BTC
scenario suites; TypeScript; production build; strict impact audit. Verify the
authenticated member UI and release validator after the existing Git-to-Vercel
deployment. Only then report production completion.

Rollback: revert this upgrade commit and redeploy through the same Git workflow.
The previous engine namespace remains intact; no archive is overwritten or
historical publication edited. New engine namespace:
`technical-first-v7-horizon-context-20260920`.
