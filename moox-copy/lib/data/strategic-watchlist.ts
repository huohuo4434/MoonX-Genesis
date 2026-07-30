/**
 * Strategic Watchlist accessor — MoonX assets with watchlist enabled,
 * plus research records marked watchlistEligible (e.g. crypto annual risk).
 */
import "server-only";

import { listResearchRecords } from "@/lib/data/research-records";
import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";
import { toWatchlistEntry } from "@/lib/moonx/adapters";
import { lt } from "@/lib/i18n/config";
import type { WatchlistEntry } from "@/types/research";

export async function listWatchlistEntries(): Promise<WatchlistEntry[]> {
  const [doc, records] = await Promise.all([loadMoonXResearchAsync(), listResearchRecords()]);
  const fromAssets = doc.assets
    .map((asset) => toWatchlistEntry(asset))
    .filter((entry): entry is WatchlistEntry => entry !== undefined);

  const fromResearch: WatchlistEntry[] = records
    .filter((record) => record.watchlistEligible)
    .map((record) => ({
      id: record.id,
      assetName: record.assetName,
      symbol: record.symbol ?? record.assetId,
      rating: "neutral" as const,
      ratingNote: record.ratingDisplay,
      status: "high-volatility-watch" as const,
      horizon: record.horizon,
      mainTheme: [
        record.researchAttribute ?? lt("风险观察", "風險觀察", "Risk watch"),
        ...(record.riskAssessment?.primaryRisks?.slice(0, 2) ?? []),
      ],
      thesis: record.summary,
      risks: record.risks?.slice(0, 3) ?? [
        lt("风险性质研究，不是价格方向预测。", "風險性質研究，不是價格方向預測。", "Risk research — not a price-direction call."),
      ],
      nextEvent: record.turningWindows?.[0]?.label ?? lt("年度风险验证", "年度風險驗證", "Annual risk verification"),
      nextEventDate: record.turningWindows?.[0]?.date ?? record.forecastEnd,
      researchAssetId: record.assetId,
      warning: lt(
        "不得将本观察当作 BTC 涨跌方向。",
        "不得將本觀察當作 BTC 漲跌方向。",
        "Do not treat this watch as a BTC price direction."
      ),
    }));

  const seen = new Set(fromAssets.map((entry) => entry.id));
  const merged = [...fromAssets];
  for (const entry of fromResearch) {
    if (!seen.has(entry.id)) merged.push(entry);
  }
  return merged;
}

export async function getWatchlistEntry(id: string): Promise<WatchlistEntry | undefined> {
  const entries = await listWatchlistEntries();
  return entries.find((entry) => entry.id === id);
}
