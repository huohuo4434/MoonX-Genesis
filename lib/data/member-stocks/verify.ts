/**
 * Changxin / member-stock daily verification — separate from index accuracy pool.
 */
import "server-only";

import {
  listAllDailyForecasts,
  listStockVerifications,
  upsertDailyForecast,
  upsertStockVerification,
} from "@/lib/data/member-stocks/store";
import { getDailyMarketResult } from "@/lib/market-data/daily-prices";
import { isSessionReadyToVerify } from "@/lib/verification/session-ready";
import { computeReturnPct, directionFromReturnPct } from "@/lib/verification/daily-rules";
import type { MemberStockDailyForecast } from "@/types/member-stock";

function mapActual(dir: "UP" | "DOWN" | "FLAT"): "上涨" | "下跌" | "震荡" {
  if (dir === "UP") return "上涨";
  if (dir === "DOWN") return "下跌";
  return "震荡";
}

function primaryMatches(
  primary: string,
  actual: "上涨" | "下跌" | "震荡"
): boolean | null {
  if (primary === "暂无判断" || primary === "观望") return null;
  if (actual === "上涨") {
    return (
      primary === "明显上涨" ||
      primary === "震荡偏涨" ||
      primary === "先跌后涨" ||
      primary === "上涨" ||
      primary === "震荡上涨" ||
      primary === "探底回升" ||
      primary === "区间震荡" // range + slight up bias handled via closingBias
    );
  }
  if (actual === "下跌") {
    return (
      primary === "明显下跌" ||
      primary === "震荡偏跌" ||
      primary === "先涨后跌" ||
      primary === "下跌" ||
      primary === "震荡下跌" ||
      primary === "冲高回落" ||
      primary === "区间震荡"
    );
  }
  return (
    primary === "区间震荡" ||
    primary === "震荡偏涨" ||
    primary === "震荡偏跌" ||
    primary === "震荡上涨" ||
    primary === "震荡下跌"
  );
}

function closingBiasHit(
  bias: string | undefined,
  actual: "上涨" | "下跌" | "震荡"
): boolean | undefined {
  if (!bias) return undefined;
  if (actual === "震荡") return bias === "中性" || bias.includes("略偏");
  if (actual === "上涨") return /偏涨|略偏上涨/.test(bias);
  if (actual === "下跌") return /偏跌|略偏下跌|偏弱/.test(bias);
  return false;
}

/**
 * Special rule for 区间震荡 + 略偏上涨:
 * - flat band → path (主要走势) hit
 * - up → closing bias hit (and primary hit via range mapping)
 * - down → miss
 */
function scoreForecast(
  forecast: MemberStockDailyForecast,
  actual: "上涨" | "下跌" | "震荡"
): {
  hit: boolean | null;
  pathHit?: boolean;
  closingBiasHit?: boolean;
} {
  const primary = forecast.primaryDirection;
  const bias = forecast.closingBias;

  if (primary === "区间震荡" && bias === "略偏上涨") {
    if (actual === "震荡") {
      return { hit: true, pathHit: true, closingBiasHit: false };
    }
    if (actual === "上涨") {
      return { hit: true, pathHit: false, closingBiasHit: true };
    }
    return { hit: false, pathHit: false, closingBiasHit: false };
  }

  const match = primaryMatches(primary, actual);
  return {
    hit: match,
    pathHit: match === true,
    closingBiasHit: closingBiasHit(bias, actual),
  };
}

function buildReviewSummary(input: {
  hit: boolean | null;
  pathHit?: boolean;
  closingBiasHit?: boolean;
  actual: "上涨" | "下跌" | "震荡";
}): string {
  if (input.hit == null) {
    return "暂无判断，不计入准确率。";
  }
  if (input.hit) {
    const bits = ["方向命中"];
    if (input.pathHit) bits.push("主要走势命中");
    if (input.closingBiasHit) bits.push("收盘倾向命中");
    return `${bits.join("，")}。新股高波动期仍需控制仓位。`;
  }
  return "方向未命中，上市初期资金博弈强于板块方向，后续类似情况需降低单边预测置信度。";
}

export type StockVerifyReport = {
  scanned: number;
  verified: number;
  skipped: number;
  voided: number;
  manual: number;
  notReady: number;
  deferred: number;
  attempted: number;
};

