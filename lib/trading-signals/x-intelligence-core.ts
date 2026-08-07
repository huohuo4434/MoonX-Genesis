export type XIntelligenceDirection = "LONG" | "SHORT" | "NEUTRAL";
export type XIntelligenceStage = "EARLY_WATCH" | "CONFIRMATION" | "OVERHEATED" | "OBSERVE";
export type XIntelligenceRisk = "LOW" | "MEDIUM" | "HIGH";
export type XIntelligenceMomentum = "NEW" | "ACCELERATING" | "STABLE" | "COOLING";

export type XIntelligenceAggregateInput = {
  postedAt: string;
  sourceKey?: string;
  sourceFamily?: string;
  symbols: string[];
  direction: XIntelligenceDirection;
  confidence: number;
  stage: XIntelligenceStage;
  risk: XIntelligenceRisk;
  levels: number[];
  timeWindows: string[];
};

export type XIntelligenceSymbolSummary = {
  symbol: string;
  mentions6h: number;
  mentions24h: number;
  mentions7d: number;
  longCount24h: number;
  shortCount24h: number;
  neutralCount24h: number;
  direction: XIntelligenceDirection;
  directionScore: number;
  averageConfidence: number;
  dominantStage: XIntelligenceStage;
  risk: XIntelligenceRisk;
  momentum: XIntelligenceMomentum;
  newestPostedAt: string;
  keyLevels: number[];
  timeWindows: string[];
  sampleSize: number;
  uniqueSources24h: number;
  uniqueAccounts24h: number;
  methodFamilies24h: number;
  agreementRatio24h: number;
};

export type XIntelligenceAggregate = {
  generatedAt: string;
  totalPosts24h: number;
  totalPosts7d: number;
  parsedPosts24h: number;
  parsedPosts7d: number;
  symbols24h: number;
  longSignals24h: number;
  shortSignals24h: number;
  neutralSignals24h: number;
  summaries: XIntelligenceSymbolSummary[];
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function normalizedDate(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function uniqueNumbers(values: number[], limit: number): number[] {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)))
    .sort((left, right) => left - right)
    .slice(0, limit);
}

function uniqueStrings(values: string[], limit: number): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);
}

function normalizedConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function directionFromScore(score: number): XIntelligenceDirection {
  if (score >= 25) return "LONG";
  if (score <= -25) return "SHORT";
  return "NEUTRAL";
}

function dominantStage(rows: XIntelligenceAggregateInput[]): XIntelligenceStage {
  const counts: Record<XIntelligenceStage, number> = {
    EARLY_WATCH: 0,
    CONFIRMATION: 0,
    OVERHEATED: 0,
    OBSERVE: 0,
  };
  for (const row of rows) counts[row.stage] += 1;
  if (counts.OVERHEATED > 0 && counts.OVERHEATED >= Math.max(counts.EARLY_WATCH, counts.CONFIRMATION)) {
    return "OVERHEATED";
  }
  if (counts.CONFIRMATION > 0 && counts.CONFIRMATION >= counts.EARLY_WATCH) return "CONFIRMATION";
  if (counts.EARLY_WATCH > 0) return "EARLY_WATCH";
  return "OBSERVE";
}

function aggregateRisk(rows: XIntelligenceAggregateInput[], stage: XIntelligenceStage): XIntelligenceRisk {
  if (stage === "OVERHEATED" || rows.some((row) => row.risk === "HIGH")) return "HIGH";
  const hasLong = rows.some((row) => row.direction === "LONG");
  const hasShort = rows.some((row) => row.direction === "SHORT");
  if (hasLong && hasShort) return "HIGH";
  if (rows.some((row) => row.risk === "MEDIUM") || stage !== "OBSERVE") return "MEDIUM";
  return "LOW";
}

function momentumForRows(rows: XIntelligenceAggregateInput[], nowMs: number): XIntelligenceMomentum {
  const recent6h = rows.filter((row) => {
    const timestamp = normalizedDate(row.postedAt);
    return timestamp !== null && timestamp >= nowMs - 6 * HOUR_MS;
  }).length;
  const prior18h = rows.filter((row) => {
    const timestamp = normalizedDate(row.postedAt);
    return timestamp !== null && timestamp < nowMs - 6 * HOUR_MS && timestamp >= nowMs - DAY_MS;
  }).length;
  if (recent6h >= 2 && prior18h === 0) return "NEW";
  const recentRate = recent6h / 6;
  const priorRate = prior18h / 18;
  if (recent6h > 0 && recentRate >= Math.max(0.2, priorRate * 1.5)) return "ACCELERATING";
  if (prior18h > 0 && recentRate < priorRate * 0.6) return "COOLING";
  return "STABLE";
}

function summaryScore(summary: XIntelligenceSymbolSummary): number {
  const stageBoost = summary.dominantStage === "EARLY_WATCH"
    ? 24
    : summary.dominantStage === "CONFIRMATION"
      ? 18
      : summary.dominantStage === "OVERHEATED"
        ? 8
        : 0;
  const momentumBoost = summary.momentum === "NEW"
    ? 25
    : summary.momentum === "ACCELERATING"
      ? 20
      : summary.momentum === "COOLING"
        ? -5
        : 0;
  return summary.mentions24h * 18
    + summary.mentions6h * 10
    + summary.averageConfidence * 0.35
    + stageBoost
    + momentumBoost;
}

