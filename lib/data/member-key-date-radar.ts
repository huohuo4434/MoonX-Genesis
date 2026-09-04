import { getSexagenaryDay } from "@/lib/calendar/sexagenary-calendar";
import { isRetiredPredictionSymbol, PREDICTION_SCOPE_EFFECTIVE_DATE } from "@/lib/prediction-scope";
import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import {
  STATIC_FOCUS_ASSET_IDS,
  STATIC_MEMBER_AUTOMATION_FOCUS,
} from "@/lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "@/lib/data/conviction/focus-static-forecast-registry";
import {
  SUPPLEMENTAL_KEY_DATE_ASSETS,
  SUPPLEMENTAL_KEY_DATE_ASSET_IDS,
  listMonthlyLiuyaoForecasts20260829,
  type SupplementalKeyDateAssetId,
} from "@/lib/data/conviction/us-megacap-liuyao-20260829";
import type { KeyDateAction, KeyDateLevel, KeyDateRadarItem } from "@/lib/data/key-date-radar-core";
import { applyResearchConsensusOverlays20260830 } from "@/lib/data/research-consensus-20260830";

const DAY_MS = 86_400_000;
const BRANCH_PATTERN = /[财官兄弟子孙父母世应][^，。；]{0,5}([子丑寅卯辰巳午未申酉戌亥])/g;

const ACTIVE_SUPPLEMENTAL_KEY_DATE_ASSET_IDS = SUPPLEMENTAL_KEY_DATE_ASSET_IDS.filter(
  (assetId) => !STATIC_FOCUS_ASSET_IDS.includes(assetId as (typeof STATIC_FOCUS_ASSET_IDS)[number]),
);

export const MEMBER_KEY_DATE_ASSET_IDS = Object.freeze([
  ...STATIC_FOCUS_ASSET_IDS,
  ...ACTIVE_SUPPLEMENTAL_KEY_DATE_ASSET_IDS,
] as const);
export type MemberKeyDateAssetId = (typeof MEMBER_KEY_DATE_ASSET_IDS)[number];

const SUPPLEMENTAL_KEY_DATE_ASSET_SET = new Set<string>(ACTIVE_SUPPLEMENTAL_KEY_DATE_ASSET_IDS);

function isSupplementalKeyDateAssetId(assetId: MemberKeyDateAssetId): assetId is SupplementalKeyDateAssetId {
  return SUPPLEMENTAL_KEY_DATE_ASSET_SET.has(assetId);
}

function keyDateAsset(assetId: MemberKeyDateAssetId) {
  return isSupplementalKeyDateAssetId(assetId)
    ? SUPPLEMENTAL_KEY_DATE_ASSETS[assetId]
    : STATIC_MEMBER_AUTOMATION_FOCUS[assetId];
}

function listKeyDateForecasts(assetId: MemberKeyDateAssetId) {
  return isSupplementalKeyDateAssetId(assetId)
    ? listMonthlyLiuyaoForecasts20260829(assetId)
    : listStaticFocusForecasts(assetId);
}

type LockedPathDateHint = {
  date: string;
  action: KeyDateAction;
  title: string;
  note: string;
};

