# September 25 BTC / ETH public research note

## Scope and authority

The author asked to summarize the supplied bearish thesis and publish on MOOX with two original charts. Add a dated, fully public article to the existing public-notes component; preserve the September 19 catalogue and all locked forecasts. User-provided chart annotations remain attributed scenario analysis, not execution instructions.

Files: one static content module, one server component, a small PublicNotes integration, two unchanged original PNGs, targeted tests and this release record. No API, database, schema, environment variable, authentication, payment, cron, membership or trading changes. No additional package, network polling or image-optimization usage.

## Evidence boundaries

- Charts: Bitget USDT perpetual contracts, not exchange spot or ETF prices. Latest right-side MACD values are above signal lines in both charts. BTC crosshair upper-left figures are historical (April 29), not latest.
- Treasury September 18/24: 10Y 5.01/5.18; 30Y 5.34/5.47. Cboe September 24 delayed VIX 15.67.
- Farside September 21/22/23 aggregate BTC ETF flow USD millions 999.0/714.7/346.9. September 24 incomplete; no zero-flow assertion.
- EIA September outlook is dated context, not real-time WTI or fresh conflict confirmation. Meeting timing sourced to the September 25 foreign-ministry release. Election November 3 sourced to FEC; results and policy consequences not assumed.
- Teacher annual-high claim attributed to author recollection, not newly verified; earlier higher price visible in supplied chart is retained as contrary evidence.
- Source links appear alongside corresponding sections. New observation does not overwrite historical research.

## Validation and rollback

Run targeted public-note tests, TypeScript, production build and impact audit. Verify anonymous `/member/notes#note-btc-eth-risk-20260925`, both exact image assets, production commit and `scripts/validate-upgrade-readonly.ts` (without local production credentials). Production acceptance must print `UPGRADE VALIDATION PASSED`.

Rollback: revert only this release commit through the existing GitHub-to-Vercel deployment path. Do not restore/delete unrelated files or change trading switches. No data rollback needed.
