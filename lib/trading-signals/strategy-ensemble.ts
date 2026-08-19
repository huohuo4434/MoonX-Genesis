import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { loadTodayForecastRows } from "@/lib/prediction-access-server";
import { fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import { resolveCanonicalQuoteSymbol } from "@/lib/market-data/quote-symbols";
import { focusDailyMarketCode } from "@/lib/data/conviction/focus-daily-generation-core";
import { listLatestGeneratedDailiesForMarketDates } from "@/lib/weekly-source/store";
import type { DailyAccuracyMarket } from "@/types/daily-accuracy";
import type { DailyForecast } from "@/types/daily-forecast";
import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";
import type {
  StrategyEnsembleCandidate,
  StrategyEnsembleSide,
  StrategyEnsembleSnapshot,
} from "@/types/strategy-ensemble";

const FOCUS_WATCH = [
  { assetId: "googl", symbol: "GOOGL", displayName: "谷歌", quoteSymbol: "GOOGL", researchOnly: false },
  { assetId: "mu", symbol: "MU", displayName: "美光", quoteSymbol: "MU", researchOnly: false },
  { assetId: "sandisk", symbol: "SNDK", displayName: "闪迪", quoteSymbol: "SNDK", researchOnly: false },
  { assetId: "spcx", symbol: "SPCX", displayName: "SpaceX", quoteSymbol: "SPCX", researchOnly: true },
  { assetId: "nvda", symbol: "NVDA", displayName: "英伟达", quoteSymbol: "NVDA", researchOnly: true },
  { assetId: "amd", symbol: "AMD", displayName: "AMD", quoteSymbol: "AMD", researchOnly: true },
] as const;

function normalizeSide(value?: string | null): StrategyEnsembleSide {
  const text = String(value ?? "").trim().toUpperCase();
  if (["UP", "LONG", "BULL", "BULLISH", "上涨", "看涨", "震荡上涨", "探底回升", "先跌后涨", "强势看涨", "略微看涨"].includes(text)) return "LONG";
  if (["DOWN", "SHORT", "BEAR", "BEARISH", "下跌", "看跌", "震荡下跌", "冲高回落", "先涨后跌", "强势看跌", "略微看跌"].includes(text)) return "SHORT";
  return "WAIT";
}

function qimenDirectionFromEvidence(evidence?: string | null): StrategyEnsembleSide {
  const match = String(evidence ?? "").match(/奇门主判=([^；]+)/);
  return normalizeSide(match?.[1] ?? null);
}

function liuyaoDirectionFromEvidence(evidence?: string | null): StrategyEnsembleSide {
  const text = String(evidence ?? "");
  const match = text.match(/(?:正式周方向|六爻(?:辅助)?(?:方向)?)[=:]([^；]+)/);
  return normalizeSide(match?.[1] ?? text);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const alpha = 2 / (period + 1);
  const output = [values[0]!];
  for (let i = 1; i < values.length; i++) output.push(values[i]! * alpha + output[i - 1]! * (1 - alpha));
  return output;
}

function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const change = values[i]! - values[i - 1]!;
    if (change >= 0) gains += change;
    else losses += -change;
  }
  if (losses === 0) return gains > 0 ? 100 : 50;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

async function technicalSignal(input: {
  quoteSymbol: string;
  market: DailyAccuracyMarket;
  asOfDate: string;
}): Promise<{ side: StrategyEnsembleSide; score: number; note: string }> {
  try {
    const bars = await fetchRecentDailyBarsForForecast(input);
    if (bars.length < 24) return { side: "WAIT", score: 0, note: "日线样本不足" };
    const closes = bars.map((bar) => bar.close).filter(Number.isFinite);
    const fastSeries = ema(closes, 8);
    const slowSeries = ema(closes, 21);
    const price = closes.at(-1) ?? 0;
    const fast = fastSeries.at(-1) ?? price;
    const slow = slowSeries.at(-1) ?? price;
    const prior = closes[Math.max(0, closes.length - 6)] ?? price;
    const change5 = prior > 0 ? ((price - prior) / prior) * 100 : 0;
    const currentRsi = rsi(closes, 14);
    const spread = price > 0 ? ((fast - slow) / price) * 100 : 0;
    const score = clamp(spread * 24 + change5 * 5 + (currentRsi - 50) * 0.55, -100, 100);
    const side: StrategyEnsembleSide = score >= 10 ? "LONG" : score <= -10 ? "SHORT" : "WAIT";
    return {
      side,
      score: Math.round(score * 10) / 10,
      note: `EMA8/21差${spread.toFixed(2)}%，5日${change5.toFixed(2)}%，RSI ${currentRsi.toFixed(1)}`,
    };
  } catch (error) {
    return { side: "WAIT", score: 0, note: `技术行情暂不可用：${String(error instanceof Error ? error.message : error).slice(0, 120)}` };
  }
}

function marketForDaily(row: DailyForecast): DailyAccuracyMarket {
  if (row.market === "crypto") return "CRYPTO";
  if (row.market === "cn") return "CN";
  if (row.market === "hk") return "HK";
  if (row.market === "commodity") return "US_FUTURES";
  return "US";
}

