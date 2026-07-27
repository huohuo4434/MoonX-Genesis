import { TodayMoonXView } from "@/components/home/TodayMoonXView";
import { MultiHorizonSummary } from "@/components/home/MultiHorizonSummary";
import { toAssetForecastSummary } from "@/lib/data/home-forecast-layers";
import { getSnapshotMetadata } from "@/lib/data/intelligence-snapshot";
import { toAssetIntelligenceSnapshot } from "@/lib/moonx/adapters";
import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";

const HOME_ASSET_IDS = ["bitcoin", "nasdaq-100", "shanghai-composite", "hang-seng", "gold"] as const;

export async function HomeTodaySection() {
  const [doc, snapshot] = await Promise.all([loadMoonXResearchAsync(), getSnapshotMetadata()]);
  const assets = HOME_ASSET_IDS.map((id) => {
    const raw = doc.assets.find((asset) => asset.id === id);
    return raw ? toAssetForecastSummary(toAssetIntelligenceSnapshot(raw)) : null;
  }).filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));

  return (
    <>
      <TodayMoonXView assets={assets} updatedAt={snapshot.snapshotDate} />
      <MultiHorizonSummary assets={assets} />
    </>
  );
}
