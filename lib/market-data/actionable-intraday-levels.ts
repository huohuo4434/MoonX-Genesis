import "server-only";

// MOOX_ACTIONABLE_LEVELS_V72092
export const MOOX_ACTIONABLE_LEVELS_VERSION = "7.20.9.2" as const;

export type CoreActionableSymbol =
  | "BTC"
  | "ETH"
  | "SPX"
  | "NDX"
  | "WTI"
  | "GOLD"
  | "SILVER"
  | "SHCOMP"
  | "HSTECH";

export type ActionableZone = {
  low: number;
  high: number;
  source: "1H_SWING_CLUSTER" | "1H_SWING_FALLBACK";
};

export type ActionableLevelSnapshot = {
  symbol: CoreActionableSymbol;
  quoteSymbol: string;
  referencePrice: number;
  atr1h: number;
  support: ActionableZone;
  resistance: ActionableZone;
  secondSupport?: ActionableZone;
  secondResistance?: ActionableZone;
  minCorridor: number;
  dataSource: string;
  asOf: string;
};

type HourBar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type Swing = {
  price: number;
  kind: "high" | "low";
};

type Cluster = {
  low: number;
  high: number;
  count: number;
};

const QUOTE_CANDIDATES: Record<CoreActionableSymbol, readonly string[]> = {
  BTC: ["BTC-USD"],
  ETH: ["ETH-USD"],
  // The public board currently presents the tradable SPY / QQQ scale under SPX / NDX labels.
  SPX: ["SPY", "^GSPC"],
  NDX: ["QQQ", "^NDX"],
  WTI: ["CL=F"],
  GOLD: ["GC=F"],
  SILVER: ["SI=F"],
  SHCOMP: ["000001.SS"],
  HSTECH: ["3033.HK", "^HSTECH"],
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function fetchYahooHourlyOnce(quoteSymbol: string): Promise<HourBar[]> {
  const encoded = encodeURIComponent(quoteSymbol);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}` +
    "?interval=1h&range=30d&includePrePost=false";

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MOOX/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Yahoo HTTP ${response.status} for ${quoteSymbol}`);
  }

  const payload = (await response.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
          }>;
        };
      }>;
    };
  };

  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (!result?.timestamp?.length || !quote) {
    throw new Error(`empty hourly chart for ${quoteSymbol}`);
  }

  const bars: HourBar[] = [];
  for (let index = 0; index < result.timestamp.length; index += 1) {
    const timestamp = result.timestamp[index];
    const open = quote.open?.[index];
    const high = quote.high?.[index];
    const low = quote.low?.[index];
    const close = quote.close?.[index];
    if (
      !isFiniteNumber(timestamp) ||
      !isFiniteNumber(open) ||
      !isFiniteNumber(high) ||
      !isFiniteNumber(low) ||
      !isFiniteNumber(close)
    ) {
      continue;
    }
    bars.push({ timestamp, open, high, low, close });
  }

  bars.sort((left, right) => left.timestamp - right.timestamp);

  // Do not build a formal level from a still-forming hourly candle.
  const last = bars.at(-1);
  if (last && Date.now() - last.timestamp * 1000 < 50 * 60 * 1000) {
    bars.pop();
  }

  return bars;
}

