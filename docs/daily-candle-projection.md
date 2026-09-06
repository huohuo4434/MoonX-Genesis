# Daily candle projection v1

Scope: member key-date chart only. No trading permissions, locked forecast changes, financial orders, accuracy score changes, new packages or database-schema changes.

- Real OHLC uses verified quote identifiers and closed sessions only. US/HK equity closes are eligible at 16:30 exchange-local time (conservative on half-days). Crypto UTC daily bars finalize after UTC midnight. Commodity settlement/session calendars are not fully verified; those feeds retain the conservative next-exchange-date cutoff.
- Check latest expected trading date, not a blanket 3/6-day stale threshold. Missing/late candles suppress projections. Unsupported symbols remain visible with a no-price-feed notice.
- Display actual solid daily candles and model hollow daily candles on the same date/price axes. Future OHLC is a **conditional, uncalibrated ATR scenario**, not a known quote, validated target, probability or trading signal. Opening gaps are not modeled; opens equal previous projected closes; shadows are 0.25 ATR. Optional bands use ATR times square-root sessions, not a statistical confidence interval.
- Source direction/version remains immutable. Explicit dated windows constrain the scenario. Undated phase order is allocated across the original period and clearly labeled as an assumption; it does not restart daily. Monthly and weekly curves remain separate, not silently combined.
- `GET /api/cron/daily-candle-projections` is authenticated with existing `CRON_SECRET`, scheduled `25 * * * *` UTC in production. Nineteen verified price feeds are processed in batches of four. Partial failures return HTTP 503 and structured logs; next hourly run retries. No new secrets.
- Member `GET /api/member/key-date-chart` checks member/device access and rate limiting **before** a five-minute shared identity-free research cache. New page visits and focus/visibility regain load data; visible pages refresh every five minutes.
- Private Storage bucket `moox-private-daily-charts`, max object 1 MiB, JSON only; configured service role is server-only. No anonymous/member direct Storage grants. Create using `scripts/setup-daily-projection.ts --setup`. Existing public bucket is an error, never silently made public/private. Server refuses to use a public bucket.
- Each archive uses asset + calculation date + SHA256 of engine, closed OHLC and source versions/windows. Upload uses `upsert: false`; first writer wins. No `latest.json` or overwrite. New daily close/source revision/provider correction generates a different key. Generated timestamp is retained on reuse; check time is separate. Current-day after-open snapshots are not represented as pre-open predictions.
- Archive failure is visible and not counted as a saved sample. There is no automatic accuracy tally for synthetic candles. No retrospective backfill of prior forecasts.

Setup uses existing configured `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`. No environment values are printed or copied. Rollback: revert this feature commit to prior `aeca37f`, removing only the new cron registration. Preserve archived objects for audit; no destructive cleanup is part of rollback.

Acceptance: targeted tests, typecheck, production build, independent cron/security reviewer, zero-blocker impact report; validate private bucket, authorized cron run and unauthorized 401, production member chart in both languages; installer must print `UPGRADE VALIDATION PASSED`. A manual run does not by itself prove recurring cron delivery—check a scheduled production invocation separately.
# Verified calendar and feed correction

First authenticated cron invocation provisions the private bucket if absent, using the deployment's existing server credential; the member GET never provisions storage. Missing credentials, a public bucket or access errors fail closed. No local credentials are copied into the worktree or deployment.

The research chart uses its own 2026 NYSE/HKEX holiday table, including US Good Friday and Juneteenth, HK October 19 (October 2 is open). Projection generation stops outside supported calendar years. Precious-metal futures retain actual-price display only until their contract session calendar is verified. This does not alter execution calendars.

Crypto uses Binance spot `timeZone=0` or OKX spot `1Dutc`, with explicit UTC-midnight alignment and fully elapsed day checks. OKX also requires `confirm=1`. UTC+8 bars are rejected, never relabeled as UTC. Public provider responses were checked locally for BTC and HYPE.
