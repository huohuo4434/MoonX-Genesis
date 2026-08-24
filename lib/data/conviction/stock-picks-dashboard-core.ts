import { buildFocusDetailedReport } from "@/lib/data/conviction/focus-dossier-core";
import { STATIC_FOCUS_ASSET_IDS, type StaticFocusAssetId } from "@/lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "@/lib/data/conviction/focus-static-forecast-registry";
import { WATCHLIST_TEASERS } from "@/lib/data/conviction/watchlist-teasers";
import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type { ConvictionPublicCard } from "@/types/conviction-asset";
import type { MemberStockPickResearchRow, StockPickPeriodView, StockPickSourcePriority } from "@/types/member-stock-picks-dashboard";
import { normalizeOfficialDirection } from "@/lib/forecasts/formal-direction";

const DAY_MS = 86_400_000;
const STATIC_IDS = new Set<string>(STATIC_FOCUS_ASSET_IDS);

function isFormal(row: ConvictionPeriodForecast, nowMs: number): boolean {
  return row.status === "published" && Date.parse(row.publishedAt) <= nowMs && Date.parse(row.lockedAt) <= nowMs;
}

function sourcePriority(row: ConvictionPeriodForecast | null): StockPickSourcePriority {
  if (!row) return "MISSING";
  const evidence = [
    row.ichingEvidence.notes,
    row.summary,
    row.expectedPath,
    ...(row.methodViews ?? []).flatMap((view) => [view.label, view.summary]),
  ].join(" ");
  if (/不是老师原卦|用户本人排盘|用户原卦|旧自算|自起卦/u.test(evidence)) return "USER_INTERPRETED";
  return /老师|课程|狼叔|丙午|原课|专项六爻月卦/u.test(evidence) ? "TEACHER" : "USER_INTERPRETED";
}

function sourceLabel(priority: StockPickSourcePriority): string {
  if (priority === "TEACHER") return "老师同周期原卦 · 最高优先级";
  if (priority === "USER_INTERPRETED") return "自起卦 · 按老师方法解读";
  return "该周期卦象待补";
}

function latestByAuthority(rows: ConvictionPeriodForecast[]): ConvictionPeriodForecast | null {
  return rows.slice().sort((left, right) => {
    const authority = Number(sourcePriority(right) === "TEACHER") - Number(sourcePriority(left) === "TEACHER");
    return authority || right.version - left.version || right.publishedAt.localeCompare(left.publishedAt);
  })[0] ?? null;
}

function currentOrNext(rows: ConvictionPeriodForecast[], asOfDate: string): ConvictionPeriodForecast | null {
  const current = rows.filter((row) => row.periodStart <= asOfDate && row.periodEnd >= asOfDate);
  if (current.length) return latestByAuthority(current);
  const nextStart = rows.filter((row) => row.periodStart > asOfDate).map((row) => row.periodStart).sort()[0];
  return nextStart ? latestByAuthority(rows.filter((row) => row.periodStart === nextStart)) : null;
}

function isHigherHorizonDerived(row: ConvictionPeriodForecast | null): boolean {
  if (!row) return false;
  return /缺少同周期完整周卦|缺少同周期.*周卦|来自月卦明确分段|月卦分段候选|不冒充独立日卦|月周融合/u.test([
    row.summary,
    row.expectedPath,
    row.ichingEvidence.notes,
    row.consensusLabel ?? "",
    ...(row.risks ?? []),
  ].join(" "));
}

function periodView(row: ConvictionPeriodForecast | null, missingSummary: string, horizon: "MONTH" | "WEEK"): StockPickPeriodView {
  const priority = sourcePriority(row);
  const derived = horizon === "WEEK" && isHigherHorizonDerived(row);
  return {
    direction: row ? normalizeOfficialDirection(row.direction) : null,
    periodStart: row?.periodStart ?? null,
    periodEnd: row?.periodEnd ?? null,
    summary: row?.summary ?? missingSummary,
    expectedPath: row?.expectedPath ?? null,
    sourcePriority: priority,
    sourceLabel: derived ? "老师月卦周拆分 · 非独立周卦" : sourceLabel(priority),
    version: row?.version ?? null,
    authority: row ? derived ? "HIGHER_HORIZON_DERIVED" : "INDEPENDENT_PERIOD" : "MISSING",
  };
}

function stageView(monthly: ConvictionPeriodForecast | null, asOfDate: string) {
  if (!monthly) return { label: "月度阶段待补", note: "没有可追溯的整月卦，暂不推测月内阶段。", progressPct: null };
  const start = Date.parse(`${monthly.periodStart}T00:00:00Z`);
  const end = Date.parse(`${monthly.periodEnd}T00:00:00Z`);
  const now = Date.parse(`${asOfDate}T00:00:00Z`);
  if (![start, end, now].every(Number.isFinite) || end <= start) return { label: "月度阶段待核对", note: monthly.expectedPath, progressPct: null };
  const progressPct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
  const label = progressPct < 34 ? "月度路线前段" : progressPct < 67 ? "月度路线中段" : "月度路线后段";
  const day = monthly.dailyPath?.find((item) => item.date === asOfDate);
  return {
    label,
    note: day ? `${day.direction}｜${day.summary}` : `按日期位于整月路线约 ${progressPct}% 处；具体强弱以周卦与真实K线确认。`,
    progressPct,
  };
}

