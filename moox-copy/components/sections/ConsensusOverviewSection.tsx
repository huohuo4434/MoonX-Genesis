import { Section } from "@/components/ui";
import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";
import { scoreToDirection } from "@/lib/moonx/rating-engine";
import type { ConsensusResult } from "@/lib/research/consensus-engine";
import type { MoonXProcessedAsset } from "@/lib/moonx/types";
import { ConsensusOverviewGrid } from "./ConsensusOverviewGrid";

const CONSENSUS_ASSET_IDS = [
  "bitcoin",
  "nasdaq-100",
  "semiconductors-storage",
  "gold",
  "crude-oil",
  "shanghai-composite",
  "hang-seng",
  "changxin-technology",
] as const;

function moonxToConsensusResult(asset: MoonXProcessedAsset): ConsensusResult {
  const score100 = Math.round(((asset.calculatedScore + 100) / 2));
  const direction = scoreToDirection(asset.calculatedScore);
  const label =
    direction === "strong-bullish" || direction === "bullish"
      ? score100 >= 65
        ? "bullish"
        : "slightly-bullish"
      : direction === "strong-bearish" || direction === "bearish"
        ? score100 <= 34
          ? "bearish"
          : "slightly-bearish"
        : "neutral";

  const bullishShare = Math.max(0, asset.calculatedScore) / 100;
  const bearishShare = Math.max(0, -asset.calculatedScore) / 100;
  const neutralShare = Math.max(0, 1 - bullishShare - bearishShare);

  return {
    assetId: asset.id,
    eligibleCount: Math.max(1, asset.frameworkFactors.length),
    insufficientEvidence: asset.direction === "watch" || asset.frameworkFactors.length === 0,
    score: asset.direction === "watch" ? null : score100,
    weightedDirection: asset.calculatedScore / 100,
    label: asset.direction === "watch" ? null : label,
    bullishWeightShare: bullishShare,
    neutralWeightShare: neutralShare,
    bearishWeightShare: bearishShare,
    frameworkContributions: asset.frameworkFactors.map((factor) => ({
      framework: mapFramework(factor.framework),
      weight: factor.weight * (factor.confidence / 100),
      weightShare: factor.weight / 100,
      recordCount: 1,
    })),
    supportingArguments: asset.trendPath.slice(0, 2).map((text) => ({ text, recordId: asset.id })),
    conflictingArguments: asset.riskConditions.slice(0, 2).map((text) => ({ text, recordId: asset.id })),
    nextTurningWindow: asset.turningWindows[0]
      ? {
          ...asset.turningWindows[0],
          start: asset.turningWindows[0].startDate,
          end: asset.turningWindows[0].endDate,
          recordId: asset.id,
        }
      : null,
    keyVerificationItems: asset.verificationChecklist.slice(0, 4).map((text) => ({ text, recordId: asset.id })),
    eligibleRecords: [],
  };
}

function mapFramework(name: string): ConsensusResult["frameworkContributions"][number]["framework"] {
  const map: Record<string, ConsensusResult["frameworkContributions"][number]["framework"]> = {
    "Oracle Six Yao": "oracle-six-yao",
    Qimen: "qimen",
    "Cycle Structure": "cycle",
    "Gann Structure": "gann",
    "Harmonic Structure": "harmonic",
    "Market Flow & Risk": "market-flow",
    "Macro Capital Cycle": "macro",
    "Macro Liquidity Rotation": "macro",
    "Technical Structure": "technical",
  };
  return map[name] ?? "internal";
}

/** "MoonX Consensus Overview" — scores from the centralized MoonX weight engine. */
export async function ConsensusOverviewSection() {
  const doc = await loadMoonXResearchAsync();
  const items = CONSENSUS_ASSET_IDS.map((id) => {
    const asset = doc.assets.find((entry) => entry.id === id);
    if (!asset) return null;
    return {
      id: asset.id,
      assetName: asset.localizedName,
      symbol: asset.symbol,
      result: moonxToConsensusResult(asset),
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <Section id="consensus" spacing="lg" className="border-t border-border/[0.06]">
      <ConsensusOverviewGrid items={items} />
    </Section>
  );
}
