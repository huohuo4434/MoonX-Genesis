import "server-only";

import type { ThreeHorizonDirection, ThreeHorizonStrategyType } from "@/types/three-horizon-strategy";

export type HexagramDirectionPrior = {
  symbol: string;
  direction: Exclude<ThreeHorizonDirection, "NEUTRAL">;
  confidence: number;
  validFrom: string;
  validUntil: string;
  preferredStrategies: ThreeHorizonStrategyType[];
  phase: "REVERSAL" | "TREND" | "DISTRIBUTION" | "REPAIR" | "DECLINE";
  phaseShiftToleranceDays: number;
  sourceSummary: string;
  riskNote: string;
};

/**
 * Internal directional priors synthesized from the user's locked Liu Yao research set.
 * They are intentionally soft priors: fresh price structure and risk controls remain decisive.
 * Date matching uses Beijing natural days and supports the documented +/-1 day phase shift.
 */
const PRIORS: HexagramDirectionPrior[] = [
  {
    symbol: "BTCUSDT",
    direction: "LONG",
    confidence: 61,
    validFrom: "2026-08-09",
    validUntil: "2026-08-13",
    preferredStrategies: ["INTRADAY", "SWING"],
    phase: "REPAIR",
    phaseShiftToleranceDays: 1,
    sourceSummary: "8月中旬属于长期偏弱结构中的反弹窗口，不等同趋势反转。",
    riskNote: "上涨后仍要防止重新转弱，禁止把反弹直接解释为主升。",
  },
  {
    symbol: "BTCUSDT",
    direction: "SHORT",
    confidence: 66,
    validFrom: "2026-08-14",
    validUntil: "2026-08-18",
    preferredStrategies: ["INTRADAY", "SWING"],
    phase: "DECLINE",
    phaseShiftToleranceDays: 1,
    sourceSummary: "反弹完成后重新承压的概率提高。",
    riskNote: "只在价格结构转弱时启用，不在快速逼空中追空。",
  },
  {
    symbol: "ETHUSDT",
    direction: "LONG",
    confidence: 63,
    validFrom: "2026-08-09",
    validUntil: "2026-08-14",
    preferredStrategies: ["INTRADAY", "SWING"],
    phase: "TREND",
    phaseShiftToleranceDays: 1,
    sourceSummary: "8月10日至16日离为火六冲，方向偏修复但波动显著放大。",
    riskNote: "六冲环境下必须缩小首批仓位，防止长影线扫损。",
  },
  {
    symbol: "ETHUSDT",
    direction: "SHORT",
    confidence: 56,
    validFrom: "2026-08-15",
    validUntil: "2026-08-18",
    preferredStrategies: ["INTRADAY"],
    phase: "DISTRIBUTION",
    phaseShiftToleranceDays: 1,
    sourceSummary: "强波动窗口后段提高兑现权重。",
    riskNote: "只有技术方向同步转弱才执行。",
  },
  {
    symbol: "HYPEUSDT",
    direction: "SHORT",
    confidence: 69,
    validFrom: "2026-08-08",
    validUntil: "2026-08-16",
    preferredStrategies: ["INTRADAY", "SWING"],
    phase: "DECLINE",
    phaseShiftToleranceDays: 1,
    sourceSummary: "8月9日至16日山泽损，主结构偏减损、回吐和去杠杆。",
    riskNote: "急跌后不追空，等待反抽失败或结构破位。",
  },
  {
    symbol: "HYPEUSDT",
    direction: "LONG",
    confidence: 64,
    validFrom: "2026-08-16",
    validUntil: "2026-08-23",
    preferredStrategies: ["INTRADAY", "SWING"],
    phase: "REVERSAL",
    phaseShiftToleranceDays: 1,
    sourceSummary: "8月17日至23日风地观变地雷复，观察后进入修复。",
    riskNote: "首批必须小仓，确认复卦修复后才允许第二批。",
  },
  {
    symbol: "MUUSDT",
    direction: "LONG",
    confidence: 62,
    validFrom: "2026-08-09",
    validUntil: "2026-08-13",
    preferredStrategies: ["INTRADAY", "SWING"],
    phase: "REPAIR",
    phaseShiftToleranceDays: 1,
    sourceSummary: "8月10日至16日地泽临变坤为地，前段靠近并修复，后段转平。",
    riskNote: "存储板块仍属于超跌修复，不能按持续主升处理。",
  },
  {
    symbol: "MUUSDT",
    direction: "SHORT",
    confidence: 57,
    validFrom: "2026-08-14",
    validUntil: "2026-08-17",
    preferredStrategies: ["INTRADAY"],
    phase: "DISTRIBUTION",
    phaseShiftToleranceDays: 1,
    sourceSummary: "临卦前段完成后进入坤卦承压和横弱阶段。",
    riskNote: "必须等待反弹失败，不得在超跌低点追空。",
  },
  {
    symbol: "QQQUSDT",
    direction: "LONG",
    confidence: 64,
    validFrom: "2026-08-09",
    validUntil: "2026-08-16",
    preferredStrategies: ["INTRADAY", "SWING"],
    phase: "REPAIR",
    phaseShiftToleranceDays: 1,
    sourceSummary: "8月9日至16日地水师变山雷颐，组织修复、震荡上行但不是直线主升。",
    riskNote: "科技内部会分化，入场更依赖价格确认。",
  },
  {
    symbol: "SPYUSDT",
    direction: "SHORT",
    confidence: 53,
    validFrom: "2026-08-09",
    validUntil: "2026-08-11",
    preferredStrategies: ["INTRADAY"],
    phase: "REVERSAL",
    phaseShiftToleranceDays: 1,
    sourceSummary: "8月10日至16日天水讼变火地晋，前段冲突和回踩。",
    riskNote: "短空只做前段冲突，不对抗后段晋卦上行。",
  },
  {
    symbol: "SPYUSDT",
    direction: "LONG",
    confidence: 68,
    validFrom: "2026-08-11",
    validUntil: "2026-08-17",
    preferredStrategies: ["INTRADAY", "SWING"],
    phase: "TREND",
    phaseShiftToleranceDays: 1,
    sourceSummary: "天水讼之后转火地晋，冲突消化后偏向推进。",
    riskNote: "采用回落分批，不在垂直拉升时追价。",
  },
  {
    symbol: "XAUTUSDT",
    direction: "LONG",
    confidence: 76,
    validFrom: "2026-08-09",
    validUntil: "2026-08-17",
    preferredStrategies: ["INTRADAY", "SWING", "POSITION"],
    phase: "TREND",
    phaseShiftToleranceDays: 1,
    sourceSummary: "8月10日至16日雷天大壮，且8月10日至31日乾为天变泽天夬，中枢上移。",
    riskNote: "强势不等于追高，优先回踩分批并保留较宽止损。",
  },
  {
    symbol: "XAGUSDT",
    direction: "LONG",
    confidence: 67,
    validFrom: "2026-08-09",
    validUntil: "2026-08-16",
    preferredStrategies: ["INTRADAY", "SWING"],
    phase: "TREND",
    phaseShiftToleranceDays: 1,
    sourceSummary: "8月中旬卦组偏向大过、乾与咸，强波动中保留上行权重。",
    riskNote: "白银波动高于黄金，首批风险必须更小。",
  },
  {
    symbol: "CLUSDT",
    direction: "SHORT",
    confidence: 72,
    validFrom: "2026-08-09",
    validUntil: "2026-08-17",
    preferredStrategies: ["INTRADAY", "SWING", "POSITION"],
    phase: "DECLINE",
    phaseShiftToleranceDays: 1,
    sourceSummary: "8月10日至16日水火未济变坤为地，与申月后原油偏弱路径一致。",
    riskNote: "地缘消息可能造成急拉，空单必须分批并使用结构止损。",
  },
];