// These dates are not new daily hexagrams. They are explicit boundaries already
// written into the locked path text and are normalized here for the radar.
const LOCKED_PATH_DATE_HINTS: Partial<Record<string, LockedPathDateHint[]>> = {
  "CXMT-M1-20260901-V4": [
    { date: "2026-09-14", action: "TURNING_RISK", title: "波动放大阶段开始", note: "锁定路径写明9月14日起进入两次先压后修、波动放大阶段。" },
    { date: "2026-09-28", action: "TOP_EXIT_WATCH", title: "月底阶段兑现观察", note: "锁定路径写明9月28日起反抽受阻并进入阶段兑现。" },
  ],
  "LITE-YOU-20260823-V2": [
    { date: "2026-09-14", action: "TOP_EXIT_WATCH", title: "阶段退守起点观察", note: "锁定路径把9月14日至20日列为阶段退守窗口。" },
    { date: "2026-09-21", action: "BOTTOM_WATCH", title: "受限修复起点观察", note: "锁定路径把9月21日至27日列为受限修复窗口。" },
  ],
  "SPCX-YOU-20260823-V3": [
    { date: "2026-09-21", action: "TOP_EXIT_WATCH", title: "冲高分化起点观察", note: "锁定路径写明9月21日起边冲高边分化，随后进入筑顶/回吐阶段。" },
  ],
  "INTC-SEP-20260824-V2": [
    { date: "2026-09-07", action: "BOTTOM_WATCH", title: "回踩后修复窗口开启", note: "锁定路径把9月7日至20日列为震荡抬高窗口。" },
    { date: "2026-09-21", action: "TOP_EXIT_WATCH", title: "下旬转弱起点观察", note: "锁定路径明确写明9月21日起转弱。" },
  ],
  "FOCUS-MONTHLY-GOLD-202609-V2": [
    { date: "2026-09-07", action: "TOP_EXIT_WATCH", title: "高位试高转温和回调", note: "锁定路径明确以9月7日作为高位试高向温和回调的切换点。" },
  ],
  "FOCUS-MONTHLY-SILVER-202609-V1": [
    { date: "2026-09-14", action: "TURNING_RISK", title: "突破转分歧交接观察", note: "锁定路径把9月14日至20日列为突破转分歧的交接阶段。" },
    { date: "2026-09-21", action: "TOP_EXIT_WATCH", title: "回吐风险升高起点", note: "锁定路径明确写明9月21日以后重心转弱并重点防回吐。" },
  ],
  "FOCUS-MONTHLY-WTI-CRUDE-202609-V2": [
    { date: "2026-09-07", action: "BOTTOM_WATCH", title: "承压转强反弹观察", note: "锁定路径写明9月1日至6日先承压，9月7日起进入主要反弹窗口。" },
    { date: "2026-09-13", action: "TOP_EXIT_WATCH", title: "上冲过热窗口末端", note: "锁定路径把9月7日至13日列为主要上冲与过热窗口。" },
    { date: "2026-09-21", action: "TOP_EXIT_WATCH", title: "回落风险重新升高", note: "锁定路径明确写明9月21日后重心重新转弱或收敛。" },
  ],
};