function futureShape(
  weekly: ConvictionPeriodForecast | null,
  monthly: ConvictionPeriodForecast | null,
  asOfDate: string,
): Pick<MemberStockPickResearchRow, "forecastShapeBasis" | "forecastPath"> {
  const source = weekly ?? monthly;
  if (!source) return { forecastShapeBasis: "MISSING", forecastPath: [] };
  const explicit = (source.dailyPath ?? [])
    .filter((day) => day.date >= asOfDate)
    .map((day) => ({ date: day.date, direction: day.direction, summary: day.summary }));
  if (explicit.length) return { forecastShapeBasis: "DAILY_PATH", forecastPath: explicit };
  const start = Date.parse(`${asOfDate}T00:00:00Z`);
  const maxEnd = Math.min(Date.parse(`${source.periodEnd}T00:00:00Z`), start + 6 * DAY_MS);
  if (!Number.isFinite(start) || !Number.isFinite(maxEnd)) return { forecastShapeBasis: "MISSING", forecastPath: [] };
  const points: MemberStockPickResearchRow["forecastPath"] = [];
  for (let cursor = start; cursor <= maxEnd; cursor += DAY_MS) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    const weekday = new Date(cursor).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    points.push({ date, direction: source.direction, summary: source.expectedPath });
  }
  return { forecastShapeBasis: weekly ? "WEEK_DIRECTION" : "MONTH_DIRECTION", forecastPath: points };
}

export function buildMemberStockPickResearchRows(input: {
  cards: ConvictionPublicCard[];
  asOfDate: string;
  nowMs: number;
}): MemberStockPickResearchRow[] {
  const cardMap = new Map(input.cards.map((card) => [card.slug, card]));
  return WATCHLIST_TEASERS
    .filter((teaser) => teaser.assetType === "STOCK" && cardMap.has(teaser.slug))
    .sort((left, right) => left.priority - right.priority)
    .map((teaser) => {
      const card = cardMap.get(teaser.slug)!;
      const staticId = STATIC_IDS.has(teaser.slug) ? teaser.slug as StaticFocusAssetId : null;
      const forecasts = staticId ? listStaticFocusForecasts(staticId).filter((row) => isFormal(row, input.nowMs)) : [];
      const monthlyForecast = currentOrNext(forecasts.filter((row) => row.forecastType === "MONTH_1"), input.asOfDate);
      const weeklyForecast = currentOrNext(forecasts.filter((row) => row.forecastType.startsWith("WEEK")), input.asOfDate);
      const dossier = staticId ? buildFocusDetailedReport({ assetId: staticId, forecasts, asOfDate: input.asOfDate, nowMs: input.nowMs }) : null;
      const todayOrNext = dossier?.qimenParallel.dailyRows.find((row) => row.date >= input.asOfDate && row.state !== "OCCURRED");
      const dailyMethods = todayOrNext ? [{
        date: todayOrNext.date,
        state: todayOrNext.state,
        derivedDirection: todayOrNext.rhythmDirection ?? todayOrNext.liuyaoDirection,
        derivedSummary: todayOrNext.rhythmSummary ?? todayOrNext.liuyaoSummary,
        qimenDirection: todayOrNext.qimen.available ? todayOrNext.qimen.direction : null,
        qimenSummary: todayOrNext.qimen.available ? todayOrNext.qimen.mysticNote : todayOrNext.qimen.evidence,
        relation: todayOrNext.relation,
        relationLabel: todayOrNext.relationLabel,
      }] : [];
      const shape = futureShape(weeklyForecast, monthlyForecast, input.asOfDate);
      return {
        slug: card.slug,
        nameZh: card.nameZh,
        nameEn: card.nameEn,
        symbol: card.symbol,
        detailHref: card.detailHref,
        rating: card.rating,
        riskLevel: card.riskLevel,
        monthly: periodView(monthlyForecast, "整月卦尚未发布；不使用周卦反推月方向。", "MONTH"),
        weekly: periodView(weeklyForecast, "本周同周期六爻尚未发布；只能显示月度背景，不能冒充周判断。", "WEEK"),
        currentStage: stageView(monthlyForecast, input.asOfDate),
        dailyMethods,
        technicalKey: `FOCUS:${card.slug.toUpperCase()}`,
        ...shape,
        dataCompleteness: monthlyForecast && weeklyForecast && !isHigherHorizonDerived(weeklyForecast) ? "READY" : monthlyForecast || weeklyForecast ? "PARTIAL" : "MISSING",
      };
    });
}
