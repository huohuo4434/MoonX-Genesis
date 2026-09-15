# 2026-09-15 technical chart review (v1)

Scope: presentation-only SNDK / LITE / MSFT reviewed level overlays in ResearchCandleTerminal; pure data/validation module and tests. No API, database, environment, order, forecast-engine or locked-history changes. Rollback: revert this release commit and redeploy. Automatic S/R remains separately visible and can replace the gold T-lines with the checkbox.

Source: user-supplied full transcript `09 14 盘前给支撑，盘中喊止盈！大盘反弹后尾盘再跳水，下一步怎么走？.txt`, read to EOF (includes transcription errors/repeated words), plus 16 screenshots. No full source transcript or screenshots republished. Public source attribution retained in the review disclosure; no retrospective return claim promoted as verified performance.

## Evidence and decisions

- SNDK 16:53 screenshot `codex-clipboard-93217115-8f01-48f0-a7e7-a0c1226bb9cd.png`: transcript explicitly gives 1498–1517 intraday support and exiting this short-term position if the small range breaks or resistance is reached. Resistance 1640.95–1651.23, lower zones 1436.15–1460.19 and 1293.70–1308.95, next resistance 1839.74 from image. These are Sep 15 forward watch conditions based on a Sep 14 review, NOT a MOOX pre-open call for Sep 14. Old 1188 position is not a fresh entry instruction.
- LITE 22:03 screenshot `codex-clipboard-45534bae-e50a-41a5-b261-3405458c0d9e.png`: transcript retains planned buying interest around 800–816 and revises trim objective from 934–974 to 974.1–1014.13. Screenshot gives 816.42, 934.36, 974.11, 1014.13, 783.54. **Close below 800 invalidation is MOOX's explicit range interpretation**, not a teacher-specified fixed stop. Moving channel boundary cannot be recovered accurately without dated anchors; do not invent one from the screenshot.
- MSFT 27:59 screenshot `codex-clipboard-b9f77313-35e0-4d1d-89b3-0dc04a8743c2.png`: transcript discourages chasing, names 525.76/prior high for trimming. Image gives 493.39,468.52,440.16,550.01. Retest/gap-risk conditions are MOOX additions, not original stop orders. Historical hover OHLC near 383 is not the latest quote; live provider verifies Sep 14 close 505.41.
- All 3 matched existing website Yahoo Finance daily USD equity feed on Sep 15: SNDK1551.98999, LITE835.03003, MSFT505.41000. Runtime requires exact asset/symbol/feed/timezone and original-session close within 0.1%; no cross-venue rescaling.
- SOXX: 495–500 contested area and compression is not confirmed bullish reversal. IGV stronger than semiconductors on this session; SOXX/IGV is a ratio, not price or proof of net fund flows. Keep as research context; don't fabricate SOXX/IGV entry candles in another instrument.
- SPX 7598.63/7629.78 are Sep 14 retrospective intraday examples, not SPY prices or proof of 0DTE profitability.
- XAUUSD is Pepperstone spot/CFD, while website gold is GC continuous futures: DO NOT copy the 4275.91–4304.35 band into GC/GLD. US30Y is yield percent, not a bond price; CL1! continuous oil is not a current authorization to restore oil trading.
- CRCL/TEM/CRWD/COST/TSEM read as reference but not added as new chart/trading instruments. TEM != TSEM != TSM. TSEM weak gap-down and 209 retest; no averaging-down endorsement. No dated channel endpoints visible: no fabricated tilted line geometry. NBIS/DASH lacking supplied exact chart coordinates: no invented numeric levels.
- Macro news / AI slowdown / Middle East talks / legislative schedules in this transcript were not independently established here and are not published as verified events. No guaranteed direction or returns.

## Freshness and integrity

Review publication date Sep15, source session Sep14, review deadline Sep16 18:00 UTC (Sep17 02:00 UTC+8); deadline is conservative pre-decision retirement, not an asserted source-specific trading trigger. At expiry hide reviewed lines and preserve disclosure. A minute timer handles open tabs; stale quote check older than15min or source mismatch also removes lines. Daily levels do not confirm live intraday stabilization. Daily close updates risk/target status without altering original source or any candle. Simulated future candle path is unchanged by this review.

## Acceptance

Required: technical-review tests, chart/projection regression tests, TypeScript, production build, diff check, explicit impact report with zero blockers; Git/Vercel deployment; live member-page bilingual and checkbox verification; read-only upgrade validator prints UPGRADE VALIDATION PASSED. This checklist is not itself proof of success.