function utc(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function dateKey(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  return dateKey(utc(date) + days * DAY_MS);
}

function durationDays(row: ConvictionPeriodForecast) {
  return Math.round((utc(row.periodEnd) - utc(row.periodStart)) / DAY_MS) + 1;
}

function hasUsableTradingDate(row: ConvictionPeriodForecast, assetId: MemberKeyDateAssetId, asOfDate: string) {
  if (keyDateAsset(assetId).assetClass === "CRYPTO") return true;
  for (let time = utc(row.periodStart > asOfDate ? row.periodStart : asOfDate); time <= utc(row.periodEnd); time += DAY_MS) {
    if (!isWeekend(dateKey(time))) return true;
  }
  return false;
}

function selectPeriod(rows: ConvictionPeriodForecast[], level: KeyDateLevel, asOfDate: string, assetId: MemberKeyDateAssetId) {
  const target = addDays(asOfDate, level === "MONTH" ? 7 : 2);
  let valid = rows.filter((row) => {
    const duration = durationDays(row);
    return row.status === "published"
      && Date.parse(row.lockedAt) <= Date.parse(`${asOfDate}T23:59:59.999+08:00`)
      && row.periodEnd >= asOfDate
      && (level === "MONTH"
        ? row.forecastType.startsWith("MONTH") && duration >= 20
        : row.forecastType.startsWith("WEEK") && duration <= 14 && hasUsableTradingDate(row, assetId, asOfDate));
  });
  if (level === "MONTH" && valid.length === 0) {
    valid = rows.filter((row) =>
      row.status === "published"
      && Date.parse(row.lockedAt) <= Date.parse(`${asOfDate}T23:59:59.999+08:00`)
      && row.periodEnd >= asOfDate
      && (row.keyDates ?? []).some((item) => Boolean(item.date) && item.date! >= asOfDate)
      && /月卦/.test(`${row.summary}${row.expectedPath}${row.ichingEvidence.notes}${row.methodViews?.map((item) => item.label).join("") ?? ""}`)
    );
  }
  return valid.sort((left, right) => {
    const targetMonth = target.slice(0, 7);
    const leftStartsInTargetMonth = left.periodStart.slice(0, 7) === targetMonth ? 1 : 0;
    const rightStartsInTargetMonth = right.periodStart.slice(0, 7) === targetMonth ? 1 : 0;
    const leftCovers = left.periodStart <= target && left.periodEnd >= target ? 1 : 0;
    const rightCovers = right.periodStart <= target && right.periodEnd >= target ? 1 : 0;
    const ideal = level === "MONTH" ? 30 : 7;
    const leftExplicit = (left.keyDates ?? []).some((item) => Boolean(item.date) && item.date! >= asOfDate) ? 1 : 0;
    const rightExplicit = (right.keyDates ?? []).some((item) => Boolean(item.date) && item.date! >= asOfDate) ? 1 : 0;
    return rightStartsInTargetMonth - leftStartsInTargetMonth
      || rightCovers - leftCovers
      || rightExplicit - leftExplicit
      || Math.abs(durationDays(left) - ideal) - Math.abs(durationDays(right) - ideal)
      || right.version - left.version
      || right.publishedAt.localeCompare(left.publishedAt)
      || right.id.localeCompare(left.id);
  })[0] ?? null;
}

function actionForDirection(row: ConvictionPeriodForecast, level: KeyDateLevel, focusDate: string, structuralTurnPending: boolean): KeyDateAction {
  if (!structuralTurnPending) return "TURNING_RISK";
  if (durationDays(row) > 45) return "TURNING_RISK";
  if (level === "MONTH" && row.periodStart.slice(0, 7) !== focusDate.slice(0, 7)) return "TURNING_RISK";
  if (level === "WEEK" && row.forecastType.startsWith("MONTH")) return "TURNING_RISK";
  const direction = row.direction;
  if (/先涨后跌|冲高回落/.test(direction)) return "TOP_EXIT_WATCH";
  if (/先跌后涨|探底回升/.test(direction)) return "BOTTOM_WATCH";
  return "TURNING_RISK";
}

function derivedTitle(direction: string, action: KeyDateAction, structuralTurnPending: boolean) {
  if (!structuralTurnPending) return "周期收尾与新周期切换观察日";
  if (action === "TURNING_RISK" && /先涨后跌|冲高回落|先跌后涨|探底回升/.test(direction)) {
    return `${direction}的阶段节奏观察日`;
  }
  if (/先涨后跌|冲高回落/.test(direction)) return `${direction}的高位转折观察日`;
  if (/先跌后涨|探底回升/.test(direction)) return `${direction}的低位转折观察日`;
  if (/上涨/.test(direction)) return `${direction}延续与转折观察日`;
  if (/下跌/.test(direction)) return `${direction}延续与转折观察日`;
  return `${direction}的结构确认观察日`;
}

function actionForExplicitType(type: NonNullable<ConvictionPeriodForecast["keyDates"]>[number]["type"]): KeyDateAction {
  if (type === "阶段高点" || type === "下跌风险") return "TOP_EXIT_WATCH";
  if (type === "阶段低点" || type === "上涨候选") return "BOTTOM_WATCH";
  return "TURNING_RISK";
}

function turnRatio(direction: string) {
  if (/先涨后跌|冲高回落/.test(direction)) return 0.55;
  if (/先跌后涨|探底回升/.test(direction)) return 0.4;
  if (/上涨|下跌/.test(direction)) return 0.65;
  return 0.5;
}

function referencedBranches(row: ConvictionPeriodForecast) {
  const evidence = `${row.summary}；${row.expectedPath}；${row.ichingEvidence.notes}`;
  const branches = new Set<string>();
  for (const match of evidence.matchAll(BRANCH_PATTERN)) if (match[1]) branches.add(match[1]);
  return branches;
}

function isWeekend(date: string) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
}

function normalizeTradingDate(date: string, row: ConvictionPeriodForecast, assetId: MemberKeyDateAssetId, asOfDate: string) {
  if (keyDateAsset(assetId).assetClass === "CRYPTO") return date;
  let candidate = date;
  for (let index = 0; index < 3 && isWeekend(candidate); index += 1) {
    const previous = addDays(candidate, -1);
    candidate = previous >= row.periodStart && previous >= asOfDate ? previous : addDays(candidate, 1);
  }
  return candidate <= row.periodEnd ? candidate : row.periodEnd;
}