function quoteForDaily(row: DailyForecast): string {
  const symbol = row.symbol.toUpperCase();
  const initial = symbol === "BTC" ? "BTC-USD"
    : symbol === "ETH" ? "ETH-USD"
      : symbol === "SPX" ? "^GSPC"
        : symbol === "NDX" ? "^NDX"
          : symbol === "SSEC" || symbol === "SHCOMP" ? "000001.SS"
            : symbol === "HSTECH" ? "HSTECH.HK"
              : symbol === "GOLD" ? "GC=F"
                : symbol === "SILVER" ? "SI=F"
                  : symbol === "WTI" ? "CL=F"
                    : row.symbol;
  return resolveCanonicalQuoteSymbol(row.symbol, initial);
}

function candidate(input: Omit<StrategyEnsembleCandidate, "id" | "generatedAt" | "forecastDate" | "horizon"> & { now: Date; forecastDate: string }): StrategyEnsembleCandidate {
  const { now, forecastDate, ...rest } = input;
  return {
    ...rest,
    id: `${rest.sleeve}:${rest.symbol}:${forecastDate}`,
    generatedAt: now.toISOString(),
    forecastDate,
    horizon: "SHORT",
  };
}

function confidenceFromTech(score: number): number {
  return Math.round(clamp(50 + Math.abs(score) * 0.35, 50, 82));
}

function qimenConfidence(row: DailyForecast): number {
  const match = String(row.qimenEvidence ?? "").match(/置信度=(\d+)%/);
  const parsed = Number(match?.[1]);
  return Number.isFinite(parsed) ? clamp(parsed, 45, 90) : clamp(row.confidence, 45, 85);
}

async function coreCandidates(now: Date): Promise<StrategyEnsembleCandidate[]> {
  const rows = await loadTodayForecastRows(now).catch(() => [] as DailyForecast[]);
  const output: StrategyEnsembleCandidate[] = [];
  for (const row of rows) {
    const tech = await technicalSignal({ quoteSymbol: quoteForDaily(row), market: marketForDaily(row), asOfDate: row.forecastForDate });
    const qimen = normalizeSide(row.qimenPrimaryDirection ?? qimenDirectionFromEvidence(row.qimenEvidence));
    const liuyao = normalizeSide(row.liuyaoAuxiliaryDirection ?? liuyaoDirectionFromEvidence(row.liuyaoEvidence));
    const support = row.supportLevels?.[0] ?? null;
    const resistance = row.resistanceLevels?.[0] ?? null;
    const invalidation = row.invalidation ?? null;

    output.push(candidate({ now, forecastDate: row.forecastForDate, sleeve: "QIMEN", assetId: row.assetId, symbol: row.symbol, displayName: row.assetName, side: qimen, confidence: qimen === "WAIT" ? 0 : qimenConfidence(row), eligibleForApproval: qimen !== "WAIT", reason: qimen === "WAIT" ? "奇门未形成明确方向" : `奇门独立主判${qimen === "LONG" ? "看多" : "看空"}`, sourceDirection: row.qimenPrimaryDirection ?? null, support, resistance, invalidation, technicalScore: tech.score, technicalNote: tech.note }));
    output.push(candidate({ now, forecastDate: row.forecastForDate, sleeve: "LIUYAO", assetId: row.assetId, symbol: row.symbol, displayName: row.assetName, side: liuyao, confidence: liuyao === "WAIT" ? 0 : Math.round(clamp(row.confidence - 5, 45, 80)), eligibleForApproval: liuyao !== "WAIT", reason: liuyao === "WAIT" ? "六爻当前没有明确方向" : `六爻独立方向${liuyao === "LONG" ? "看多" : "看空"}`, sourceDirection: row.liuyaoAuxiliaryDirection ?? null, support, resistance, invalidation, technicalScore: tech.score, technicalNote: tech.note }));
    output.push(candidate({ now, forecastDate: row.forecastForDate, sleeve: "TECHNICAL", assetId: row.assetId, symbol: row.symbol, displayName: row.assetName, side: tech.side, confidence: tech.side === "WAIT" ? 0 : confidenceFromTech(tech.score), eligibleForApproval: tech.side !== "WAIT", reason: tech.side === "WAIT" ? "技术结构未形成独立方向" : `纯技术${tech.side === "LONG" ? "看多" : "看空"}，${tech.note}`, support, resistance, invalidation, technicalScore: tech.score, technicalNote: tech.note }));

    let composite: StrategyEnsembleSide = "WAIT";
    let compositeConfidence = 0;
    let compositeReason = "方法之间未形成足够共振";
    if (qimen !== "WAIT" && liuyao === qimen && tech.side === qimen) {
      composite = qimen;
      compositeConfidence = Math.round(clamp((qimenConfidence(row) + row.confidence + confidenceFromTech(tech.score)) / 3 + 8, 55, 92));
      compositeReason = "奇门、六爻、技术三方同向";
    } else if (qimen !== "WAIT" && liuyao === qimen && tech.side === "WAIT") {
      composite = qimen;
      compositeConfidence = Math.round(clamp((qimenConfidence(row) + row.confidence) / 2, 52, 86));
      compositeReason = "奇门与六爻同向，技术等待更好位置";
    } else if (qimen !== "WAIT" && tech.side === qimen && liuyao === "WAIT") {
      composite = qimen;
      compositeConfidence = Math.round(clamp((qimenConfidence(row) + confidenceFromTech(tech.score)) / 2 - 3, 50, 82));
      compositeReason = "奇门与技术同向，六爻信号缺失";
    }
    output.push(candidate({ now, forecastDate: row.forecastForDate, sleeve: "COMPOSITE", assetId: row.assetId, symbol: row.symbol, displayName: row.assetName, side: composite, confidence: compositeConfidence, eligibleForApproval: composite !== "WAIT" && compositeConfidence >= 60, reason: compositeReason, support, resistance, invalidation, technicalScore: tech.score, technicalNote: tech.note }));
  }
  return output;
}

