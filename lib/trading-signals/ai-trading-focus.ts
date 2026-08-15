import type { PredictionStrategyPlan } from "@/types/prediction-auto-trader";

export type AiTradingFocusDirection = "LONG" | "SHORT" | "NEUTRAL";
export type AiTradingCountertrendPolicy = "NONE" | "STRONG_ONLY";

export type AiTradingFocusDay = {
  date: string;
  shortDate: string;
  label: string;
  mainDirection: AiTradingFocusDirection;
  tacticalDirection: AiTradingFocusDirection;
  action: string;
  note: string;
};

export type AiTradingFocusPlaybook = {
  symbol: string;
  assetName: string;
  assetNameEn: string;
  assetId: string;
  periodStart: string;
  periodEnd: string;
  weeklyLabel: string;
  weeklyDirection: AiTradingFocusDirection;
  weeklyPath: string;
  primaryAction: string;
  countertrendPolicy: AiTradingCountertrendPolicy;
  countertrendConfluence: number;
  countertrendRiskScale: number;
  priority: number;
  sourceNote: string;
  days: AiTradingFocusDay[];
};

const CORE_PRIORITY: Record<string, number> = {
  XAUTUSDT: 28,
  ETHUSDT: 24,
  XAGUSDT: 22,
  BTCUSDT: 20,
  QQQUSDT: 14,
  SPYUSDT: 13,
  GOOGLUSDT: 12,
  MUUSDT: 11,
  HYPEUSDT: 10,
  SNDKUSDT: 12,
  MSFTUSDT: 8,
  CLUSDT: 7,
};

const ASSET_NAMES: Record<string, [string, string]> = {
  XAUTUSDT: ["黄金", "Gold"],
  XAGUSDT: ["白银", "Silver"],
  BTCUSDT: ["比特币", "Bitcoin"],
  ETHUSDT: ["以太坊", "Ether"],
  QQQUSDT: ["纳指 QQQ", "Nasdaq QQQ"],
  SPYUSDT: ["标普 SPY", "S&P 500 SPY"],
  CLUSDT: ["WTI 原油", "WTI Crude"],
  GOOGLUSDT: ["谷歌", "Google"],
  MUUSDT: ["美光", "Micron"],
  HYPEUSDT: ["HYPE", "HYPE"],
  SNDKUSDT: ["闪迪", "SanDisk"],
  MSFTUSDT: ["微软", "Microsoft"],
};

export function listAiTradingFocusRegistry(): Array<{
  canonicalSymbol: string; displayName: string; assetClass: "CRYPTO" | "COMMODITY" | "EQUITY" | "ETF";
}> {
  const classes: Record<string, "CRYPTO" | "COMMODITY" | "EQUITY" | "ETF"> = {
    BTCUSDT: "CRYPTO", ETHUSDT: "CRYPTO", HYPEUSDT: "CRYPTO",
    XAUTUSDT: "COMMODITY", XAGUSDT: "COMMODITY", CLUSDT: "COMMODITY",
    QQQUSDT: "ETF", SPYUSDT: "ETF",
  };
  return Object.keys(CORE_PRIORITY).map((canonicalSymbol) => ({
    canonicalSymbol,
    displayName: ASSET_NAMES[canonicalSymbol]?.[0] ?? canonicalSymbol,
    assetClass: classes[canonicalSymbol] ?? "EQUITY",
  }));
}