function derivedFocus(row: ConvictionPeriodForecast, assetId: MemberKeyDateAssetId, asOfDate: string, level: KeyDateLevel) {
  const monthlyWeekFallback = level === "WEEK" && row.forecastType.startsWith("MONTH");
  const target = addDays(asOfDate, level === "MONTH" ? 7 : 2);
  const targetMonthStart = `${target.slice(0, 7)}-01`;
  const nextMonthStart = addDays(`${target.slice(0, 7)}-28`, 4).slice(0, 7) + "-01";
  const targetMonthEnd = addDays(nextMonthStart, -1);
  const requestedStart = monthlyWeekFallback ? addDays(asOfDate, 2) : row.periodStart;
  const sliceStart = level === "MONTH"
    ? (row.periodStart > targetMonthStart ? row.periodStart : targetMonthStart)
    : requestedStart;
  const naturalEnd = level === "MONTH" ? targetMonthEnd : monthlyWeekFallback ? addDays(sliceStart, 6) : row.periodEnd;
  const sliceEnd = row.periodEnd < naturalEnd ? row.periodEnd : naturalEnd;
  const span = Math.max(0, Math.round((utc(sliceEnd) - utc(sliceStart)) / DAY_MS));
  const raw = addDays(sliceStart, Math.round(span * turnRatio(row.direction)));
  const structuralTurnPending = raw >= asOfDate;
  const branches = referencedBranches(row);
  let selected = structuralTurnPending ? raw : sliceEnd;
  let matchedBranch: string | null = null;
  if (branches.size) {
    const candidates = Array.from({ length: 9 }, (_, index) => addDays(raw, index - 4))
      .filter((date) => date >= sliceStart && date >= asOfDate && date <= sliceEnd && date <= row.periodEnd)
      .sort((left, right) => Math.abs(utc(left) - utc(raw)) - Math.abs(utc(right) - utc(raw)));
    const branchDate = candidates.find((date) => branches.has(getSexagenaryDay(date).branch));
    if (branchDate) {
      selected = branchDate;
      matchedBranch = getSexagenaryDay(branchDate).branch;
    }
  }
  selected = normalizeTradingDate(selected, row, assetId, asOfDate);
  if (matchedBranch && getSexagenaryDay(selected).branch !== matchedBranch) matchedBranch = null;
  return {
    date: selected,
    structuralTurnPending,
    derivation: matchedBranch
      ? `按${row.direction}的结构转折位置取中心，并在前后4日内用原记录提及的${matchedBranch}支日校准。`
      : `按${row.direction}的结构转折位置取中心；${getSexagenaryDay(selected).label}只作历法标记，不冒充原卦明确点名。`,
  };
}

function buildItem(input: {
  assetId: MemberKeyDateAssetId;
  level: KeyDateLevel;
  row: ConvictionPeriodForecast;
  date: string;
  action: KeyDateAction;
  title: string;
  evidence: "EXPLICIT" | "DERIVED";
  derivation: string;
  sourceDateType?: KeyDateRadarItem["sourceDateType"];
  sourceDateNote?: string;
}): KeyDateRadarItem {
  const asset = keyDateAsset(input.assetId);
  const duration = durationDays(input.row);
  const sourceLabel = input.level === "WEEK" && input.row.forecastType.startsWith("MONTH")
    ? "月卦当周推演方向"
    : input.level === "MONTH" && duration > 45
      ? "多月卦阶段方向"
      : input.level === "MONTH" && input.row.forecastType.startsWith("WEEK")
        ? "专项跨月记录方向"
        : input.level === "MONTH"
          ? "月卦正式方向"
          : "周卦正式方向";
  return {
    id: `${input.assetId}-${input.level.toLowerCase()}-${input.date}-${input.evidence.toLowerCase()}`,
    assetId: input.assetId,
    assetName: asset.displayName,
    symbol: asset.canonicalSymbol?.replace(/USDT$/, "") ?? input.assetId.toUpperCase(),
    startDate: input.date,
    endDate: input.date,
    focusDate: input.date,
    ganzhi: getSexagenaryDay(input.date).label,
    level: input.level,
    action: input.action,
    sourceDateType: input.sourceDateType,
    sourceDateNote: input.sourceDateNote,
    title: input.title,
    primaryView: `${sourceLabel}（${input.row.periodStart}至${input.row.periodEnd}）：${input.row.direction}。${input.row.summary}`,
    weeklyAssist: input.row.expectedPath,
    confirmation: (input.row.confirmationLevel?.trim().length ?? 0) >= 15
      ? input.row.confirmationLevel!.trim()
      : "到日后等待日线或4H停止原方向扩张，并由30分钟结构和量价关系确认转折。",
    invalidation: (input.row.invalidationLevel?.trim().length ?? 0) >= 15
      ? input.row.invalidationLevel!.trim()
      : "日期到达但价格结构没有转折，或仍沿原方向放量扩张时，本次关键日失效，不机械交易。",
    confidence: input.evidence === "EXPLICIT" ? 68 : 52,
    evidence: input.evidence,
    derivation: input.derivation,
    sourceIds: [input.row.id],
    methodViews: input.row.methodViews?.map((view) => ({
      id: view.id,
      label: view.label,
      direction: view.direction,
      summary: view.summary,
    })),
    finalSynthesis: input.row.consensusLabel ?? undefined,
  };
}

