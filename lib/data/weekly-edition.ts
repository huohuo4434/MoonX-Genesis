/**
 * Current-week tactical edition (2026-07-27 → 2026-08-02).
 * Surfaces existing summaries — does not invent day-by-day prices.
 */
import { CURRENT_WEEK, curatedImportRecords } from "@/lib/data/curated-import-records";
import { externalObservations } from "@/lib/data/external-observations";
import { listResearchRecords } from "@/lib/data/research-records";
import type { LocalizedText } from "@/lib/i18n/config";
import type { ResearchDirection, ResearchRecord } from "@/types/research";

export type WeeklyDayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "weekend";

export interface WeeklyDaySlot {
  key: WeeklyDayKey;
  date?: string;
  rhythmZhCN: string;
  rhythmEn: string;
  directionLabelZhCN: string;
  directionLabelEn: string;
  conditionZhCN: string;
  conditionEn: string;
  revised: boolean;
}

export interface WeeklyAssetCard {
  assetId: string;
  symbol: string;
  nameZhCN: string;
  nameEn: string;
  record: ResearchRecord;
  parentRecord?: ResearchRecord;
  technicalRecord?: ResearchRecord;
  alignsWithHigherHorizon: boolean | "unknown";
  sourceArchiveLabelZhCN: string;
  sourceArchiveLabelEn: string;
  daySlots: WeeklyDaySlot[];
}

export interface WeeklyEdition {
  periodStart: string;
  periodEnd: string;
  cards: WeeklyAssetCard[];
  dayUncertaintyNoteZhCN: string;
  dayUncertaintyNoteEn: string;
}

const WEEKLY_ASSET_ORDER = ["bitcoin", "crude-oil", "sp500", "nasdaq-100", "gold"] as const;

function pick(record: ResearchRecord | undefined, locale: "zhCN" | "en"): string {
  if (!record) return "";
  return locale === "zhCN" ? record.summary.zhCN : record.summary.en;
}

function directionLabel(direction: ResearchDirection): { zhCN: string; en: string } {
  switch (direction) {
    case "strong-bullish":
      return { zhCN: "强势看涨", en: "Strong bullish" };
    case "bullish":
    case "slightly-bullish":
      return { zhCN: "上涨概率较高", en: "Higher upside probability" };
    case "bearish":
    case "slightly-bearish":
      return { zhCN: "缓慢偏空", en: "Gradually bearish" };
    case "strong-bearish":
      return { zhCN: "强势看跌", en: "Strong bearish" };
    case "insufficient-evidence":
      return { zhCN: "证据不足", en: "Insufficient evidence" };
    default:
      return { zhCN: "中性 / 混合", en: "Neutral / mixed" };
  }
}

function archiveLabel(status: ResearchRecord["sourceStatus"], assetId?: string): { zhCN: string; en: string } {
  if (assetId === "bitcoin" && status === "raw_source_saved") {
    return {
      zhCN: "用户自测原始卦盘已归档，已审核并纳入日度拆解",
      en: "User self-test source charts archived — reviewed and used in daily decomposition",
    };
  }
  if (status === "raw_source_saved") {
    return { zhCN: "原始来源已归档", en: "Raw source archived" };
  }
  if (status === "source_image_pending_relink") {
    return { zhCN: "原始卦图待归档", en: "Source hexagram chart pending archive" };
  }
  return { zhCN: "目前为摘要记录", en: "Summary-only record" };
}

