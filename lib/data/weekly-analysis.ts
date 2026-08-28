import {
  ALL_WEEKLY_ANALYSES,
  PUBLISHED_WEEKLY_ANALYSES,
  WEEKLY_CORE_MARKETS,
} from "@/lib/data/published-weekly-analysis-20260727";
import { PUBLISHED_WEEKLY_ANALYSES_20260803 } from "@/lib/data/published-weekly-analysis-20260803";
import {
  PUBLISHED_WEEKLY_ANALYSES_20260817,
  WEEKLY_RESEARCH_BLEND_NOTE_20260817,
  WEEKLY_SOURCE_VERIFICATION_NOTE_20260817,
} from "@/lib/data/published-weekly-analysis-20260817";
import {
  PUBLISHED_WEEKLY_ANALYSES_20260824,
  WEEKLY_SOURCE_VERIFICATION_NOTE_20260824,
} from "@/lib/data/published-weekly-analysis-20260824";
import {
  WEEKLY_WOLF_REVISIONS_20260823,
} from "@/lib/data/published-weekly-wolf-20260823";
import {
  WEEKLY_RESEARCH_REVISIONS_20260823,
} from "@/lib/data/published-weekly-research-20260823";
import {
  WEEKLY_CRYPTO_TEACHER_REVISIONS_20260823,
} from "@/lib/data/published-weekly-crypto-teacher-20260823";
import {
  WEEKLY_QIMEN_POST_REVISIONS_20260823,
  WEEKLY_QIMEN_POST_REVISION_NOTE_20260824,
} from "@/lib/data/published-weekly-qimen-post-20260823";
import {
  WEEKLY_METALS_ENERGY_20260824,
  WEEKLY_METALS_ENERGY_SOURCE_NOTE_20260824,
} from "@/lib/data/published-weekly-metals-energy-20260824";
import { SOURCE_LOCKED_AUTO_WEEKLY_PUBLICATIONS } from "@/lib/data/source-locked-weekly-auto-publications";
import {
  ARCHIVED_WEEKLY_ANALYSES_20260810_V4,
  PUBLISHED_WEEKLY_ANALYSES_20260810_V4,
  WEEKLY_RESEARCH_BLEND_NOTE_20260810_V4,
  WEEKLY_SOURCE_VERIFICATION_NOTE_20260810_V4,
} from "@/lib/data/published-weekly-us-indices-20260809";
import { applyWeeklyPriceOverlay } from "@/lib/data/apply-price-overlays";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type {
  WeeklyAnalysisMemberView,
  WeeklyAnalysisPublicSummary,
  WeeklyAnalysisRecord,
  WeeklyAnalysisTeaser,
  WeeklyMarketSlot,
} from "@/types/weekly-analysis";

export { WEEKLY_CORE_MARKETS };

const ALL_PUBLISHED: WeeklyAnalysisRecord[] = [
  ...PUBLISHED_WEEKLY_ANALYSES,
  ...PUBLISHED_WEEKLY_ANALYSES_20260803,
  ...PUBLISHED_WEEKLY_ANALYSES_20260810_V4,
  ...PUBLISHED_WEEKLY_ANALYSES_20260817,
  ...PUBLISHED_WEEKLY_ANALYSES_20260824,
  ...WEEKLY_WOLF_REVISIONS_20260823,
  ...WEEKLY_RESEARCH_REVISIONS_20260823,
  ...WEEKLY_CRYPTO_TEACHER_REVISIONS_20260823,
  ...WEEKLY_QIMEN_POST_REVISIONS_20260823,
  ...WEEKLY_METALS_ENERGY_20260824,
  ...SOURCE_LOCKED_AUTO_WEEKLY_PUBLICATIONS,
];

const ALL_RECORDS: WeeklyAnalysisRecord[] = [
  ...ALL_WEEKLY_ANALYSES,
  ...PUBLISHED_WEEKLY_ANALYSES_20260803,
  ...ARCHIVED_WEEKLY_ANALYSES_20260810_V4,
  ...PUBLISHED_WEEKLY_ANALYSES_20260810_V4,
  ...PUBLISHED_WEEKLY_ANALYSES_20260817,
  ...PUBLISHED_WEEKLY_ANALYSES_20260824,
  ...WEEKLY_WOLF_REVISIONS_20260823,
  ...WEEKLY_RESEARCH_REVISIONS_20260823,
  ...WEEKLY_CRYPTO_TEACHER_REVISIONS_20260823,
  ...WEEKLY_QIMEN_POST_REVISIONS_20260823,
  ...WEEKLY_METALS_ENERGY_20260824,
  ...SOURCE_LOCKED_AUTO_WEEKLY_PUBLICATIONS,
];

function addUtcDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolveWeeklyDisplayWindow(now = new Date()): {
  displayMode: "CURRENT_WEEK" | "NEXT_WEEK";
  weekStart: string;
  weekEnd: string;
} {
  const today = getBeijingTodayKey(now);
  const day = new Date(`${today}T12:00:00Z`).getUTCDay();
  const weekend = day === 0 || day === 6;
  const daysToMonday = weekend ? (day === 6 ? 2 : 1) : 1 - day;
  const weekStart = addUtcDays(today, daysToMonday);
  return {
    displayMode: weekend ? "NEXT_WEEK" : "CURRENT_WEEK",
    weekStart,
    weekEnd: addUtcDays(weekStart, 6),
  };
}

export function listAllWeeklyAnalyses(): WeeklyAnalysisRecord[] {
  return ALL_RECORDS.map(applyWeeklyPriceOverlay);
}

/** All published weeks, used by history and verification. */
export function listAllPublishedWeeklyAnalyses(): WeeklyAnalysisRecord[] {
  return ALL_PUBLISHED.filter((r) => r.status === "published").map(applyWeeklyPriceOverlay);
}

/** The week currently shown to members: current week on weekdays, next week from Saturday. */
export function listPublishedWeeklyAnalyses(now = new Date()): WeeklyAnalysisRecord[] {
  const window = resolveWeeklyDisplayWindow(now);
  return listAllPublishedWeeklyAnalyses().filter(
    (r) => r.weekStart === window.weekStart && r.weekEnd === window.weekEnd
  );
}

export function toWeeklyTeaser(r: WeeklyAnalysisRecord): WeeklyAnalysisTeaser {
  return {
    id: r.id,
    assetId: r.assetId,
    assetName: r.assetName,
    symbol: r.symbol,
    displaySymbol: r.displaySymbol ?? r.symbol,
    weekStart: r.weekStart,
    weekEnd: r.weekEnd,
    status: r.status,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    isReady: r.status === "published",
  };
}

export function toWeeklyMemberView(r: WeeklyAnalysisRecord): WeeklyAnalysisMemberView {
  return {
    id: r.id,
    assetId: r.assetId,
    assetName: r.assetName,
    symbol: r.symbol,
    displaySymbol: r.displaySymbol ?? r.symbol,
    weekStart: r.weekStart,
    weekEnd: r.weekEnd,
    overallDirection: r.overallDirection,
    weeklyPath: r.weeklyPath,
    headline: r.headline,
    probabilities: r.probabilities,
    strongWindow: r.strongWindow,
    weakWindow: r.weakWindow,
    keyDates: r.keyDates,
    basisWeights: r.basisWeights,
    keySupport: r.keySupport,
    keyResistance: r.keyResistance,
    invalidation: r.invalidation,
    confirmation: r.confirmation,
    catalysts: r.catalysts,
    risks: r.risks,
    priceSnapshot: r.priceSnapshot,
    priceDataSourceLabel: r.priceDataSourceLabel,
    priceSnapshotAtLabel: r.priceSnapshotAtLabel,
    riskLevel: r.riskLevel,
    confidence: r.confidence,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
    status: r.status,
    visibility: r.visibility,
    version: r.version,
    originalLocked: r.originalLocked,
    memberRevisionNotice: r.memberRevisionNotice,
  };
}

/** Canonical core-market slots — missing markets show as unpublished with a clear reason. */
export function buildWeeklyMarketSlots(now = new Date()): WeeklyMarketSlot[] {
  const byAsset = new Map(
    listPublishedWeeklyAnalyses(now).map((r) => [r.assetId, toWeeklyMemberView(r)])
  );
  return WEEKLY_CORE_MARKETS.map((m) => {
    const analysis = byAsset.get(m.assetId);
    if (analysis) return { kind: "published" as const, analysis };
    return {
      kind: "unpublished" as const,
      assetId: m.assetId,
      assetName: m.assetName,
      symbol: m.symbol,
      displaySymbol: m.displaySymbol,
    };
  });
}

