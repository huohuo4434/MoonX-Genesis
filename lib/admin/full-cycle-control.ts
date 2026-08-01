import "server-only";

import { getSexagenaryDay, listDatesByBranches } from "@/lib/calendar/sexagenary-calendar";
import { getChinaDateKey } from "@/lib/date/china-date";
import { listDailyForecasts } from "@/lib/data/daily-forecasts";
import { listAllWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { listLongxinPeriodForecasts } from "@/lib/data/conviction/longxin-forecasts";
import { listAsteroidPeriodForecasts } from "@/lib/data/conviction/asteroid-forecasts";
import { listMuHypePeriodForecasts } from "@/lib/data/conviction/mu-hype-forecasts";
import { listEthPeriodForecasts } from "@/lib/data/conviction/eth-forecasts";
import { CORE_MARKET_CYCLE_ADMIN_ROWS_20260801 } from "@/lib/data/core-market-liuyao-20260801";
import { REMAINING_CORE_MARKET_CYCLE_ADMIN_ROWS_20260801 } from "@/lib/data/core-market-liuyao-remaining-20260801";
import { buildSixYaoMonthlyFallbackRows } from "@/lib/admin/six-yao-cycle-fallback";
import { hasPrisma, prisma } from "@/lib/prisma";
import type {
  AdminBreakoutEvent,
  AdminCycleAsset,
  AdminCycleForecastRow,
  AdminFullCycleSnapshot,
  AdminKeyDateRecord,
  AdminLevelTimeframe,
  AdminPriceZone,
} from "@/types/admin-full-cycle";

export const ADMIN_FULL_CYCLE_ASSETS: AdminCycleAsset[] = [
  { id: "bitcoin", name: "比特币", symbol: "BTC", assetClass: "CORE", market: "crypto" },
  { id: "sp500", name: "标普500", symbol: "SPX", assetClass: "CORE", market: "us" },
  { id: "nasdaq-100", name: "纳斯达克100", symbol: "NDX", assetClass: "CORE", market: "us" },
  { id: "shanghai-composite", name: "上证指数", symbol: "SHCOMP", assetClass: "CORE", market: "cn" },
  { id: "hang-seng", name: "恒生科技", symbol: "HSTECH", assetClass: "CORE", market: "hk" },
  { id: "gold", name: "国际金价", symbol: "GOLD", assetClass: "CORE", market: "commodity" },
  { id: "wti-crude", name: "WTI原油", symbol: "WTI", assetClass: "CORE", market: "commodity" },
  { id: "cxmt", name: "长鑫科技", symbol: "688825", assetClass: "FOCUS", market: "stock" },
  { id: "asteroid", name: "Asteroid（太空狗）", symbol: "ASTEROID", assetClass: "FOCUS", market: "crypto" },
  { id: "mu", name: "美光科技", symbol: "MU", assetClass: "FOCUS", market: "us" },
  { id: "hype", name: "HYPE", symbol: "HYPE", assetClass: "FOCUS", market: "crypto" },
  { id: "eth", name: "以太坊", symbol: "ETH", assetClass: "FOCUS", market: "crypto" },
];

const ASSET_ALIASES: Record<string, string[]> = {
  bitcoin: ["bitcoin", "BTC", "btc"],
  sp500: ["sp500", "SPX", "标普500"],
  "nasdaq-100": ["nasdaq-100", "NDX", "纳斯达克100"],
  "shanghai-composite": ["shanghai-composite", "SHCOMP", "SSEC", "上证指数"],
  "hang-seng": ["hang-seng", "HSTECH", "恒生科技"],
  gold: ["gold", "GOLD", "GC=F", "国际金价"],
  "wti-crude": ["wti-crude", "WTI", "CL", "WTI原油"],
  cxmt: ["cxmt", "688825", "长鑫", "长鑫科技"],
  asteroid: ["asteroid", "ASTEROID", "太空狗"],
  mu: ["mu", "MU", "美光", "美光科技"],
  hype: ["hype", "HYPE"],
  eth: ["eth", "ETH", "以太坊"],
};

function canonicalAssetId(value: string): string {
  const normalized = value.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(ASSET_ALIASES)) {
    if (canonical.toLowerCase() === normalized) return canonical;
    if (aliases.some((alias) => alias.toLowerCase() === normalized)) return canonical;
  }
  return value;
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = Date.UTC(y!, m! - 1, d! + days);
  return new Date(utc).toISOString().slice(0, 10);
}

