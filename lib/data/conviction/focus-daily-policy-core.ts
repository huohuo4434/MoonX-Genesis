import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";

const DAY_MS = 86_400_000;

export type FocusAuthorityBias = "UP" | "DOWN" | "MIXED";

export function focusAuthorityIsFormal(forecast: ConvictionPeriodForecast, nowMs: number): boolean {
  const publishedAt = Date.parse(forecast.publishedAt);
  const lockedAt = Date.parse(forecast.lockedAt);
  return forecast.status === "published" && Number.isFinite(publishedAt) && Number.isFinite(lockedAt) && publishedAt <= nowMs && lockedAt <= nowMs;
}

function priority(type: ConvictionPeriodForecast["forecastType"]): number {
  if (type.startsWith("WEEK")) return 0;
  if (type === "MONTH_1") return 1;
  if (type === "MONTH_3") return 2;
  if (type === "YEAR_1") return 3;
  if (type === "YEAR_3") return 4;
  if (type === "YEAR_5") return 5;
  if (type === "YEAR_10") return 6;
  return 99;
}

export function selectFocusCurrentAuthority(input: {
  forecasts: readonly ConvictionPeriodForecast[];
  asOfDate: string;
  nowMs: number;
}): ConvictionPeriodForecast | null {
  return input.forecasts
    .filter((forecast) => forecast.forecastType !== "TODAY" && forecast.forecastType !== "TOMORROW")
    .filter((forecast) => focusAuthorityIsFormal(forecast, input.nowMs))
    .filter((forecast) => forecast.periodStart <= input.asOfDate && input.asOfDate <= forecast.periodEnd)
    .sort((left, right) =>
      priority(left.forecastType) - priority(right.forecastType) ||
      right.version - left.version ||
      right.publishedAt.localeCompare(left.publishedAt) ||
      right.id.localeCompare(left.id)
    )[0] ?? null;
}

export function focusAuthorityBias(forecast: Pick<ConvictionPeriodForecast, "direction" | "summary" | "expectedPath">): FocusAuthorityBias {
  const text = `${forecast.direction} ${forecast.summary} ${forecast.expectedPath}`;
  if (/先跌后涨|探底回升|上涨|看涨|偏多|反弹|修复|走强|上行|BULL|LONG/i.test(text)) return "UP";
  if (/先涨后跌|冲高回落|下跌|看跌|偏空|回落|走弱|下行|BEAR|SHORT/i.test(text)) return "DOWN";
  return "MIXED";
}

function parseDate(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) throw new Error(`Invalid focus date: ${value}`);
  return parsed;
}

function dateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function focusAuthorityDisplayWindow(authority: ConvictionPeriodForecast, asOfDate: string): { start: string; end: string } {
  if (authority.forecastType.startsWith("WEEK")) return { start: authority.periodStart, end: authority.periodEnd };
  const start = asOfDate < authority.periodStart ? authority.periodStart : asOfDate;
  const endMs = Math.min(parseDate(authority.periodEnd), parseDate(start) + 6 * DAY_MS);
  return { start, end: dateKey(endMs) };
}

export function focusAuthorityDates(authority: ConvictionPeriodForecast, asOfDate: string): string[] {
  const window = focusAuthorityDisplayWindow(authority, asOfDate);
  const first = parseDate(window.start);
  const last = parseDate(window.end);
  return Array.from({ length: Math.floor((last - first) / DAY_MS) + 1 }, (_, index) => dateKey(first + index * DAY_MS));
}

export function focusAuthorityDerivedStep(authority: ConvictionPeriodForecast, date: string, asOfDate: string): { direction: string; summary: string } {
  const source = authority.dailyPath?.find((day) => day.date === date);
  if (source) return { direction: source.direction, summary: source.summary };

  const dates = focusAuthorityDates(authority, asOfDate);
  const index = Math.max(0, dates.indexOf(date));
  const text = `${authority.direction} ${authority.expectedPath} ${authority.summary}`;
  if (/先跌后涨|探底回升/i.test(text)) {
    const steps = [
      ["回撤观察", "先看回撤承接"], ["探底", "观察低点是否止住"], ["企稳", "低位企稳观察"],
      ["修复", "进入修复窗口"], ["反弹", "修复延续"], ["整固", "反弹后整固"], ["偏强", "等待进一步确认"],
    ] as const;
    const hit = steps[Math.min(index, steps.length - 1)]!;
    return { direction: hit[0], summary: hit[1] };
  }
  if (/先涨后跌|冲高回落/i.test(text)) {
    const steps = [
      ["偏强", "先看上冲"], ["冲高", "观察上方兑现"], ["高位震荡", "高位换手"],
      ["回落", "进入回撤窗口"], ["回撤观察", "观察回撤深度"], ["企稳观察", "等待稳定"], ["震荡", "复核阶段节奏"],
    ] as const;
    const hit = steps[Math.min(index, steps.length - 1)]!;
    return { direction: hit[0], summary: hit[1] };
  }
  const bias = focusAuthorityBias(authority);
  if (bias === "UP") {
    const steps = ["震荡偏强", "上涨", "回踩观察", "修复上涨", "震荡偏强", "上涨", "震荡偏强"];
    return { direction: steps[index % steps.length]!, summary: "偏多结构下观察推进、回踩与再确认" };
  }
  if (bias === "DOWN") {
    const steps = ["震荡偏弱", "下跌", "反抽观察", "回落", "震荡偏弱", "下跌", "震荡偏弱"];
    return { direction: steps[index % steps.length]!, summary: "偏空结构下观察回落、反抽与再确认" };
  }
  return { direction: "震荡", summary: "区间震荡，等待方向选择" };
}

export function focusFutureRhythmRevision(input: {
  original: { direction: string; summary: string };
  realizedPhase: "NONE" | "EARLY_RALLY" | "EARLY_DROP";
  forecastDate: string;
  asOfDate: string;
}): { direction: string; summary: string; revised: boolean } {
  if (input.forecastDate <= input.asOfDate || input.realizedPhase === "NONE") return { ...input.original, revised: false };
  if (input.realizedPhase === "EARLY_RALLY") {
    return {
      direction: /下跌|偏弱|回落|探底/.test(input.original.direction) ? "震荡观察" : "整固偏强",
      summary: "今日涨幅提前兑现，未来节奏调整为先整固/回踩，再观察是否续强。",
      revised: true,
    };
  }
  return {
    direction: /上涨|偏强|反弹|修复/.test(input.original.direction) ? "震荡观察" : "企稳修复",
    summary: "今日跌幅提前兑现，未来节奏调整为先企稳/修复，再观察是否继续走弱。",
    revised: true,
  };
}