function itemsForPeriod(assetId: MemberKeyDateAssetId, level: KeyDateLevel, asOfDate: string) {
  if (level === "WEEK" && asOfDate >= PREDICTION_SCOPE_EFFECTIVE_DATE && isRetiredPredictionSymbol(keyDateAsset(assetId).canonicalSymbol ?? assetId)) return [];
  const forecasts = listKeyDateForecasts(assetId);
  const row = selectPeriod(forecasts, level, asOfDate, assetId)
    ?? (level === "WEEK" ? selectPeriod(forecasts, "MONTH", asOfDate, assetId) : null);
  if (!row) return [];
  const explicit = (row.keyDates ?? []).filter((item) =>
    Boolean(item.date) && item.date! >= asOfDate && item.date! >= row.periodStart && item.date! <= row.periodEnd
  );
  if (explicit.length) {
    return explicit.map((item) => buildItem({
      assetId,
      level,
      row,
      date: item.date!,
      action: actionForExplicitType(item.type),
      sourceDateType: item.type,
      sourceDateNote: item.note ?? undefined,
      title: item.label,
      evidence: "EXPLICIT",
      derivation: `${level === "MONTH" ? "月卦" : "周卦"}锁定记录明确点名${item.date}；${item.note ?? "仍须由真实K线确认。"}`,
    }));
  }
  const pathHints = level === "MONTH"
    ? (LOCKED_PATH_DATE_HINTS[row.id] ?? []).filter((item) => item.date >= asOfDate && item.date >= row.periodStart && item.date <= row.periodEnd)
    : [];
  if (pathHints.length) {
    return pathHints.map((hint) => buildItem({
      assetId,
      level,
      row,
      date: hint.date,
      action: hint.action,
      sourceDateType: hint.action === "BOTTOM_WATCH" ? "上涨候选" : hint.action === "TOP_EXIT_WATCH" ? "下跌风险" : "转折",
      title: hint.title,
      evidence: "DERIVED",
      derivation: `${hint.note} 该日期直接整理自已锁定路径文字，不是新增日卦，仍须由真实K线确认。`,
    }));
  }
  const derived = derivedFocus(row, assetId, asOfDate, level);
  const action = actionForDirection(row, level, derived.date, derived.structuralTurnPending);
  const crossMonthResidual = level === "MONTH" && row.periodStart.slice(0, 7) !== derived.date.slice(0, 7);
  return [buildItem({
    assetId,
    level,
    row,
    date: derived.date,
    action,
    title: derivedTitle(row.direction, action, derived.structuralTurnPending),
    evidence: "DERIVED",
    derivation: level === "WEEK" && row.forecastType.startsWith("MONTH")
      ? `下一独立周卦尚未覆盖，先按已锁定月卦的当周段推演；${derived.derivation}`
      : crossMonthResidual
        ? `当前目标月没有独立整月记录，只展示既有跨月锁定记录的剩余有效窗；${derived.derivation}`
        : derived.derivation,
  })];
}

export function buildMemberKeyDateRadar(asOfDate: string): KeyDateRadarItem[] {
  const formalItems = MEMBER_KEY_DATE_ASSET_IDS.flatMap((assetId) => [
    ...itemsForPeriod(assetId, "MONTH", asOfDate),
    ...itemsForPeriod(assetId, "WEEK", asOfDate),
  ]);
  return applyResearchConsensusOverlays20260830(formalItems);
}

export function memberKeyDateCoverage(asOfDate: string) {
  const rows = buildMemberKeyDateRadar(asOfDate);
  return MEMBER_KEY_DATE_ASSET_IDS.map((assetId) => ({
    assetId,
    month: rows.some((row) => row.assetId === assetId && row.level === "MONTH"),
    week: rows.some((row) => row.assetId === assetId && row.level === "WEEK"),
  }));
}