function genericDaySlots(direction: ResearchDirection): WeeklyDaySlot[] {
  const d = directionLabel(direction);
  return [
    {
      key: "monday",
      date: "2026-07-27",
      rhythmZhCN: "观察初始方向确认",
      rhythmEn: "Watch initial direction confirmation",
      directionLabelZhCN: d.zhCN,
      directionLabelEn: d.en,
      conditionZhCN: "关注开盘后方向与关键位反应",
      conditionEn: "Watch open direction and key-level reaction",
      revised: false,
    },
    {
      key: "tuesday",
      date: "2026-07-28",
      rhythmZhCN: "观察初始方向确认",
      rhythmEn: "Watch initial direction confirmation",
      directionLabelZhCN: d.zhCN,
      directionLabelEn: d.en,
      conditionZhCN: "确认周一方向是否延续",
      conditionEn: "Confirm whether Monday’s bias continues",
      revised: false,
    },
    {
      key: "wednesday",
      date: "2026-07-29",
      rhythmZhCN: "关注周中转折",
      rhythmEn: "Watch midweek turn",
      directionLabelZhCN: d.zhCN,
      directionLabelEn: d.en,
      conditionZhCN: "波动可能放大，等待结构确认",
      conditionEn: "Volatility may rise; wait for structure confirmation",
      revised: false,
    },
    {
      key: "thursday",
      date: "2026-07-30",
      rhythmZhCN: "根据周度趋势延续或修正",
      rhythmEn: "Continue or revise with weekly bias",
      directionLabelZhCN: d.zhCN,
      directionLabelEn: d.en,
      conditionZhCN: "对照周度方向与技术条件",
      conditionEn: "Cross-check weekly bias and technical conditions",
      revised: false,
    },
    {
      key: "friday",
      date: "2026-07-31",
      rhythmZhCN: "根据周度趋势延续或修正",
      rhythmEn: "Continue or revise with weekly bias",
      directionLabelZhCN: d.zhCN,
      directionLabelEn: d.en,
      conditionZhCN: "周末前观察冲高回落或延续",
      conditionEn: "Watch late-week extension or fade into the weekend",
      revised: false,
    },
    {
      key: "weekend",
      rhythmZhCN: "休市整理 / 事件跟踪",
      rhythmEn: "Weekend review / event tracking",
      directionLabelZhCN: "观察",
      directionLabelEn: "Watch",
      conditionZhCN: "记录突发事件修正，不覆盖原预测",
      conditionEn: "Log event revisions without overwriting the original forecast",
      revised: false,
    },
  ];
}

