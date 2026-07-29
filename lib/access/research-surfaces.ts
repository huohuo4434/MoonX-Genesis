import "server-only";

import { getMemberUserContext } from "@/lib/access/member-preview";
import { calculateTechnicalVerificationStats } from "@/lib/analysis/technical-signals";
import { listResearchConflicts } from "@/lib/data/research-conflicts";
import { researchCollections } from "@/lib/data/research-records";
import { listTechnicalSignals } from "@/lib/data/load-technical-signals";
import type { ResearchCollection, ResearchRecord, TimelineEvent, WatchlistEntry } from "@/types/research";

type SurfaceAccess = {
  unlocked: boolean;
  isAdmin: boolean;
  isPreviewGate: boolean;
  isMember: boolean;
};

export async function getSurfaceAccess(): Promise<SurfaceAccess> {
  const ctx = await getMemberUserContext();
  return {
    unlocked: ctx.isAdmin || ctx.isMember || ctx.isPreviewGate,
    isAdmin: ctx.isAdmin,
    isPreviewGate: ctx.isPreviewGate,
    isMember: ctx.isMember,
  };
}

export function selectLongTermResearchRecords(records: ResearchRecord[]): ResearchRecord[] {
  return records.filter(
    (record) =>
      Boolean(record.isLongRange) ||
      Boolean(record.annualPath?.length) ||
      Boolean(record.collectionId && researchCollections.some((collection) => collection.id === record.collectionId))
  );
}

export function buildLongTermModuleInventory(records: ResearchRecord[]): Array<
  ResearchCollection & { coveredAssets: string[]; recordCount: number; lastUpdated: string | null }
> {
  return researchCollections.map((collection) => {
    const scoped = records.filter((record) => record.collectionId === collection.id);
    return {
      ...collection,
      coveredAssets: [...new Set(scoped.map((record) => record.assetName.zhCN))],
      recordCount: scoped.length,
      lastUpdated: scoped.map((record) => record.publishedAt).sort().at(-1) ?? collection.publishedAt,
    };
  });
}

export function shapeLongTermModuleInventory(
  inventory: Array<ResearchCollection & { coveredAssets: string[]; recordCount: number; lastUpdated: string | null }>,
  unlocked: boolean
) {
  if (unlocked) return inventory;
  return inventory.map((module, index) => ({
    ...module,
    title: {
      zhCN: `长期研究模块 ${index + 1}`,
      zhTW: `長期研究模組 ${index + 1}`,
      en: `Long-term Research Module ${index + 1}`,
    },
    description: {
      zhCN: "公开页仅展示模块范围、覆盖资产、周期与更新时间，不展示框架原文和长期目标。",
      zhTW: "公開頁僅展示模組範圍、覆蓋資產、週期與更新時間，不展示框架原文和長期目標。",
      en: "Public view shows only module scope, covered assets, period, and update time.",
    },
  }));
}

export function shapeWatchlistEntries(entries: WatchlistEntry[], unlocked: boolean): WatchlistEntry[] {
  if (unlocked) return entries;
  return entries.map((entry) => ({
    ...entry,
    mainTheme: [],
    thesis: {
      zhCN: "公开页仅展示观察范围与更新状态。",
      zhTW: "公開頁僅展示觀察範圍與更新狀態。",
      en: "Public view shows only observation scope and update status.",
    },
    risks: [],
    warning: undefined,
    meta: entry.meta?.filter((item) => item.labelKey !== "watchlist.meta.ipoPrice"),
  }));
}

export function shapeTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
  return events.filter((event) => {
    const blob = `${event.title.zhCN} ${event.description?.zhCN ?? ""}`;
    if (event.isLongRange) return false;
    if (blob.includes("年度六爻")) return false;
    if (blob.includes("2035")) return false;
    return true;
  });
}

export async function getTechnicalSignalsSurfacePayload() {
  const access = await getSurfaceAccess();
  const signals = await listTechnicalSignals();
  const stats = calculateTechnicalVerificationStats(signals);
  const conflictCount = listResearchConflicts().length;

  return {
    access,
    allSignals: signals,
    publicSignals: signals.slice(0, 8).map((signal) => ({
      id: signal.id,
      symbol: signal.symbol,
      title: signal.title,
      summary: signal.summary,
      status: signal.status,
      timeframe: signal.timeframe,
      detectedAt: signal.detectedAt,
    })),
    stats,
    conflictCount,
  };
}
