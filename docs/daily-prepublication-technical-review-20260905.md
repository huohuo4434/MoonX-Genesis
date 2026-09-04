# Daily pre-publication review — 2026-09-05

## Scope and rollback

Daily forecast generation, closed-candle technical review, source-stage selection, revision comparison and daily/tomorrow/home presentation. Reuse existing public market readers and Chan structure analyzer; EMA extraction preserves its original algorithm. No new dependencies, API routes, database schema, environment variables, order submissions, LIVE switches or account configuration changes. Roll back the release commit; do not delete appended forecast versions or rewrite locked history.

The next scheduled future-date generation can persist a new version after existing publication gates. This release does not call a generation cron manually or claim a newly generated production forecast exists merely because code deployed.

## Technical interpretation

- Capture the review cutoff before reads. Exclude unfinished/future bars, require at least 65 unique valid bars, reject conflicting OHLC duplicates and stale data.
- 1D, 4H, 1H use EMA60, MACD(12,26,9), previous structure highs and existing Chan zones. Two closed bars above the prior high distinguish a confirmed structure break from resistance proximity.
- Larger-frame penalties are a conservative rule, not evidence of higher predictive accuracy. Cap combined continuation reduction at 15 points. Move bullish continuation score to flat, not to bearish, without changing official source direction.
- Crypto retains existing multi-source spot/futures selection and reports each selected provider. Index/metals retain their native Yahoo symbols, not ETF substitutes. No cross-frame level averaging or order generation.
- Exchange calendars are handled by existing readers. The pure review adds a conservative timestamp-plus-duration close test; for session-based daily bars this can deliberately lag the actual exchange close. It must not be marketed as the latest intraday price.
- Missing reviews remain visible. Snapshot text is separate from current live levels. Newly technically reviewed records do not infer method-consensus stars from adjusted scenario scores. Missing method assessment is not a low star rating.

## Teacher-source audit

Confirmed existing stage records, not newly invented predictions:

| Evidence | Existing stage | Important boundary |
| --- | --- | --- |
| BTC target-window reading | 2026-08-24 through 2026-09-10 | Upward probes with USD 80k–85k exit/pressure discussion; the stated difficulty of breaking 85k is not a bullish probability. Do not extend this record after Sep 10. |
| SOXL two-month reading | 2026-08-25 through 2026-10-25 | Stronger period after Sep 7; source discusses a broad mid/late-Sep to early-Oct peak opportunity and greater risk after Oct 7, not a guaranteed single peak day. |
| SNDK three-month reading | 2026-07-07 through 2026-10-07 | Weak early period, gradual recovery, stronger expectation after Sep 7. Not evidence all semiconductor names follow the identical daily path. |

Overlapping stage and weekly paths are not necessarily opposite forecasts. Keep teacher priority and complete stage path, expose the other valid weekly path and stage expiry, and lower unqualified consensus assumptions. Reader eligibility requires publication and locking no later than the captured evidence time. Historical records and original source refs are untouched.

Three legacy source references point to an old Desktop folder. The matching supplied transcripts are now at:

- `C:\Users\13558\Desktop\网站相关\01_六爻老师\丙午-比特币9月10号前能否突破8.5万 .txt`
  SHA256 `32CAEDBAFA515D51FF405408F6D2E43C9593F461C1334DDA53094E1172950CA2`
- `C:\Users\13558\Desktop\网站相关\01_六爻老师\丙午8.25-10.25s三倍半导体未来2个月预测 .txt`
  SHA256 `C32D3F0826D6464793CC8381421D4475502C9E479050DD028055B9D14BB73DAD`
- `C:\Users\13558\Desktop\网站相关\01_六爻老师\闪迪未来3个月走势如何7月7号测的.txt`
  SHA256 `50894116A93B5D0F7A7A53CD3A300DE932C9576816954FF46C2E7381445B2338`

## Explicit remaining gap

The repository's full same-window 55:45 conditional Liuyao arbitration is not wired into this daily selector. The existing conditional authority module has older semantics and no complete production caller supplying all required independent checks. This patch does not invent those inputs or claim the exception is implemented. It preserves teacher-first stage selection, exposes disagreements and enforces time eligibility. This is a bounded source audit, not a claim that every historical video has been re-transcribed.

TradingView chart libraries are renderers with a caller-supplied datafeed; an embedded TradingView chart is not itself a licensed unrestricted historical-candle API. This release adds no TradingView scraping.
