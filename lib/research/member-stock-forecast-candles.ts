import type { ChanCandle } from "@/types/chan-execution";
import type { MemberStockPathSnapshot, MemberStockPickResearchRow } from "@/types/member-stock-picks-dashboard";

const DAY_MS = 86_400_000;

export type MemberStockForecastCandle = {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  direction: string;
  basis: "WEEK" | "MONTH";
  keyDay: boolean;
  keyLabel: string | null;
};

export type MemberStockForecastProjection = {
  candles: MemberStockForecastCandle[];
  atr14: number;
  projectedLow: number | null;
  projectedHigh: number | null;
  basisLabel: string;
  evidenceLevel: "HIGH" | "MEDIUM" | "LOW";
};

function roundPrice(value: number): number {
  const digits = Math.abs(value) < 20 ? 3 : 2;
  return Number(value.toFixed(digits));
}

function isoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function dateMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function nextTradingDate(date: string): string {
  let cursor = dateMs(date) + DAY_MS;
  while ([0, 6].includes(new Date(cursor).getUTCDay())) cursor += DAY_MS;
  return isoDate(cursor);
}

function tradingDates(startDate: string, endDate: string, limit = 30): string[] {
  const output: string[] = [];
  const start = dateMs(startDate);
  const end = dateMs(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return output;
  for (let cursor = start; cursor <= end && output.length < limit; cursor += DAY_MS) {
    const weekday = new Date(cursor).getUTCDay();
    if (weekday !== 0 && weekday !== 6) output.push(isoDate(cursor));
  }
  return output;
}

export function memberStockAtr(candles: ChanCandle[], lookback = 14): number {
  const valid = candles.filter((row) => row.open > 0 && row.high >= row.low && row.low > 0 && row.close > 0).slice(-Math.max(2, lookback + 1));
  if (valid.length < 2) return valid.at(-1)?.close ? valid.at(-1)!.close * 0.025 : 0;
  const ranges = valid.slice(1).map((row, index) => {
    const previousClose = valid[index]!.close;
    return Math.max(row.high - row.low, Math.abs(row.high - previousClose), Math.abs(row.low - previousClose));
  });
  return ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
}

function directionSign(direction: string): -1 | 0 | 1 {
  if (/先跌后涨|上涨|震荡上涨|回升|反弹|修复|转强|冲高/u.test(direction)) return 1;
  if (/先涨后跌|下跌|震荡下跌|回落|转弱|探底/u.test(direction)) return -1;
  return 0;
}

function directionImpulse(direction: string, progress: number, index: number): number {
  if (/先跌后涨/u.test(direction)) return progress < 0.42 ? -0.48 : 0.62;
  if (/先涨后跌/u.test(direction)) return progress < 0.42 ? 0.48 : -0.62;
  if (/震荡上涨/u.test(direction)) return [-0.16, 0.42, 0.25, -0.08, 0.5][index % 5]!;
  if (/震荡下跌/u.test(direction)) return [0.16, -0.42, -0.25, 0.08, -0.5][index % 5]!;
  if (/上涨|回升|反弹|修复|转强|冲高/u.test(direction)) return [0.32, 0.5, 0.38, 0.16][index % 4]!;
  if (/下跌|回落|转弱|探底/u.test(direction)) return [-0.32, -0.5, -0.38, -0.16][index % 4]!;
  return index % 2 === 0 ? 0.16 : -0.16;
}

function compactLabel(value: string): string {
  return value
    .replace(/该路径来自.*$/u, "")
    .replace(/不冒充.*$/u, "")
    .replace(/[。；].*$/u, "")
    .trim()
    .slice(0, 18);
}

function directionFromKeyLabel(label: string | null, fallback: string): string {
  if (!label) return fallback;
  if (/转弱|走弱|回落|下跌|杀跌|砸坑|决堤|回吐/u.test(label)) return "震荡下跌";
  if (/转强|上涨|加速|推进|突破|冲高|冲顶|聚集|修复/u.test(label)) return "震荡上涨";
  if (/高位区|高位换手|震荡|休市|消化|沉淀/u.test(label)) return "震荡";
  return fallback;
}

function extractKeyDates(text: string | null, periodStart: string | null): Map<string, string> {
  const output = new Map<string, string>();
  if (!text || !periodStart) return output;
  const [yearText, monthText] = periodStart.split("-");
  const year = Number(yearText);
  let month = Number(monthText);
  let previousDay: number | null = null;
  for (const segment of text.split(/→|；|。/u).map((value) => value.trim()).filter(Boolean)) {
    const regex = /(?:(\d{1,2})月)?(\d{1,2})(?:日|号)/gu;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(segment))) {
      const explicitMonth = match[1] ? Number(match[1]) : null;
      const day = Number(match[2]);
      if (explicitMonth) month = explicitMonth;
      else if (previousDay != null && day + 15 < previousDay) month = month === 12 ? 1 : month + 1;
      previousDay = day;
      if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) continue;
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (Number.isFinite(dateMs(date))) output.set(date, compactLabel(segment));
    }
  }
  return output;
}

function evidenceLevel(row: MemberStockPickResearchRow): MemberStockForecastProjection["evidenceLevel"] {
  if (row.weekly.authority === "INDEPENDENT_PERIOD" && row.weekly.sourcePriority === "TEACHER") return "HIGH";
  if (row.weekly.authority !== "MISSING") return "MEDIUM";
  return "LOW";
}

