import { StrategicWatchlistPreviewClient } from "@/components/home/StrategicWatchlistPreviewClient";
import { listWatchlistEntries } from "@/lib/data/strategic-watchlist";
import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";

const PREFERRED_IDS = [
  "changxin-technology",
  "alibaba",
  "tencent",
  "bitcoin",
  "nasdaq-100",
  "hang-seng",
] as const;

const FOCUS_FALLBACKS: Record<
  string,
  {
    assetName: { zhCN: string; zhTW: string; en: string };
    symbol: string;
    horizon: { zhCN: string; zhTW: string; en: string };
    nextEvent: { zhCN: string; zhTW: string; en: string };
  }
> = {
  alibaba: {
    assetName: { zhCN: "阿里巴巴", zhTW: "阿里巴巴", en: "Alibaba" },
    symbol: "BABA",
    horizon: { zhCN: "2026 Q3–Q4", zhTW: "2026 Q3–Q4", en: "2026 Q3–Q4" },
    nextEvent: {
      zhCN: "恒生科技指数修复情景下的重点跟踪对象；等待个股战术更新。",
      zhTW: "恆生科技指數修復情景下的重點跟蹤對象；等待個股戰術更新。",
      en: "Focus name under the Hang Seng TECH repair scenario; stock-level tactical update pending.",
    },
  },
  tencent: {
    assetName: { zhCN: "腾讯", zhTW: "騰訊", en: "Tencent" },
    symbol: "0700.HK",
    horizon: { zhCN: "2026 Q3–Q4", zhTW: "2026 Q3–Q4", en: "2026 Q3–Q4" },
    nextEvent: {
      zhCN: "恒生科技指数成分重点跟踪；等待个股战术更新。",
      zhTW: "恆生科技指數成分重點跟蹤；等待個股戰術更新。",
      en: "Hang Seng TECH constituent focus tracking; stock-level tactical update pending.",
    },
  },
};

export async function StrategicWatchlistPreview() {
  const [entries, doc] = await Promise.all([listWatchlistEntries(), loadMoonXResearchAsync()]);
  const byResearchId = new Map(entries.map((entry) => [entry.researchAssetId, entry]));

  const rows = PREFERRED_IDS.map((id) => {
    const entry = byResearchId.get(id);
    if (entry) {
      // IPO / pre-listing names stay as focus tracking — do not surface an auto bullish label.
      const formal =
        entry.status !== "ipo-strategic-watch" && entry.status !== "pre-ipo-watch";
      return {
        id: entry.id,
        assetName: entry.assetName,
        symbol: entry.symbol,
        horizon: entry.horizon,
        nextEvent: entry.nextEvent,
        updatedAt: entry.nextEventDate,
        rating: entry.rating,
        hasFormalRating: formal,
      };
    }
    const asset = doc.assets.find((item) => item.id === id);
    if (asset) {
      return {
        id: asset.id,
        assetName: asset.localizedName,
        symbol: asset.symbol,
        horizon: asset.forecastHorizon,
        nextEvent: asset.localizedSummary,
        updatedAt: asset.lastUpdated,
        rating: "neutral" as const,
        hasFormalRating: false as const,
      };
    }
    const fallback = FOCUS_FALLBACKS[id];
    if (!fallback) return null;
    return {
      id,
      assetName: fallback.assetName,
      symbol: fallback.symbol,
      horizon: fallback.horizon,
      nextEvent: fallback.nextEvent,
      updatedAt: undefined,
      rating: "neutral" as const,
      hasFormalRating: false as const,
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <section id="watchlist" className="border-t border-border/[0.06] py-12 lg:py-16">
      <StrategicWatchlistPreviewClient rows={rows} />
    </section>
  );
}
