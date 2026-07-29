import type {
  DailyMarketForecastEdition,
  DailyMarketForecastEditionTeaser,
} from "@/types/daily-market-edition";

export function shapeDailyMarketEditionTeaser(
  edition: DailyMarketForecastEdition
): DailyMarketForecastEditionTeaser {
  return {
    id: edition.id,
    forecastDate: edition.forecastDate,
    memberAvailableAt: edition.memberAvailableAt,
    publicAvailableAt: edition.publicAvailableAt,
    publishedAt: edition.publishedAt,
    version: edition.version,
    assetIds: edition.entries.map((entry) => entry.assetId),
    assetNames: edition.entries.map((entry) => entry.assetName),
    status: edition.status,
  };
}
