# CZSC research pilot — 2026-09-13

Native CZSC 1.0.1 runs in an isolated Python 3.10+ worker, outside Next.js, Vercel requests and the Bitget runner. The member daily chart has a collapsed research-tools panel: export its exact closed bars, run this worker, then load the output to overlay strokes/centers locally. No API, database, new credentials, scheduled job or execution state is changed.

## Run

```powershell
py -3.11 -m venv .moox-workbench/czsc-venv
.\.moox-workbench\czsc-venv\Scripts\python.exe -m pip install --only-binary=:all: -r tools/czsc-research/requirements.txt
.\.moox-workbench\czsc-venv\Scripts\python.exe tools/czsc-research/analyze.py input.json report.json
.\.moox-workbench\czsc-venv\Scripts\python.exe -m unittest discover -s tools/czsc-research -p test_analyze.py -v
node --conditions=react-server --import tsx scripts/compare-czsc-research.ts C:\MoonX-CZSC-20260913\.moox-workbench\czsc-venv\Scripts\python.exe
node --import tsx --test tests/czsc-research.test.ts tests/key-date-price-chart.test.ts
```

The last script reads current public BTC/ETH/TSLA/SNDK daily prices via existing loaders, exports dated inputs/reports/comparison under `.moox-workbench/`, and reports errors rather than substituting fake data. Existing output files are never overwritten. Its `python` argument is an operator-selected interpreter path, not remote user input.

## Contract and interpretation

- Input is `moox-czsc-input-v1`, 1D only, ascending unique closed candles. The existing website market calendar/finalization loader owns session closure; the offline worker validates the export but does not independently certify exchange calendars. It does not download data itself.
- SHA-256 covers the **exact UTF-8 `barsJson` string**. The browser checks hash, symbol, as-of, count, engine version, prices and observation dates. Corrected/new candles, a different asset or stale data immediately hide an older overlay. Loading a report never persists or uploads it.
- `min_bi_len=6`, max retained strokes=2000 (at most 2000 input bars). No inherited environment settings alter these parameters. `finished_bis` only; the unfinished tail is excluded.
- `observedOn` is the closed candle on which a structure appeared in incremental replay, **not an assertion it was known at the original extremum time**. Retractions remain in the journal. Reappearance gets a new observation date. Zone extensions also count as retractions/additions, so the revision count is not a failure rate.
- Null volume stays null in the input. Native RawBar receives zero for unavailable volume and amount; this pilot uses price structures only, never volume signals.
- MACD in the web chart is SMA-seeded EMA12−EMA26; DEA is seeded from 9 actual DIFs; histogram=2×(DIF−DEA). It never consumes future scenario candles. Histogram contraction alone is not labeled as Chan divergence. No strategy parameters are altered.
- Structural replay is **not** a profit backtest. No hit-rate, expected-return or profitability claim. Before connecting to execution: define exact entry/exit rules, next-bar availability, costs/slippage/funding, out-of-sample periods and separate risk review. No automatic direction overwrite or order permissions are present.

## Live smoke comparison

100 actual closed daily candles per asset, retrieved 2026-09-13. BTC/ETH through Sep 12 (Binance UTC daily); TSLA/SNDK through Sep 11 (Yahoo Finance).

| Asset | Existing strokes / overlapping 3-stroke zones | CZSC finished strokes / merged centers |
|---|---:|---:|
| BTC | 9 / 6 | 6 / 1 |
| ETH | 10 / 7 | 8 / 3 |
| TSLA | 9 / 7 | 9 / 2 |
| SNDK | 12 / 10 | 8 / 1 |

These counts expose different definitions/merging and are **not comparative accuracy scores**. The four actual reports passed the same browser contract validator used by the website. Synthetic data is used only in the named tests.

## Deployment and rollback

Website changes: `ResearchCandleTerminal.tsx`, `technical-chart-context.ts`, `czsc-research-contract.ts`. Existing member API authorization, daily refresh, forecast archives and support/resistance ladder remain unchanged. Python is a local pilot; **not installed on the VPS and not scheduled** by this release. Member UI does not claim automatically generated CZSC output.

Rollback the release commit to remove the UI addition; no migration or trade-state rollback is required. The isolated local venv/artifacts can be retained for audit. Do not modify the legacy `C:\MoonX-Genesis` tree.

Upstream: https://github.com/waditu/czsc (Apache-2.0). This repository only adds an adapter; upstream licensed code is installed as a dependency, not copied. The license does not grant redistribution rights to third-party courses, feeds or linked articles.
