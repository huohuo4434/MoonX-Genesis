import type { DailyForecastMarket } from "@/types/daily-forecast";

export type TradingSessionDisplay = {
  title: string;
  targetDateZh: string;
  exchangeTimeLine: string | null;
  beijingTimeLine: string | null;
  alertLabel: string | null;
  isDeferred: boolean;
  weekendRiskLabel: string | null;
};

function parseIsoDate(iso: string): [number, number, number] {
  const parts = iso.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return [year!, month!, day!];
}

function formatDateZh(iso: string): string {
  const [y, m, d] = parseIsoDate(iso);
  return `${y}年${m}月${d}日`;
}

function dateOnlyFromIsoTimestamp(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseOffsetMinutes(timeZone: string, at: Date): number {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
    hour: "2-digit",
  })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = part?.match(/GMT([+-])(\d{2}):?(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  return sign * (Number(match[2]!) * 60 + Number(match[3]!));
}

function zonedLocalToUtc(input: {
  isoDate: string;
  hour: number;
  minute: number;
  timeZone: string;
}): Date {
  const [year, month, day] = parseIsoDate(input.isoDate);
  const approximate = new Date(Date.UTC(year, month - 1, day, input.hour, input.minute));
  const offset = parseOffsetMinutes(input.timeZone, approximate);
  return new Date(approximate.getTime() - offset * 60_000);
}

function formatTimeInZone(date: Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    date: `${values.year}年${Number(values.month)}月${Number(values.day)}日`,
    time: `${values.hour}:${values.minute}`,
  };
}

function calendarGapDays(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

function weekdayZh(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
    timeZone: "UTC",
  }).format(d);
}

function marketName(input: {
  market: DailyForecastMarket;
  symbol?: string;
}): { title: string; short: string } {
  if (input.market === "us") return { title: "下一美股常规交易时段", short: "美股" };
  if (input.market === "cn") return { title: "下一A股交易日", short: "A股" };
  if (input.market === "hk") return { title: "下一港股交易日", short: "港股" };
  if (input.symbol === "WTI" || input.symbol === "CL=F") {
    return { title: "下一WTI交易日", short: "WTI" };
  }
  if (input.symbol === "SILVER" || input.symbol === "SI" || input.symbol === "SI=F") {
    return { title: "下一国际银价交易日", short: "白银" };
  }
  return { title: "下一国际金价交易日", short: "黄金" };
}

function deferredMeta(input: {
  market: DailyForecastMarket;
  symbol?: string;
  forecastDate: string;
  publishedAt: string;
}): {
  isDeferred: boolean;
  alertLabel: string | null;
  weekendRiskLabel: string | null;
} {
  if (input.market === "crypto") {
    return { isDeferred: false, alertLabel: null, weekendRiskLabel: null };
  }
  const publishedChinaDate = dateOnlyFromIsoTimestamp(input.publishedAt, "Asia/Shanghai");
  const gap = calendarGapDays(publishedChinaDate, input.forecastDate);
  const isDeferred = gap > 1;
  if (!isDeferred) {
    return { isDeferred: false, alertLabel: null, weekendRiskLabel: null };
  }
  const weekday = weekdayZh(input.forecastDate);
  const name = marketName(input).short;
  return {
    isDeferred: true,
    alertLabel:
      weekday === "星期一"
        ? `跨周预测 · 下周一${name}`
        : `休市顺延 · ${weekday}${name}`,
    weekendRiskLabel: "休市期间仅作风险观察，不计入正式日度验证。",
  };
}

function buildUsSession(input: {
  forecastDate: string;
  publishedAt: string;
  symbol?: string;
}): TradingSessionDisplay {
  const startUtc = zonedLocalToUtc({
    isoDate: input.forecastDate,
    hour: 9,
    minute: 30,
    timeZone: "America/New_York",
  });
  const endUtc = zonedLocalToUtc({
    isoDate: input.forecastDate,
    hour: 16,
    minute: 0,
    timeZone: "America/New_York",
  });
  const startBj = formatTimeInZone(startUtc, "Asia/Shanghai");
  const endBj = formatTimeInZone(endUtc, "Asia/Shanghai");
  const beijingRange =
    startBj.date === endBj.date
      ? `${startBj.date} ${startBj.time}—${endBj.time}`
      : `${startBj.date} ${startBj.time}—${endBj.date} ${endBj.time}`;
  const deferred = deferredMeta({
    market: "us",
    symbol: input.symbol,
    forecastDate: input.forecastDate,
    publishedAt: input.publishedAt,
  });

  return {
    title: "下一美股常规交易时段",
    targetDateZh: formatDateZh(input.forecastDate),
    exchangeTimeLine: `美东时间：${formatDateZh(input.forecastDate)} 09:30—16:00`,
    beijingTimeLine: `北京时间：${beijingRange}`,
    ...deferred,
  };
}

export function getTradingSessionDisplay(input: {
  market: DailyForecastMarket;
  forecastDate: string;
  publishedAt: string;
  symbol?: string;
}): TradingSessionDisplay {
  if (input.market === "us") {
    return buildUsSession(input);
  }
  if (input.market === "crypto") {
    return {
      title: "下一自然日",
      targetDateZh: formatDateZh(input.forecastDate),
      exchangeTimeLine: null,
      beijingTimeLine: `北京时间：${formatDateZh(input.forecastDate)} 00:00—23:59`,
      alertLabel: null,
      isDeferred: false,
      weekendRiskLabel: null,
    };
  }

  const name = marketName(input);
  return {
    title: name.title,
    targetDateZh: formatDateZh(input.forecastDate),
    exchangeTimeLine: null,
    beijingTimeLine: null,
    ...deferredMeta(input),
  };
}
