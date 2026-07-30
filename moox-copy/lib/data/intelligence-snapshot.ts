/**
 * MoonX Intelligence Snapshot accessors.
 * Asset cards and snapshot metadata load from content/moonx/latest.json.
 */
import "server-only";

import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";
import {
  toAssetIntelligenceSnapshot,
  toRiskDisclaimer,
  toSnapshotMetadata,
} from "@/lib/moonx/adapters";

export type {
  SnapshotStatus,
  SnapshotMetadata,
  FrameworkEvidenceEntry,
  ObservationZone,
  AssetIntelligenceScores,
  AssetIntelligenceSnapshot,
  CrossAssetConsensus,
  LongRangeTimelinePeriod,
} from "./intelligence-snapshot-types";

export { getDominantDirection } from "./intelligence-snapshot-types";

import type { AssetIntelligenceSnapshot, CrossAssetConsensus, LongRangeTimelinePeriod, SnapshotMetadata } from "./intelligence-snapshot-types";

/** Snapshot card assets shown on Research Intelligence / homepage teasers. */
const SNAPSHOT_ASSET_IDS = ["bitcoin", "nasdaq-100", "semiconductors-storage", "gold", "crude-oil"] as const;

export async function getSnapshotMetadata(): Promise<SnapshotMetadata> {
  const doc = await loadMoonXResearchAsync();
  return toSnapshotMetadata(doc);
}

export async function getRiskDisclaimer(): Promise<string> {
  const doc = await loadMoonXResearchAsync();
  return toRiskDisclaimer(doc);
}

/** Fallback string for rare sync call sites; prefer `getRiskDisclaimer()`. */
export const riskDisclaimer =
  "This snapshot is a research synthesis for educational purposes only. It is a draft, has not been verified against actual outcomes, and does not constitute financial advice. Nothing here should be read as a guarantee, a verified track record, or a recommendation to trade.";

export async function listAssetIntelligenceSnapshots(): Promise<AssetIntelligenceSnapshot[]> {
  const doc = await loadMoonXResearchAsync();
  return SNAPSHOT_ASSET_IDS.map((id) => doc.assets.find((asset) => asset.id === id))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
    .map((asset) => toAssetIntelligenceSnapshot(asset));
}

export async function getAssetIntelligenceSnapshot(id: string): Promise<AssetIntelligenceSnapshot | undefined> {
  const doc = await loadMoonXResearchAsync();
  const asset = doc.assets.find((entry) => entry.id === id);
  return asset ? toAssetIntelligenceSnapshot(asset) : undefined;
}

export async function getCrossAssetConsensus(): Promise<CrossAssetConsensus> {
  const doc = await loadMoonXResearchAsync();
  const conclusion = doc.mainConclusion.map((p) => p.en);
  return {
    mainConclusion: conclusion[0] ?? "The strongest shared timing signal is an early-August turning window.",
    mainConclusionZh: doc.mainConclusion[0]?.zhCN,
    beforeWindow: [
      "Nasdaq remains under pressure.",
      "Semiconductors and storage remain weak.",
      "Oil is expected to correct.",
      "Gold struggles with major resistance.",
      "Bitcoin remains relatively stronger but volatile.",
    ],
    beforeWindowZh: ["纳斯达克指数仍承受压力。", "半导体与存储板块维持偏弱。", "原油存在回调预期。", "国际黄金面临主要压力位。", "比特币相对偏强，但波动仍大。"],
    afterWindow: [
      "A short rebound may appear across several risk assets.",
      "Bitcoin may attempt to break 70,000.",
      "Semiconductors may begin a gradual recovery.",
      "US indexes may experience a temporary rebound.",
    ],
    afterWindowZh: ["多项风险资产可能出现短期反弹。", "比特币可能尝试突破70,000。", "半导体板块或开始逐步修复。", "美股指数可能出现阶段性反弹。"],
    caveat:
      conclusion.find((p) => p.toLowerCase().includes("late august") || p.toLowerCase().includes("october")) ??
      "Late August through October remains a major correction and accumulation window across several cycle models.",
    caveatZh:
      doc.mainConclusion.find((p) => p.zhCN.includes("8月底") || p.zhCN.includes("10月"))?.zhCN ??
      "8月底至10月仍是多个周期模型提示的主要回调与积累窗口。",
    strongestEvidence: doc.assets
      .flatMap((asset) => asset.frameworkFactors.slice(0, 1).map((f) => `${asset.symbol}: ${f.framework} — ${f.explanation.en}`))
      .slice(0, 4),
    strongestEvidenceZh: doc.assets
      .flatMap((asset) => asset.frameworkFactors.slice(0, 1).map((f) => `${asset.symbol}：${f.framework} — ${f.explanation.zhCN}`))
      .slice(0, 4),
    mainConflicts: doc.assets
      .filter((asset) => asset.frameworkFactors.length >= 2)
      .slice(0, 3)
      .map((asset) => {
        const a = asset.frameworkFactors[0];
        const b = asset.frameworkFactors[1];
        return `${asset.symbol}: ${a?.framework} vs ${b?.framework} — review framework divergence in the research library.`;
      }),
    mainConflictsZh: doc.assets
      .filter((asset) => asset.frameworkFactors.length >= 2)
      .slice(0, 3)
      .map((asset) => `${asset.symbol}：${asset.frameworkFactors[0]?.framework} 与 ${asset.frameworkFactors[1]?.framework} 存在分歧，请在研究库中查看。`),
  };
}

export async function listNasdaqLongRangeTimeline(): Promise<LongRangeTimelinePeriod[]> {
  const doc = await loadMoonXResearchAsync();
  return doc.timeline
    .filter((event) => event.isLongRange || event.categories.includes("oracle"))
    .filter((event) => event.categories.includes("us-equity") || event.isLongRange)
    .slice(0, 10)
    .map((event) => ({
      id: event.id,
      period: event.date ?? `${event.start ?? ""} – ${event.end ?? ""}`,
      outlook: event.title.en,
    }));
}
