/**
 * User-supplied teacher source: 2026-08-21 crypto weekly video notes.
 *
 * Member-facing consumers use the anonymous public label and the verified
 * forecast fields below. Full local provenance lives in the server-only file.
 */

export const TEACHER02_CRYPTO_SOURCE_20260821 = {
  id: "T02-CRYPTO-BTC-ETH-20260824-0830-V1",
  publicSourceLabel: "六爻市场老师",
  internalSourceKey: "TEACHER02-CRYPTO-VIDEO-20260821",
  sourcePublishedAt: "2026-08-21",
  ingestedAt: "2026-08-23T15:06:00+08:00",
  sourceTimeZone: "UTC",
  targets: ["bitcoin", "eth"],
  periodStart: "2026-08-24",
  periodEnd: "2026-08-30",
  primaryHexagram: "水火既济",
  mutualHexagram: "火水未济",
  changingHexagram: "水天需",
  officialDirection: "探底回升",
  sourceBoundary:
    "周卦30的7×24运行轨迹明确覆盖BTC与ETH；申月月卦交叉校准只明确属于ETH，不复制为BTC月卦。",
  monthlyCrossCheck:
    "ETH申月月卦雷水解在8月30日06:00 UTC结束，随后山地剥接掌；周末修复之后重新进入承压背景。",
} as const;

export const TEACHER02_CRYPTO_DAILY_PATH_20260824 = [
  {
    date: "2026-08-24",
    direction: "震荡下跌",
    summary: "开局冲高受阻后快速下探震荡，主要低点候选向8月24日晚至25日延伸。",
    riskNote: "原文统一使用UTC；时间窗口不能脱离真实价格结构单独触发交易。",
  },
  {
    date: "2026-08-25",
    direction: "探底回升",
    summary: "低点候选与止跌回收窗口，尾段观察承接和收复部分失地。",
    riskNote: "低点是候选窗口，不是无条件买点。",
  },
  {
    date: "2026-08-26",
    direction: "探底回升",
    summary: "02:24 UTC后切入火水未济修复段，允许震荡反弹，但不定义为连续主升。",
    riskNote: "修复伴随反复换手、上下插针和冲高受阻。",
  },
  {
    date: "2026-08-27",
    direction: "震荡",
    summary: "多空宽幅拉锯，上下插针换手，方向服从周度先跌后修复主线。",
    riskNote: "高波动日，不把单次上冲或下杀外推为新趋势。",
  },
  {
    date: "2026-08-28",
    direction: "震荡",
    summary: "观望沉淀与低位换手，抛压趋于衰竭，等待后段资金回补。",
    riskNote: "仍不支持追涨或把修复解释为直线主升。",
  },
  {
    date: "2026-08-29",
    direction: "震荡上涨",
    summary: "06:00 UTC后进入水天需等待蓄势段，7×24市场观察多头资金回补。",
    riskNote: "周末低流动性可能放大插针，方向与振幅分开判断。",
  },
  {
    date: "2026-08-30",
    direction: "震荡上涨",
    summary: "筹码失而复得，偏震荡回升收官；ETH随后转入月卦重新承压背景。",
    riskNote: "周末回升不能外推成9月连续主升。",
  },
] as const;