function technicalScale(direction: string, snapshot: MemberStockPathSnapshot): number {
  const formalSign = directionSign(direction);
  const technicalSign = snapshot.chan4h?.direction === "BULL" ? 1 : snapshot.chan4h?.direction === "BEAR" ? -1 : 0;
  if (!formalSign || !technicalSign) return 0.82;
  return formalSign === technicalSign ? 1.08 : 0.64;
}

function projectionEnd(row: MemberStockPickResearchRow, startDate: string): string {
  const candidates = [row.monthly.periodEnd, row.weekly.periodEnd]
    .filter((value): value is string => Boolean(value && Number.isFinite(dateMs(value!))))
    .sort();
  const requested = candidates.at(-1) ?? isoDate(dateMs(startDate) + 13 * DAY_MS);
  const cap = isoDate(dateMs(startDate) + 45 * DAY_MS);
  return requested > cap ? cap : requested;
}

export function buildMemberStockForecastProjection(input: {
  row: MemberStockPickResearchRow;
  snapshot: MemberStockPathSnapshot;
}): MemberStockForecastProjection {
  const actual = input.snapshot.dailyCandles;
  const latest = actual.at(-1);
  if (!latest) return { candles: [], atr14: 0, projectedLow: null, projectedHigh: null, basisLabel: "真实日K不足，未生成模拟K线。", evidenceLevel: evidenceLevel(input.row) };
  if (!input.row.weekly.direction && !input.row.monthly.direction && !input.row.forecastPath.length) {
    return { candles: [], atr14: roundPrice(memberStockAtr(actual)), projectedLow: null, projectedHigh: null, basisLabel: "月卦和周卦均缺失，未生成未来模拟K线。", evidenceLevel: "LOW" };
  }

  const latestDate = isoDate(latest.timestamp);
  const startDate = nextTradingDate(latestDate);
  const dates = tradingDates(startDate, projectionEnd(input.row, startDate));
  const atr14 = Math.max(memberStockAtr(actual), latest.close * 0.008);
  const explicit = new Map(input.row.forecastPath.map((point) => [point.date, point]));
  const monthlyKeys = extractKeyDates(input.row.monthly.expectedPath, input.row.monthly.periodStart);
  const weeklyKeys = extractKeyDates(input.row.weekly.expectedPath, input.row.weekly.periodStart);
  const keyDates = new Map([...monthlyKeys, ...weeklyKeys]);
  const seed = [...input.row.slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const candles: MemberStockForecastCandle[] = [];
  let previousClose = latest.close;
  let previousDirection: string | null = null;

  dates.forEach((date, index) => {
    const explicitPoint = explicit.get(date);
    const inWeeklyWindow = Boolean(input.row.weekly.periodStart && input.row.weekly.periodEnd && date >= input.row.weekly.periodStart && date <= input.row.weekly.periodEnd);
    const baseDirection = explicitPoint?.direction
      ?? (inWeeklyWindow ? input.row.weekly.direction : null)
      ?? input.row.monthly.direction
      ?? "震荡";
    const basis: MemberStockForecastCandle["basis"] = explicitPoint || inWeeklyWindow ? "WEEK" : "MONTH";
    const sourceKeyLabel = keyDates.get(date) ?? null;
    const direction = directionFromKeyLabel(sourceKeyLabel, baseDirection);
    const directionChanged = previousDirection != null && direction !== previousDirection;
    const keyLabel = sourceKeyLabel ?? (directionChanged ? `${previousDirection} → ${direction}` : null);
    const keyDay = Boolean(keyLabel);
    const progress = dates.length <= 1 ? 1 : index / (dates.length - 1);
    const scale = technicalScale(direction, input.snapshot);
    const micro = Math.sin((index + 1) * 1.73 + seed * 0.11) * 0.075;
    const impulse = (directionImpulse(direction, progress, index) + micro) * scale * (keyDay ? 1.18 : 1);
    const sign = directionSign(direction);
    const openGap = atr14 * (keyDay ? 0.05 : 0.018) * (sign || (index % 2 ? -1 : 1));
    const open = previousClose + openGap;
    const close = Math.max(latest.close * 0.2, open + atr14 * impulse);
    const wick = atr14 * (0.28 + ((seed + index) % 4) * 0.035) * (keyDay ? 1.12 : 1);
    const high = Math.max(open, close) + wick * (close >= open ? 0.62 : 0.42);
    const low = Math.max(0.001, Math.min(open, close) - wick * (close >= open ? 0.42 : 0.62));
    candles.push({
      timestamp: dateMs(date),
      date,
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
      direction,
      basis,
      keyDay,
      keyLabel,
    });
    previousClose = close;
    previousDirection = direction;
  });

  const projectedLow = candles.length ? Math.min(...candles.map((candle) => candle.low)) : null;
  const projectedHigh = candles.length ? Math.max(...candles.map((candle) => candle.high)) : null;
  const basisLabel = input.row.weekly.authority === "INDEPENDENT_PERIOD"
    ? "月卦定整月背景，老师/同周期周卦校正本周方向与关键日；4H缠论和近14日真实波幅约束振幅。"
    : input.row.weekly.authority === "HIGHER_HORIZON_DERIVED"
      ? "月卦定整月背景，本周暂用老师月卦拆分校正关键窗；4H缠论和近14日真实波幅约束振幅。"
      : "仅有月卦背景，缺少同周期周卦；模拟K线降低可信度，并以4H缠论和近14日真实波幅约束振幅。";
  return { candles, atr14: roundPrice(atr14), projectedLow, projectedHigh, basisLabel, evidenceLevel: evidenceLevel(input.row) };
}
