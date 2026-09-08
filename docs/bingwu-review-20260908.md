# September 8 source review — forward editorial E2

## Scope / release boundary

Presentation and internal research import only: `lib/presentation/member-september-outlook*.ts`, `lib/presentation/september-three-market-review.ts`, `lib/research/bingwu-review-20260908.ts`, `lib/data/research-records.ts`, the member monthly/sector pages and compact review component. No API, database, schema, environment, cron, score, direction-vote or trading-authority changes. No original paid transcripts or charts copied to public assets.

E1 editorial module is preserved byte-for-byte apart from line endings. E2 records the Sep 8 receipt/review, not a backdated Sep 1 publication. Original locked monthly and weekly records remain unchanged. Internal priority queue consumes the three new records at P1; BTCTW0 stays P2. These are provisional research notes, not new full-month verification samples. No numeric confidence or consensus increase.

## Supplied evidence

Folder: `C:/Users/13558/Desktop/丙午0908/`. Each title has TXT and PNG; all six files inspected. Source chart date says Sep 7, before White Dew; exact video upload timestamp was not supplied and is not marked verified. Research receipt/review recorded at 2026-09-08T11:40:15Z. Display expires into archive at the end of Sep 30 Hong Kong time; this display cutoff is not asserted to be the source's exchange-specific evaluation timezone.

| TXT | SHA-256 |
|---|---|
| 比特币9月30日前能不能突破8.7万美金.txt | 1894506143B2B3D1B82A3E07F7AFDC13B4C6B2F5C222586C1711EBC0C3C881AC |
| 纳斯达克100，九月份走势如何.txt | 4E91B570B0E6334587A4185EEF59D784A4352EBC3A1D4A0E44E14FE690B8C05E |
| 月底之前WTI油价能否突破98美金.txt | 3936B2E18454F88A928446C2DB552BBA97F8B69D981E24C57065EAB592584569 |

Transcription caution: BTC text repeatedly corrupts 8.7万 as 870万 and confuses 持世/巳/午. Screenshot title and board confirm the USD 87,000 question and 兄午世; the moving upper line is 兄巳→孙戌, lower 父寅→兄巳. Do not silently use ASR's 巳火持世 as verified chart data. NDX screenshot has 官巳世, 财卯, 兄酉应 and no moving arrows. WTI screenshot has 财丑世→官酉, upper 官酉→孙巳 and initial 财丑应→父子水. No missing Qimen chart/use-god invented.

## Comparison and decisions

| Asset | New core teacher conclusion | Existing site | BTCTW0 Sep 7 supplied video | Decision |
|---|---|---|---|---|
| BTC | Before Sep 30, break above 87k looks difficult; approach remains possible. September high context can extend into early October under the solar-term framing, not a precise peak day. | Monthly rally-then-fade, weekly rally-then-fade. Earlier separate question: before Sep 10, 85k cap. | Current advance may already have peaked or may test a further high; pressure zone and failed breakout matter. Larger opportunity may return Q4. | Partial alignment in late-rally/giveback risk, NOT agreement on exact price, timing or an inevitable new high. Preserve both deadlines; do not raise score. |
| NDX | September gradually lower, not necessarily a sudden crash. | Formal monthly downward-ranging; current week bearish. Broad editorial text incorrectly suggested an early-month technology rebound. | No directly comparable NDX September claim in this supplied transcript. SPX and selected technology stocks are not NDX. | Formal direction already aligns. Correct current editorial wording; do not substitute SPX or semiconductors for NDX. |
| WTI | Upside potential, but 98 difficult to exceed sustainably by Sep 30; near approach/brief touch explicitly allowed. | Current long-cycle research favors gradual September rise / later high risk. A legacy monthly rally-then-fade record remains visible; daily/weekly coverage is retired. | No WTI thesis in this supplied video. | Current long-cycle direction broadly agrees, not identical to the legacy monthly path. Mark the legacy monthly card as historical and point to the current long-cycle update. Add a qualified ceiling question only; no daily/weekly or trading restart. |

BTCTW0 evidence: `C:/Users/13558/Desktop/比特兔/今天这期视频，我从大级别趋势、结构、关键位置、江恩时间周期等多个维度，对BTC、  .txt`; original public post https://x.com/BTCTW0/status/2096898294320656565. ASR price decimals are not reconciled; no numeric Gann order levels imported. Teacher video discussion of oil policy/geopolitics is hypothetical, not confirmed news or a deterministic oil/NDX inverse correlation.

Member-facing text is concise original synthesis, bilingual, without internal source-processing narration. Sources remain traceable internally; no exclusive-original or proven-accuracy claim is made.

### Latest BTCTW0 cross-check during production acceptance

Authenticated X UI was checked for https://x.com/BTCTW0/status/2097287475614147020 (Sep 8, 19:34 Hong Kong) and its follow-up https://x.com/BTCTW0/status/2097289027766595993 (19:40). The first explicitly considers 82,300 as a possible existing stage top; holding 78,900 allows further upside, failure to break 82,700–83,500 limits persistence, and a failed reclaim below 76,200 would strengthen the top hypothesis. The later 67,800/65,400 references belong to Q4 moving Gann lines, not present fixed supports. These are the author's conditional chart observations, not independently rebuilt technical levels. The follow-up's claimed 1,300-point short profit and near-all-turns accuracy were not verified and are not scored. This is more defensive than assuming another high, but consistent with the new member card's conditional push/giveback warning; it does not warrant increasing consensus or replacing the source-locked official direction. No NDX or WTI conclusion is supplied in either new post.

## Verification / rollback

Run the targeted source review, Gann, editorial and governance tests, TypeScript, production build, and zero-blocker impact audit. Verify authenticated zh/en monthly and sector rendering, P1 admin inclusion, anonymous gates and absence of raw source details. Existing read-only release validator must print `UPGRADE VALIDATION PASSED` before acceptance.

Rollback: revert this release commit and redeploy the prior verified deployment. No data, environment or trading-state rollback required.

## Local acceptance (2026-09-08)

- New review, Gann priority, member editorial, research-record store and September rotation suites: 33 tests passed. TypeScript passed. Next.js production build passed with six pre-existing unused-variable warnings in unchanged files.
- Impact audit: MEDIUM, 11 files, zero blockers. E1 archive text matches the original HEAD module; no locked monthly/weekly source files or high-risk execution paths changed.
- Expanded legacy checks expose two baseline failures: `prediction-governance-v7189.test.ts` expects an old guide phrase; `forecast-revision-20260823.test.ts` expects an old weekly item which is now absent. Both failures were reproduced unchanged at baseline commit `642f96b` in the prior worktree. They were not hidden or modified to make this release look green.
- Production verification is separate and is recorded only after deployment; local build success is not an online acceptance claim.
