import "server-only";
import { listTSLAPeriodForecasts20260816 } from "@/lib/data/conviction/tsla-liuyao-20260816";
import { listLITEPeriodForecasts20260816 } from "@/lib/data/conviction/lite-liuyao-20260816";
import { listAsteroidPeriodForecasts, type ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { listBtcPeriodForecasts20260801 } from "@/lib/data/conviction/btc-forecasts-20260801";
import { listEthPeriodForecasts } from "@/lib/data/conviction/eth-forecasts";
import { listGooglePeriodForecasts } from "@/lib/data/conviction/google-forecasts";
import { listLongxinPeriodForecasts } from "@/lib/data/conviction/longxin-forecasts";
import { listMsftPeriodForecasts } from "@/lib/data/conviction/msft-forecasts";
import { listMuHypePeriodForecasts } from "@/lib/data/conviction/mu-hype-forecasts";
import { listHypePeriodForecasts20260809, listSolPeriodForecasts20260809 } from "@/lib/data/conviction/hype-sol-20260809";
import { listSandiskPeriodForecasts } from "@/lib/data/conviction/sandisk-forecasts";
import { listNbisPeriodForecasts } from "@/lib/data/conviction/nbis-liuyao-20260811";
import { listTencentPeriodForecasts } from "@/lib/data/conviction/tencent-forecasts";
import { SPCX_MEMBER_RESEARCH } from "@/lib/data/spcx-member-20260808";
import { mooxDirectionAtDate, mooxPrimaryDirection, type MooxPrimaryDirection } from "@/lib/forecasts/moox-direction-doctrine";
import { evaluateResonanceVotes, targetWeekMidpoint, targetWeekWindow, type ResonanceVote } from "@/lib/data/conviction/resonance-core";
import type { WatchlistResonanceSignal } from "@/lib/data/conviction/resonance-types";

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

function textDirection(text: string): MooxPrimaryDirection {
  if (/偏多|偏强|偏上|偏正|偏成长|增益|上攻|上涨|强势延续|推进/.test(text)) return "BULLISH";
  if (/偏空|偏弱|下跌|回落为主|承压/.test(text)) return "BEARISH";
  return "UNCLEAR";
}

function spcxSignal(asOfDate: string): WatchlistResonanceSignal {
  const window = targetWeekWindow(asOfDate);
  const targetDate = targetWeekMidpoint(window);
  const targetWeek = SPCX_MEMBER_RESEARCH.weeklyPath.find((item) => item.start <= targetDate && item.end >= targetDate) ?? null;
  const votes: ResonanceVote[] = [
    { label: "目标周周卦", direction: targetWeek ? textDirection(`${targetWeek.labelZh} ${targetWeek.pathZh}`) : "UNCLEAR", weight: 50, horizon: "WEEK" },
    { label: "月卦", direction: textDirection(SPCX_MEMBER_RESEARCH.monthly.directionZh), weight: 30, horizon: "MONTH" },
    { label: "3个月卦", direction: textDirection(SPCX_MEMBER_RESEARCH.threeMonth.directionZh), weight: 18, horizon: "LONG" },
    { label: "5年卦", direction: textDirection(SPCX_MEMBER_RESEARCH.fiveYear.directionZh), weight: 4, horizon: "LONG" },
  ];
  const evaluation = evaluateResonanceVotes(votes);
  return {
    slug: "spcx",
    ...evaluation,
    labelZh: evaluation.direction === "BULLISH" ? "看涨" : evaluation.direction === "BEARISH" ? "看跌" : "方向不明确",
    targetPeriodStart: window.start,
    targetPeriodEnd: window.end,
  };
}

export function buildWatchlistResonanceRanking(asOfDate: string): WatchlistResonanceSignal[] {
  const signals = [
    regularSignal("tsla", listTSLAPeriodForecasts20260816(), asOfDate),
    regularSignal("lite", listLITEPeriodForecasts20260816(), asOfDate),
    spcxSignal(asOfDate),
    regularSignal("asteroid", listAsteroidPeriodForecasts(), asOfDate),
    regularSignal("googl", listGooglePeriodForecasts(), asOfDate),
    regularSignal("sandisk", listSandiskPeriodForecasts(), asOfDate),
    regularSignal("nbis", listNbisPeriodForecasts(), asOfDate),
    regularSignal("msft", listMsftPeriodForecasts(), asOfDate),
    regularSignal("cxmt", listLongxinPeriodForecasts(), asOfDate),
    regularSignal("mu", listMuHypePeriodForecasts("mu"), asOfDate),
    regularSignal("hype", listHypePeriodForecasts20260809(), asOfDate),
    regularSignal("sol", listSolPeriodForecasts20260809(), asOfDate),
    regularSignal("eth", listEthPeriodForecasts(), asOfDate),
    regularSignal("btc", listBtcPeriodForecasts20260801(), asOfDate),
    regularSignal("tencent", listTencentPeriodForecasts(), asOfDate),
  ];
  return signals.sort((a, b) => b.score - a.score || b.sameDirectionPeriods - a.sameDirectionPeriods || Number(b.hasWeeklyVote) - Number(a.hasWeeklyVote) || a.slug.localeCompare(b.slug));
}
