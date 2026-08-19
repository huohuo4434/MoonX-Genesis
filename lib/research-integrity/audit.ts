import { STATIC_FOCUS_ASSET_IDS, STATIC_MEMBER_AUTOMATION_FOCUS } from "@/lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "@/lib/data/conviction/focus-static-forecast-registry";
import { focusAuthorityDerivedStep, selectFocusCurrentAuthority } from "@/lib/data/conviction/focus-daily-policy-core";
import { buildFocusQimenParallelReading } from "@/lib/forecasts/focus-qimen-parallel";
import { classifyDailyDirection } from "@/lib/forecasts/daily-direction-family";
import { listAllWeeklyAnalyses } from "@/lib/data/weekly-analysis";
import { hasIntradayTechnicalTarget, intradayFocusKey } from "@/lib/market-data/intraday-chan-levels";
import { generateCoreMarketFromWeeklyPure } from "@/lib/forecasts/daily-pipeline";
import { applyQimenFirstToGeneratedDaily } from "@/lib/forecasts/qimen-first-policy";
import { getNextForecastDate } from "@/lib/calendar/next-trading-day";
import { marketMeta } from "@/lib/forecasts/weekly-to-daily";

export const MOOX_RESEARCH_INTEGRITY_VERSION = "RESEARCH_INTEGRITY_V2_20260819";

const DAY_MS = 86_400_000;
const CORE9 = [
  { key: "BTC", pipelineCode: "BTC", label: "比特币", aliases: ["BTC"] },
  { key: "ETH", pipelineCode: "ETH", label: "以太坊", aliases: ["ETH"] },
  { key: "SPX", pipelineCode: "SPX", label: "标普500", aliases: ["SPX", "^GSPC"] },
  { key: "NDX", pipelineCode: "NDX", label: "纳斯达克100", aliases: ["NDX", "^NDX"] },
  { key: "WTI", pipelineCode: "WTI", label: "WTI原油", aliases: ["WTI", "CL", "CL=F"] },
  { key: "GOLD", pipelineCode: "GLD", label: "黄金", aliases: ["GOLD", "GLD", "GC", "XAU"] },
  { key: "SILVER", pipelineCode: "SILVER", label: "白银", aliases: ["SILVER", "SI", "XAG"] },
  { key: "SHCOMP", pipelineCode: "SHCOMP", label: "上证指数", aliases: ["SHCOMP", "SSEC", "000001.SS"] },
  { key: "HSTECH", pipelineCode: "HSTECH", label: "恒生科技", aliases: ["HSTECH"] },
] as const;

type AuditState = "OK" | "ATTENTION" | "MISSING";

export type CoreResearchIntegrityRow = {
  key: string;
  label: string;
  weeklySource: boolean;
  weeklyDirection: string | null;
  todayLiuyao: string | null;
  todayQimen: string | null;
  nextLiuyao: string | null;
  nextQimen: string | null;
  intraday1h: boolean;
  state: AuditState;
  issues: string[];
};

export type FocusResearchIntegrityRow = {
  assetId: string;
  label: string;
  authorityId: string | null;
  authorityType: string | null;
  authorityDirection: string | null;
  todayLiuyao: string | null;
  nextLiuyao: string | null;
  todayQimen: string | null;
  nextQimen: string | null;
  todayRelation: string | null;
  nextRelation: string | null;
  intraday1h: boolean;
  state: AuditState;
  issues: string[];
};

export type ResearchIntegrityAudit = {
  version: string;
  asOfDate: string;
  generatedAt: string;
  core: CoreResearchIntegrityRow[];
  focus: FocusResearchIntegrityRow[];
  summary: {
    coreOk: number;
    coreTotal: number;
    focusOk: number;
    focusTotal: number;
    criticalIssues: number;
  };
};

function addDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(ms)) throw new Error(`invalid research-integrity date: ${date}`);
  return new Date(ms + days * DAY_MS).toISOString().slice(0, 10);
}