export async function runMemberStockVerification(
  now = new Date(),
  options: { maxRecords?: number; deadlineAt?: number } = {}
): Promise<StockVerifyReport> {
  const forecasts = (await listAllDailyForecasts()).filter(
    (f) => f.status === "published" && f.role === "today" && f.accuracyEligible === true
  );
  const existing = await listStockVerifications();
  const byId = new Map(existing.map((r) => [r.forecastId, r]));

  const report: StockVerifyReport = {
    scanned: 0,
    verified: 0,
    skipped: 0,
    voided: 0,
    manual: 0,
    notReady: 0,
    deferred: 0,
    attempted: 0,
  };
  forecasts.sort((a, b) => (byId.get(a.id)?.verifiedAt ?? "").localeCompare(byId.get(b.id)?.verifiedAt ?? "") || a.id.localeCompare(b.id));

  for (const forecast of forecasts) {
    report.scanned += 1;
    if (byId.has(forecast.id) && byId.get(forecast.id)?.verdict !== "manual_review") {
      report.skipped += 1;
      continue;
    }

    if (!isSessionReadyToVerify("CN", forecast.forecastDate, now)) {
      report.notReady += 1;
      continue;
    }

    if (report.attempted >= (options.maxRecords ?? 4) || Date.now() >= (options.deadlineAt ?? Infinity)) {
      report.deferred += 1;
      continue;
    }
    report.attempted += 1;
    const stock = (await import("@/lib/data/member-stocks/store")).getBenefitStock(forecast.stockId);
    const quoteSymbol = stock?.quoteSymbol ?? `${forecast.stockId}.SS`;

    try {
      const market = await getDailyMarketResult({
        symbol: forecast.stockId,
        quoteSymbol,
        forecastDate: forecast.forecastDate,
        market: "CN",
      });
      if ("error" in market || !Number.isFinite(market.close) || !Number.isFinite(market.previousClose)) {
        await upsertStockVerification({
          forecastId: forecast.id,
          stockId: forecast.stockId,
          forecastDate: forecast.forecastDate,
          predictedDirection: forecast.direction,
          actualReturnPct: 0,
          actualClose: 0,
          previousClose: 0,
          actualDirection: "震荡",
          verdict: "manual_review",
          verdictLabel: "人工复核",
          reviewSummary: "行情获取失败，转入人工复核。",
          verifiedAt: now.toISOString(),
          dataSource: "unavailable",
          publishedAt: forecast.publishedAt,
        });
        report.manual += 1;
        continue;
      }

      const returnPct = computeReturnPct(market.previousClose, market.close);
      const actualEng = directionFromReturnPct(returnPct);
      const actual = mapActual(actualEng);
      const scored = scoreForecast(forecast, actual);

      if (scored.hit == null) {
        report.voided += 1;
        await upsertStockVerification({
          forecastId: forecast.id,
          stockId: forecast.stockId,
          forecastDate: forecast.forecastDate,
          predictedDirection: forecast.direction,
          actualReturnPct: returnPct,
          actualClose: market.close,
          previousClose: market.previousClose,
          actualDirection: actual,
          verdict: "void",
          verdictLabel: "不计入",
          reviewSummary: buildReviewSummary({ ...scored, actual }),
          verifiedAt: now.toISOString(),
          dataSource: market.dataSource,
          publishedAt: forecast.publishedAt,
        });
        continue;
      }

      const hit = scored.hit;
      await upsertStockVerification({
        forecastId: forecast.id,
        stockId: forecast.stockId,
        forecastDate: forecast.forecastDate,
        predictedDirection: forecast.direction,
        actualReturnPct: returnPct,
        actualClose: market.close,
        previousClose: market.previousClose,
        actualDirection: actual,
        verdict: hit ? "hit" : "miss",
        verdictLabel: hit ? "命中" : "未命中",
        pathHit: scored.pathHit,
        closingBiasHit: scored.closingBiasHit,
        reviewSummary: buildReviewSummary({ ...scored, actual }),
        verifiedAt: now.toISOString(),
        dataSource: market.dataSource,
        publishedAt: forecast.publishedAt,
      });
      await upsertDailyForecast({
        ...forecast,
        verificationStatus: hit ? "hit" : "miss",
      });
      report.verified += 1;
    } catch (err) {
      await upsertStockVerification({
        forecastId: forecast.id,
        stockId: forecast.stockId,
        forecastDate: forecast.forecastDate,
        predictedDirection: forecast.direction,
        actualReturnPct: 0,
        actualClose: 0,
        previousClose: 0,
        actualDirection: "震荡",
        verdict: "manual_review",
        verdictLabel: "人工复核",
        reviewSummary: err instanceof Error ? err.message : "行情获取失败",
        verifiedAt: now.toISOString(),
        dataSource: "error",
        publishedAt: forecast.publishedAt,
      });
      report.manual += 1;
    }
  }

  return report;
}
