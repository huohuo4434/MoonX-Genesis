/**
 * Pure helpers for daily accuracy breakdowns and composite day summary.
 */
import type { DailyForecastRecord, DailyVerificationResult } from "@/types/daily-accuracy";
import type { DailyReviewRecord } from "@/types/automation";

function rate(hits: number, misses: number): number | null {
  const den = hits + misses;
  return den === 0 ? null : hits / den;
}

export function assetAccuracyBreakdown(results: DailyVerificationResult[]): Array<{
  symbol: string;
  label: string;
  hit: number;
  miss: number;
  hitRate: number | null;
}> {
  const labels: Record<string, string> = {
    BTC: "比特币",
    SPX: "标普500指数",
    NDX: "纳斯达克100",
    SSEC: "上证指数",
    HSTECH: "恒生科技指数",
    GLD: "黄金ETF",
    WTI: "WTI原油",
  };
  const symbols = ["BTC", "SPX", "NDX", "SSEC", "HSTECH", "GLD", "WTI"];
  return symbols.map((symbol) => {
    const rows = results.filter(
      (r) => !r.isSystemTest && (r.verdict === "HIT" || r.verdict === "MISS") && r.symbol === symbol
    );
    const hit = rows.filter((r) => r.verdict === "HIT").length;
    const miss = rows.filter((r) => r.verdict === "MISS").length;
    return { symbol, label: labels[symbol] ?? symbol, hit, miss, hitRate: rate(hit, miss) };
  });
}

export function sourceAccuracyBreakdown(
  forecasts: DailyForecastRecord[],
  results: DailyVerificationResult[]
): Array<{ source: string; hit: number; miss: number; hitRate: number | null }> {
  const byId = new Map(forecasts.map((f) => [f.id, f]));
  const buckets = new Map<string, { hit: number; miss: number }>();
  const normalize = (s: string) => {
    if (/老师|teacher/i.test(s)) return "老师研究";
    if (/周期|推演|cycle|综合|composite|MoonX/i.test(s)) return "MoonX综合判断";
    if (/技术|technical/i.test(s)) return "技术分析";
    if (/自测|用户|user/i.test(s)) return "用户自测";
    return s || "MoonX综合判断";
  };
  for (const r of results) {
    if (r.isSystemTest || (r.verdict !== "HIT" && r.verdict !== "MISS")) continue;
    const f = byId.get(r.forecastId);
    const source = normalize(f?.source ?? "综合判断");
    const cur = buckets.get(source) ?? { hit: 0, miss: 0 };
    if (r.verdict === "HIT") cur.hit += 1;
    else cur.miss += 1;
    buckets.set(source, cur);
  }
  return [...buckets.entries()].map(([source, v]) => ({
    source,
    hit: v.hit,
    miss: v.miss,
    hitRate: rate(v.hit, v.miss),
  }));
}

export function confidenceAccuracyBreakdown(
  forecasts: DailyForecastRecord[],
  results: DailyVerificationResult[]
): Array<{ bucket: string; hit: number; miss: number; hitRate: number | null }> {
  const byId = new Map(forecasts.map((f) => [f.id, f]));
  const order = ["50%以下", "50%至59%", "60%至69%", "70%以上"] as const;
  const buckets: Record<(typeof order)[number], { hit: number; miss: number }> = {
    "50%以下": { hit: 0, miss: 0 },
    "50%至59%": { hit: 0, miss: 0 },
    "60%至69%": { hit: 0, miss: 0 },
    "70%以上": { hit: 0, miss: 0 },
  };
  for (const r of results) {
    if (r.isSystemTest || (r.verdict !== "HIT" && r.verdict !== "MISS")) continue;
    const p = byId.get(r.forecastId)?.probability ?? 0;
    const key =
      p < 50 ? "50%以下" : p < 60 ? "50%至59%" : p < 70 ? "60%至69%" : "70%以上";
    if (r.verdict === "HIT") buckets[key].hit += 1;
    else buckets[key].miss += 1;
  }
  return order.map((bucket) => ({
    bucket,
    hit: buckets[bucket].hit,
    miss: buckets[bucket].miss,
    hitRate: rate(buckets[bucket].hit, buckets[bucket].miss),
  }));
}

export function buildDailyCompositeSummary(input: {
  date: string;
  results: DailyVerificationResult[];
  reviews: DailyReviewRecord[];
}): { short: string; full: string } {
  const dayResults = input.results.filter((r) => r.forecastDate === input.date && !r.isSystemTest);
  const hits = dayResults.filter((r) => r.verdict === "HIT").map((r) => r.assetName);
  const misses = dayResults.filter((r) => r.verdict === "MISS").map((r) => r.assetName);
  const dayReviews = input.reviews.filter((r) => r.forecastDate === input.date);
  const topBias = dayReviews.flatMap((r) => r.interpretationBiases)[0];
  const caution = dayReviews.find((r) => r.futureCaution)?.futureCaution;

  if (!dayResults.length) {
    return {
      short: "当前暂无明确结论",
      full: "当日尚无已完成验证的日度预测，不展示假准确率。",
    };
  }

  const short = [
    hits.length ? `命中：${hits.join("、")}` : null,
    misses.length ? `未命中：${misses.join("、")}` : null,
    topBias ? `偏差提示：${topBias.evidence.slice(0, 40)}` : null,
  ]
    .filter(Boolean)
    .join("；");

  const full = [
    `${input.date}综合总结`,
    hits.length ? `命中资产：${hits.join("、")}` : "命中资产：无",
    misses.length ? `未命中资产：${misses.join("、")}` : "未命中资产：无",
    topBias ? `今日最明显偏差：${topBias.evidence}` : "今日偏差：样本不足",
    caution ? `明日重点警惕：${caution}` : "明日重点：保持结构核对，不机械反向。",
    `新增复盘：${dayReviews.length} 条`,
  ].join("\n");

  return { short: short || "当前暂无明确结论", full };
}