function formalCurrentWeekly(key: string, aliases: readonly string[], asOfDate: string) {
  const aliasSet = new Set([key, ...aliases].map((value) => value.toUpperCase()));
  return listAllWeeklyAnalyses()
    .filter((row) => row.status === "published")
    .filter((row) => row.weekStart <= asOfDate && asOfDate <= row.weekEnd)
    .filter((row) => aliasSet.has(String(row.displaySymbol ?? row.symbol).toUpperCase()) || aliasSet.has(String(row.symbol).toUpperCase()))
    .sort((a, b) => b.version - a.version || b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

function evidenceField(text: string | null | undefined, key: string): string | null {
  if (!text) return null;
  const part = text.split("；").find((item) => item.startsWith(`${key}=`));
  return part ? part.slice(key.length + 1).trim() || null : null;
}

function coreDualView(pipelineCode: string, date: string): { liuyao: string | null; qimen: string | null } {
  const pure = generateCoreMarketFromWeeklyPure(pipelineCode, date, "LOCKED");
  if (!pure) return { liuyao: null, qimen: null };
  const withQimen = applyQimenFirstToGeneratedDaily(pure, { liuyaoDirection: pure.direction });
  return {
    liuyao: pure.direction || null,
    qimen: evidenceField(withQimen.qimenEvidence, "奇门主判"),
  };
}

export function buildResearchIntegrityAudit(input: { asOfDate: string; nowMs: number }): ResearchIntegrityAudit {
  const nextDate = addDays(input.asOfDate, 1);
  const core = CORE9.map((market): CoreResearchIntegrityRow => {
    const weekly = formalCurrentWeekly(market.key, market.aliases, input.asOfDate);
    const today = coreDualView(market.pipelineCode, input.asOfDate);
    const nextTarget = getNextForecastDate(marketMeta(market.pipelineCode).legacyMarket, input.asOfDate);
    const next = coreDualView(market.pipelineCode, nextTarget);
    const intraday1h = hasIntradayTechnicalTarget(market.key);
    const issues = [
      !weekly ? "当前周正式研究缺失" : null,
      !today.liuyao ? "今日日六爻未生成" : null,
      !today.qimen ? "今日奇门未生成" : null,
      !next.liuyao ? "下一交易日日六爻未生成" : null,
      !next.qimen ? "下一交易日奇门未生成" : null,
      !intraday1h ? "1H技术位映射缺失" : null,
    ].filter((value): value is string => Boolean(value));
    return {
      key: market.key,
      label: market.label,
      weeklySource: Boolean(weekly),
      weeklyDirection: weekly?.overallDirection ?? null,
      todayLiuyao: today.liuyao,
      todayQimen: today.qimen,
      nextLiuyao: next.liuyao,
      nextQimen: next.qimen,
      intraday1h,
      state: issues.length ? "MISSING" : "OK",
      issues,
    };
  });

  const focus = STATIC_FOCUS_ASSET_IDS.map((assetId): FocusResearchIntegrityRow => {
    const forecasts = listStaticFocusForecasts(assetId);
    const authority = selectFocusCurrentAuthority({ forecasts, asOfDate: input.asOfDate, nowMs: input.nowMs });
    const nextAuthority = selectFocusCurrentAuthority({ forecasts, asOfDate: nextDate, nowMs: input.nowMs });
    const issues: string[] = [];
    if (!authority) issues.push("当前正式周/月/长期研究缺失");
    if (!nextAuthority) issues.push("次日正式周/月/长期研究缺失");

    let todayLiuyao: string | null = null;
    let nextLiuyao: string | null = null;
    let todayQimen: string | null = null;
    let nextQimen: string | null = null;
    let todayRelation: string | null = null;
    let nextRelation: string | null = null;

    if (authority) {
      const today = focusAuthorityDerivedStep(authority, input.asOfDate, input.asOfDate);
      todayLiuyao = today.direction;
      if (classifyDailyDirection(todayLiuyao) === "UNKNOWN") issues.push("今日日六爻派生方向不可识别");

      const qToday = buildFocusQimenParallelReading({ assetId, forecastDate: input.asOfDate, liuyaoDirection: todayLiuyao });
      todayQimen = qToday.direction;
      todayRelation = qToday.relationLabel;
      if (!qToday.available) issues.push("今日奇门盘不可用");
      if (qToday.relation === "LIUYAO_MISSING") issues.push("今日双观点关系错误：六爻被误判缺失");
    }

    if (nextAuthority) {
      const next = focusAuthorityDerivedStep(nextAuthority, nextDate, input.asOfDate);
      nextLiuyao = next.direction;
      if (classifyDailyDirection(nextLiuyao) === "UNKNOWN") issues.push("次日日六爻派生方向不可识别");
      const qNext = buildFocusQimenParallelReading({ assetId, forecastDate: nextDate, liuyaoDirection: nextLiuyao });
      nextQimen = qNext.direction;
      nextRelation = qNext.relationLabel;
      if (!qNext.available) issues.push("次日奇门盘不可用");
      if (qNext.relation === "LIUYAO_MISSING") issues.push("次日双观点关系错误：六爻被误判缺失");
    }

    const intraday1h = hasIntradayTechnicalTarget(intradayFocusKey(assetId));
    if (!intraday1h) issues.push("1H技术位映射缺失");
    const label = STATIC_MEMBER_AUTOMATION_FOCUS[assetId].displayName;
    return {
      assetId,
      label,
      authorityId: authority?.id ?? null,
      authorityType: authority?.forecastType ?? null,
      authorityDirection: authority?.direction ?? null,
      todayLiuyao,
      nextLiuyao,
      todayQimen,
      nextQimen,
      todayRelation,
      nextRelation,
      intraday1h,
      state: issues.length ? "MISSING" : "OK",
      issues,
    };
  });

  return {
    version: MOOX_RESEARCH_INTEGRITY_VERSION,
    asOfDate: input.asOfDate,
    generatedAt: new Date(input.nowMs).toISOString(),
    core,
    focus,
    summary: {
      coreOk: core.filter((row) => row.state === "OK").length,
      coreTotal: core.length,
      focusOk: focus.filter((row) => row.state === "OK").length,
      focusTotal: focus.length,
      criticalIssues: [...core, ...focus].reduce((sum, row) => sum + row.issues.length, 0),
    },
  };
}
