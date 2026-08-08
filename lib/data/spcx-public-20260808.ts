export type SpcxLanguage = "zh" | "en";

export const SPCX_PUBLIC_RESEARCH = {
  id: "spcx-20260808-v2",
  symbol: "SPCX",
  assetNameZh: "SpaceX",
  assetNameEn: "SpaceX",
  market: "NASDAQ",
  version: 2,
  revisedAt: "2026-08-08T20:50:00+08:00",
  revisionOf: "spcx-20260806-v1",
  consensusStars: 4,
  executionState: "REVISED_AFTER_UNLOCK_BREAKOUT",
  observedClose: 133.11,
  observedCloseDate: "2026-08-07",
  ipoPrice: 135,
  recentLowApprox: 105,
  publicHeadlineZh: "解锁后反而快速上冲：原方向未错，但反弹启动明显提前",
  publicHeadlineEn: "The unlock triggered a fast rebound: the direction held, but the timing accelerated",
  publicSummaryZh:
    "8月6日解锁后，SPCX没有出现预期中的持续供给踩踏，买盘在约109美元附近承接；8月7日又大涨约16%至133.11美元，周涨幅约23%，几乎收复135美元IPO价。MOOX因此把原V1“先消化、后反弹”修订为：供给消化和第一轮反弹已经提前完成，下周核心不再是等首次启动，而是观察135美元附近的突破确认、回踩承接与第二段上冲。",
  publicSummaryEn:
    "After the Aug. 6 unlock, SPCX did not suffer a sustained supply washout. Buyers absorbed shares near the $109 area, and the stock then jumped about 16% on Aug. 7 to $133.11, up roughly 23% for the week and nearly back to the $135 IPO price. MOOX therefore revises V1: the initial supply absorption and first rebound happened earlier than expected. Next week is no longer about waiting for the first rally; the key is whether SPCX can confirm above the IPO pivot, hold a pullback, and launch a second leg.",
  revisionNoteZh:
    "V1的“解锁不等于一路下跌、后续偏修复”方向得到验证，但时间节奏偏慢。V2保留原卦方向，依据实际K线把强势窗口前移，并提高对短线冲高回吐的警惕。",
  revisionNoteEn:
    "V1 was directionally right that the unlock did not imply a one-way collapse and that repair was more likely, but the timing was too slow. V2 keeps the original directional thesis, shifts the strength window forward based on observed price action, and raises short-term pullback risk after the surge.",
  publicWindows: [
    {
      period: "2026-08-10 / 2026-08-14",
      zh: "IPO价确认周：先看135美元附近能否站稳。主路径改为“冲高确认／回踩承接 → 再上”，不再把这周定义成单纯等待反弹。",
      en: "IPO-pivot confirmation week: first test whether $135 can hold. The main path becomes 'breakout test / supported pullback → second push', not simply waiting for a rebound.",
    },
    {
      period: "2026-08-17 / 2026-08-23",
      zh: "延续与第二轮供给测试：若前一周守住突破结构，偏强延续概率提高；若重新跌回关键支撑，则转入宽幅震荡。",
      en: "Continuation and a second supply test: if the prior week holds the breakout structure, bullish continuation improves; a loss of key support shifts the path to a wide range.",
    },
    {
      period: "2026-08-24 / 2026-08-30",
      zh: "结构最顺窗口仍保留，但含义调整：若前两周已经大涨，这一段更可能表现为高位稳定、二次上攻，而不是首次启动。",
      en: "The cleanest structural window remains, but its meaning changes: if the stock has already rallied hard, this phase is more likely to be high-level stabilization or a second advance rather than the first launch.",
    },
  ],
  teaserZh:
    "会员版包含：8/10—8/14逐日路径、周/月/三个月/一年/五年分层判断、事件后K线复盘、动态支撑压力、失效条件与V1→V2修订记录。",
  teaserEn:
    "Member research includes a day-by-day Aug. 10–14 path, weekly/monthly/three-month/one-year/five-year layers, post-unlock price review, live support/resistance, invalidation rules and the V1→V2 revision log.",
  disclaimerZh:
    "研究对象为纳斯达克SPCX正股。第三方代币化股票、RWA或交易所映射产品可能存在额外发行人、跟踪误差与流动性风险。研究仅用于情景分析，不构成投资建议。",
  disclaimerEn:
    "The research target is the Nasdaq-listed SPCX share. Third-party tokenized shares, RWA wrappers or exchange representations may carry additional issuer, tracking and liquidity risks. This is scenario research, not investment advice.",
} as const;