function startOfWeek(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDays(dateKey, delta);
}

function endOfMonth(dateKey: string): string {
  const [y, m] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
}

function probabilityLabel(input: { up?: number | null; flat?: number | null; down?: number | null }) {
  if ([input.up, input.flat, input.down].every((value) => typeof value !== "number")) return "—";
  return `涨${input.up ?? 0}% / 震${input.flat ?? 0}% / 跌${input.down ?? 0}%`;
}

function staticForecastRows(now = new Date()): AdminCycleForecastRow[] {
  const today = getChinaDateKey(now);
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const monthEnd = endOfMonth(today);
  const yearEnd = `${today.slice(0, 4)}-12-31`;
  const rows: AdminCycleForecastRow[] = [];

  for (const item of listDailyForecasts(now)) {
    if (item.forecastForDate < weekStart || item.forecastForDate > weekEnd) continue;
    rows.push({
      id: item.id,
      assetId: item.assetId,
      horizon: "DAY",
      periodStart: item.forecastForDate,
      periodEnd: item.forecastForDate,
      direction: item.directionLabel ?? item.direction,
      path: item.expectedPath?.join(" → ") ?? item.summary,
      probabilityLabel: `${item.confidence}%置信度`,
      sourceLabel: item.publishedBy || "日度预测库",
      status: item.status,
      version: item.version,
    });
  }

  for (const item of listAllWeeklyAnalyses()) {
    rows.push({
      id: item.id,
      assetId: item.assetId,
      horizon: "WEEK",
      periodStart: item.weekStart,
      periodEnd: item.weekEnd,
      direction: item.overallDirection,
      path: item.weeklyPath,
      probabilityLabel: probabilityLabel({
        up: item.probabilities.up,
        flat: item.probabilities.flat,
        down: item.probabilities.down,
      }),
      sourceLabel: (item.sourceIds ?? []).join("、") || "周度预测库",
      status: item.status,
      version: item.version,
    });
  }

  for (const item of CORE_MARKET_CYCLE_ADMIN_ROWS_20260801) {
    rows.push({ ...item });
  }
  for (const item of REMAINING_CORE_MARKET_CYCLE_ADMIN_ROWS_20260801) {
    rows.push({ ...item });
  }

  const focusGroups = [
    ...listLongxinPeriodForecasts(),
    ...listAsteroidPeriodForecasts(),
    ...listMuHypePeriodForecasts("mu"),
    ...listMuHypePeriodForecasts("hype"),
    ...listEthPeriodForecasts(),
  ];
  for (const item of focusGroups) {
    const horizon = item.forecastType.startsWith("WEEK")
      ? "WEEK"
      : item.forecastType.startsWith("MONTH")
        ? "WEEK"
        : "MONTH";
    if (horizon === "WEEK" && item.periodStart > monthEnd) continue;
    if (horizon === "MONTH" && item.periodStart > yearEnd) continue;
    rows.push({
      id: item.id,
      assetId: item.assetId,
      horizon,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      direction: item.direction,
      path: item.expectedPath,
      probabilityLabel: probabilityLabel({
        up: item.upProbability,
        flat: item.sidewaysProbability,
        down: item.downProbability,
      }),
      sourceLabel: item.sourceType === "ICHING_RESEARCH" ? "六爻研究" : "管理员",
      status: item.status,
      version: item.version,
    });
  }

  return rows;
}

type OverrideNote = Record<string, unknown>;

function parseNote(note: string | null): OverrideNote {
  if (!note) return {};
  try {
    const parsed = JSON.parse(note) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as OverrideNote) : { text: note };
  } catch {
    return { text: note };
  }
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function normalizeLevelTimeframe(scope: string): AdminLevelTimeframe {
  if (scope.endsWith("4H")) return "4H";
  if (scope.endsWith("1W")) return "1W";
  return "1D";
}

