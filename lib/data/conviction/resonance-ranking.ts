import "server-only";

import { listAsteroidPeriodForecasts, type ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { listBtcPeriodForecasts20260801 } from "@/lib/data/conviction/btc-forecasts-20260801";
import { listEthPeriodForecasts } from "@/lib/data/conviction/eth-forecasts";
import { listGooglePeriodForecasts } from "@/lib/data/conviction/google-forecasts";
import { listLongxinPeriodForecasts } from "@/lib/data/conviction/longxin-forecasts";
import { listMsftPeriodForecasts } from "@/lib/data/conviction/msft-forecasts";
import { listMuHypePeriodForecasts } from "@/lib/data/conviction/mu-hype-forecasts";
import { listSandiskPeriodForecasts } from "@/lib/data/conviction/sandisk-forecasts";
import { listTencentPeriodForecasts } from "@/lib/data/conviction/tencent-forecasts";
import { listVibeFocusPeriodForecasts } from "@/lib/data/conviction/vibe-focus-forecasts";
import { SPCX_MEMBER_RESEARCH } from "@/lib/data/spcx-member-20260808";
import { mooxDirectionAtDate, mooxPrimaryDirection, type MooxPrimaryDirection } from "@/lib/forecasts/moox-direction-doctrine";

import type { WatchlistResonanceSignal } from "@/lib/data/conviction/resonance-types";


type Vote = { label: string; direction: MooxPrimaryDirection; weight: number };

const HORIZON_WEIGHT: Record<string, number> = {
  WEEK: 50,
  WEEK_2: 50,
  WEEK_3: 50,
  WEEK_4: 50,
  MONTH_1: 30,
  MONTH_3: 18,
  YEAR_1: 10,
  YEAR_3: 6,
  YEAR_5: 4,
  YEAR_10: 2,
};

function midpoint(start: string, end: string): string {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  return new Date(a + (b - a) / 2).toISOString().slice(0, 10);
}

function chooseTargetWeek(periods: ConvictionPeriodForecast[], asOfDate: string): ConvictionPeriodForecast | null {
  const weeks = periods
    .filter((f) => f.forecastType.startsWith("WEEK") && f.periodEnd >= asOfDate)
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  if (!weeks.length) return null;
  const current = weeks.find((f) => f.periodStart <= asOfDate && f.periodEnd >= asOfDate) ?? null;
  const next = weeks.find((f) => f.periodStart > asOfDate) ?? null;
  // On the last day of a weekly window, rank the upcoming week when one is already published.
  if (current?.periodEnd === asOfDate && next) return next;
  return current ?? next ?? weeks[0] ?? null;
}

function regularSignal(slug: string, periods: ConvictionPeriodForecast[], asOfDate: string): WatchlistResonanceSignal {
  const targetWeek = chooseTargetWeek(periods, asOfDate);
  const targetDate = targetWeek ? midpoint(targetWeek.periodStart, targetWeek.periodEnd) : asOfDate;
  const votes: Vote[] = [];

  if (targetWeek) {
    votes.push({ label: `${targetWeek.periodStart}周卦`, direction: mooxPrimaryDirection(targetWeek.direction), weight: 50 });
  }

  for (const forecast of periods) {
    if (forecast === targetWeek || forecast.periodStart > targetDate || forecast.periodEnd < targetDate) continue;
    if (forecast.forecastType.startsWith("WEEK")) continue;
    const weight = HORIZON_WEIGHT[forecast.forecastType] ?? 0;
    if (!weight) continue;
    votes.push({
      label: forecast.forecastType === "MONTH_1" ? "月卦" : forecast.forecastType === "MONTH_3" ? "3个月卦" : `${forecast.forecastType.replace("YEAR_", "")}年卦`,
      direction: mooxDirectionAtDate({ direction: forecast.direction, periodStart: forecast.periodStart, periodEnd: forecast.periodEnd, targetDate }),
      weight,
    });
  }

  return finishSignal(slug, votes);
}

function finishSignal(slug: string, votes: Vote[]): WatchlistResonanceSignal {
  const directional = votes.filter((v) => v.direction !== "UNCLEAR");
  if (!directional.length) {
    return { slug, direction: "UNCLEAR", labelZh: "方向不明确", strengthZh: votes.length ? "方向冲突" : "资料不足", score: votes.length ? 10 : 0, sameDirectionPeriods: 0, directionalPeriods: 0, evidenceZh: votes.map((v) => `${v.label}：不明确`) };
  }

  const up = directional.filter((v) => v.direction === "BULLISH");
  const down = directional.filter((v) => v.direction === "BEARISH");
  const upWeight = up.reduce((sum, v) => sum + v.weight, 0);
  const downWeight = down.reduce((sum, v) => sum + v.weight, 0);
  const weekVote = votes.find((v) => v.label.includes("周卦"));
  const monthVote = votes.find((v) => v.label === "月卦");

  // The user's doctrine is strict: if week and month disagree, do not pretend the direction is clear.
  if (weekVote && monthVote && weekVote.direction !== "UNCLEAR" && monthVote.direction !== "UNCLEAR" && weekVote.direction !== monthVote.direction) {
    return {
      slug,
      direction: "UNCLEAR",
      labelZh: "方向不明确",
      strengthZh: "方向冲突",
      score: 20 + directional.length,
      sameDirectionPeriods: Math.max(up.length, down.length),
      directionalPeriods: directional.length,
      evidenceZh: votes.map((v) => `${v.label}：${v.direction === "BULLISH" ? "看涨" : v.direction === "BEARISH" ? "看跌" : "不明确"}`),
    };
  }

  let direction: MooxPrimaryDirection = "UNCLEAR";
  if (upWeight > downWeight) direction = "BULLISH";
  if (downWeight > upWeight) direction = "BEARISH";
  if (upWeight === downWeight) direction = weekVote?.direction ?? "UNCLEAR";

  const same = directional.filter((v) => v.direction === direction);
  const opposite = directional.filter((v) => v.direction !== direction);
  const coreAgreement = Boolean(weekVote && monthVote && weekVote.direction === direction && monthVote.direction === direction);
  let strength: WatchlistResonanceSignal["strengthZh"];
  let tier: number;
  if (direction === "UNCLEAR") { strength = "方向冲突"; tier = 0; }
  else if (coreAgreement && same.length >= 4 && opposite.length === 0) { strength = "极强共振"; tier = 5; }
  else if (coreAgreement && same.length >= 2 && opposite.length === 0) { strength = "强共振"; tier = 4; }
  else if (weekVote?.direction === direction && opposite.length === 0) { strength = "方向明确"; tier = 3; }
  else if (same.length >= 2 && opposite.length === 0) { strength = "方向明确"; tier = 2; }
  else if (same.length === 1 && opposite.length === 0) { strength = "单周期明确"; tier = 1; }
  else { strength = "方向冲突"; tier = 0; direction = "UNCLEAR"; }

  return {
    slug,
    direction,
    labelZh: direction === "BULLISH" ? "看涨" : direction === "BEARISH" ? "看跌" : "方向不明确",
    strengthZh: strength,
    score: tier * 100 + same.length * 10 + Math.max(upWeight, downWeight) - Math.min(upWeight, downWeight),
    sameDirectionPeriods: same.length,
    directionalPeriods: directional.length,
    evidenceZh: votes.map((v) => `${v.label}：${v.direction === "BULLISH" ? "看涨" : v.direction === "BEARISH" ? "看跌" : "不明确"}`),
  };
}

function spcxSignal(asOfDate: string): WatchlistResonanceSignal {
  const nextWeek = SPCX_MEMBER_RESEARCH.weeklyPath.find((w) => w.end >= asOfDate && w.start > asOfDate)
    ?? SPCX_MEMBER_RESEARCH.weeklyPath.find((w) => w.start <= asOfDate && w.end >= asOfDate)
    ?? SPCX_MEMBER_RESEARCH.weeklyPath[0];
  const weekText = `${nextWeek?.labelZh ?? ""} ${nextWeek?.pathZh ?? ""}`;
  const weekDirection: MooxPrimaryDirection = /偏多|偏强|上攻|上涨|强势延续/.test(weekText) ? "BULLISH" : /偏空|偏弱|下跌|回落为主/.test(weekText) ? "BEARISH" : "UNCLEAR";
  const monthDirection: MooxPrimaryDirection = /偏上|偏多|推进|上涨/.test(SPCX_MEMBER_RESEARCH.monthly.directionZh) ? "BULLISH" : /偏下|偏空|下跌/.test(SPCX_MEMBER_RESEARCH.monthly.directionZh) ? "BEARISH" : "UNCLEAR";
  const threeMonthDirection: MooxPrimaryDirection = /偏正|偏上|增益|看涨/.test(SPCX_MEMBER_RESEARCH.threeMonth.directionZh) ? "BULLISH" : /偏负|偏下|看跌/.test(SPCX_MEMBER_RESEARCH.threeMonth.directionZh) ? "BEARISH" : "UNCLEAR";
  const fiveYearDirection: MooxPrimaryDirection = /偏成长|增益|偏上/.test(SPCX_MEMBER_RESEARCH.fiveYear.directionZh) ? "BULLISH" : /偏下|看跌/.test(SPCX_MEMBER_RESEARCH.fiveYear.directionZh) ? "BEARISH" : "UNCLEAR";
  return finishSignal("spcx", [
    { label: "周卦", direction: weekDirection, weight: 50 },
    { label: "月卦", direction: monthDirection, weight: 30 },
    { label: "3个月卦", direction: threeMonthDirection, weight: 18 },
    { label: "5年卦", direction: fiveYearDirection, weight: 4 },
  ]);
}

export function buildWatchlistResonanceRanking(asOfDate: string): WatchlistResonanceSignal[] {
  const signals = [
    spcxSignal(asOfDate),
    regularSignal("asteroid", listAsteroidPeriodForecasts(), asOfDate),
    regularSignal("googl", listGooglePeriodForecasts(), asOfDate),
    regularSignal("sandisk", listSandiskPeriodForecasts(), asOfDate),
    regularSignal("msft", listMsftPeriodForecasts(), asOfDate),
    regularSignal("cxmt", listLongxinPeriodForecasts(), asOfDate),
    regularSignal("mu", listMuHypePeriodForecasts("mu"), asOfDate),
    regularSignal("hype", listMuHypePeriodForecasts("hype"), asOfDate),
    regularSignal("eth", listEthPeriodForecasts(), asOfDate),
    regularSignal("btc", listBtcPeriodForecasts20260801(), asOfDate),
    regularSignal("tencent", listTencentPeriodForecasts(), asOfDate),
    regularSignal("kingsoft-office", listVibeFocusPeriodForecasts("kingsoft-office"), asOfDate),
  ];
  return signals.sort((a, b) => b.score - a.score || b.sameDirectionPeriods - a.sameDirectionPeriods || a.slug.localeCompare(b.slug));
}
