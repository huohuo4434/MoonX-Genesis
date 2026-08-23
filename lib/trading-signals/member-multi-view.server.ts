// MOOX_V720107_ASSET_OPINION_MATRIX: last-10-day X posts grouped by asset first, researcher second.
import "server-only";

import { prisma } from "@/lib/prisma";
import { ensureExternalAnalystTables } from "@/lib/trading-signals/external-analyst-signals";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { X_SOURCE_REGISTRY, xSourceFamilyForHandle, xSourceRegistryEntryForHandle } from "@/lib/trading-signals/x-source-registry.server";
import {
  anonymizeMultiViewResearcher,
  classifyMultiViewDirection,
  classifyMultiViewHorizon,
  classifyMultiViewTheory,
  extractMultiViewAssets,
  extractMultiViewCashtags,
  extractMultiViewLevels,
  extractMultiViewTimeWindows,
  filterMultiViewSourceAssets,
  redactMultiViewSourceHandles,
  summarizeMultiViewForAsset,
  type MultiViewDirection,
  type MultiViewHorizon,
  type MultiViewLevel,
  type MultiViewTheory,
} from "@/lib/research/member-multi-view-core";
import type { ExternalAnalystParsedPost } from "@/types/external-analyst";

export type MemberAssetOpinionDirection = MultiViewDirection | "MIXED";

export type MemberAssetOpinionEntry = {
  postedAt: string;
  direction: MultiViewDirection;
  horizon: MultiViewHorizon;
  summary: string;
  timeWindows: string[];
  levels: MultiViewLevel[];
  targets: string[];
};

export type MemberAssetResearcherOpinion = {
  researcherCode: string;
  memberAlias: string | null;
  specialty: string | null;
  priorityTier: 1 | 2 | null;
  priorityRank: number | null;
  family: string;
  overallDirection: MemberAssetOpinionDirection;
  latestDirection: MultiViewDirection;
  theories: Array<{ theory: MultiViewTheory; score: number; explanation: string }>;
  postCount: number;
  latestAt: string;
  entries: MemberAssetOpinionEntry[];
};

export type MemberAssetOpinionGroup = {
  asset: string;
  displayAsset: string;
  totalResearchers: number;
  totalPosts: number;
  bullishResearchers: number;
  bearishResearchers: number;
  mixedResearchers: number;
  neutralResearchers: number;
  latestAt: string;
  opinions: MemberAssetResearcherOpinion[];
};

export type MemberMultiViewCollectionHealth = {
  registryCount: number;
  activeResearchers24h: number;
  activeResearchers7d: number;
  activeResearchers10d: number;
  posts24h: number;
  posts7d: number;
  posts10d: number;
  lastPostAt: string | null;
  reportCronSchedule: "*/15 * * * *";
  serverCollectorConfigured: boolean;
  serverCollectorMode: "X_API" | "JSON_FEED" | "NONE";
  serverRefreshAt: string | null;
  serverRefreshMessage: string | null;
  localCollectorConfigured: boolean;
  localCollectorStatus: string;
  localCollectorLastCheckedAt: string | null;
  localCollectorAccountsAttempted: number;
  localCollectorAccountsSucceeded: number;
  localCollectorMessage: string;
  effectiveSource: "SERVER_X_API" | "SERVER_JSON_FEED" | "LOCAL_COLLECTOR" | "NO_ACTIVE_SOURCE";
};

export type MemberMultiViewSnapshot = {
  generatedAt: string;
  lookbackDays: 10;
  databaseAvailable: boolean;
  health: MemberMultiViewCollectionHealth;
  assets: MemberAssetOpinionGroup[];
};

type StoredPostRow = {
  username: string;
  posted_at: Date | string;
  text: string;
  parsed: unknown;
};