export function buildWeeklyPublicSummary(now = new Date()): WeeklyAnalysisPublicSummary {
  const window = resolveWeeklyDisplayWindow(now);
  const slots = buildWeeklyMarketSlots(now);
  const published = slots
    .filter((s): s is Extract<WeeklyMarketSlot, { kind: "published" }> => s.kind === "published")
    .map((s) => s.analysis);
  const updated = published
    .map((r) => r.updatedAt || r.publishedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const publishedAt = published
    .map((r) => r.publishedAt)
    .filter(Boolean)
    .sort()
    .at(0);

  const teasers: WeeklyAnalysisTeaser[] = slots.map((s) => {
    if (s.kind === "published") {
      return {
        id: s.analysis.id,
        assetId: s.analysis.assetId,
        assetName: s.analysis.assetName,
        symbol: s.analysis.symbol,
        displaySymbol: s.analysis.displaySymbol ?? s.analysis.symbol,
        weekStart: s.analysis.weekStart,
        weekEnd: s.analysis.weekEnd,
        status: s.analysis.status,
        publishedAt: s.analysis.publishedAt,
        updatedAt: s.analysis.updatedAt,
        isReady: true,
      };
    }
    return {
      id: `WEEKLY-EMPTY-${window.weekStart}-${s.assetId}`,
      assetId: s.assetId,
      assetName: s.assetName,
      symbol: s.symbol,
      displaySymbol: s.displaySymbol,
      weekStart: window.weekStart,
      weekEnd: window.weekEnd,
      status: "draft",
      publishedAt: "",
      updatedAt: "",
      isReady: false,
    };
  });

  const nextWeek = window.displayMode === "NEXT_WEEK";
  return {
    displayMode: window.displayMode,
    headingZh: nextWeek ? "下周行情分析" : "本周行情分析",
    subtitleZh: nextWeek
      ? "每周六起自动展示下一周；只发布已有真实研究依据的市场，未完成的项目明确标记待发布。"
      : "提前了解核心市场的整体方向、周内运行顺序和关键风险窗口。",
    weekStart: window.weekStart,
    weekEnd: window.weekEnd,
    weekLabel: `${formatDateChina(window.weekStart)}至${formatDateChina(window.weekEnd)}`,
    publishedAtLabel: publishedAt ? formatDateTimeChina(publishedAt) : "—",
    lastUpdatedLabel: updated ? formatDateTimeChina(updated) : "—",
    publishedCount: published.length,
    coverageCount: WEEKLY_CORE_MARKETS.length,
    assetNames: WEEKLY_CORE_MARKETS.map((m) => m.assetName),
    teasers,
    nextPublishHint: nextWeek
      ? published.length > 0
        ? `已进入下周窗口，当前已发布 ${published.length} / ${WEEKLY_CORE_MARKETS.length} 个有依据的市场；其余不会把上周内容当作新预测发布。`
        : "已进入下周窗口，下周预测待发布；系统不会把上周内容当作新预测发布。"
      : "本周观点在周五结束后进入历史验证；周六自动切换下周窗口。",
    researchBlendNoteZh: window.weekStart >= "2026-08-31" && window.weekStart <= "2026-09-28"
      ? WEEKLY_METALS_ENERGY_SOURCE_NOTE_20260824.zh
      : (window.weekStart === "2026-08-24" ? WEEKLY_QIMEN_POST_REVISION_NOTE_20260824.zh : (window.weekStart === "2026-08-17" ? WEEKLY_RESEARCH_BLEND_NOTE_20260817.zh : (window.weekStart === "2026-08-10" ? WEEKLY_RESEARCH_BLEND_NOTE_20260810_V4.zh : undefined))),
    researchBlendNoteEn: window.weekStart >= "2026-08-31" && window.weekStart <= "2026-09-28"
      ? WEEKLY_METALS_ENERGY_SOURCE_NOTE_20260824.en
      : (window.weekStart === "2026-08-24" ? WEEKLY_QIMEN_POST_REVISION_NOTE_20260824.en : (window.weekStart === "2026-08-17" ? WEEKLY_RESEARCH_BLEND_NOTE_20260817.en : (window.weekStart === "2026-08-10" ? WEEKLY_RESEARCH_BLEND_NOTE_20260810_V4.en : undefined))),
    sourceVerificationNoteZh: window.weekStart === "2026-08-24" ? WEEKLY_SOURCE_VERIFICATION_NOTE_20260824.zh : (window.weekStart === "2026-08-17" ? WEEKLY_SOURCE_VERIFICATION_NOTE_20260817.zh : (window.weekStart === "2026-08-10" ? WEEKLY_SOURCE_VERIFICATION_NOTE_20260810_V4.zh : undefined)),
    sourceVerificationNoteEn: window.weekStart === "2026-08-24" ? WEEKLY_SOURCE_VERIFICATION_NOTE_20260824.en : (window.weekStart === "2026-08-17" ? WEEKLY_SOURCE_VERIFICATION_NOTE_20260817.en : (window.weekStart === "2026-08-10" ? WEEKLY_SOURCE_VERIFICATION_NOTE_20260810_V4.en : undefined)),
  };
}