async function focusCandidates(now: Date): Promise<StrategyEnsembleCandidate[]> {
  const today = getBeijingTodayKey(now);
  const output: StrategyEnsembleCandidate[] = [];
  for (const watch of FOCUS_WATCH) {
    let row: GeneratedDailyForecastRecord | null = null;
    if (["googl", "mu", "sandisk"].includes(watch.assetId)) {
      const rows = await listLatestGeneratedDailiesForMarketDates(focusDailyMarketCode(watch.assetId), [today], { readOnly: true }).catch(() => []);
      row = rows[0] ?? null;
    }
    const tech = await technicalSignal({ quoteSymbol: watch.quoteSymbol, market: "US", asOfDate: today });
    const qimen = qimenDirectionFromEvidence(row?.qimenEvidence ?? null);
    const liuyao = liuyaoDirectionFromEvidence(row?.liuyaoEvidence ?? null);
    const support = row?.supportLevels?.[0] ?? null;
    const resistance = row?.resistanceLevels?.[0] ?? null;
    const invalidation = row?.invalidationLevel ?? null;

    const make = (sleeve: "QIMEN" | "LIUYAO" | "TECHNICAL" | "COMPOSITE", side: StrategyEnsembleSide, confidence: number, reason: string, eligible: boolean) => output.push(candidate({
      now, forecastDate: today, sleeve, assetId: watch.assetId, symbol: watch.symbol, displayName: watch.displayName, side, confidence, eligibleForApproval: eligible && !watch.researchOnly, reason, support, resistance, invalidation, technicalScore: tech.score, technicalNote: tech.note, researchOnly: watch.researchOnly,
    }));

    make("QIMEN", qimen, qimen === "WAIT" ? 0 : 62, qimen === "WAIT" ? "暂无前置奇门日盘" : `奇门独立${qimen === "LONG" ? "看多" : "看空"}`, qimen !== "WAIT");
    make("LIUYAO", liuyao, liuyao === "WAIT" ? 0 : 60, liuyao === "WAIT" ? "暂无前置六爻日方向" : `六爻独立${liuyao === "LONG" ? "看多" : "看空"}`, liuyao !== "WAIT");
    make("TECHNICAL", tech.side, tech.side === "WAIT" ? 0 : confidenceFromTech(tech.score), tech.side === "WAIT" ? `技术等待：${tech.note}` : `纯技术${tech.side === "LONG" ? "看多" : "看空"}：${tech.note}`, tech.side !== "WAIT");

    let composite: StrategyEnsembleSide = "WAIT";
    let conf = 0;
    let reason = "方法未形成共振";
    if (qimen !== "WAIT" && qimen === liuyao && qimen === tech.side) {
      composite = qimen; conf = 78; reason = "奇门、六爻、技术三方同向";
    } else if (qimen !== "WAIT" && qimen === liuyao) {
      composite = qimen; conf = 68; reason = "奇门与六爻同向，技术等待/分歧";
    }
    make("COMPOSITE", composite, conf, reason, composite !== "WAIT" && conf >= 65);
  }
  return output;
}

export async function buildStrategyEnsembleSnapshot(now = new Date()): Promise<StrategyEnsembleSnapshot> {
  const [core, focus] = await Promise.all([coreCandidates(now), focusCandidates(now)]);
  const candidates = [...core, ...focus].sort((a, b) => b.confidence - a.confidence || a.symbol.localeCompare(b.symbol));
  return {
    generatedAt: now.toISOString(),
    candidates,
    actionable: candidates.filter((item) => item.eligibleForApproval && item.side !== "WAIT"),
    notes: [
      "四套方法独立记分：六爻、奇门、纯技术、综合。",
      "综合策略只有方法形成共振时进入审批队列。",
      "SPCX/NVDA/AMD当前作为研究观察标的；不会自动进入真实下单队列。",
      "本模块只生成候选单并留痕，不执行真实资金买卖。",
    ],
  };
}