function daySlotsFromThesis(record: ResearchRecord): WeeklyDaySlot[] | null {
  const theses = record.thesis ?? [];
  if (theses.length === 0) return null;
  const d = directionLabel(record.direction);

  // Oil has explicit 3-stage path — map onto week days without inventing prices.
  if (record.id === "EXTERNAL-OIL-RHYTHM-2026-07-27") {
    return [
      { key: "monday", date: "2026-07-27", rhythmZhCN: "先受阻下探", rhythmEn: "Early resistance then dip", directionLabelZhCN: "偏空试探", directionLabelEn: "Downside probe", conditionZhCN: theses[0]?.zhCN ?? "", conditionEn: theses[0]?.en ?? "", revised: false },
      { key: "tuesday", date: "2026-07-28", rhythmZhCN: "尝试V形反弹", rhythmEn: "V-shaped rebound attempt", directionLabelZhCN: "修复", directionLabelEn: "Repair", conditionZhCN: theses[0]?.zhCN ?? "", conditionEn: theses[0]?.en ?? "", revised: false },
      { key: "wednesday", date: "2026-07-29", rhythmZhCN: "高位震荡换手", rhythmEn: "High-range turnover", directionLabelZhCN: "震荡", directionLabelEn: "Range", conditionZhCN: theses[1]?.zhCN ?? "", conditionEn: theses[1]?.en ?? "", revised: false },
      { key: "thursday", date: "2026-07-30", rhythmZhCN: "高位震荡换手", rhythmEn: "High-range turnover", directionLabelZhCN: "震荡", directionLabelEn: "Range", conditionZhCN: theses[1]?.zhCN ?? "", conditionEn: theses[1]?.en ?? "", revised: false },
      { key: "friday", date: "2026-07-31", rhythmZhCN: "尝试突破，防冲高回落", rhythmEn: "Breakout attempt; fade risk", directionLabelZhCN: d.zhCN, directionLabelEn: d.en, conditionZhCN: theses[2]?.zhCN ?? "", conditionEn: theses[2]?.en ?? "", revised: false },
      { key: "weekend", rhythmZhCN: "休市整理", rhythmEn: "Weekend review", directionLabelZhCN: "观察", directionLabelEn: "Watch", conditionZhCN: "保留修正记录", conditionEn: "Keep revision trail", revised: false },
    ];
  }

  if (record.id === "external-symbolic-spy-weekly-2026-07-27") {
    return [
      { key: "monday", date: "2026-07-27", rhythmZhCN: "先跌后涨 / V形修复", rhythmEn: "Dip then V-repair", directionLabelZhCN: "先跌后涨", directionLabelEn: "Dip-then-lift", conditionZhCN: theses[0]?.zhCN ?? "", conditionEn: theses[0]?.en ?? "", revised: false },
      { key: "tuesday", date: "2026-07-28", rhythmZhCN: "震荡筑底后温和抬升", rhythmEn: "Base then mild lift", directionLabelZhCN: "震荡偏涨", directionLabelEn: "Mild repair", conditionZhCN: theses[1]?.zhCN ?? "", conditionEn: theses[1]?.en ?? "", revised: false },
      { key: "wednesday", date: "2026-07-29", rhythmZhCN: "后半周路径资料不完整", rhythmEn: "Later-week path incomplete", directionLabelZhCN: "观察", directionLabelEn: "Watch", conditionZhCN: "不延伸未经提供的精细路径", conditionEn: "Do not invent unsupported day paths", revised: false },
      { key: "thursday", date: "2026-07-30", rhythmZhCN: "后半周路径资料不完整", rhythmEn: "Later-week path incomplete", directionLabelZhCN: "观察", directionLabelEn: "Watch", conditionZhCN: "对照周度修复偏向", conditionEn: "Stay with weekly repair bias", revised: false },
      { key: "friday", date: "2026-07-31", rhythmZhCN: "后半周路径资料不完整", rhythmEn: "Later-week path incomplete", directionLabelZhCN: "观察", directionLabelEn: "Watch", conditionZhCN: "记录突发事件修正", conditionEn: "Log event revisions", revised: false },
      { key: "weekend", rhythmZhCN: "休市整理", rhythmEn: "Weekend review", directionLabelZhCN: "观察", directionLabelEn: "Watch", conditionZhCN: "保留修正记录", conditionEn: "Keep revision trail", revised: false },
    ];
  }

  if (record.id === "external-symbolic-qqq-weekly-2026-07-27") {
    return [
      { key: "monday", date: "2026-07-27", rhythmZhCN: "前段急跌探底", rhythmEn: "Early sharp dip", directionLabelZhCN: "偏空试探", directionLabelEn: "Downside probe", conditionZhCN: "波动可能大于标普", conditionEn: "Volatility may exceed SPX", revised: false },
      { key: "tuesday", date: "2026-07-28", rhythmZhCN: "关键低点 / 拐点观察", rhythmEn: "Key low / turn watch", directionLabelZhCN: "转折", directionLabelEn: "Turn", conditionZhCN: "7月28日前后低点或拐点", conditionEn: "Low or turn near July 28", revised: false },
      { key: "wednesday", date: "2026-07-29", rhythmZhCN: "中段强力V形修复机会", rhythmEn: "Midweek V-repair opportunity", directionLabelZhCN: "修复", directionLabelEn: "Repair", conditionZhCN: "由周度路径拆分，非独立日预测", conditionEn: "Derived from weekly path — not an independent daily call", revised: false },
      { key: "thursday", date: "2026-07-30", rhythmZhCN: "后段高位宽幅换手", rhythmEn: "Late wide high-range churn", directionLabelZhCN: "震荡", directionLabelEn: "Range", conditionZhCN: "防范冲高受阻", conditionEn: "Watch failed upside extension", revised: false },
      { key: "friday", date: "2026-07-31", rhythmZhCN: "后段高位宽幅换手", rhythmEn: "Late wide high-range churn", directionLabelZhCN: "震荡", directionLabelEn: "Range", conditionZhCN: "由周度路径拆分", conditionEn: "Derived from weekly path", revised: false },
      { key: "weekend", rhythmZhCN: "休市整理", rhythmEn: "Weekend review", directionLabelZhCN: "观察", directionLabelEn: "Watch", conditionZhCN: "保留修正记录", conditionEn: "Keep revision trail", revised: false },
    ];
  }

  if (record.id === "MX-GLD-20260727-WEEKLY-001") {
    return [
      { key: "monday", date: "2026-07-27", rhythmZhCN: "高位震荡或试高", rhythmEn: "High-range chop or probe highs", directionLabelZhCN: "先涨后跌", directionLabelEn: "Rise then fall", conditionZhCN: "低权重日级路径，非必然见顶", conditionEn: "Low-weight daily path — not a certain top", revised: false },
      { key: "tuesday", date: "2026-07-28", rhythmZhCN: "高位延续试探", rhythmEn: "High-range continuation probe", directionLabelZhCN: "先涨后跌", directionLabelEn: "Rise then fall", conditionZhCN: "与周度先涨后跌一致", conditionEn: "Aligned with weekly rise-then-fall", revised: false },
      { key: "wednesday", date: "2026-07-29", rhythmZhCN: "转折与冲高回落风险上升", rhythmEn: "Turn / probe-fade risk rises", directionLabelZhCN: "略微看跌", directionLabelEn: "Slightly bearish", conditionZhCN: "兄弟爻化进，获利卖盘压力增强", conditionEn: "Sibling advancing spirit — take-profit pressure rises", revised: false },
      { key: "thursday", date: "2026-07-30", rhythmZhCN: "冲高回落风险窗口", rhythmEn: "Probe-fade risk window", directionLabelZhCN: "略微看跌", directionLabelEn: "Slightly bearish", conditionZhCN: "日级节奏不得写成必然见顶", conditionEn: "Daily rhythm must not be stated as a certain top", revised: false },
      { key: "friday", date: "2026-07-31", rhythmZhCN: "低位震荡或弱势收尾", rhythmEn: "Low-range chop or soft close", directionLabelZhCN: "略微看跌", directionLabelEn: "Slightly bearish", conditionZhCN: "不断言必然形成周内最低点", conditionEn: "Do not assert a certain weekly low", revised: false },
      { key: "weekend", rhythmZhCN: "休市整理", rhythmEn: "Weekend review", directionLabelZhCN: "观察", directionLabelEn: "Watch", conditionZhCN: "等待2026-08-01验证", conditionEn: "Await verification on 2026-08-01", revised: false },
    ];
  }

  return null;
}

