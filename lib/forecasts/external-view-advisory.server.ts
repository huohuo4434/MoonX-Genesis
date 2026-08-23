import "server-only";

import { DATED_EXTERNAL_INDICATORS_20260823, type DatedExternalIndicator } from "@/lib/data/external-indicators-20260823";
import { normalizeOfficialDirection } from "@/lib/forecasts/formal-direction";
import { canonicalAssetCode } from "@/lib/presentation/asset-catalog";
import { buildMultiViewResearcherAlias, resolveMultiViewTargetDates } from "@/lib/research/member-multi-view-core";
import { getMemberAssetOpinionGroups } from "@/lib/trading-signals/member-multi-view.server";
import type { DailyForecast } from "@/types/daily-forecast";

type AdvisorySignal = Pick<DatedExternalIndicator, "asset" | "date" | "direction" | "analystAlias" | "reason"> & {
  source: "DESKTOP" | "X_15M";
};

function officialSide(forecast: DailyForecast): "BULLISH" | "BEARISH" | "NEUTRAL" {
  const direction = normalizeOfficialDirection(forecast.directionLabel ?? forecast.direction);
  if (direction === "上涨" || direction === "震荡上涨") return "BULLISH";
  if (direction === "下跌" || direction === "震荡下跌") return "BEARISH";
  return "NEUTRAL";
}

function sideLabel(direction: AdvisorySignal["direction"]): string {
  return direction === "BULLISH" ? "看涨" : direction === "BEARISH" ? "看跌" : "中性/事件风险";
}

function concise(value: string, max = 96): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function dedupeSignals(signals: AdvisorySignal[]): AdvisorySignal[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.asset}:${signal.date}:${signal.analystAlias}:${signal.direction}:${signal.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadXSignals(): Promise<AdvisorySignal[]> {
  const groups = await getMemberAssetOpinionGroups().catch(() => []);
  const signals: AdvisorySignal[] = [];
  for (const group of groups) {
    for (const opinion of group.opinions) {
      const alias = opinion.memberAlias ?? buildMultiViewResearcherAlias(opinion.researcherCode, opinion.theories);
      for (const entry of opinion.entries) {
        const dates = resolveMultiViewTargetDates({
          postedAt: entry.postedAt,
          horizon: entry.horizon,
          timeWindows: entry.timeWindows,
          summary: entry.summary,
        });
        for (const date of dates) {
          signals.push({
            asset: group.asset,
            date,
            direction: entry.direction,
            analystAlias: alias,
            reason: entry.summary,
            source: "X_15M",
          });
        }
      }
    }
  }
  return signals;
}

export function buildExternalViewWarning(forecast: DailyForecast, inputSignals: AdvisorySignal[]): string | null {
  const asset = canonicalAssetCode(forecast.symbol);
  const signals = dedupeSignals(inputSignals).filter((signal) => signal.asset === asset && signal.date === forecast.forecastForDate);
  if (!signals.length) return null;
  const official = officialSide(forecast);
  const directional = signals.filter((signal) => signal.direction !== "NEUTRAL");
  const aligned = official === "NEUTRAL" ? [] : directional.filter((signal) => signal.direction === official);
  const opposite = official === "NEUTRAL" ? [] : directional.filter((signal) => signal.direction !== official);
  const neutral = signals.filter((signal) => signal.direction === "NEUTRAL");
  const segments: string[] = [];

  if (official === "NEUTRAL") {
    segments.push(`MOOX当日属于路径型/震荡判断，外部方向暂不硬比较`);
  } else {
    segments.push(`MOOX当日${official === "BULLISH" ? "看涨" : "看跌"}`);
  }
  if (aligned.length) {
    segments.push(`同向：${aligned.slice(0, 3).map((signal) => `${signal.analystAlias}${sideLabel(signal.direction)}`).join("、")}`);
  }
  if (opposite.length) {
    segments.push(`相反：${opposite.slice(0, 3).map((signal) => `${signal.analystAlias}${sideLabel(signal.direction)}，因${concise(signal.reason, 72)}`).join("；")}`);
  }
  if (official === "NEUTRAL" && directional.length) {
    segments.push(`外部：${directional.slice(0, 3).map((signal) => `${signal.analystAlias}${sideLabel(signal.direction)}`).join("、")}`);
  }
  if (neutral.length) {
    segments.push(`事件/条件：${neutral.slice(0, 2).map((signal) => `${signal.analystAlias}提示${concise(signal.reason, 72)}`).join("；")}`);
  }
  segments.push(opposite.length ? "存在反向证据，需谨慎并等待价格确认" : "仅作交叉验证，不改变MOOX正式方向");
  return `外部交叉提醒（${forecast.forecastForDate}）：${segments.join("；")}。`;
}

/** Presentation/risk overlay only: direction, probabilities and confidence stay untouched. */
export async function applyExternalViewAdvisories(forecasts: DailyForecast[]): Promise<DailyForecast[]> {
  if (!forecasts.length) return forecasts;
  const xSignals = await loadXSignals();
  const desktopSignals: AdvisorySignal[] = DATED_EXTERNAL_INDICATORS_20260823.map((signal) => ({
    asset: signal.asset,
    date: signal.date,
    direction: signal.direction,
    analystAlias: signal.analystAlias,
    reason: signal.reason,
    source: "DESKTOP",
  }));
  const allSignals = [...desktopSignals, ...xSignals];
  return forecasts.map((forecast) => {
    const warning = buildExternalViewWarning(forecast, allSignals);
    if (!warning) return forecast;
    const risks = [...(forecast.risks ?? []).filter((item) => !item.startsWith("外部交叉提醒（")), warning];
    return { ...forecast, risks };
  });
}
