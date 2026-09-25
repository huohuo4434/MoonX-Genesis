# US equities Xu-cycle research edition, 2026-09-25

Scope: server-only member research component and dated source summary; four existing gated pages (member, daily, key-dates, monthly), including both research/default branches. No API, DB, environment, jobs, payments, membership rights or trading changes. No replacement of locked monthly/daily records, no new SPX scope, no simulated-candle-engine changes.

Reason: user supplied new SPY/QQQ Xu-cycle material and a choppy-decline baseline. Keep the user's baseline separate from Wolf's bullish SPY monthly original and Stone's conditional macro framework. Missing complete QQQ monthly evidence stays missing. No daily hexagrams, probabilities or prices invented.

Source trace (user supplied; originals remain local, not copied into release):
- SPY monthly original: `738937cd-c824-4303-bf07-d0cba2e2a247.png`; formal grids `22357c56-247d-4d10-9b35-1d6f2d223189.png`, `225f5831-5844-48d1-99f1-ca14ab5cd890.png`.
- Weekly comparison: `72acff71-10c1-42d8-b143-6d87953292da.png`, `2f9e6f4e-574c-4707-8187-ee2958a6e95a.png`. All 14 screenshots and associated TXT reviewed by Liuyao/Qimen reviewer.
- User-supplied macro transcript dated 20260924, episode 9235. Attribution follows user context; no independent external Stone collection. Year/units/spot FX inconsistencies were excluded from factual claims.
- Oil transcript reviewed as separate asset context, not equity timing evidence.

Calendar: Oct 8–Nov 6, 22 weekday sessions; NYSE Oct 12 open. Original intraday timezone unverified; only provisional US session-date mapping. New York date handling includes Nov 1 DST change. After Nov 6 the version becomes an archive, not an extended forecast. Do not score research as prospective until actually deployed and accessible.

Committee: independent Market Structure, Liuyao/Qimen, Macro/Events, Contrarian and Risk read-only reviews completed; separate final reviewer returned PASS on implementation and independently reproduced 6/6 new tests. Every output RESEARCH_ONLY.

Checks: `node --conditions=react-server --import tsx --test tests/us-equity-xu-review-20260925.test.ts`; existing forecast governance regression tests; TypeScript; production build; impact audit; allowed-member and anonymous HTML/RSC checks; real production validator printing UPGRADE VALIDATION PASSED. No new paid service or poller.

Local regression note: new tests 6/6 passed. Crypto-risk-note tests 3/3 passed. Governance core assertions passed; the existing rulebook/public-page text assertion fails because the current unchanged beginner guide lacks an old required phrase. Both that guide and test match pre-change HEAD; no unrelated content was modified to conceal the baseline failure.

Rollback: revert only this edition's commit (new component/data/test/doc and imports/render sites) via the standard Git deployment flow; no data restore or trade change required. Baseline before this edition: 78884c51f8d214db6138171d5d66800509108d14.
