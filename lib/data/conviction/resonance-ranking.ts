import "server-only";
import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { mooxDirectionAtDate, mooxPrimaryDirection } from "@/lib/forecasts/moox-direction-doctrine";
import { evaluateResonanceVotes, targetWeekMidpoint, targetWeekWindow, type ResonanceVote } from "@/lib/data/conviction/resonance-core";
import type { WatchlistResonanceSignal } from "@/lib/data/conviction/resonance-types";
import { listStaticFocusForecasts } from "@/lib/data/conviction/focus-static-forecast-registry";

const HORIZON_WEIGHT: Record<string, number> = {
  WEEK: 50,
  WEEK_2: 50,
  WEEK_3: 50,
  WEEK_4: 50,
  WEEK_5: 50,
  WEEK_6: 50,
  WEEK_7: 50,
  WEEK_8: 50,
  WEEK_9: 50,
  MONTH_1: 30,
  MONTH_3: 18,
  YEAR_1: 10,
  YEAR_3: 6,
  YEAR_5: 4,
  YEAR_10: 2,
};

function latestCoveringByType(periods: ConvictionPeriodForecast[], targetDate: string): ConvictionPeriodForecast[] {
  const byType = new Map<string, ConvictionPeriodForecast>();
  for (const forecast of periods) {
    if (forecast.status !== "published" || forecast.periodStart > targetDate || forecast.periodEnd < targetDate) continue;
    const prev = byType.get(forecast.forecastType);
    if (!prev || forecast.version > prev.version || (forecast.version === prev.version && forecast.publishedAt > prev.publishedAt)) {
      byType.set(forecast.forecastType, forecast);
    }
  }
  return [...byType.values()];
}

function chooseTargetWeek(periods: ConvictionPeriodForecast[], targetDate: string): ConvictionPeriodForecast | null {
  return latestCoveringByType(periods, targetDate)
    .filter((forecast) => forecast.forecastType.startsWith("WEEK"))
    .sort((a, b) => {
      const aExact = a.periodStart === targetDate ? 1 : 0;
      const bExact = b.periodStart === targetDate ? 1 : 0;
      return bExact - aExact || b.version - a.version || b.publishedAt.localeCompare(a.publishedAt);
    })[0] ?? null;
}

function labelForForecast(forecast: ConvictionPeriodForecast): string {
  if (forecast.forecastType.startsWith("WEEK")) return "目标周周卦";
  if (forecast.forecastType === "MONTH_1") return "月卦";
  if (forecast.forecastType === "MONTH_3") return "3个月卦";
  return `${forecast.forecastType.replace("YEAR_", "")}年卦`;
}

function regularSignal(slug: string, periods: ConvictionPeriodForecast[], asOfDate: string): WatchlistResonanceSignal {
  const window = targetWeekWindow(asOfDate);
  const targetDate = targetWeekMidpoint(window);
  const covering = latestCoveringByType(periods, targetDate);
  const targetWeek = chooseTargetWeek(periods, targetDate);
  const votes: ResonanceVote[] = [];

  if (targetWeek) {
    votes.push({ label: "目标周周卦", direction: mooxPrimaryDirection(targetWeek.direction), weight: 50, horizon: "WEEK" });
  }

  for (const forecast of covering) {
    if (forecast === targetWeek || forecast.forecastType.startsWith("WEEK")) continue;
    const weight = HORIZON_WEIGHT[forecast.forecastType] ?? 0;
    if (!weight) continue;
    votes.push({
      label: labelForForecast(forecast),
      direction: mooxDirectionAtDate({ direction: forecast.direction, periodStart: forecast.periodStart, periodEnd: forecast.periodEnd, targetDate }),
      weight,
      horizon: forecast.forecastType === "MONTH_1" ? "MONTH" : "LONG",
    });
  }

  const evaluation = evaluateResonanceVotes(votes);
  return {
    slug,
    ...evaluation,
    labelZh: evaluation.direction === "BULLISH" ? "看涨" : evaluation.direction === "BEARISH" ? "看跌" : "方向不明确",
    targetPeriodStart: window.start,
    targetPeriodEnd: window.end,
  };
}

export function buildWatchlistResonanceRanking(asOfDate: string): WatchlistResonanceSignal[] {
  const signals = [
    ...(["tsla", "lite", "spcx", "asteroid", "googl", "sandisk", "nbis", "msft", "cxmt", "mu", "hype", "sol", "eth", "btc", "tencent", "gold", "silver", "wti-crude"] as const)
      .map((assetId) => regularSignal(assetId, listStaticFocusForecasts(assetId), asOfDate)),
  ];
  return signals.sort((a, b) => b.score - a.score || b.sameDirectionPeriods - a.sameDirectionPeriods || Number(b.hasWeeklyVote) - Number(a.hasWeeklyVote) || a.slug.localeCompare(b.slug));
}
