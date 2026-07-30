import type { WeeklyForecastSourceRecord } from "@/lib/weekly-source/types";

const LOCKED_AT = "2026-07-28T20:00:00.000Z";
const CREATED = "2026-07-28T12:00:00.000Z";

function base(
  partial: Omit<WeeklyForecastSourceRecord, "sourceType" | "version" | "status" | "createdAt" | "updatedAt" | "publishedAt" | "lockedAt"> &
    Partial<Pick<WeeklyForecastSourceRecord, "publishedAt" | "lockedAt">>
): WeeklyForecastSourceRecord {
  return {
    sourceType: "LIUYAO_WEEKLY",
    version: 1,
    status: "LOCKED",
    publishedAt: partial.publishedAt ?? LOCKED_AT,
    lockedAt: partial.lockedAt ?? LOCKED_AT,
    createdAt: CREATED,
    updatedAt: CREATED,
    ...partial,
  };
}

/** Canonical 6 weekly Liu Yao sources — no personal birth data. */
export const CANONICAL_WEEKLY_LIUYAO_SOURCES: WeeklyForecastSourceRecord[] = [
  base({
    id: "WFS-SPX-20260728-V1",
    marketCode: "SPX",
    periodStart: "2026-07-28",
    periodEnd: "2026-08-02",
    primaryHexagram: "雷火丰",
    changedHexagram: "火天大有",
    movingLines: [2, 6],
    specialPatterns: ["归魂"],
    weeklyDirection: "先涨后跌",
    weeklyPath: "周初上涨，周中高位震荡，周后段冲高回落。",
    interpretation:
      "雷火丰表示行情处于强势和充分释放阶段，火天大有延续强势特征，但归魂结构意味着后段容易出现回归、分歧和涨势减弱。若周初已经快速上涨并提前接近压力位，下一交易日不应继续机械判断大涨，而应调整为震荡或冲高回落。",
    riskSummary: "上涨提前兑现后，高位追涨风险上升。",
  }),
  base({
    id: "WFS-SPX-20260803-V1",
    marketCode: "SPX",
    periodStart: "2026-08-03",
    periodEnd: "2026-08-09",
    primaryHexagram: "雷火丰",
    changedHexagram: "火雷噬嗑",
    movingLines: [3, 6],
    specialPatterns: [],
    weeklyDirection: "先涨后跌",
    weeklyPath: "周初上涨，周中分歧增加，周后段下跌。",
    interpretation:
      "雷火丰仍有强势惯性，火雷噬嗑代表运行过程中出现阻力、分歧和需要处理的问题。周初可能仍有上涨，但上涨流畅度下降，越靠近周后段，转弱概率越高。",
    riskSummary: "高位阻力增大，周后段下跌风险上升。",
  }),
  base({
    id: "WFS-NDX-20260728-V1",
    marketCode: "NDX",
    periodStart: "2026-07-28",
    periodEnd: "2026-08-02",
    primaryHexagram: "雷天大壮",
    changedHexagram: "泽天夬",
    movingLines: [5],
    specialPatterns: ["六冲"],
    weeklyDirection: "震荡上涨",
    weeklyPath: "周初上涨，周中延续，周后段冲高回落或高位震荡。",
    interpretation:
      "雷天大壮代表强势推进，泽天夬代表突破和决断，第五爻发动意味着较明显的变化更靠近周后段。六冲结构代表波动较大，因此本周可维持上涨主方向，但不能理解为每天连续单边大涨。",
    riskSummary: "波动较大，提前达到压力位后容易冲高回落。",
  }),
  base({
    id: "WFS-NDX-20260803-V1",
    marketCode: "NDX",
    periodStart: "2026-08-03",
    periodEnd: "2026-08-09",
    primaryHexagram: "山天大畜",
    changedHexagram: "坎为水",
    movingLines: [1, 3, 5, 6],
    specialPatterns: ["变卦六冲"],
    weeklyDirection: "震荡下跌",
    weeklyPath: "周初震荡，周中转弱，周后段下跌。",
    interpretation:
      "山天大畜代表积蓄、收敛和等待，变为坎为水后，风险、反复和下行压力增加。多个动爻说明整周可能多次改变节奏，不能只给出一个简单直线走势。总体上周初可能先震荡，周中以后下跌概率提高。",
    riskSummary: "高位回吐、波动扩大和快速下探风险。",
  }),
  base({
    id: "WFS-WTI-20260728-V1",
    marketCode: "WTI",
    periodStart: "2026-07-28",
    periodEnd: "2026-08-02",
    primaryHexagram: "地泽临",
    changedHexagram: "火雷噬嗑",
    movingLines: [2, 4, 6],
    specialPatterns: [],
    weeklyDirection: "先涨后跌",
    weeklyPath: "周初反弹，周中震荡，周后段下跌。",
    interpretation:
      "地泽临代表价格向关键区域靠近并存在短线回升机会，火雷噬嗑代表上涨过程中阻力增加。第二、第四、上爻发动，说明周初、周中和周后段均可能出现节奏变化，因此应根据价格是否提前接近压力位动态修正。",
    riskSummary: "反弹持续性不足，接近压力位后容易转弱。",
  }),
  base({
    id: "WFS-WTI-20260803-V1",
    marketCode: "WTI",
    periodStart: "2026-08-03",
    periodEnd: "2026-08-09",
    primaryHexagram: "雷天大壮",
    changedHexagram: null,
    movingLines: [],
    specialPatterns: ["六冲"],
    weeklyDirection: "震荡上涨",
    weeklyPath:
      "上涨过程中伴随大幅震荡，是否转为冲高回落由实际压力位和当周行情进度决定。",
    interpretation:
      "雷天大壮表示短线仍有向上推动力量，但六冲代表行情波动快、持续性不稳定。由于没有动爻，不得根据动爻凭空编造某一个具体变盘日期。每日预测应重点结合技术压力位、消息面和实际行情是否提前兑现上涨。",
    riskSummary: "大幅震荡、上涨后快速回吐和消息面扰动风险。",
  }),
];

export function findCanonicalWeeklySource(
  marketCode: string,
  forecastDate: string
): WeeklyForecastSourceRecord | null {
  const code = marketCode.toUpperCase() === "CL" ? "WTI" : marketCode.toUpperCase();
  return (
    CANONICAL_WEEKLY_LIUYAO_SOURCES.find(
      (s) =>
        s.marketCode === code &&
        s.periodStart <= forecastDate &&
        s.periodEnd >= forecastDate &&
        (s.status === "LOCKED" || s.status === "PUBLISHED")
    ) ?? null
  );
}