type StateRow = {
  state_key: string;
  payload: unknown;
  updated_at: Date | string;
};

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseParsedPost(value: unknown): Partial<ExternalAnalystParsedPost> {
  const record = parseJsonRecord(value);
  return record as Partial<ExternalAnalystParsedPost>;
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function familyLabel(family: string): string {
  const labels: Record<string, string> = {
    ALTCOIN_RADAR: "山寨轮动",
    MARKET_STRUCTURE: "市场结构",
    FLOW_LIQUIDITY: "资金/流动性",
    CYCLE_TIMING: "周期择时",
    METAPHYSICAL_TIMING: "玄学择时",
    FUNDAMENTAL_EVENT: "基本面/事件",
    TACTICAL_SENTIMENT: "情绪战术",
    OTHER: "综合研究",
  };
  return labels[family] ?? "综合研究";
}

function mapParsedDirection(value: unknown, text: string): MultiViewDirection {
  if (value === "LONG") return "BULLISH";
  if (value === "SHORT") return "BEARISH";
  const fallback = classifyMultiViewDirection(text);
  return fallback;
}

function mapParsedHorizon(value: unknown, text: string): MultiViewHorizon {
  if (value === "INTRADAY") return "SHORT";
  if (value === "SWING") return "MEDIUM";
  if (value === "POSITION") return "LONG";
  return classifyMultiViewHorizon(text);
}

function displaySymbol(raw: string): string {
  const symbol = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const direct: Record<string, string> = {
    BTCUSDT: "BTC", ETHUSDT: "ETH", HYPEUSDT: "HYPE", SOLUSDT: "SOL",
    XAUTUSDT: "GOLD", XAGUSDT: "SILVER", CLUSDT: "WTI", SPYUSDT: "SPX",
    QQQUSDT: "NDX", MUUSDT: "MU", GOOGLUSDT: "GOOGL",
  };
  if (direct[symbol]) return direct[symbol];
  if (symbol.endsWith("USDT") && symbol.length > 4) return symbol.slice(0, -4);
  return symbol || raw.toUpperCase();
}

function numberLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (Math.abs(value) >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return value.toLocaleString("en-US", { maximumFractionDigits: Math.abs(value) < 1 ? 6 : 2 });
}

/** Remove monitored identities before any member-facing summary or extracted text is built. */
function redactMemberSourceHandles(value: string): string {
  return redactMultiViewSourceHandles(value, X_SOURCE_REGISTRY.map((entry) => entry.handle));
}

function parsedLevels(parsed: Partial<ExternalAnalystParsedPost>): MultiViewLevel[] {
  const rows: MultiViewLevel[] = [];
  const add = (label: MultiViewLevel["label"], values: unknown) => {
    if (!Array.isArray(values)) return;
    for (const raw of values) {
      const value = numberLabel(Number(raw));
      if (value && !rows.some((row) => row.label === label && row.value === value)) rows.push({ label, value });
    }
  };
  add("支撑", parsed.supportLevels);
  add("压力", parsed.resistanceLevels);
  add("目标", parsed.targetLevels);
  add("失效", parsed.invalidationLevels);
  return rows.slice(0, 8);
}

function targetLabels(parsed: Partial<ExternalAnalystParsedPost>, levels: MultiViewLevel[]): string[] {
  const targets = Array.isArray(parsed.targetLevels)
    ? parsed.targetLevels.map((value) => numberLabel(Number(value))).filter(Boolean)
    : [];
  for (const level of levels) {
    if (level.label === "目标" && !targets.includes(level.value)) targets.push(level.value);
  }
  return targets.slice(0, 6);
}

const MEMBER_SOURCE_HANDLES = X_SOURCE_REGISTRY.map((entry) => entry.handle);

function assetsForRow(row: StoredPostRow, memberSafeText: string): string[] {
  const parsed = parseParsedPost(row.parsed);
  const values = new Set<string>();
  if (Array.isArray(parsed.symbols)) {
    for (const symbol of filterMultiViewSourceAssets(parsed.symbols.map(String), MEMBER_SOURCE_HANDLES)) {
      const display = displaySymbol(String(symbol));
      if (display) values.add(display);
    }
  }
  for (const asset of extractMultiViewAssets(memberSafeText)) values.add(asset);
  for (const ticker of extractMultiViewCashtags(memberSafeText)) values.add(ticker);
  if (!values.size && /美联储|利率|流动性|大盘|美股|市场|风险偏好|宏观/i.test(memberSafeText)) values.add("MACRO");
  return filterMultiViewSourceAssets([...values], MEMBER_SOURCE_HANDLES).slice(0, 10);
}

function overallDirection(entries: MemberAssetOpinionEntry[]): MemberAssetOpinionDirection {
  const hasBull = entries.some((entry) => entry.direction === "BULLISH");
  const hasBear = entries.some((entry) => entry.direction === "BEARISH");
  if (hasBull && hasBear) return "MIXED";
  if (hasBull) return "BULLISH";
  if (hasBear) return "BEARISH";
  return "NEUTRAL";
}

export function buildMemberAssetOpinionGroups(rows: StoredPostRow[]): MemberAssetOpinionGroup[] {
  const allowed = new Set(X_SOURCE_REGISTRY.map((row) => row.handle.toLowerCase()));
  type ResearcherBucket = {
    family: string;
    memberAlias: string | null;
    specialty: string | null;
    priorityTier: 1 | 2 | null;
    priorityRank: number | null;
    entries: MemberAssetOpinionEntry[];
    theoryText: string[];
  };
  const assetResearcher = new Map<string, Map<string, ResearcherBucket>>();

  for (const row of rows) {
    const username = String(row.username ?? "").replace(/^@/, "").trim().toLowerCase();
    if (!username || !allowed.has(username)) continue;
    const postedAt = iso(row.posted_at);
    if (!postedAt) continue;
    const parsed = parseParsedPost(row.parsed);
    const memberSafeText = redactMemberSourceHandles(row.text);
    const assets = assetsForRow(row, memberSafeText);
    if (!assets.length) continue;
    const direction = mapParsedDirection(parsed.direction, row.text);
    const horizon = mapParsedHorizon(parsed.horizon, row.text);
    const fallbackLevels = extractMultiViewLevels(row.text);
    const levels = [...parsedLevels(parsed)];
    for (const level of fallbackLevels) {
      if (!levels.some((item) => item.label === level.label && item.value === level.value)) levels.push(level);
    }
    const parsedWindows = Array.isArray(parsed.timeWindows)
      ? parsed.timeWindows.map((value) => redactMemberSourceHandles(String(value))).filter(Boolean)
      : [];
    const timeWindows = [...new Set([...parsedWindows, ...extractMultiViewTimeWindows(memberSafeText)])].slice(0, 6);
    const code = anonymizeMultiViewResearcher(`@${username}`, 0);
    const family = familyLabel(xSourceFamilyForHandle(username));
    const profile = xSourceRegistryEntryForHandle(username);

    for (const asset of assets) {
      const assetMap = assetResearcher.get(asset) ?? new Map<string, ResearcherBucket>();
      const current = assetMap.get(code) ?? {
        family,
        memberAlias: profile?.memberAlias ?? null,
        specialty: profile?.specialty ?? null,
        priorityTier: profile?.priorityTier ?? null,
        priorityRank: profile?.priorityRank ?? null,
        entries: [],
        theoryText: [],
      };
      current.entries.push({
        postedAt,
        direction,
        horizon,
        summary: summarizeMultiViewForAsset(memberSafeText, asset, 260),
        timeWindows,
        levels: levels.slice(0, 8),
        targets: targetLabels(parsed, levels),
      });
      current.theoryText.push(row.text);
      assetMap.set(code, current);
      assetResearcher.set(asset, assetMap);
    }
  }

  const groups: MemberAssetOpinionGroup[] = [];
  for (const [asset, researcherMap] of assetResearcher.entries()) {
    const opinions: MemberAssetResearcherOpinion[] = [];
    for (const [researcherCode, raw] of researcherMap.entries()) {
      const entries = [...raw.entries]
        .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
        .slice(0, 20);
      const theoryMap = new Map<MultiViewTheory, { theory: MultiViewTheory; score: number; explanation: string }>();
      for (const text of raw.theoryText) {
        for (const theory of classifyMultiViewTheory(text)) {
          const existing = theoryMap.get(theory.theory);
          if (existing) existing.score += theory.score;
          else theoryMap.set(theory.theory, { ...theory });
        }
      }
      opinions.push({
        researcherCode,
        memberAlias: raw.memberAlias,
        specialty: raw.specialty,
        priorityTier: raw.priorityTier,
        priorityRank: raw.priorityRank,
        family: raw.family,
        overallDirection: overallDirection(entries),
        latestDirection: entries[0]?.direction ?? "NEUTRAL",
        theories: [...theoryMap.values()].sort((a, b) => b.score - a.score).slice(0, 3),
        postCount: entries.length,
        latestAt: entries[0]?.postedAt ?? new Date(0).toISOString(),
        entries,
      });
    }
    opinions.sort((a, b) => {
      const tierA = a.priorityTier ?? 9;
      const tierB = b.priorityTier ?? 9;
      if (tierA !== tierB) return tierA - tierB;
      const rankA = a.priorityRank ?? 999;
      const rankB = b.priorityRank ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      return Date.parse(b.latestAt) - Date.parse(a.latestAt);
    });
    const counts = opinions.reduce((acc, opinion) => {
      if (opinion.overallDirection === "BULLISH") acc.bull += 1;
      else if (opinion.overallDirection === "BEARISH") acc.bear += 1;
      else if (opinion.overallDirection === "MIXED") acc.mixed += 1;
      else acc.neutral += 1;
      return acc;
    }, { bull: 0, bear: 0, mixed: 0, neutral: 0 });
    groups.push({
      asset,
      displayAsset: asset === "MACRO" ? "宏观 / 全市场" : asset,
      totalResearchers: opinions.length,
      totalPosts: opinions.reduce((sum, opinion) => sum + opinion.postCount, 0),
      bullishResearchers: counts.bull,
      bearishResearchers: counts.bear,
      mixedResearchers: counts.mixed,
      neutralResearchers: counts.neutral,
      latestAt: opinions[0]?.latestAt ?? new Date(0).toISOString(),
      opinions,
    });
  }

  const preferred = ["BTC", "ETH", "HYPE", "SOL", "MU", "SNDK", "NVDA", "NDX", "SPX", "GOOGL", "GOLD", "SILVER", "WTI", "HSTECH", "SHCOMP", "MACRO"];
  const rank = new Map(preferred.map((asset, index) => [asset, index] as const));
  return groups.sort((a, b) => {
    const ai = rank.get(a.asset) ?? 999;
    const bi = rank.get(b.asset) ?? 999;
    if (ai !== bi) return ai - bi;
    if (b.totalPosts !== a.totalPosts) return b.totalPosts - a.totalPosts;
    return a.asset.localeCompare(b.asset, "en-US");
  });
}

async function queryMemberOpinionRows(): Promise<StoredPostRow[]> {
  if (!prisma || !(await ensureExternalAnalystTables())) return [];
  const rows = await prisma.$queryRawUnsafe<StoredPostRow[]>(`
    SELECT username, posted_at, text, parsed
    FROM trade_external_analyst_posts
    WHERE posted_at >= NOW() - INTERVAL '10 days'
    ORDER BY posted_at DESC
    LIMIT 5000
  `);
  const allowedHandles = new Set(X_SOURCE_REGISTRY.map((row) => row.handle.toLowerCase()));
  return rows.filter((row) => allowedHandles.has(String(row.username ?? "").replace(/^@/, "").trim().toLowerCase()));
}

/** Lightweight asset groups for dated forecast advisories; no collector-health query. */
export async function getMemberAssetOpinionGroups(): Promise<MemberAssetOpinionGroup[]> {
  return buildMemberAssetOpinionGroups(await queryMemberOpinionRows());
}

function emptyHealth(registryCount: number): MemberMultiViewCollectionHealth {
  const serverMode = process.env.X_BEARER_TOKEN?.trim()
    ? "X_API" as const
    : process.env.MOOX_EXTERNAL_ANALYST_FEED_URL?.trim()
      ? "JSON_FEED" as const
      : "NONE" as const;
  return {
    registryCount,
    activeResearchers24h: 0,
    activeResearchers7d: 0,
    activeResearchers10d: 0,
    posts24h: 0,
    posts7d: 0,
    posts10d: 0,
    lastPostAt: null,
    reportCronSchedule: "*/15 * * * *",
    serverCollectorConfigured: serverMode !== "NONE",
    serverCollectorMode: serverMode,
    serverRefreshAt: null,
    serverRefreshMessage: null,
    localCollectorConfigured: Boolean(process.env.MOOX_X_COLLECTOR_SECRET?.trim()),
    localCollectorStatus: "DATABASE_UNAVAILABLE",
    localCollectorLastCheckedAt: null,
    localCollectorAccountsAttempted: 0,
    localCollectorAccountsSucceeded: 0,
    localCollectorMessage: "数据库不可用，无法读取X采集状态。",
    effectiveSource: "NO_ACTIVE_SOURCE",
  };
}

export async function getMemberMultiViewSnapshot(now = new Date()): Promise<MemberMultiViewSnapshot> {
  const generatedAt = now.toISOString();
  const registryCount = X_SOURCE_REGISTRY.length;
  if (!prisma || !(await ensureExternalAnalystTables())) {
    return { generatedAt, lookbackDays: 10, databaseAvailable: false, health: emptyHealth(registryCount), assets: [] };
  }

  const [rows, states, xSnapshot] = await Promise.all([
    queryMemberOpinionRows(),
    prisma.$queryRawUnsafe<StateRow[]>(`
      SELECT state_key, payload, updated_at
      FROM trade_external_analyst_state
      WHERE state_key IN ('refresh', 'local_x_collector')
    `),
    getXIntelligenceSnapshot({ force: true, now }).catch(() => null),
  ]);

  const registryRows = rows;
  const cutoff24h = now.getTime() - 24 * 60 * 60 * 1000;
  const cutoff7d = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const activeRows24h = registryRows.filter((row) => Date.parse(String(row.posted_at)) >= cutoff24h);
  const activeRows7d = registryRows.filter((row) => Date.parse(String(row.posted_at)) >= cutoff7d);
  const activeResearchers24h = new Set(activeRows24h.map((row) => String(row.username).toLowerCase())).size;
  const activeResearchers7d = new Set(activeRows7d.map((row) => String(row.username).toLowerCase())).size;
  const activeResearchers10d = new Set(registryRows.map((row) => String(row.username).toLowerCase())).size;
  const lastPostAt = registryRows.length ? iso(registryRows[0]?.posted_at) : null;
  const stateByKey = new Map(states.map((row) => [row.state_key, row] as const));
  const refreshState = stateByKey.get("refresh");
  const refreshPayload = parseJsonRecord(refreshState?.payload);
  const serverMode = process.env.X_BEARER_TOKEN?.trim()
    ? "X_API" as const
    : process.env.MOOX_EXTERNAL_ANALYST_FEED_URL?.trim()
      ? "JSON_FEED" as const
      : "NONE" as const;
  const serverCollectorConfigured = serverMode !== "NONE";
  const localCollector = xSnapshot?.collector;
  const localHealthy = localCollector?.status === "HEALTHY";
  const effectiveSource = serverCollectorConfigured
    ? (serverMode === "X_API" ? "SERVER_X_API" as const : "SERVER_JSON_FEED" as const)
    : localHealthy
      ? "LOCAL_COLLECTOR" as const
      : "NO_ACTIVE_SOURCE" as const;

  return {
    generatedAt,
    lookbackDays: 10,
    databaseAvailable: true,
    health: {
      registryCount,
      activeResearchers24h,
      activeResearchers7d,
      activeResearchers10d,
      posts24h: activeRows24h.length,
      posts7d: activeRows7d.length,
      posts10d: registryRows.length,
      lastPostAt,
      reportCronSchedule: "*/15 * * * *",
      serverCollectorConfigured,
      serverCollectorMode: serverMode,
      serverRefreshAt: iso(refreshState?.updated_at),
      serverRefreshMessage: String(refreshPayload.message ?? "").trim() || null,
      localCollectorConfigured: Boolean(localCollector?.configured),
      localCollectorStatus: localCollector?.status ?? "UNKNOWN",
      localCollectorLastCheckedAt: localCollector?.lastCheckedAt ?? null,
      localCollectorAccountsAttempted: localCollector?.accountsAttempted ?? 0,
      localCollectorAccountsSucceeded: localCollector?.accountsSucceeded ?? 0,
      localCollectorMessage: localCollector?.message ?? "未读取到本地采集器状态。",
      effectiveSource,
    },
    assets: buildMemberAssetOpinionGroups(registryRows),
  };
}
