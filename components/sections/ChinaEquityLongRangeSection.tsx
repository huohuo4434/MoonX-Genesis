import { Section } from "@/components/ui";
import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";
import { ChinaEquityLongRangeClient } from "./ChinaEquityLongRangeClient";
import type { ResearchRecord } from "@/types/research";
import type { MoonXProcessedAsset } from "@/lib/moonx/types";

function assetToResearchRecord(asset: MoonXProcessedAsset): ResearchRecord {
  return {
    id: asset.id,
    publishedAt: asset.researchDate,
    forecastStart: asset.chart?.forecastWindow.start ?? asset.researchDate,
    forecastEnd: asset.chart?.forecastWindow.end ?? asset.lastUpdated,
    assetId: asset.id,
    assetName: asset.localizedName,
    symbol: asset.symbol,
    market: asset.category === "index" ? "china-equity" : asset.category,
    framework: "qimen",
    sourceType: "private-teacher",
    publicSourceLabel: {
      zhCN: "奇门研究",
      zhTW: "奇門研究",
      en: "Qimen Research",
    },
    direction:
      asset.direction === "watch"
        ? "neutral"
        : asset.direction === "strong-bullish"
          ? "strong-bullish"
          : asset.direction === "strong-bearish"
            ? "strong-bearish"
            : asset.direction,
    editorialConfidence: asset.confidence,
    consensusEligible: true,
    horizon: asset.forecastHorizon,
    title: asset.localizedName,
    summary: asset.localizedSummary,
    thesis: asset.trendPath.length > 0 ? asset.trendPath : [asset.localizedSummary],
    risks: asset.riskConditions,
    targets: asset.targetLevels,
    turningWindows: asset.turningWindows.map((window_) => ({
      id: window_.id,
      start: window_.startDate,
      end: window_.endDate,
      label: window_.label,
      note: window_.note,
    })),
    verificationChecklist: asset.verificationChecklist,
    status: "pending",
    tags: asset.tags,
    isLongRange: asset.isLongRange,
  };
}

/** "China Equity Long-Range View" — surfaces A-share / Hong Kong scenarios from MoonX content. */
export async function ChinaEquityLongRangeSection() {
  const doc = await loadMoonXResearchAsync();
  const aSharesAsset = doc.assets.find((asset) => asset.id === "shanghai-composite");
  const hongKongAsset = doc.assets.find((asset) => asset.id === "hang-seng");

  if (!aSharesAsset || !hongKongAsset) return null;

  return (
    <Section id="china-equity" spacing="lg" className="border-t border-border/[0.06]">
      <ChinaEquityLongRangeClient
        aShares={assetToResearchRecord(aSharesAsset)}
        hongKong={assetToResearchRecord(hongKongAsset)}
      />
    </Section>
  );
}
