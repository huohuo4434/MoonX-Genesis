import type {
  XIntelligenceAggregate,
  XIntelligenceSymbolSummary,
} from "@/lib/trading-signals/x-intelligence-core";
import {
  buildXIntelligenceAutoWeight,
  findXIntelligenceSummaryForMarket,
} from "@/lib/trading-signals/x-intelligence-overlay";

export type MarketEnvironmentTone = "POSITIVE" | "NEUTRAL" | "CAUTION" | "RISK";

export type MarketEnvironmentBand = {
  score: number;
  zh: string;
  en: string;
  tone: MarketEnvironmentTone;
};

export type MarketForecastImpact = {
  marketCode: string;
  assetZh: string;
  assetEn: string;
  sourceSymbol: string;
  shiftPct: number;
  strength: "LOW" | "MEDIUM" | "HIGH";
  tone: MarketEnvironmentTone;
  effectZh: string;
  effectEn: string;
  noteZh: string;
  noteEn: string;
};

export type MarketTradePriorityBoost = {
  symbol: string;
  score: number;
  guarded: boolean;
  reasonZh: string;
  reasonEn: string;
};

export type MarketEnvironmentView = {
  riskAppetite: MarketEnvironmentBand;
  heat: MarketEnvironmentBand;
  breadth: MarketEnvironmentBand;
  reversalRisk: MarketEnvironmentBand;
  significant: boolean;
  alertLevel: "NONE" | "WATCH" | "HIGH";
  headlineZh: string;
  headlineEn: string;
  summaryZh: string;
  summaryEn: string;
  forecastImpacts: MarketForecastImpact[];
  aiPriorityUp: MarketTradePriorityBoost[];
  aiRiskGuards: MarketTradePriorityBoost[];
};

const FORECAST_MARKETS = [
  { code: "BTC", zh: "比特币", en: "Bitcoin" },
  { code: "ETH", zh: "以太坊", en: "Ether" },
  { code: "GLD", zh: "黄金", en: "Gold" },
  { code: "SILVER", zh: "白银", en: "Silver" },
  { code: "SPX", zh: "标普500", en: "S&P 500" },
  { code: "NDX", zh: "纳指", en: "Nasdaq 100" },
  { code: "WTI", zh: "WTI原油", en: "WTI Crude" },
  { code: "SHCOMP", zh: "上证", en: "Shanghai Composite" },
  { code: "HSTECH", zh: "恒生科技", en: "Hang Seng TECH" },
] as const;

