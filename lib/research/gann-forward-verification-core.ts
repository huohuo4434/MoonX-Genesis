import type { KeyDateRadarItem } from "@/lib/data/key-date-radar-core";
import type { DailyMarketBar } from "@/lib/market-data/daily-prices";

export type GannForwardVerdict = "WATCHING" | "DATA_PENDING" | "FULL" | "PARTIAL" | "MISS";

export type GannForwardSample = {
  id: string;
  assetName: string;
  symbol: string;
  focusDate: string;
  lockedAt: string;
  expectedIntent: "TOP" | "BOTTOM";
  officialAction: KeyDateRadarItem["action"];
  overlayStatus: NonNullable<KeyDateRadarItem["gann"]>["status"];
  forecastSourceIds: string[];
  gannSourceUrls: string[];
  matchedWindows: string[];
  verdict: GannForwardVerdict;
  evaluatedAt: string | null;
  result: string | null;
};

export type GannForwardSnapshot = {
  version: 1;
  generatedAt: string;
  samples: GannForwardSample[];
};

export function buildGannForwardCandidates(items: readonly KeyDateRadarItem[], asOfDate: string, lockedAt: string): GannForwardSample[] {
  return items.flatMap((item): GannForwardSample[] => {
    const gann = item.gann;
    if (!gann || gann.turnIntent === "NEUTRAL" || item.focusDate < asOfDate) return [];
    const postIds = item.sourceIds.filter((id) => id.startsWith("GANN:")).sort();
    if (!postIds.length || !gann.sourceUrls.length) return [];
    return [{
      id: `${item.id}::${postIds.join("+")}`,
      assetName: item.assetName,
      symbol: item.symbol,
      focusDate: item.focusDate,
      lockedAt,
      expectedIntent: gann.turnIntent,
      officialAction: item.action,
      overlayStatus: gann.status,
      forecastSourceIds: item.sourceIds.filter((id) => !id.startsWith("GANN:")).sort(),
      gannSourceUrls: [...gann.sourceUrls].sort(),
      matchedWindows: [...gann.matchedWindows].sort(),
      verdict: "WATCHING",
      evaluatedAt: null,
      result: null,
    }];
  });
}

export function mergeGannForwardSamples(existing: readonly GannForwardSample[], candidates: readonly GannForwardSample[], today: string) {
  const byId = new Map(existing.map((sample) => [sample.id, sample]));
  for (const sample of candidates) if (!byId.has(sample.id)) byId.set(sample.id, sample);
  return [...byId.values()].map((sample) => {
    if (["FULL", "PARTIAL", "MISS"].includes(sample.verdict)) return sample;
    return { ...sample, verdict: sample.focusDate < today ? "DATA_PENDING" as const : "WATCHING" as const };
  }).sort((left, right) => left.focusDate.localeCompare(right.focusDate) || left.symbol.localeCompare(right.symbol));
}

export function evaluateGannForwardSample(sample: GannForwardSample, barsInput: readonly DailyMarketBar[], evaluatedAt: string): GannForwardSample {
  const bars = barsInput.filter((bar) => !bar.synthetic).sort((a, b) => a.date.localeCompare(b.date));
  const center = bars.findIndex((bar) => bar.date >= sample.focusDate);
  if (center < 3 || center + 3 >= bars.length) return { ...sample, verdict: "DATA_PENDING" };
  const context = bars.slice(center - 3, center + 4);
  const window = bars.slice(center - 1, center + 2);
  const extreme = sample.expectedIntent === "TOP"
    ? Math.max(...context.map((bar) => bar.high))
    : Math.min(...context.map((bar) => bar.low));
  const windowExtreme = sample.expectedIntent === "TOP"
    ? Math.max(...window.map((bar) => bar.high))
    : Math.min(...window.map((bar) => bar.low));
  const pivotInWindow = Math.abs(extreme - windowExtreme) <= Math.max(1e-9, Math.abs(extreme) * 1e-9);
  const lastClose = context.at(-1)!.close;
  const confirmationPct = sample.expectedIntent === "TOP"
    ? ((windowExtreme - lastClose) / windowExtreme) * 100
    : ((lastClose - windowExtreme) / windowExtreme) * 100;
  const verdict: GannForwardVerdict = !pivotInWindow ? "MISS" : confirmationPct >= 1 ? "FULL" : "PARTIAL";
  const label = sample.expectedIntent === "TOP" ? "高点" : "低点";
  return {
    ...sample,
    verdict,
    evaluatedAt,
    result: `${label}窗口${pivotInWindow ? "覆盖7个交易日极值" : "未覆盖7个交易日极值"}；窗口后确认幅度 ${Math.max(0, confirmationPct).toFixed(2)}%。`,
  };
}

export function summarizeGannForwardSnapshot(samples: readonly GannForwardSample[]) {
  const scored = samples.filter((sample) => ["FULL", "PARTIAL", "MISS"].includes(sample.verdict));
  const full = scored.filter((sample) => sample.verdict === "FULL").length;
  const partial = scored.filter((sample) => sample.verdict === "PARTIAL").length;
  const miss = scored.filter((sample) => sample.verdict === "MISS").length;
  return {
    watching: samples.filter((sample) => sample.verdict === "WATCHING").length,
    pending: samples.filter((sample) => sample.verdict === "DATA_PENDING").length,
    scored: scored.length,
    full,
    partial,
    miss,
    weightedAccuracyPct: scored.length ? Math.round(((full + partial * 0.5) / scored.length) * 1_000) / 10 : null,
  };
}