async function indexRecords(): Promise<Map<string, ResearchRecord>> {
  const all = await listResearchRecords();
  const map = new Map<string, ResearchRecord>();
  for (const record of all) {
    map.set(record.id, record);
    for (const alias of record.aliases ?? []) map.set(alias, record);
  }
  for (const record of curatedImportRecords) {
    if (!map.has(record.id)) map.set(record.id, record);
  }
  for (const record of externalObservations) {
    if (!map.has(record.id)) map.set(record.id, record);
  }
  return map;
}

/** Resolve the four weekly cards for the current edition. */
export async function getCurrentWeeklyEdition(): Promise<WeeklyEdition> {
  const byId = await indexRecords();

  const weeklyIds: Record<(typeof WEEKLY_ASSET_ORDER)[number], string> = {
    bitcoin: "weekly-tactical-btc-2026-07-27",
    "crude-oil": "EXTERNAL-OIL-RHYTHM-2026-07-27",
    sp500: "external-symbolic-spy-weekly-2026-07-27",
    "nasdaq-100": "external-symbolic-qqq-weekly-2026-07-27",
    gold: "MX-GLD-20260727-WEEKLY-001",
  };

  const parentIds: Partial<Record<(typeof WEEKLY_ASSET_ORDER)[number], string>> = {
    bitcoin: "MX-BTC-20260727-0907-LIUYAO-001",
    "crude-oil": "research-oil-cycle-2026-h2",
    "nasdaq-100": "ORACLE-0001",
    gold: "MX-XAU-2026-ANNUAL-001",
  };

  const technicalIds: Partial<Record<(typeof WEEKLY_ASSET_ORDER)[number], string>> = {
    bitcoin: "technical-btc-2026-07-snapshot",
    "nasdaq-100": "technical-ndx-2026-07-snapshot",
  };

  const cards: WeeklyAssetCard[] = [];

  for (const assetId of WEEKLY_ASSET_ORDER) {
    const record = byId.get(weeklyIds[assetId]);
    if (!record) continue;
    const parentRecord = parentIds[assetId] ? byId.get(parentIds[assetId]!) : undefined;
    const technicalRecord = technicalIds[assetId] ? byId.get(technicalIds[assetId]!) : undefined;
    const archive = archiveLabel(record.sourceStatus ?? "summary_only", assetId);
    const slots = daySlotsFromThesis(record) ?? genericDaySlots(record.direction);

    cards.push({
      assetId,
      symbol: record.symbol ?? assetId,
      nameZhCN: record.assetName.zhCN,
      nameEn: record.assetName.en,
      record,
      parentRecord,
      technicalRecord,
      alignsWithHigherHorizon:
        parentRecord == null
          ? ("unknown" as const)
          : parentRecord.direction === record.direction ||
              (parentRecord.direction.includes("bull") && record.direction.includes("bull")) ||
              (parentRecord.direction.includes("bear") && record.direction.includes("bear")) ||
              parentRecord.direction === "neutral" ||
              record.direction === "neutral",
      sourceArchiveLabelZhCN: archive.zhCN,
      sourceArchiveLabelEn: archive.en,
      daySlots: slots,
    });
  }

  return {
    periodStart: CURRENT_WEEK.start,
    periodEnd: CURRENT_WEEK.end,
    cards,
    dayUncertaintyNoteZhCN: "每日节奏属于周度趋势拆解，不确定性高于周度判断。",
    dayUncertaintyNoteEn: "Daily rhythm is derived from the weekly path and carries higher uncertainty than the weekly judgment.",
  };
}

export function localizedSummary(text: LocalizedText, isChinese: boolean): string {
  return isChinese ? text.zhCN : text.en;
}

export function pickRecordSummary(record: ResearchRecord, isChinese: boolean): string {
  return pick(record, isChinese ? "zhCN" : "en");
}