const PLAYBOOKS: AiTradingFocusPlaybook[] = [
  {
    symbol: "XAUTUSDT",
    assetName: "黄金",
    assetNameEn: "Gold",
    assetId: "gold",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-14",
    weeklyLabel: "震荡上涨 · 先跌后涨",
    weeklyDirection: "LONG",
    weeklyPath: "周初探底 → 周中反弹转强 → 后半周冲高，冲高后防回吐",
    primaryAction: "主策略等周初下探完成后做多，不追涨；突破只认真实收盘确认。",
    countertrendPolicy: "STRONG_ONLY",
    countertrendConfluence: 78,
    countertrendRiskScale: 0.42,
    priority: 100,
    sourceNote: "MOOX 周度 V2 + 第二六爻来源交叉验证；方向仍以震荡上涨为主。",
    days: [
      { date: "2026-08-10", shortDate: "8/10 周一", label: "探底偏弱", mainDirection: "LONG", tacticalDirection: "SHORT", action: "先等下探；若 1H/15m 同向转空且共振很强，只允许小仓短空。", note: "反向只做强共振，不把短空升级成周趋势看空。" },
      { date: "2026-08-11", shortDate: "8/11 周二", label: "低点/转折窗口", mainDirection: "LONG", tacticalDirection: "NEUTRAL", action: "重点找止跌，不追空；出现承接后准备切换做多。", note: "低点窗口优先等市场确认。" },
      { date: "2026-08-12", shortDate: "8/12 周三", label: "反弹转强", mainDirection: "LONG", tacticalDirection: "LONG", action: "主多启动：回踩不破、5m/15m 转强后做多。", note: "优先主方向交易。" },
      { date: "2026-08-13", shortDate: "8/13 周四", label: "偏强上行", mainDirection: "LONG", tacticalDirection: "LONG", action: "持多或等回踩再多，不在急拉末端追价。", note: "强势阶段仍使用技术入场。" },
      { date: "2026-08-14", shortDate: "8/14 周五", label: "冲高防回吐", mainDirection: "LONG", tacticalDirection: "NEUTRAL", action: "已有多单保护利润；新单只做回踩确认，不追高。", note: "冲高后回吐风险提高。" },
    ],
  },
  {
    symbol: "ETHUSDT",
    assetName: "以太坊",
    assetNameEn: "Ether",
    assetId: "eth",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    weeklyLabel: "探底回升",
    weeklyDirection: "LONG",
    weeklyPath: "10–11 日探底 → 12 日转强 → 12–14 日渐进上攻 → 15 日高点/变盘 → 15–16 日高位震荡或回落",
    primaryAction: "优先等 10–11 日下探完成后做多；12 日是重点转强窗口。",
    countertrendPolicy: "STRONG_ONLY",
    countertrendConfluence: 72,
    countertrendRiskScale: 0.38,
    priority: 92,
    sourceNote: "MOOX 周度 V2；8/12 与 8/15 为明确关键时间窗，仍需 K 线确认。",
    days: [
      { date: "2026-08-10", shortDate: "8/10 周一", label: "下探", mainDirection: "LONG", tacticalDirection: "SHORT", action: "以等待低点为主；强技术共振才允许短空探路。", note: "不追空。" },
      { date: "2026-08-11", shortDate: "8/11 周二", label: "低点窗口", mainDirection: "LONG", tacticalDirection: "NEUTRAL", action: "停止追空，观察止跌和结构抬高。", note: "为 12 日转强做准备。" },
      { date: "2026-08-12", shortDate: "8/12 周三", label: "多头启动关键日", mainDirection: "LONG", tacticalDirection: "LONG", action: "止跌确认后优先做多。", note: "时间窗不是无条件买点。" },
      { date: "2026-08-13", shortDate: "8/13 周四", label: "渐进走强", mainDirection: "LONG", tacticalDirection: "LONG", action: "顺势做多，回踩优先于追涨。", note: "维持主多。" },
      { date: "2026-08-14", shortDate: "8/14 周五", label: "偏强", mainDirection: "LONG", tacticalDirection: "LONG", action: "主多延续，逐步保护利润。", note: "关注波动放大。" },
      { date: "2026-08-15", shortDate: "8/15 周六", label: "高点/变盘", mainDirection: "LONG", tacticalDirection: "NEUTRAL", action: "多单减风险，不追高；出现转弱则退出。", note: "7×24 正式观察日。" },
      { date: "2026-08-16", shortDate: "8/16 周日", label: "高位震荡/回落", mainDirection: "NEUTRAL", tacticalDirection: "SHORT", action: "以保护已有利润为主，新方向等确认。", note: "不强行反手。" },
    ],
  },
  {
    symbol: "XAGUSDT",
    assetName: "白银",
    assetNameEn: "Silver",
    assetId: "silver",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-14",
    weeklyLabel: "震荡上涨 · 高波动",
    weeklyDirection: "LONG",
    weeklyPath: "前段仍可上冲 → 11–12 日砸坑/周内低点 → 13–14 日强势反攻",
    primaryAction: "白银弹性高，主策略仍是砸坑完成后做多；不在急拉时追价。",
    countertrendPolicy: "STRONG_ONLY",
    countertrendConfluence: 74,
    countertrendRiskScale: 0.36,
    priority: 88,
    sourceNote: "MOOX 周度 V2；白银攻击性高于黄金，反向仓风险必须更小。",
    days: [
      { date: "2026-08-10", shortDate: "8/10 周一", label: "仍有上冲", mainDirection: "LONG", tacticalDirection: "LONG", action: "顺势但不追高，优先回踩多。", note: "波动高。" },
      { date: "2026-08-11", shortDate: "8/11 周二", label: "转入砸坑", mainDirection: "LONG", tacticalDirection: "SHORT", action: "强共振才允许小仓短空；更重要的是等低点。", note: "反向风险缩小。" },
      { date: "2026-08-12", shortDate: "8/12 周三", label: "周内低点窗口", mainDirection: "LONG", tacticalDirection: "NEUTRAL", action: "不追空，等待止跌回收。", note: "准备切回主多。" },
      { date: "2026-08-13", shortDate: "8/13 周四", label: "强势反攻", mainDirection: "LONG", tacticalDirection: "LONG", action: "技术转强后做多。", note: "主多重点窗口。" },
      { date: "2026-08-14", shortDate: "8/14 周五", label: "反攻延续", mainDirection: "LONG", tacticalDirection: "LONG", action: "持多/回踩多，逐步保护利润。", note: "避免高位追价。" },
    ],
  },
  {
    symbol: "BTCUSDT",
    assetName: "比特币",
    assetNameEn: "Bitcoin",
    assetId: "bitcoin",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    weeklyLabel: "先涨后跌",
    weeklyDirection: "NEUTRAL",
    weeklyPath: "周初至周中先修复反弹 → 压力区确认后防快速反向 → 周后段重新承压",
    primaryAction: "按周内阶段切换：前段只在止跌确认后做多，后段只有转弱确认后才做空。",
    countertrendPolicy: "NONE",
    countertrendConfluence: 0,
    countertrendRiskScale: 0,
    priority: 82,
    sourceNote: "MOOX 周度 V2；24–36 小时快速反向风险高，不追涨杀跌。",
    days: [
      { date: "2026-08-10", shortDate: "8/10 周一", label: "修复反弹", mainDirection: "LONG", tacticalDirection: "LONG", action: "止跌确认后做多，不追阳线。", note: "反弹不等于反转。" },
      { date: "2026-08-11", shortDate: "8/11 周二", label: "反弹延续/震荡", mainDirection: "LONG", tacticalDirection: "LONG", action: "回踩确认再多。", note: "随时防 24–36 小时反向。" },
      { date: "2026-08-12", shortDate: "8/12 周三", label: "压力观察", mainDirection: "NEUTRAL", tacticalDirection: "NEUTRAL", action: "不追涨，等待压力区选择方向。", note: "切换窗口。" },
      { date: "2026-08-13", shortDate: "8/13 周四", label: "转弱观察", mainDirection: "SHORT", tacticalDirection: "SHORT", action: "只有压力受阻并转弱后才做空。", note: "不提前猜顶。" },
      { date: "2026-08-14", shortDate: "8/14 周五", label: "承压", mainDirection: "SHORT", tacticalDirection: "SHORT", action: "反弹不过压力可逢高空。", note: "避免低位追空。" },
      { date: "2026-08-15", shortDate: "8/15 周六", label: "高波动", mainDirection: "SHORT", tacticalDirection: "SHORT", action: "顺势但缩短持仓，防周末急反。", note: "7×24 高波动。" },
      { date: "2026-08-16", shortDate: "8/16 周日", label: "承压/震荡", mainDirection: "SHORT", tacticalDirection: "NEUTRAL", action: "已有空单保护利润，新单等技术确认。", note: "不为凑单追空。" },
    ],
  },
];