export function aggregateXIntelligence(
  rows: XIntelligenceAggregateInput[],
  now = new Date()
): XIntelligenceAggregate {
  const nowMs = now.getTime();
  const validRows = rows.filter((row) => {
    const timestamp = normalizedDate(row.postedAt);
    return timestamp !== null && timestamp <= nowMs + HOUR_MS && timestamp >= nowMs - 7 * DAY_MS;
  });
  const posts24h = validRows.filter((row) => {
    const timestamp = normalizedDate(row.postedAt);
    return timestamp !== null && timestamp >= nowMs - DAY_MS;
  });
  const parsedPosts24h = posts24h.filter((row) => row.symbols.length > 0);
  const parsedPosts7d = validRows.filter((row) => row.symbols.length > 0);
  const bySymbol = new Map<string, XIntelligenceAggregateInput[]>();

  for (const row of parsedPosts7d) {
    for (const rawSymbol of row.symbols) {
      const symbol = rawSymbol.trim().toUpperCase();
      if (!symbol) continue;
      const existing = bySymbol.get(symbol) ?? [];
      existing.push(row);
      bySymbol.set(symbol, existing);
    }
  }

  const summaries = Array.from(bySymbol.entries()).map(([symbol, symbolRows]): XIntelligenceSymbolSummary => {
    const rows24h = symbolRows.filter((row) => {
      const timestamp = normalizedDate(row.postedAt);
      return timestamp !== null && timestamp >= nowMs - DAY_MS;
    });
    const rows6h = symbolRows.filter((row) => {
      const timestamp = normalizedDate(row.postedAt);
      return timestamp !== null && timestamp >= nowMs - 6 * HOUR_MS;
    });
    const scoringRows = rows24h.length > 0 ? rows24h : symbolRows;
    const signedConfidence = scoringRows.reduce((sum, row) => {
      const confidence = normalizedConfidence(row.confidence);
      if (row.direction === "LONG") return sum + confidence;
      if (row.direction === "SHORT") return sum - confidence;
      return sum;
    }, 0);
    const directionScore = scoringRows.length > 0 ? Math.round(signedConfidence / scoringRows.length) : 0;
    const averageConfidence = scoringRows.length > 0
      ? Math.round(scoringRows.reduce((sum, row) => sum + normalizedConfidence(row.confidence), 0) / scoringRows.length)
      : 0;
    const stage = dominantStage(scoringRows);
    const newestPostedAt = symbolRows
      .map((row) => row.postedAt)
      .sort((left, right) => (normalizedDate(right) ?? 0) - (normalizedDate(left) ?? 0))[0] ?? now.toISOString();

    return {
      symbol,
      mentions6h: rows6h.length,
      mentions24h: rows24h.length,
      mentions7d: symbolRows.length,
      longCount24h: rows24h.filter((row) => row.direction === "LONG").length,
      shortCount24h: rows24h.filter((row) => row.direction === "SHORT").length,
      neutralCount24h: rows24h.filter((row) => row.direction === "NEUTRAL").length,
      direction: directionFromScore(directionScore),
      directionScore,
      averageConfidence,
      dominantStage: stage,
      risk: aggregateRisk(scoringRows, stage),
      momentum: momentumForRows(symbolRows, nowMs),
      newestPostedAt,
      keyLevels: uniqueNumbers(scoringRows.flatMap((row) => row.levels), 8),
      timeWindows: uniqueStrings(scoringRows.flatMap((row) => row.timeWindows), 6),
      sampleSize: scoringRows.length,
      uniqueSources24h: (() => {
        const handles = new Set(rows24h.map((row) => row.sourceKey?.trim().toLowerCase()).filter(Boolean));
        if (handles.size === 0) return rows24h.length > 0 ? 1 : 0;
        const families = new Set(rows24h.map((row) => row.sourceFamily?.trim().toUpperCase() || "OTHER"));
        const extraSameFamily = Math.max(0, handles.size - families.size);
        return Math.max(1, families.size + Math.min(2, Math.floor(extraSameFamily / 3)));
      })(),
      uniqueAccounts24h: new Set(rows24h.map((row) => row.sourceKey?.trim().toLowerCase()).filter(Boolean)).size || (rows24h.length > 0 ? 1 : 0),
      methodFamilies24h: (() => {
        if (rows24h.length === 0) return 0;
        return new Set(rows24h.map((row) => row.sourceFamily?.trim().toUpperCase() || "OTHER")).size;
      })(),
      agreementRatio24h: (() => {
        const directional = rows24h.filter((row) => row.direction === "LONG" || row.direction === "SHORT");
        if (directional.length === 0) return 0;
        const longs = directional.filter((row) => row.direction === "LONG").length;
        const shorts = directional.length - longs;
        return Math.max(longs, shorts) / directional.length;
      })(),
    };
  }).sort((left, right) => summaryScore(right) - summaryScore(left) || right.mentions7d - left.mentions7d);

  return {
    generatedAt: now.toISOString(),
    totalPosts24h: posts24h.length,
    totalPosts7d: validRows.length,
    parsedPosts24h: parsedPosts24h.length,
    parsedPosts7d: parsedPosts7d.length,
    symbols24h: new Set(parsedPosts24h.flatMap((row) => row.symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))).size,
    longSignals24h: parsedPosts24h.filter((row) => row.direction === "LONG").length,
    shortSignals24h: parsedPosts24h.filter((row) => row.direction === "SHORT").length,
    neutralSignals24h: parsedPosts24h.filter((row) => row.direction === "NEUTRAL").length,
    summaries,
  };
}
