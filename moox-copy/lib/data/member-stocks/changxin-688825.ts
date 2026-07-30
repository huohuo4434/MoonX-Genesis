/**
 * Changxin Technology (688825) — first MoonX member benefit stock.
 * Formal directions only; no 观望 / vague level prose on published records.
 */
import type {
  MemberBenefitStock,
  MemberStockDailyForecast,
  MemberStockWeeklyAnalysis,
} from "@/types/member-stock";

export const CHANGXIN_STOCK_ID = "688825";

export const CHANGXIN_STOCK: MemberBenefitStock = {
  stockId: CHANGXIN_STOCK_ID,
  name: "长鑫科技",
  symbol: "688825",
  market: "SSE_STAR",
  marketLabel: "科创板",
  tags: ["会员福利股", "科创板", "新股高波动期"],
  listingDate: "2026-07-27",
  quoteSymbol: "688825.SS",
  existingRating: "上涨",
  status: "online",
  sourceLabel: "MoonX综合判断",
};

export const CHANGXIN_IPO_HIGH_VOL_DATES = [
  "2026-07-27",
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
  "2026-07-31",
] as const;

const SRC = ["sixyao-cxmt-ipo-first-week", "changxin-technology"];

const RISK_NOTE =
  "长鑫科技处于上市初期，股价波动可能明显高于普通股票。上市后前5个交易日不设涨跌幅限制，请严格控制风险。";

export const CHANGXIN_DAILY_FORECASTS: MemberStockDailyForecast[] = [
  {
    id: "STOCK-688825-20260728-TODAY",
    stockId: CHANGXIN_STOCK_ID,
    forecastDate: "2026-07-28",
    role: "today",
    direction: "区间震荡，略偏上涨",
    primaryDirection: "区间震荡",
    closingBias: "略偏上涨",
    pathDirection: "先冲高或回落，再反复震荡，尾盘略偏上涨",
    probabilities: { up: 34, flat: 36, down: 30 },
    headline: "今天更可能维持大幅震荡，收盘小幅上涨的概率略高于下跌，但方向优势并不明显。",
    expectedPath:
      "开盘后可能快速冲高或下跌，随后反复震荡。如果午后资金承接增强，尾盘更可能小幅上涨。",
    keySupport: [],
    keyResistance: [],
    invalidation:
      "放量突破前一交易日高点并站稳，转为明显上涨；放量跌破前一交易日低点并持续运行其下，转为明显下跌。",
    riskNote: RISK_NOTE,
    riskLevel: "高",
    confidence: 52,
    publishedAt: "2026-07-27T18:30:00+08:00",
    updatedAt: "2026-07-28T20:30:00+08:00",
    status: "published",
    visibility: "member",
    accuracyEligible: true,
    verificationStatus: "pending",
    publicSourceLabel: "MoonX综合判断",
    sourceIds: SRC,
    internalNotes: "Rewritten formal direction; no vague level prose.",
  },
  {
    id: "STOCK-688825-20260729-TOMORROW",
    stockId: CHANGXIN_STOCK_ID,
    forecastDate: "2026-07-29",
    role: "tomorrow",
    direction: "区间震荡，略偏上涨",
    primaryDirection: "区间震荡",
    closingBias: "略偏上涨",
    pathDirection: "早盘大幅换手，午后方向明确，尾盘略偏上涨",
    probabilities: { up: 33, flat: 37, down: 30 },
    headline: "明天更可能继续宽幅震荡，收盘上涨概率略高于下跌，但暂时不支持连续大涨判断。",
    expectedPath:
      "早盘可能出现较大幅度换手，午后方向逐渐明确。若前一交易日低点得到支撑，尾盘小幅上涨的可能性较高。",
    keySupport: [],
    keyResistance: [],
    invalidation:
      "放量突破前一交易日高点并持续走强，转为上涨；跌破前一交易日低点且无法收回，转为下跌。",
    riskNote: RISK_NOTE,
    riskLevel: "高",
    confidence: 51,
    publishedAt: "2026-07-28T18:30:00+08:00",
    updatedAt: "2026-07-28T20:30:00+08:00",
    status: "published",
    visibility: "member",
    accuracyEligible: true,
    verificationStatus: "pending",
    publicSourceLabel: "MoonX综合判断",
    sourceIds: SRC,
    internalNotes: "Next session formal direction; IPO high-vol confidence capped.",
  },
];

export const CHANGXIN_WEEKLY_ANALYSES: MemberStockWeeklyAnalysis[] = [
  {
    id: "STOCK-WEEKLY-688825-20260727-V1",
    stockId: CHANGXIN_STOCK_ID,
    weekStart: "2026-07-27",
    weekEnd: "2026-08-02",
    overallDirection: "先涨后跌，周末偏弱",
    primaryDirection: "先涨后跌",
    closingBias: "偏弱",
    pathDirection: "先涨后跌",
    weeklyPath:
      "前两个交易日重点观察冲高，后三个交易日更容易震荡回落。即使盘中再次上涨，也要防范高位卖盘增多后由涨转跌。",
    headline:
      "本周前半段可能继续上涨或冲高，后半段下跌概率逐渐提高。综合判断，本周更可能先涨后跌，周末收盘偏弱。",
    probabilities: { up: 30, flat: 32, down: 38 },
    strongWindow: "前两个交易日",
    weakWindow: "后三个交易日",
    keySupport: [],
    keyResistance: [],
    invalidation:
      "若后三个交易日仍持续放量创新高且周末收盘未回落，则先涨后跌、周末偏弱判断失效。",
    riskNote: RISK_NOTE,
    riskLevel: "高",
    confidence: 58,
    publishedAt: "2026-07-26T20:00:00+08:00",
    updatedAt: "2026-07-28T20:30:00+08:00",
    status: "published",
    visibility: "member",
    publicSourceLabel: "MoonX综合判断",
    sourceIds: SRC,
    internalNotes: "Formal weekly path; levels hidden until numeric quotes available.",
  },
];
