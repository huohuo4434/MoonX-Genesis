import { Section } from "@/components/ui";
import {
  getSnapshotMetadata,
  listAssetIntelligenceSnapshots,
} from "@/lib/data/intelligence-snapshot";
import { TodaysMoonXViewClient } from "./TodaysMoonXViewClient";

const homepageAssetIds = ["bitcoin", "nasdaq-100", "semiconductors-storage", "gold"];

/**
 * Compact homepage teaser for the curated MoonX Intelligence Snapshot.
 * Links out to the full report — does not duplicate its content.
 */
export async function TodaysMoonXViewSection() {
  const [allAssets, snapshot] = await Promise.all([listAssetIntelligenceSnapshots(), getSnapshotMetadata()]);
  const assets = homepageAssetIds
    .map((id) => allAssets.find((asset) => asset.id === id))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));

  return (
    <Section id="moonx-view" spacing="lg" className="border-t border-border/[0.06]">
      <TodaysMoonXViewClient assets={assets} snapshot={snapshot} />
    </Section>
  );
}
