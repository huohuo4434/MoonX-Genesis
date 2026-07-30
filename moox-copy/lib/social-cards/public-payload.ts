import "server-only";

/**
 * Build public marketing payloads for social cards.
 * Strips member evidence, I Ching source, weights, and detailed paths.
 */

import { displayDirection, getPublicTodayForecasts, isHumanPublishedForecast } from "@/lib/data/daily-forecasts";
import { listDailyMarketForecastEditions } from "@/lib/data/daily-market-editions";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import type { DailyForecast } from "@/types/daily-forecast";
import type { DailyMarketForecastEdition, DailyMarketForecastEntry } from "@/types/daily-market-edition";
import type { SocialCardPublicPayload } from "@/types/social-card";

const ICHING_HINT =
  /六爻|爻辞|卦象|本卦|变卦|世应|用神|飞神|伏神|纳甲|卦辞|彖曰|象曰|internalSource|weight\s*[:=]|权重/i;

function oneLine(text: string, max = 72): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(ICHING_HINT, "")
    .trim();
  if (cleaned.length <= max) return cleaned || "MOOX 每日市场观察";
  return `${cleaned.slice(0, max - 1)}…`;
}

function firstLevel(levels: string[] | undefined): string {
  const value = levels?.find((item) => item.trim().length > 0)?.trim();
  return value || "—";
}

function probabilityFromForecast(f: DailyForecast): string {
  if (f.probabilities) {
    const { up, flat, down } = f.probabilities;
    const ranked = [
      ["上涨", up],
      ["震荡", flat],
      ["下跌", down],
    ] as const;
    const best = [...ranked].sort((a, b) => b[1] - a[1])[0];
    if (best) return `${best[0]} ${Math.round(best[1])}%`;
  }
  return `置信度 ${Math.round(f.confidence)}%`;
}

function probabilityFromEditionEntry(entry: DailyMarketForecastEntry): string {
  return `${entry.mainDirection} ${Math.round(entry.confidence)}%`;
}

export function forecastToPublicCardPayload(f: DailyForecast): SocialCardPublicPayload {
  const summarySource = f.headline || f.summary;
  return {
    brand: "MOOX",
    forecastDate: f.forecastForDate,
    assetName: f.assetName,
    symbol: f.symbol,
    direction: displayDirection(f),
    probability: probabilityFromForecast(f),
    support: firstLevel(f.supportLevels),
    resistance: firstLevel(f.resistanceLevels),
    summary: oneLine(summarySource),
  };
}

export function editionEntryToPublicCardPayload(
  edition: DailyMarketForecastEdition,
  entry: DailyMarketForecastEntry
): SocialCardPublicPayload {
  return {
    brand: "MOOX",
    forecastDate: edition.forecastDate,
    assetName: entry.assetName.zhCN,
    symbol: entry.symbol,
    direction: entry.mainDirection,
    probability: probabilityFromEditionEntry(entry),
    support: firstLevel(entry.supportLevels),
    resistance: firstLevel(entry.resistanceLevels),
    summary: oneLine(entry.summary.zhCN),
  };
}

export type SocialCardSourceItem = {
  assetId: string;
  forecastId?: string;
  payload: SocialCardPublicPayload;
};

/**
 * Prefer today's four-core edition when present; otherwise legacy published today forecasts.
 * Never includes memberEvidenceNote, framework weights, intraday path detail, or I Ching text.
 */
export function collectTodayPublicCardSources(now = new Date()): {
  forecastDate: string;
  items: SocialCardSourceItem[];
} {
  const today = getBeijingTodayKey(now);
  const editions = listDailyMarketForecastEditions();
  const edition = editions.find((item) => item.forecastDate === today) ?? null;

  if (edition?.entries?.length) {
    return {
      forecastDate: today,
      items: edition.entries.map((entry) => ({
        assetId: entry.assetId,
        forecastId: `${edition.id}:${entry.assetId}`,
        payload: editionEntryToPublicCardPayload(edition, entry),
      })),
    };
  }

  const forecasts = getPublicTodayForecasts(now).filter(isHumanPublishedForecast);
  return {
    forecastDate: today,
    items: forecasts.map((f) => ({
      assetId: f.assetId,
      forecastId: f.id,
      payload: forecastToPublicCardPayload(f),
    })),
  };
}
