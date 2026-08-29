import { getSexagenaryDay } from "@/lib/calendar/sexagenary-calendar";
import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import {
  STATIC_FOCUS_ASSET_IDS,
  STATIC_MEMBER_AUTOMATION_FOCUS,
  type StaticFocusAssetId,
} from "@/lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "@/lib/data/conviction/focus-static-forecast-registry";
import type { KeyDateAction, KeyDateLevel, KeyDateRadarItem } from "@/lib/data/key-date-radar-core";

const DAY_MS = 86_400_000;
const BRANCH_PATTERN = /[财官兄弟子孙父母世应][^，。；]{0,5}([子丑寅卯辰巳午未申酉戌亥])/g;

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

function hasUsableTradingDate(row: ConvictionPeriodForecast, assetId: StaticFocusAssetId, asOfDate: string) {
  if (STATIC_MEMBER_AUTOMATION_FOCUS[assetId].assetClass === "CRYPTO") return true;
  for (let time = utc(row.periodStart > asOfDate ? row.periodStart : asOfDate); time <= utc(row.periodEnd); time += DAY_MS) {
    if (!isWeekend(dateKey(time))) return true;
  }
  return false;
}

function selectPeriod(rows: ConvictionPeriodForecast[], level: KeyDateLevel, asOfDate: string, assetId: StaticFocusAssetId) {
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
    const leftCovers = left.periodStart <= target && left.periodEnd >= target ? 1 : 0;
    const rightCovers = right.periodStart <= target && right.periodEnd >= target ? 1 : 0;
    const ideal = level === "MONTH" ? 30 : 7;
    const leftExplicit = (left.keyDates ?? []).some((item) => Boolean(item.date) && item.date! >= asOfDate) ? 1 : 0;
    const rightExplicit = (right.keyDates ?? []).some((item) => Boolean(item.date) && item.date! >= asOfDate) ? 1 : 0;
    return rightExplicit - leftExplicit
      || rightCovers - leftCovers
      || Math.abs(durationDays(left) - ideal) - Math.abs(durationDays(right) - ideal)
      || right.version - left.version
      || right.publishedAt.localeCompare(left.publishedAt)
      || right.id.localeCompare(left.id);
  })[0] ?? null;
}

function actionForDirection(direction: string): KeyDateAction {
  if (/先涨后跌|冲高回落/.test(direction)) return "TOP_EXIT_WATCH";
  if (/先跌后涨|探底回升/.test(direction)) return "BOTTOM_WATCH";
  if (/下跌/.test(direction)) return "BOTTOM_WATCH";
  if (/上涨/.test(direction)) return "TOP_EXIT_WATCH";
  return "TURNING_RISK";
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

function normalizeTradingDate(date: string, row: ConvictionPeriodForecast, assetId: StaticFocusAssetId, asOfDate: string) {
  if (STATIC_MEMBER_AUTOMATION_FOCUS[assetId].assetClass === "CRYPTO") return date;
  let candidate = date;
  for (let index = 0; index < 3 && isWeekend(candidate); index += 1) {
    const previous = addDays(candidate, -1);
    candidate = previous >= row.periodStart && previous >= asOfDate ? previous : addDays(candidate, 1);
  }
  return candidate <= row.periodEnd ? candidate : row.periodEnd;
}

function derivedFocus(row: ConvictionPeriodForecast, assetId: StaticFocusAssetId, asOfDate: string, level: KeyDateLevel) {
  const monthlyWeekFallback = level === "WEEK" && row.forecastType.startsWith("MONTH");
  const requestedStart = monthlyWeekFallback ? addDays(asOfDate, 2) : asOfDate;
  const usableStart = row.periodStart > requestedStart ? row.periodStart : requestedStart;
  const fullSpan = Math.max(0, Math.round((utc(row.periodEnd) - utc(usableStart)) / DAY_MS));
  const span = level === "MONTH" ? Math.min(fullSpan, 29) : monthlyWeekFallback ? Math.min(fullSpan, 6) : fullSpan;
  const sliceEnd = addDays(usableStart, span);
  const raw = addDays(usableStart, Math.round(span * turnRatio(row.direction)));
  const branches = referencedBranches(row);
  let selected = raw;
  let matchedBranch: string | null = null;
  if (branches.size) {
    const candidates = Array.from({ length: 9 }, (_, index) => addDays(raw, index - 4))
      .filter((date) => date >= usableStart && date <= sliceEnd && date <= row.periodEnd)
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
    derivation: matchedBranch
      ? `按${row.direction}的结构转折位置取中心，并在前后4日内用原记录提及的${matchedBranch}支日校准。`
      : `按${row.direction}的结构转折位置取中心；${getSexagenaryDay(selected).label}只作历法标记，不冒充原卦明确点名。`,
  };
}

function buildItem(input: {
  assetId: StaticFocusAssetId;
  level: KeyDateLevel;
  row: ConvictionPeriodForecast;
  date: string;
  action: KeyDateAction;
  title: string;
  evidence: "EXPLICIT" | "DERIVED";
  derivation: string;
}): KeyDateRadarItem {
  const asset = STATIC_MEMBER_AUTOMATION_FOCUS[input.assetId];
  const sourceLabel = input.level === "MONTH" ? "月卦" : "周卦";
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
    title: input.title,
    primaryView: `${sourceLabel}正式方向：${input.row.direction}。${input.row.summary}`,
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
  };
}

function itemsForPeriod(assetId: StaticFocusAssetId, level: KeyDateLevel, asOfDate: string) {
  const forecasts = listStaticFocusForecasts(assetId);
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
      title: item.label,
      evidence: "EXPLICIT",
      derivation: `${level === "MONTH" ? "月卦" : "周卦"}锁定记录明确点名${item.date}；${item.note ?? "仍须由真实K线确认。"}`,
    }));
  }
  const derived = derivedFocus(row, assetId, asOfDate, level);
  return [buildItem({
    assetId,
    level,
    row,
    date: derived.date,
    action: actionForDirection(row.direction),
    title: `${row.direction}的转折确认日`,
    evidence: "DERIVED",
    derivation: level === "WEEK" && row.forecastType.startsWith("MONTH")
      ? `下一独立周卦尚未覆盖，先按已锁定月卦的当周段推演；${derived.derivation}`
      : derived.derivation,
  })];
}

export function buildMemberKeyDateRadar(asOfDate: string): KeyDateRadarItem[] {
  return STATIC_FOCUS_ASSET_IDS.flatMap((assetId) => [
    ...itemsForPeriod(assetId, "MONTH", asOfDate),
    ...itemsForPeriod(assetId, "WEEK", asOfDate),
  ]);
}

export function memberKeyDateCoverage(asOfDate: string) {
  const rows = buildMemberKeyDateRadar(asOfDate);
  return STATIC_FOCUS_ASSET_IDS.map((assetId) => ({
    assetId,
    month: rows.some((row) => row.assetId === assetId && row.level === "MONTH"),
    week: rows.some((row) => row.assetId === assetId && row.level === "WEEK"),
  }));
}