function beijingDateKey(now: Date): string {
  return new Date(now.getTime() + 8 * 60 * 60_000).toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getHexagramDirectionPrior(
  symbol: string,
  strategyType: ThreeHorizonStrategyType,
  now = new Date()
): HexagramDirectionPrior | null {
  const normalized = symbol.trim().toUpperCase();
  const key = beijingDateKey(now);
  const matches = PRIORS.filter((row) => {
    if (row.symbol !== normalized || !row.preferredStrategies.includes(strategyType)) return false;
    const from = addDays(row.validFrom, -row.phaseShiftToleranceDays);
    const until = addDays(row.validUntil, row.phaseShiftToleranceDays);
    return key >= from && key <= until;
  });
  if (!matches.length) return null;
  // Exact date range beats tolerance-only overlap; stronger confidence breaks ties.
  return matches.sort((a, b) => {
    const aExact = key >= a.validFrom && key <= a.validUntil ? 1 : 0;
    const bExact = key >= b.validFrom && key <= b.validUntil ? 1 : 0;
    return bExact - aExact || b.confidence - a.confidence;
  })[0] ?? null;
}

export function listHexagramDirectionPriors(): HexagramDirectionPrior[] {
  return PRIORS.map((row) => ({ ...row, preferredStrategies: [...row.preferredStrategies] }));
}