async function fetchYahooHourly(symbol: CoreActionableSymbol): Promise<{
  bars: HourBar[];
  quoteSymbol: string;
}> {
  let best: { bars: HourBar[]; quoteSymbol: string } | undefined;
  let lastError: unknown;

  for (const quoteSymbol of QUOTE_CANDIDATES[symbol]) {
    try {
      const bars = await fetchYahooHourlyOnce(quoteSymbol);
      if (!best || bars.length > best.bars.length) {
        best = { bars, quoteSymbol };
      }
      if (bars.length >= 40) {
        return { bars, quoteSymbol };
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (best?.bars.length) return best;
  throw lastError instanceof Error
    ? lastError
    : new Error(`no hourly bars for ${symbol}`);
}

function atr14(bars: HourBar[]): number {
  if (bars.length < 2) return Math.abs(bars.at(-1)?.close ?? 0) * 0.005;
  const slice = bars.slice(-15);
  let total = 0;
  let count = 0;
  for (let index = 1; index < slice.length; index += 1) {
    const current = slice[index]!;
    const previous = slice[index - 1]!;
    total += Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close),
    );
    count += 1;
  }
  return count > 0 ? total / count : Math.abs(bars.at(-1)!.close) * 0.005;
}

function findSwings(bars: HourBar[]): Swing[] {
  const slice = bars.slice(-Math.min(160, bars.length));
  const swings: Swing[] = [];
  for (let index = 2; index < slice.length - 2; index += 1) {
    const current = slice[index]!;
    if (
      current.high >= slice[index - 1]!.high &&
      current.high >= slice[index - 2]!.high &&
      current.high >= slice[index + 1]!.high &&
      current.high >= slice[index + 2]!.high
    ) {
      swings.push({ price: current.high, kind: "high" });
    }
    if (
      current.low <= slice[index - 1]!.low &&
      current.low <= slice[index - 2]!.low &&
      current.low <= slice[index + 1]!.low &&
      current.low <= slice[index + 2]!.low
    ) {
      swings.push({ price: current.low, kind: "low" });
    }
  }
  return swings;
}

function clusterSwings(
  swings: Swing[],
  kind: Swing["kind"],
  width: number,
): Cluster[] {
  const prices = swings
    .filter((swing) => swing.kind === kind)
    .map((swing) => swing.price)
    .sort((left, right) => left - right);
  const clusters: Array<{ low: number; high: number; members: number[] }> = [];

  for (const price of prices) {
    const hit = clusters.find(
      (cluster) => price >= cluster.low - width && price <= cluster.high + width,
    );
    if (hit) {
      hit.members.push(price);
      hit.low = Math.min(hit.low, price);
      hit.high = Math.max(hit.high, price);
    } else {
      clusters.push({ low: price, high: price, members: [price] });
    }
  }

  return clusters.map((cluster) => ({
    low: Math.min(...cluster.members) - width * 0.18,
    high: Math.max(...cluster.members) + width * 0.18,
    count: cluster.members.length,
  }));
}

function toZone(cluster: Cluster): ActionableZone {
  return {
    low: cluster.low,
    high: cluster.high,
    source: "1H_SWING_CLUSTER",
  };
}

function fallbackZones(
  bars: HourBar[],
  referencePrice: number,
  atr: number,
): { support: ActionableZone; resistance: ActionableZone } {
  const recent = bars.slice(-Math.min(80, bars.length));
  const supportPrice = Math.min(...recent.map((bar) => bar.low));
  const resistancePrice = Math.max(...recent.map((bar) => bar.high));
  const width = Math.max(atr * 0.16, referencePrice * 0.0008);
  return {
    support: {
      low: supportPrice - width,
      high: supportPrice + width,
      source: "1H_SWING_FALLBACK",
    },
    resistance: {
      low: resistancePrice - width,
      high: resistancePrice + width,
      source: "1H_SWING_FALLBACK",
    },
  };
}

function selectMeaningfulPair(input: {
  supports: ActionableZone[];
  resistances: ActionableZone[];
  referencePrice: number;
  minCorridor: number;
}): { support: ActionableZone; resistance: ActionableZone } | null {
  let best:
    | { support: ActionableZone; resistance: ActionableZone; distance: number }
    | undefined;

  for (const support of input.supports.slice(0, 5)) {
    for (const resistance of input.resistances.slice(0, 5)) {
      const corridor = resistance.low - support.high;
      if (corridor < input.minCorridor) continue;
      const distance =
        Math.abs(input.referencePrice - support.high) +
        Math.abs(resistance.low - input.referencePrice);
      if (!best || distance < best.distance) {
        best = { support, resistance, distance };
      }
    }
  }

  return best ? { support: best.support, resistance: best.resistance } : null;
}

export async function buildActionableIntradayLevels(
  symbol: CoreActionableSymbol,
): Promise<ActionableLevelSnapshot> {
  const { bars, quoteSymbol } = await fetchYahooHourly(symbol);
  if (bars.length < 12) throw new Error(`insufficient 1H bars for ${symbol}`);

  const referencePrice = bars.at(-1)!.close;
  const atr = Math.max(atr14(bars), referencePrice * 0.0015);
  const clusterWidth = Math.max(atr * 0.22, referencePrice * 0.0008);
  const minClearance = Math.max(atr * 0.18, referencePrice * 0.0015);
  const minCorridor = Math.max(atr * 0.8, referencePrice * 0.004);
  const swings = findSwings(bars);

  const supports = clusterSwings(swings, "low", clusterWidth)
    .filter((cluster) => cluster.high <= referencePrice - minClearance)
    .sort((left, right) => right.high - left.high)
    .map(toZone);
  const resistances = clusterSwings(swings, "high", clusterWidth)
    .filter((cluster) => cluster.low >= referencePrice + minClearance)
    .sort((left, right) => left.low - right.low)
    .map(toZone);

  let pair = selectMeaningfulPair({ supports, resistances, referencePrice, minCorridor });
  if (!pair) {
    const fallback = fallbackZones(bars, referencePrice, atr);
    const combinedSupports = [...supports, fallback.support].sort(
      (left, right) => right.high - left.high,
    );
    const combinedResistances = [...resistances, fallback.resistance].sort(
      (left, right) => left.low - right.low,
    );
    pair = selectMeaningfulPair({
      supports: combinedSupports,
      resistances: combinedResistances,
      referencePrice,
      minCorridor,
    });
    if (!pair) {
      if (fallback.support.high >= fallback.resistance.low) {
        throw new Error(`no meaningful 1H corridor for ${symbol}`);
      }
      pair = fallback;
    }
  }

  const remainingSupports = supports.filter(
    (zone) => zone.high < pair!.support.low - clusterWidth * 0.25,
  );
  const remainingResistances = resistances.filter(
    (zone) => zone.low > pair!.resistance.high + clusterWidth * 0.25,
  );

  return {
    symbol,
    quoteSymbol,
    referencePrice,
    atr1h: atr,
    support: pair.support,
    resistance: pair.resistance,
    secondSupport: remainingSupports[0],
    secondResistance: remainingResistances[0],
    minCorridor,
    dataSource: `yahoo-finance-1h:${quoteSymbol}`,
    asOf: new Date(bars.at(-1)!.timestamp * 1000).toISOString(),
  };
}

export function isCoreActionableSymbol(value: string): value is CoreActionableSymbol {
  return Object.prototype.hasOwnProperty.call(QUOTE_CANDIDATES, value);
}
