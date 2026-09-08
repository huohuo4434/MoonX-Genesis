import { memberSectorOutlook as priorSector, memberSeptemberOutlook as priorMonth } from "./member-september-outlook-20260906";

// E2: forward editorial review only. E1 and all locked forecast/score records remain intact.
export const memberSectorOutlook = {
  ...priorSector,
  reviewedAt: "2026-09-08",
  title: "易老师9月判断：纳指偏弱，BTC冲高防回吐",
  rows: priorSector.rows.map((row) => {
    if (row.asset === "比特币／以太坊") return { ...row,
      outlook: "BTC 9月7—13日先涨后跌；月底前冲高仍可能，突破8.7万美元难度较大。ETH冲高防回吐。",
      rhythm: "9—11日观察转弱，不是最终顶；8.7万观察截止9月30日。" };
    if (row.asset === "纳指／大型科技") return { ...row, status: "纳指月度偏弱",
      outlook: "纳指9月偏向逐步走低，反弹不等于月度转强；半导体与个股分开看。",
      rhythm: "9月7—13日按下跌路径观察；月内允许反抽，不指定崩跌日。" };
    if (row.asset === "原油／农业") return { ...row,
      outlook: "WTI月内仍有上行动力；月底前98美元附近难持续突破。",
      rhythm: "仅到9月30日的门槛观察；地缘与政策影响方向未定。" };
    return row;
  }),
};

export const memberSeptemberOutlook = {
  ...priorMonth,
  editorialVersion: "20260908-E2",
  editorialUpdatedZh: "9月8日应对更新 · E2",
  editorialUpdatedEn: "Outlook review Sep 8 · E2",
  titleZh: "易老师9月判断：纳指偏弱，BTC冲高防回吐",
  titleEn: "September outlook: softer Nasdaq, guard against BTC rally givebacks",
  conclusionZh: "纳指月度偏弱；半导体分股看修复，BTC防冲高回吐。原油只看长周期。",
  conclusionEn: "Nasdaq remains softer at the monthly horizon. Assess semiconductor recoveries individually and watch BTC giveback risk. Oil remains long-cycle research only.",
  executionZh: ["纳指：月度逐步走低，反抽不等于转强；不推导所有科技股同跌。", "BTC：月底前突破8.7万美元难度较大，不等于一定涨到该价。", "半导体按个股确认修复；原油98美元是月底门槛观察，不是下单价。"],
  executionEn: ["Nasdaq: gradual monthly weakness; a rebound is not a reversal, nor must every technology stock fall.", "BTC: a break above USD 87,000 before month-end looks difficult; reaching that level is not assured.", "Assess semiconductor recoveries stock by stock. Oil's USD 98 threshold is a month-end research reference, not an order price."],
};

export const memberSeptemberEditorialHistory = [priorMonth, memberSeptemberOutlook] as const;

const englishSectorRows = [
  ["Semiconductors / SOXL / SNDK / MU", "Persistence risk", "A stage recovery is possible, not an unconditional long hold.", "Assess demand from Sep 8; protect gains Sep 14–20.", "Wait for stable retests. Protect gains on weakness; do not hold through a structural break."],
  ["Bitcoin / Ether", "Separate week and stage", "BTC's Sep 7–13 path is rally then fade. Further upside is possible, but a break above USD 87,000 before month-end looks difficult. Watch ETH givebacks.", "Sep 9–11 is a turn window, not a final top. The USD 87,000 view ends Sep 30.", "Wait for weakness before evaluating shorts; do not rush into a sustained breakout."],
  ["Gold", "Timing uncertain", "A mild stage pullback can include rebounds; the sequence of lows is uncertain.", "Watch stabilization Sep 8–11 and later-month downside risk.", "Do not buy or short by date. Avoid chasing rejected rebounds; reassess breakdowns."],
  ["Nasdaq / Large technology", "Softer monthly Nasdaq", "Nasdaq favors gradual September weakness. A rebound is not a monthly reversal; assess semiconductors and individual stocks separately.", "Sep 7–13 retains a bearish path. Rebounds remain possible; no crash date is specified.", "Protect gains and reduce risk on weakness, not a blanket Sep 20 liquidation or short."],
  ["Apple / Tencent", "Separate horizons", "Apple: short-term opportunities. Tencent: longer-term opportunities after a pullback.", "Watch Apple ahead of its product event; wait for Tencent stabilization.", "Do not chase Apple rebounds; wait for demand confirmation in Tencent."],
  ["Oil / Agriculture", "Long-cycle only", "WTI retains upside potential, but a sustained break through USD 98 before month-end looks difficult.", "Threshold research through Sep 30; geopolitical and policy effects remain uncertain.", "No oil daily/weekly trading. Agriculture remains a watch theme, not a reason to chase."],
  ["STAR 50 / Federal Reserve", "Momentum and events", "STAR 50 may rise gradually with limited follow-through. A September rate hike is not the favored scenario.", "Watch recovery after Sep 7; await the actual policy decision.", "Protect rally gains. A rate forecast is not an announced result."],
  ["Shanghai / Hang Seng TECH / S&P 500", "Thematic reference only", "Thematic research only; no daily or weekly forecasts.", "Watch limited recovery in Shanghai and Hang Seng TECH; S&P rebounds can face profit taking.", "Do not assume a broad rally. Check resistance on rebounds."],
  ["Silver", "Short-term recovery watch", "Assess silver separately from gold; a short recovery is not a one-way monthly advance.", "Watch demand and repair after pullbacks Sep 8–11.", "Wait for stabilization and a successful breakout retest; abandon the short-term setup if it fails."],
  ["Tesla TSLA", "Weekly sequence uncertain", "The sequence of weekly swings is unclear. A longer-term opportunity does not imply an immediate rise.", "Check demand Sep 8–11 and whether upside holds.", "Do not trade by date. Reassess breakdowns and wait for a stable retest."],
] as const;

export function getMemberSectorOutlook(en: boolean) {
  if (!en) return memberSectorOutlook;
  return { ...memberSectorOutlook,
    title: memberSeptemberOutlook.titleEn,
    boundary: "Review rebound positions intraday or every 2–3 days. Plan swing exits; do not turn a short-term long into a long-term hold.",
    methodNote: "Research, not confirmation of AI positions. Timing needs price confirmation; consensus is not win rate.",
    rows: englishSectorRows.map(([asset, status, outlook, rhythm, action]) => ({ asset, status, outlook, rhythm, action, tone: "caution" })),
  };
}