function normalizeSymbol(symbol: string): string {
  const value = symbol.trim().toUpperCase().replace(/[-_/\s]/g, "");
  return value.endsWith("USDT") ? value : `${value}USDT`;
}

function dateKeyInBeijing(now: Date): string {
  const shifted = new Date(now.getTime() + 8 * 60 * 60_000);
  return shifted.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

export function aiTradingAssetName(symbol: string, en = false): string {
  const normalized = normalizeSymbol(symbol);
  const row = ASSET_NAMES[normalized];
  return row ? row[en ? 1 : 0] : normalized.replace(/USDT$/, "");
}

export function getAiTradingExecutionFocus(
  symbol: string,
  now = new Date()
): (AiTradingFocusPlaybook & { day: AiTradingFocusDay | null }) | null {
  const normalized = normalizeSymbol(symbol);
  const today = dateKeyInBeijing(now);
  const playbook = PLAYBOOKS.find(
    (row) => row.symbol === normalized && row.periodStart <= today && row.periodEnd >= today
  );
  if (!playbook) return null;
  return { ...playbook, day: playbook.days.find((row) => row.date === today) ?? null };
}

export function listAiTradingDisplayFocus(now = new Date()): AiTradingFocusPlaybook[] {
  const today = dateKeyInBeijing(now);
  const active = PLAYBOOKS.filter((row) => row.periodStart <= today && row.periodEnd >= today);
  const rows = active.length
    ? active
    : PLAYBOOKS.filter((row) => row.periodStart > today && dayDiff(row.periodStart, today) <= 3);
  return [...rows].sort((a, b) => b.priority - a.priority);
}

export function aiTradingFocusPriority(symbol: string, now = new Date()): number {
  const normalized = normalizeSymbol(symbol);
  const display = listAiTradingDisplayFocus(now).find((row) => row.symbol === normalized);
  return (CORE_PRIORITY[normalized] ?? 0) + (display ? Math.round(display.priority * 0.45) : 0);
}

export function buildAiTradingFocusPredictionPlan(
  symbol: string,
  now = new Date()
): PredictionStrategyPlan | null {
  const focus = getAiTradingExecutionFocus(symbol, now);
  if (!focus) return null;
  const day = focus.day;
  const mainDirection = day?.mainDirection ?? focus.weeklyDirection;
  const setup = mainDirection === "LONG" ? "BUY_DIP" : mainDirection === "SHORT" ? "SELL_RALLY" : "HOLD";
  const dailyDirection = day?.mainDirection ?? "NEUTRAL";
  const today = dateKeyInBeijing(now);
  return {
    symbol: focus.symbol.replace(/USDT$/, ""),
    tradeSymbol: focus.symbol.replace(/USDT$/, ""),
    assetId: focus.assetId,
    assetName: focus.assetName,
    monthlyForecast: null,
    weeklyForecast: {
      id: `AI-FOCUS-${focus.symbol}-${focus.periodStart}`,
      periodStart: focus.periodStart,
      periodEnd: focus.periodEnd,
      direction: focus.weeklyLabel,
      path: focus.weeklyPath,
      confidence: Math.min(82, Math.max(58, Math.round(focus.priority * 0.72))),
      sourceLabel: "MOOX周度预测+重点交易编排",
      status: "published",
      version: 1,
      publishedAt: null,
      lockedAt: null,
    },
    dailyForecast: day
      ? {
          id: `AI-FOCUS-${focus.symbol}-${today}`,
          periodStart: today,
          periodEnd: today,
          direction: day.label,
          path: `${day.label}；${day.action}`,
          confidence: Math.min(82, Math.max(58, focus.countertrendPolicy === "STRONG_ONLY" ? focus.countertrendConfluence : 66)),
          sourceLabel: "MOOX周内路径推演",
          status: "published",
          version: 1,
          publishedAt: null,
          lockedAt: null,
        }
      : null,
    monthlyDirection: "NEUTRAL",
    weeklyDirection: focus.weeklyDirection === "NEUTRAL" ? mainDirection : focus.weeklyDirection,
    dailyDirection,
    setup,
    confidence: Math.min(82, Math.max(58, Math.round((focus.priority + (day ? 62 : 55)) / 2))),
    reason: `${focus.weeklyLabel}：${focus.primaryAction}${day ? ` 今日：${day.action}` : ""}`,
    pointGuidance: null,
  };
}