const TRADE_ALIASES: Record<string, string[]> = {
  BTC: ["BTC", "BITCOIN"],
  ETH: ["ETH", "ETHEREUM"],
  XAUT: ["XAUT", "XAU", "GOLD", "GLD"],
  XAG: ["XAG", "SILVER", "SLV"],
  SPY: ["SPY", "SPX", "SP500"],
  QQQ: ["QQQ", "NDX", "NASDAQ", "NASDAQ100"],
  CL: ["CL", "WTI", "OIL", "CRUDE"],
  GOOGL: ["GOOGL", "GOOGLE"],
  MU: ["MU", "MICRON"],
  SNDK: ["SNDK", "SANDISK"],
  MSFT: ["MSFT", "MICROSOFT"],
  HYPE: ["HYPE"],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function normalizedSymbol(value: string): string {
  return value.toUpperCase().replace(/USDT$/, "").replace(/[^A-Z0-9\u4e00-\u9fff]/g, "");
}

function weightedDirectionScore(rows: XIntelligenceSymbolSummary[]): number {
  let numerator = 0;
  let denominator = 0;
  for (const row of rows) {
    if (row.mentions24h <= 0) continue;
    const weight = Math.max(1, Math.min(8, row.mentions24h));
    numerator += row.directionScore * weight;
    denominator += weight;
  }
  return denominator ? numerator / denominator : 0;
}

function bandRiskAppetite(score: number): MarketEnvironmentBand {
  if (score >= 35) return { score, zh: "偏强", en: "Risk-on", tone: "POSITIVE" };
  if (score >= 10) return { score, zh: "温和偏强", en: "Mild risk-on", tone: "POSITIVE" };
  if (score <= -35) return { score, zh: "偏弱", en: "Risk-off", tone: "RISK" };
  if (score <= -10) return { score, zh: "温和偏弱", en: "Mild risk-off", tone: "CAUTION" };
  return { score, zh: "中性", en: "Neutral", tone: "NEUTRAL" };
}

function bandHeat(score: number): MarketEnvironmentBand {
  if (score >= 78) return { score, zh: "过热", en: "Overheated", tone: "RISK" };
  if (score >= 58) return { score, zh: "偏热", en: "Hot", tone: "CAUTION" };
  if (score >= 32) return { score, zh: "正常", en: "Normal", tone: "NEUTRAL" };
  return { score, zh: "降温", en: "Cooling", tone: "CAUTION" };
}

function bandBreadth(score: number): MarketEnvironmentBand {
  if (score >= 70) return { score, zh: "广泛扩散", en: "Broad", tone: "POSITIVE" };
  if (score >= 42) return { score, zh: "中等扩散", en: "Moderate", tone: "NEUTRAL" };
  return { score, zh: "集中", en: "Narrow", tone: "CAUTION" };
}

function bandReversal(score: number): MarketEnvironmentBand {
  if (score >= 70) return { score, zh: "高", en: "High", tone: "RISK" };
  if (score >= 48) return { score, zh: "中高", en: "Elevated", tone: "CAUTION" };
  if (score >= 28) return { score, zh: "中等", en: "Moderate", tone: "NEUTRAL" };
  return { score, zh: "低", en: "Low", tone: "POSITIVE" };
}

function forecastImpactFor(
  aggregate: XIntelligenceAggregate,
  market: (typeof FORECAST_MARKETS)[number]
): MarketForecastImpact | null {
  const summary = findXIntelligenceSummaryForMarket(aggregate.summaries, market.code);
  const overlay = buildXIntelligenceAutoWeight(summary);
  if (!summary || !overlay) return null;
  const isGuard = overlay.forecastAction === "OVERHEAT_GUARD";
  if (!isGuard && Math.abs(overlay.probabilityShiftPct) < 1) return null;

  const magnitude = Math.abs(overlay.probabilityShiftPct);
  const strength: MarketForecastImpact["strength"] = isGuard || magnitude >= 4
    ? "HIGH"
    : magnitude >= 2
      ? "MEDIUM"
      : "LOW";
  const tone: MarketEnvironmentTone = isGuard
    ? "RISK"
    : overlay.probabilityShiftPct > 0
      ? "POSITIVE"
      : overlay.probabilityShiftPct < 0
        ? "CAUTION"
        : "NEUTRAL";

  let effectZh = "环境中性：不改变主方向";
  let effectEn = "Neutral context: no directional change";
  if (isGuard) {
    effectZh = "过热保护：不增加追涨权重";
    effectEn = "Overheat guard: no chase boost";
  } else if (overlay.probabilityShiftPct > 0) {
    effectZh = `上涨情景权重 +${overlay.probabilityShiftPct} 个百分点`;
    effectEn = `Up probability +${overlay.probabilityShiftPct}pp`;
  } else if (overlay.probabilityShiftPct < 0) {
    effectZh = `上涨情景权重 ${overlay.probabilityShiftPct} 个百分点`;
    effectEn = `Up probability ${overlay.probabilityShiftPct}pp`;
  }

  const noteZh = summary.risk === "HIGH"
    ? "风险较高，只做辅助修正，必须等待技术确认。"
    : summary.momentum === "COOLING"
      ? "热度正在降温，不把旧热度当成新趋势。"
      : "仅作环境修正，不覆盖MOOX主预测。";
  const noteEn = summary.risk === "HIGH"
    ? "High-risk context; technical confirmation is still required."
    : summary.momentum === "COOLING"
      ? "Heat is cooling; old attention is not treated as a fresh trend."
      : "Context adjustment only; it does not override the core MOOX forecast.";

  return {
    marketCode: market.code,
    assetZh: market.zh,
    assetEn: market.en,
    sourceSymbol: summary.symbol,
    shiftPct: overlay.probabilityShiftPct,
    strength,
    tone,
    effectZh,
    effectEn,
    noteZh,
    noteEn,
  };
}

function findSummaryForTradeSymbol(
  summaries: XIntelligenceSymbolSummary[],
  tradeSymbol: string
): XIntelligenceSymbolSummary | null {
  const normalized = normalizedSymbol(tradeSymbol);
  const aliases = TRADE_ALIASES[normalized] ?? [normalized];
  const wanted = new Set(aliases.map(normalizedSymbol));
  return summaries.find((row) => wanted.has(normalizedSymbol(row.symbol))) ?? null;
}

export function buildXIntelligenceTradeUniverseBoost(
  summaries: XIntelligenceSymbolSummary[],
  tradeSymbol: string
): MarketTradePriorityBoost {
  const summary = findSummaryForTradeSymbol(summaries, tradeSymbol);
  if (!summary || summary.mentions24h <= 0) {
    return {
      symbol: tradeSymbol,
      score: 0,
      guarded: false,
      reasonZh: "没有足够的24小时资金环境线索，不调整AI候选排序。",
      reasonEn: "No sufficient 24h context; AI candidate ranking is unchanged.",
    };
  }

  if (summary.dominantStage === "OVERHEATED") {
    return {
      symbol: tradeSymbol,
      score: -8,
      guarded: true,
      reasonZh: "线索过热：只降低追价优先级，不反向生成交易。",
      reasonEn: "Overheated: lowers chase priority only; it does not create a reverse trade.",
    };
  }

  let score = 0;
  if (summary.dominantStage === "CONFIRMATION") score += 5;
  else if (summary.dominantStage === "EARLY_WATCH") score += 3;
  if (summary.momentum === "ACCELERATING") score += 4;
  else if (summary.momentum === "NEW") score += 3;
  else if (summary.momentum === "COOLING") score -= 3;
  score += Math.min(4, Math.max(0, summary.uniqueSources24h - 1));
  if (summary.agreementRatio24h >= 0.75) score += 2;
  else if (summary.agreementRatio24h < 0.55) score -= 3;
  if (summary.risk === "HIGH") score -= 3;
  else if (summary.risk === "MEDIUM") score -= 1;
  if (summary.direction === "NEUTRAL") score -= 2;
  score = clamp(Math.round(score), -10, 12);

  return {
    symbol: tradeSymbol,
    score,
    guarded: score < 0 && summary.risk === "HIGH",
    reasonZh: score > 0
      ? "多源线索与阶段质量提高AI候选排序；方向和入场仍由预测与技术结构决定。"
      : score < 0
        ? "分歧、降温或风险较高，AI候选排序降权。"
        : "环境信息不足以改变AI候选排序。",
    reasonEn: score > 0
      ? "Multi-source context raises AI candidate priority; direction and entry still come from forecast and technical structure."
      : score < 0
        ? "Conflict, cooling or elevated risk lowers AI candidate priority."
        : "Context is insufficient to change AI candidate priority.",
  };
}

export function buildMarketEnvironment(aggregate: XIntelligenceAggregate): MarketEnvironmentView {
  const active = aggregate.summaries.filter((row) => row.mentions24h > 0);
  const totalMentions24h = active.reduce((sum, row) => sum + row.mentions24h, 0);
  const totalMentions6h = active.reduce((sum, row) => sum + row.mentions6h, 0);
  const directionalPosts = aggregate.longSignals24h + aggregate.shortSignals24h;
  const postBias = directionalPosts
    ? (aggregate.longSignals24h - aggregate.shortSignals24h) / directionalPosts * 100
    : 0;
  const symbolBias = weightedDirectionScore(active);
  const riskAppetiteScore = clamp(Math.round(postBias * 0.55 + symbolBias * 0.45), -100, 100);

  const recentShare = safeRatio(totalMentions6h, totalMentions24h);
  const acceleratingShare = safeRatio(
    active.filter((row) => row.momentum === "ACCELERATING" || row.momentum === "NEW").length,
    active.length
  );
  const newShare = safeRatio(active.filter((row) => row.momentum === "NEW").length, active.length);
  const overheatShare = safeRatio(active.filter((row) => row.dominantStage === "OVERHEATED").length, active.length);
  const highRiskShare = safeRatio(active.filter((row) => row.risk === "HIGH").length, active.length);
  const coolingShare = safeRatio(active.filter((row) => row.momentum === "COOLING").length, active.length);
  const directionalAssetShare = safeRatio(active.filter((row) => row.direction !== "NEUTRAL").length, active.length);

  const heatScore = active.length
    ? clamp(Math.round(
        Math.min(1.4, recentShare / 0.25) * 30 +
        acceleratingShare * 30 +
        overheatShare * 30 +
        newShare * 10
      ), 0, 100)
    : 0;

  const breadthScore = active.length
    ? clamp(Math.round(
        Math.min(1, aggregate.symbols24h / 24) * 65 +
        directionalAssetShare * 35
      ), 0, 100)
    : 0;

  const topMentions = active.length ? Math.max(...active.map((row) => row.mentions24h)) : 0;
  const concentration = safeRatio(topMentions, totalMentions24h);
  const avgAgreement = active.length
    ? active.reduce((sum, row) => sum + row.agreementRatio24h, 0) / active.length
    : 0;
  const crowdingBase = clamp(Math.round(
    overheatShare * 42 +
    highRiskShare * 24 +
    Math.min(1, concentration / 0.35) * 20 +
    Math.max(0, avgAgreement - 0.65) / 0.35 * 14
  ), 0, 100);
  const reversalScore = clamp(Math.round(
    crowdingBase * 0.68 +
    Math.max(0, heatScore - 50) * 0.45 +
    coolingShare * 18
  ), 0, 100);

  const riskAppetite = bandRiskAppetite(riskAppetiteScore);
  const heat = bandHeat(heatScore);
  const breadth = bandBreadth(breadthScore);
  const reversalRisk = bandReversal(reversalScore);
  const significant = Math.abs(riskAppetiteScore) >= 35 || heatScore >= 65 || reversalScore >= 55 || breadthScore <= 25;
  const alertLevel: MarketEnvironmentView["alertLevel"] = reversalScore >= 70 || heatScore >= 82
    ? "HIGH"
    : significant
      ? "WATCH"
      : "NONE";

  let headlineZh = "资金环境中性，不单独改变次日方向";
  let headlineEn = "Market context is neutral and does not change the next-session direction";
  let summaryZh = "继续以MOOX主预测与技术结构为准；资金雷达只提供辅助修正。";
  let summaryEn = "Keep the core MOOX forecast and technical structure in charge; the radar is an auxiliary adjustment only.";

  if (riskAppetiteScore >= 30 && reversalScore >= 55) {
    headlineZh = "风险偏好仍强，但短线拥挤明显";
    headlineEn = "Risk appetite remains firm, but short-term crowding is elevated";
    summaryZh = "偏多预测可以保留，但不宜追涨；优先等待回踩和新的技术确认。";
    summaryEn = "Bullish forecasts may remain intact, but avoid chasing; prefer pullbacks and fresh technical confirmation.";
  } else if (riskAppetiteScore >= 30) {
    headlineZh = "风险偏好偏强，资金环境对风险资产较友好";
    headlineEn = "Risk appetite is firm and the environment is supportive for risk assets";
    summaryZh = "可作为偏多判断的辅助确认，但仍不能绕过价格结构、止损和风险闸门。";
    summaryEn = "This can support bullish views, but it never bypasses price structure, stops or risk gates.";
  } else if (riskAppetiteScore <= -30) {
    headlineZh = "风险偏好转弱，多头判断需要更谨慎";
    headlineEn = "Risk appetite is weakening and bullish views need more caution";
    summaryZh = "系统会降低部分风险资产的多头权重，等待技术面重新确认后再提高优先级。";
    summaryEn = "The system reduces some bullish risk-asset weight and waits for renewed technical confirmation before raising priority.";
  } else if (heatScore >= 70 || reversalScore >= 60) {
    headlineZh = "方向未必转弱，但追价风险已经升高";
    headlineEn = "Direction may not be bearish, but chase risk has increased";
    summaryZh = "过热只触发保护和降权，不会因为热度高就自动反手做空。";
    summaryEn = "Overheat triggers protection and de-prioritization only; it does not automatically create a short trade.";
  }

  const forecastImpacts = FORECAST_MARKETS
    .map((market) => forecastImpactFor(aggregate, market))
    .filter((row): row is MarketForecastImpact => Boolean(row))
    .sort((left, right) => {
      const guardDelta = Number(right.tone === "RISK") - Number(left.tone === "RISK");
      if (guardDelta !== 0) return guardDelta;
      return Math.abs(right.shiftPct) - Math.abs(left.shiftPct);
    })
    .slice(0, 6);

  const tradeRows = active
    .map((row) => buildXIntelligenceTradeUniverseBoost(active, row.symbol))
    .filter((row) => row.score !== 0);
  const aiPriorityUp = tradeRows
    .filter((row) => row.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const aiRiskGuards = tradeRows
    .filter((row) => row.score <= -4 || row.guarded)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  return {
    riskAppetite,
    heat,
    breadth,
    reversalRisk,
    significant,
    alertLevel,
    headlineZh,
    headlineEn,
    summaryZh,
    summaryEn,
    forecastImpacts,
    aiPriorityUp,
    aiRiskGuards,
  };
}