function isMissingDatabaseTable(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "P2021" ||
    /does not exist in the current database/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}

async function optionalIChingResearchRows() {
  if (!prisma) return [];
  try {
    return await prisma.iChingResearch.findMany({
      orderBy: [{ forecastStartAt: "asc" }, { updatedAt: "desc" }],
      take: 500,
    });
  } catch (error) {
    if (!isMissingDatabaseTable(error)) throw error;
    console.warn(
      "IChingResearch table is unavailable; using built-in research records instead."
    );
    return [];
  }
}

async function optionalForecastOverrideRows() {
  if (!prisma) return [];
  try {
    return await prisma.forecastOverride.findMany({
      where: { enabled: true },
      orderBy: [{ targetDate: "asc" }, { updatedAt: "desc" }],
      take: 500,
    });
  } catch (error) {
    if (!isMissingDatabaseTable(error)) throw error;
    console.warn(
      "ForecastOverride table is unavailable; continuing without database overrides."
    );
    return [];
  }
}

async function databaseRows(): Promise<{
  forecasts: AdminCycleForecastRow[];
  keyDates: AdminKeyDateRecord[];
  priceZones: AdminPriceZone[];
  breakoutEvents: AdminBreakoutEvent[];
}> {
  if (!hasPrisma() || !prisma) {
    return { forecasts: [], keyDates: [], priceZones: [], breakoutEvents: [] };
  }

  const [research, overrides] = await Promise.all([
    optionalIChingResearchRows(),
    optionalForecastOverrideRows(),
  ]);

  const forecasts: AdminCycleForecastRow[] = research.map((row) => {
    const type = row.forecastType.toUpperCase();
    const horizon = type.includes("DAY")
      ? "DAY"
      : type.includes("WEEK")
        ? "WEEK"
        : "MONTH";
    return {
      id: row.id,
      assetId: canonicalAssetId(row.assetId),
      horizon,
      periodStart: row.forecastStartAt,
      periodEnd: row.forecastEndAt,
      direction:
        row.masterDirectionConclusion ||
        row.internalDirectionConclusion ||
        row.directionConclusion ||
        "待复核",
      path:
        row.masterPathConclusion ||
        row.internalPathConclusion ||
        row.pathConclusion ||
        row.masterStructuredSummary ||
        "原始研究已保存，尚未形成正式路径。",
      probabilityLabel: row.confidence ? `${row.confidence}%置信度` : "未评分",
      sourceLabel: `${row.sourceType} · ${row.hexagramName}${row.changedHexagramName ? `→${row.changedHexagramName}` : ""}`,
      status: row.researchStatus,
      version: row.version,
    };
  });

  const keyDates: AdminKeyDateRecord[] = [];
  const priceZones: AdminPriceZone[] = [];
  const breakoutEvents: AdminBreakoutEvent[] = [];

  for (const row of overrides) {
    const note = parseNote(row.note);
    if (row.scope.startsWith("KEY_DATE")) {
      let ganzhi: string | null = null;
      try {
        ganzhi = getSexagenaryDay(row.targetDate).label;
      } catch {
        ganzhi = typeof note.ganzhi === "string" ? note.ganzhi : null;
      }
      keyDates.push({
        id: row.id,
        assetId: row.assetId,
        date: row.targetDate,
        ganzhi,
        branchRule: typeof note.branchRule === "string" ? note.branchRule : null,
        effect: row.direction || String(note.effect || "转折"),
        source: String(note.source || "ADMIN"),
        label: String(note.label || "关键日"),
        note: typeof note.text === "string" ? note.text : null,
        enabled: row.enabled,
        createdAt: row.createdAt.toISOString(),
      });
      continue;
    }
    if (row.scope.startsWith("PRICE_LEVEL_")) {
      priceZones.push({
        id: row.id,
        assetId: row.assetId,
        timeframe: normalizeLevelTimeframe(row.scope),
        effectiveDate: row.targetDate,
        supportLevels: stringArray(row.supportLevels),
        resistanceLevels: stringArray(row.resistanceLevels),
        confirmation: row.confirmation,
        invalidation: row.invalidation,
        note: typeof note.text === "string" ? note.text : row.note,
        enabled: row.enabled,
        updatedAt: row.updatedAt.toISOString(),
      });
      continue;
    }
    if (row.scope.startsWith("BREAKOUT_EVENT_")) {
      breakoutEvents.push({
        id: row.id,
        assetId: row.assetId,
        timeframe: normalizeLevelTimeframe(row.scope),
        eventDate: row.targetDate,
        closePrice: Number(note.closePrice || 0),
        eventType:
          note.eventType === "PRESSURE_BREAK" || note.eventType === "SUPPORT_BREAK"
            ? note.eventType
            : "IN_RANGE",
        alignment:
          note.alignment === "ALIGNED" || note.alignment === "CONFLICT"
            ? note.alignment
            : "UNCLEAR",
        evidence: String(note.evidence || "暂无卦象一致性说明"),
        note: typeof note.text === "string" ? note.text : null,
      });
    }
  }

  return { forecasts, keyDates, priceZones, breakoutEvents };
}

