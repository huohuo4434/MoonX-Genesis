import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import type {
  XIntelligenceDirection,
  XIntelligenceMomentum,
  XIntelligenceRisk,
  XIntelligenceStage,
  XIntelligenceSymbolSummary,
} from "@/lib/trading-signals/x-intelligence-core";

export type XIntelligenceAutoWeight = {
  symbol: string;
  weightPct: number;
  direction: XIntelligenceDirection;
  directionScore: number;
  probabilityShiftPct: number;
  uniqueSources24h: number;
  uniqueAccounts24h: number;
  methodFamilies24h: number;
  agreementPct: number;
  stage: XIntelligenceStage;
  momentum: XIntelligenceMomentum;
  risk: XIntelligenceRisk;
  forecastAction: "BOOST" | "REDUCE" | "NEUTRAL" | "OVERHEAT_GUARD";
  explanation: string;
  canTriggerTradeAlone: false;
};

const MARKET_ALIASES: Record<string, string[]> = {
  BTC: ["BTC", "BTCUSDT", "BITCOIN"],
  ETH: ["ETH", "ETHUSDT", "ETHEREUM"],
  SPX: ["SPX", "SPY", "SP500", "S&P500"],
  NDX: ["NDX", "QQQ", "NASDAQ", "NASDAQ100"],
  SHCOMP: ["SHCOMP", "SSEC", "000001SS", "A股", "上证"],
  HSTECH: ["HSTECH", "恒生科技"],
  GLD: ["GLD", "GOLD", "XAU", "XAUUSD", "GCF"],
  SILVER: ["SILVER", "SLV", "XAG", "XAGUSD", "SIF"],
  WTI: ["WTI", "CL", "CLF", "OIL", "CRUDE"],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizedSymbol(value: string): string {
  return value.toUpperCase().replace(/USDT$/, "").replace(/[^A-Z0-9\u4e00-\u9fff]/g, "");
}

export function findXIntelligenceSummaryForMarket(
  summaries: XIntelligenceSymbolSummary[],
  marketCode: string
): XIntelligenceSymbolSummary | null {
  const aliases = MARKET_ALIASES[marketCode.toUpperCase()] ?? [marketCode];
  const wanted = new Set(aliases.map(normalizedSymbol));
  return summaries.find((item) => wanted.has(normalizedSymbol(item.symbol))) ?? null;
}

export function buildXIntelligenceAutoWeight(
  summary: XIntelligenceSymbolSummary | null | undefined
): XIntelligenceAutoWeight | null {
  if (!summary || summary.mentions24h <= 0) return null;
  const sources = Math.max(1, summary.uniqueSources24h || 1);
  const agreement = clamp(summary.agreementRatio24h || 0, 0, 1);
  const sourceCap = sources >= 5 ? 15 : sources >= 3 ? 10 : sources >= 2 ? 8 : 5;
  let weight = 3 + Math.min(3, Math.floor(summary.mentions24h / 2));
  if (summary.momentum === "NEW" || summary.momentum === "ACCELERATING") weight += 2;
  if (summary.dominantStage === "CONFIRMATION") weight += 2;
  else if (summary.dominantStage === "EARLY_WATCH") weight += 1;
  if (summary.averageConfidence >= 60) weight += 1;
  weight = Math.min(sourceCap, weight);

  if (summary.direction === "NEUTRAL" || agreement < 0.55) weight = Math.min(weight, 3);
  if (summary.risk === "HIGH" && summary.dominantStage !== "OVERHEATED") weight = Math.min(weight, 6);
  if (summary.dominantStage === "OVERHEATED") weight = Math.min(5, Math.max(2, Math.round(weight * 0.5)));

  let probabilityShiftPct = clamp(Math.round(weight * summary.directionScore / 100), -8, 8);
  let forecastAction: XIntelligenceAutoWeight["forecastAction"] = "NEUTRAL";
  if (summary.dominantStage === "OVERHEATED") {
    probabilityShiftPct = 0;
    forecastAction = "OVERHEAT_GUARD";
  } else if (probabilityShiftPct >= 1) {
    forecastAction = "BOOST";
  } else if (probabilityShiftPct <= -1) {
    forecastAction = "REDUCE";
  }

  const explanation = `匿名X情报自动权重${weight}%：24小时${summary.mentions24h}条，账号${summary.uniqueAccounts24h}个，方法组${summary.methodFamilies24h}类，有效独立源${sources}组，方向一致度${Math.round(agreement * 100)}%，方向分${summary.directionScore >= 0 ? "+" : ""}${summary.directionScore}，阶段${summary.dominantStage}，热度${summary.momentum}。`;

  return {
    symbol: summary.symbol,
    weightPct: weight,
    direction: summary.direction,
    directionScore: summary.directionScore,
    probabilityShiftPct,
    uniqueSources24h: sources,
    uniqueAccounts24h: summary.uniqueAccounts24h,
    methodFamilies24h: summary.methodFamilies24h,
    agreementPct: Math.round(agreement * 100),
    stage: summary.dominantStage,
    momentum: summary.momentum,
    risk: summary.risk,
    forecastAction,
    explanation,
    canTriggerTradeAlone: false,
  };
}

function normalizeProbabilities(up: number, flat: number, down: number) {
  const a = Math.max(5, up);
  const b = Math.max(5, flat);
  const c = Math.max(5, down);
  const total = a + b + c;
  const nUp = Math.round(a / total * 100);
  const nFlat = Math.round(b / total * 100);
  return { up: nUp, flat: nFlat, down: 100 - nUp - nFlat };
}

export function applyXIntelligenceToGeneratedDaily(
  record: GeneratedDailyForecastRecord,
  overlay: XIntelligenceAutoWeight | null
): GeneratedDailyForecastRecord {
  if (!overlay || overlay.weightPct <= 0) return record;

  const shift = overlay.probabilityShiftPct;
  let probs = normalizeProbabilities(
    record.upProbability + shift,
    record.sidewaysProbability,
    record.downProbability - shift
  );
  let direction = record.direction;
  let revisionReason = record.revisionReason;
  const riskNotes = [...record.risks];

  if (overlay.forecastAction === "OVERHEAT_GUARD") {
    const guard = Math.min(4, Math.max(2, Math.ceil(overlay.weightPct / 2)));
    if (/上涨|偏多/.test(direction)) {
      probs = normalizeProbabilities(probs.up - guard, probs.flat + guard, probs.down);
    }
    riskNotes.push("匿名X情报显示可能过热：自动降低追涨权重，不把高热度等同于继续上涨。")
  } else if (overlay.agreementPct < 55) {
    riskNotes.push("匿名X情报多空分歧较大：动态权重已自动降至低档。")
  }

  if (/^震荡$/.test(direction) && Math.abs(shift) >= 4) {
    direction = shift > 0 ? "震荡上涨" : "震荡下跌";
  }

  if (overlay.weightPct >= 5 || overlay.forecastAction === "OVERHEAT_GUARD") {
    const effect = overlay.forecastAction === "OVERHEAT_GUARD"
      ? "触发过热保护"
      : shift === 0
        ? "保持中性"
        : `对上涨概率${shift > 0 ? "+" : ""}${shift}个百分点`;
    revisionReason = [record.revisionReason, `X情报自动层：${effect}；${overlay.explanation}`]
      .filter(Boolean)
      .join("；");
  }

  return {
    ...record,
    direction,
    upProbability: probs.up,
    sidewaysProbability: probs.flat,
    downProbability: probs.down,
    newsEvidence: [record.newsEvidence, `MOOX匿名X情报：${overlay.explanation} 仅作辅助权重，不能单独触发实盘。`]
      .filter(Boolean)
      .join("；"),
    revisionReason,
    risks: [...new Set(riskNotes)],
  };
}

export function xIntelligenceCommitteeMemo(overlay: XIntelligenceAutoWeight | null): string {
  if (!overlay) return "";
  const effect = overlay.forecastAction === "OVERHEAT_GUARD"
    ? "过热保护，不追高"
    : overlay.probabilityShiftPct === 0
      ? "中性，不调整方向"
      : `方向概率修订${overlay.probabilityShiftPct > 0 ? "+" : ""}${overlay.probabilityShiftPct}个百分点`;
  return `[MOOX匿名X情报自动层] ${overlay.explanation} 预测作用：${effect}。该层不能单独触发交易，也不得覆盖已锁定历史预测。`;
}
