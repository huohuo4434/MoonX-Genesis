import "server-only";

export type SpcxTechnicalSnapshot = {
  asOf: string;
  source: string;
  currentClose: number;
  previousClose: number | null;
  dayChangePct: number | null;
  fiveSessionChangePct: number | null;
  atr14: number | null;
  supportZone: [number, number];
  secondarySupportZone: [number, number] | null;
  resistanceZone: [number, number];
  secondaryResistanceZone: [number, number] | null;
  trendZh: string;
  trendEn: string;
  confirmationZh: string;
  confirmationEn: string;
  invalidationZh: string;
  invalidationEn: string;
};

type Bar = { date: string; open: number; high: number; low: number; close: number };

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function dateKey(ts: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts * 1000));
}

async function fetchBars(): Promise<Bar[]> {
  const now = Math.floor(Date.now() / 1000);
  const period1 = now - 120 * 24 * 60 * 60;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPCX?interval=1d&period1=${period1}&period2=${now + 86400}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MOOX/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SPCX_QUOTE_HTTP_${response.status}`);
  const json = (await response.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        meta?: { exchangeTimezoneName?: string };
        indicators?: {
          quote?: Array<{
            open?: Array<number | null>;
            high?: Array<number | null>;
            low?: Array<number | null>;
            close?: Array<number | null>;
          }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result?.timestamp?.length || !quote) throw new Error("SPCX_QUOTE_EMPTY");
  const tz = result.meta?.exchangeTimezoneName || "America/New_York";
  const bars: Bar[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    if (open == null || high == null || low == null || close == null) continue;
    if (![open, high, low, close].every(Number.isFinite)) continue;
    bars.push({
      date: dateKey(result.timestamp[i]!, tz),
      open,
      high,
      low,
      close,
    });
  }
  return bars.sort((a, b) => a.date.localeCompare(b.date));
}

function atr14(bars: Bar[]): number | null {
  if (bars.length < 3) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const bar = bars[i]!;
    const prev = bars[i - 1]!;
    trs.push(Math.max(bar.high - bar.low, Math.abs(bar.high - prev.close), Math.abs(bar.low - prev.close)));
  }
  const slice = trs.slice(-14);
  if (!slice.length) return null;
  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

function pivotLevels(bars: Bar[], kind: "low" | "high"): number[] {
  const values: number[] = [];
  for (let i = 1; i < bars.length - 1; i++) {
    const prev = bars[i - 1]!;
    const cur = bars[i]!;
    const next = bars[i + 1]!;
    if (kind === "low" && cur.low <= prev.low && cur.low <= next.low) values.push(cur.low);
    if (kind === "high" && cur.high >= prev.high && cur.high >= next.high) values.push(cur.high);
  }
  return values;
}

function zone(center: number, width: number): [number, number] {
  return [round2(Math.max(0, center - width)), round2(center + width)];
}

export async function getSpcxTechnicalSnapshot(): Promise<SpcxTechnicalSnapshot> {
  const bars = await fetchBars();
  if (bars.length < 5) throw new Error("SPCX_QUOTE_INSUFFICIENT");
  const current = bars.at(-1)!;
  const previous = bars.at(-2) ?? null;
  const atr = atr14(bars.slice(-40));
  const width = Math.max(0.8, (atr ?? current.close * 0.04) * 0.16);
  const recent = bars.slice(-45);

  const supportCandidates = [
    ...pivotLevels(recent, "low"),
    119.08,
    109.2,
    105,
  ]
    .filter((value) => value < current.close * 0.995)
    .sort((a, b) => b - a);

  const resistanceCandidates = [
    ...pivotLevels(recent, "high"),
    135,
    150,
  ]
    .filter((value) => value > current.close * 1.005)
    .sort((a, b) => a - b);

  const support1 = supportCandidates[0] ?? current.close - (atr ?? current.close * 0.06);
  const support2 = supportCandidates.find((value) => value < support1 - Math.max(3, width * 2)) ?? null;
  const resistance1 = resistanceCandidates[0] ?? current.close + (atr ?? current.close * 0.06);
  const resistance2 = resistanceCandidates.find((value) => value > resistance1 + Math.max(3, width * 2)) ?? null;

  const close5 = bars.at(-6)?.close ?? null;
  const dayChangePct = previous ? ((current.close / previous.close) - 1) * 100 : null;
  const fiveSessionChangePct = close5 ? ((current.close / close5) - 1) * 100 : null;
  const aboveIpo = current.close >= 135;
  const trendZh = aboveIpo
    ? "已站上IPO枢轴，短线进入突破后的承接验证阶段。"
    : "仍在135美元IPO枢轴下方，短线先看能否完成有效突破。";
  const trendEn = aboveIpo
    ? "SPCX is above the IPO pivot and is now in a post-breakout support test."
    : "SPCX remains below the $135 IPO pivot; the first task is confirming a valid breakout.";

  return {
    asOf: current.date,
    source: "Yahoo Finance daily OHLC (live server fetch)",
    currentClose: round2(current.close),
    previousClose: previous ? round2(previous.close) : null,
    dayChangePct: dayChangePct == null ? null : round2(dayChangePct),
    fiveSessionChangePct: fiveSessionChangePct == null ? null : round2(fiveSessionChangePct),
    atr14: atr == null ? null : round2(atr),
    supportZone: zone(support1, width),
    secondarySupportZone: support2 == null ? null : zone(support2, width),
    resistanceZone: zone(resistance1, width),
    secondaryResistanceZone: resistance2 == null ? null : zone(resistance2, width),
    trendZh,
    trendEn,
    confirmationZh: `30分钟K线有效站稳${round2(resistance1)}美元附近第一压力区上方，且回踩不快速跌回，视为第二段上攻确认。`,
    confirmationEn: `A valid 30-minute hold above the first resistance near $${round2(resistance1)}, followed by a pullback that does not immediately fail, confirms the second-leg setup.`,
    invalidationZh: `若日线跌破${round2(support1)}美元附近第一支撑并继续放量走弱，短线偏强路径降级；若进一步失守109—110美元解锁承接区，则V2需要重新修订。`,
    invalidationEn: `A daily break below first support near $${round2(support1)} with expanding weakness downgrades the short-term bullish path. A further loss of the $109–110 unlock-demand zone requires another V2 revision.`,
  };
}