export async function buildAdminFullCycleSnapshot(now = new Date()): Promise<AdminFullCycleSnapshot> {
  const [db, sixYaoMonthly] = await Promise.all([
    databaseRows(),
    buildSixYaoMonthlyFallbackRows(now),
  ]);
  const forecastMap = new Map<string, AdminCycleForecastRow>();
  for (const row of [...sixYaoMonthly, ...staticForecastRows(now), ...db.forecasts]) {
    forecastMap.set(`${row.assetId}:${row.horizon}:${row.periodStart}:${row.version ?? 0}`, row);
  }
  return {
    generatedAt: now.toISOString(),
    databaseReady: hasPrisma(),
    assets: ADMIN_FULL_CYCLE_ASSETS,
    forecasts: [...forecastMap.values()].sort((a, b) =>
      `${a.assetId}:${a.periodStart}:${a.horizon}`.localeCompare(`${b.assetId}:${b.periodStart}:${b.horizon}`)
    ),
    keyDates: db.keyDates,
    priceZones: db.priceZones,
    breakoutEvents: db.breakoutEvents,
  };
}

function idPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80);
}

export async function saveBranchKeyDates(input: {
  assetId: string;
  startDate: string;
  endDate: string;
  branches: string[];
  effect: string;
  source: string;
  label: string;
  note?: string;
  createdBy?: string;
}): Promise<AdminKeyDateRecord[]> {
  if (!hasPrisma() || !prisma) throw new Error("DATABASE_URL未配置，无法保存关键日");
  const dates = listDatesByBranches(input);
  const result: AdminKeyDateRecord[] = [];
  for (const item of dates) {
    const scope = `KEY_DATE_${idPart(input.source).toUpperCase()}`;
    const id = `KEY-${idPart(input.assetId)}-${item.date}-${idPart(input.source)}-${item.branch}`;
    const note = JSON.stringify({
      branchRule: input.branches.join("、"),
      effect: input.effect,
      source: input.source,
      label: input.label,
      ganzhi: item.label,
      text: input.note || null,
      calendarReference: "2026-07-30=乙巳日",
      timezone: "Asia/Shanghai",
    });
    const row = await prisma.forecastOverride.upsert({
      where: {
        scope_assetId_targetDate: {
          scope,
          assetId: input.assetId,
          targetDate: item.date,
        },
      },
      update: {
        direction: input.effect,
        note,
        enabled: true,
        createdBy: input.createdBy,
      },
      create: {
        id,
        scope,
        assetId: input.assetId,
        targetDate: item.date,
        direction: input.effect,
        note,
        enabled: true,
        createdBy: input.createdBy,
      },
    });
    result.push({
      id: row.id,
      assetId: row.assetId,
      date: row.targetDate,
      ganzhi: item.label,
      branchRule: input.branches.join("、"),
      effect: input.effect,
      source: input.source,
      label: input.label,
      note: input.note || null,
      enabled: row.enabled,
      createdAt: row.createdAt.toISOString(),
    });
  }
  return result;
}

export async function saveExactKeyDate(input: {
  assetId: string;
  date: string;
  effect: string;
  source: string;
  label: string;
  note?: string;
  createdBy?: string;
}): Promise<AdminKeyDateRecord> {
  if (!hasPrisma() || !prisma) throw new Error("DATABASE_URL未配置，无法保存关键日");
  let ganzhi: string | null = null;
  try {
    ganzhi = getSexagenaryDay(input.date).label;
  } catch {
    ganzhi = null;
  }
  const scope = `KEY_DATE_${idPart(input.source).toUpperCase()}`;
  const note = JSON.stringify({
    effect: input.effect,
    source: input.source,
    label: input.label,
    ganzhi,
    text: input.note || null,
    timezone: "Asia/Shanghai",
  });
  const row = await prisma.forecastOverride.upsert({
    where: {
      scope_assetId_targetDate: {
        scope,
        assetId: input.assetId,
        targetDate: input.date,
      },
    },
    update: { direction: input.effect, note, enabled: true, createdBy: input.createdBy },
    create: {
      id: `KEY-${idPart(input.assetId)}-${input.date}-${idPart(input.source)}`,
      scope,
      assetId: input.assetId,
      targetDate: input.date,
      direction: input.effect,
      note,
      enabled: true,
      createdBy: input.createdBy,
    },
  });
  return {
    id: row.id,
    assetId: row.assetId,
    date: row.targetDate,
    ganzhi,
    branchRule: null,
    effect: input.effect,
    source: input.source,
    label: input.label,
    note: input.note || null,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function savePriceZone(input: {
  assetId: string;
  timeframe: AdminLevelTimeframe;
  effectiveDate: string;
  supportLevels: string[];
  resistanceLevels: string[];
  confirmation?: string;
  invalidation?: string;
  note?: string;
  createdBy?: string;
}): Promise<AdminPriceZone> {
  if (!hasPrisma() || !prisma) throw new Error("DATABASE_URL未配置，无法保存支撑压力区");
  const scope = `PRICE_LEVEL_${input.timeframe}`;
  const row = await prisma.forecastOverride.upsert({
    where: {
      scope_assetId_targetDate: {
        scope,
        assetId: input.assetId,
        targetDate: input.effectiveDate,
      },
    },
    update: {
      supportLevels: input.supportLevels,
      resistanceLevels: input.resistanceLevels,
      confirmation: input.confirmation || null,
      invalidation: input.invalidation || null,
      note: JSON.stringify({ text: input.note || null }),
      enabled: true,
      createdBy: input.createdBy,
    },
    create: {
      id: `LEVEL-${idPart(input.assetId)}-${input.timeframe}-${input.effectiveDate}`,
      scope,
      assetId: input.assetId,
      targetDate: input.effectiveDate,
      supportLevels: input.supportLevels,
      resistanceLevels: input.resistanceLevels,
      confirmation: input.confirmation || null,
      invalidation: input.invalidation || null,
      note: JSON.stringify({ text: input.note || null }),
      enabled: true,
      createdBy: input.createdBy,
    },
  });
  return {
    id: row.id,
    assetId: row.assetId,
    timeframe: input.timeframe,
    effectiveDate: row.targetDate,
    supportLevels: input.supportLevels,
    resistanceLevels: input.resistanceLevels,
    confirmation: row.confirmation,
    invalidation: row.invalidation,
    note: input.note || null,
    enabled: row.enabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseZone(zone: string): { low: number; high: number } | null {
  const values = [...zone.replace(/,/g, "").matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (!values.length || values.some((value) => !Number.isFinite(value))) return null;
  const low = Math.min(...values);
  const high = Math.max(...values);
  return { low, high };
}

function directionClass(text: string): "UP" | "DOWN" | "NEUTRAL" {
  if (/下跌|看空|偏空|转弱|冲高回落|先涨后跌/.test(text)) return "DOWN";
  if (/上涨|看多|偏多|转强|探底回升|先跌后涨/.test(text)) return "UP";
  return "NEUTRAL";
}

export async function evaluateBreakout(input: {
  assetId: string;
  timeframe: AdminLevelTimeframe;
  eventDate: string;
  closePrice: number;
  note?: string;
  createdBy?: string;
}): Promise<AdminBreakoutEvent> {
  if (!hasPrisma() || !prisma) throw new Error("DATABASE_URL未配置，无法记录突破事件");
  const scope = `PRICE_LEVEL_${input.timeframe}`;
  const zone = await prisma.forecastOverride.findFirst({
    where: {
      scope,
      assetId: input.assetId,
      targetDate: { lte: input.eventDate },
      enabled: true,
    },
    orderBy: [{ targetDate: "desc" }, { updatedAt: "desc" }],
  });
  if (!zone) throw new Error("请先录入该资产对应周期的支撑压力区");

  const supports = stringArray(zone.supportLevels).map(parseZone).filter((v): v is { low: number; high: number } => Boolean(v));
  const resistances = stringArray(zone.resistanceLevels).map(parseZone).filter((v): v is { low: number; high: number } => Boolean(v));
  const lowestSupport = supports.length ? Math.min(...supports.map((v) => v.low)) : null;
  const highestResistance = resistances.length ? Math.max(...resistances.map((v) => v.high)) : null;
  const eventType =
    highestResistance !== null && input.closePrice > highestResistance
      ? "PRESSURE_BREAK"
      : lowestSupport !== null && input.closePrice < lowestSupport
        ? "SUPPORT_BREAK"
        : "IN_RANGE";

  const aliases = ASSET_ALIASES[input.assetId] ?? [input.assetId];
  let research: Awaited<ReturnType<typeof prisma.iChingResearch.findMany>> = [];
  try {
    research = await prisma.iChingResearch.findMany({
      where: {
        assetId: { in: aliases },
        forecastEndAt: { gte: input.eventDate },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
    });
  } catch (error) {
    if (!isMissingDatabaseTable(error)) throw error;
    console.warn(
      "IChingResearch table is unavailable; breakout alignment will use no database research."
    );
  }
  const evidence = research
    .map((row) =>
      row.masterDirectionConclusion || row.internalDirectionConclusion || row.directionConclusion || ""
    )
    .filter(Boolean);
  const signal = eventType === "PRESSURE_BREAK" ? "UP" : eventType === "SUPPORT_BREAK" ? "DOWN" : "NEUTRAL";
  const classes = evidence.map(directionClass);
  const alignment =
    signal === "NEUTRAL" || classes.length === 0
      ? "UNCLEAR"
      : classes.some((item) => item === signal)
        ? "ALIGNED"
        : classes.some((item) => item !== "NEUTRAL" && item !== signal)
          ? "CONFLICT"
          : "UNCLEAR";
  const evidenceText = evidence.length
    ? evidence.slice(0, 4).join("；")
    : "暂无覆盖该日期的正式六爻/奇门方向，需管理员复核。";
  const eventScope = `BREAKOUT_EVENT_${input.timeframe}`;
  const note = JSON.stringify({
    closePrice: input.closePrice,
    eventType,
    alignment,
    evidence: evidenceText,
    text: input.note || null,
    levelSourceId: zone.id,
  });
  const row = await prisma.forecastOverride.upsert({
    where: {
      scope_assetId_targetDate: {
        scope: eventScope,
        assetId: input.assetId,
        targetDate: input.eventDate,
      },
    },
    update: { direction: eventType, note, enabled: true, createdBy: input.createdBy },
    create: {
      id: `BREAK-${idPart(input.assetId)}-${input.timeframe}-${input.eventDate}`,
      scope: eventScope,
      assetId: input.assetId,
      targetDate: input.eventDate,
      direction: eventType,
      note,
      enabled: true,
      createdBy: input.createdBy,
    },
  });
  return {
    id: row.id,
    assetId: row.assetId,
    timeframe: input.timeframe,
    eventDate: input.eventDate,
    closePrice: input.closePrice,
    eventType,
    alignment,
    evidence: evidenceText,
    note: input.note || null,
  };
}
