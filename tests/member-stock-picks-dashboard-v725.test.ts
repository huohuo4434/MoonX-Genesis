import assert from "node:assert/strict";
import test from "node:test";
import { buildMemberStockPickResearchRows } from "../lib/data/conviction/stock-picks-dashboard-core";
import { CONVICTION_ASSET_SEED } from "../lib/data/conviction/seed";
import { buildMemberStockForecastProjection, memberStockAtr } from "../lib/research/member-stock-forecast-candles";
import type { ConvictionPublicCard } from "../types/conviction-asset";
import type { MemberStockPathSnapshot } from "../types/member-stock-picks-dashboard";

function cards(): ConvictionPublicCard[] {
  return CONVICTION_ASSET_SEED.map((asset) => ({
    ...asset,
    exchange: asset.exchange ?? null,
    network: asset.network ?? null,
    contractAddress: asset.contractAddress ?? null,
    marketCap: asset.marketCap ?? null,
    marketCapCurrency: asset.marketCapCurrency ?? null,
    marketCapUpdatedAt: asset.marketCapUpdatedAt ?? null,
    researchStatusZh: "已发布",
    researchStatusEn: "Published",
    detailHref: `/featured-stocks/${asset.slug}`,
  }));
}

const rows = buildMemberStockPickResearchRows({
  cards: cards(),
  asOfDate: "2026-08-24",
  nowMs: Date.parse("2026-08-24T08:00:00Z"),
});

test("stock dashboard follows month-week-day chain and keeps missing weekly evidence explicit", () => {
  const intel = rows.find((row) => row.slug === "intel");
  assert.ok(intel);
  assert.equal(intel.monthly.sourcePriority, "USER_INTERPRETED");
  assert.equal(intel.weekly.direction, null);
  assert.match(intel.weekly.summary, /不能冒充周判断/);
  assert.match(intel.currentStage.note, /周卦与真实K线确认|震荡/);
});

test("an independent same-period chart outranks a teacher monthly decomposition", () => {
  const refreshed = buildMemberStockPickResearchRows({
    cards: cards(),
    asOfDate: "2026-08-24",
    nowMs: Date.parse("2026-08-24T13:00:00Z"),
  });
  const intel = refreshed.find((row) => row.slug === "intel");
  assert.ok(intel);
  assert.equal(intel.weekly.authority, "INDEPENDENT_PERIOD");
  assert.equal(intel.weekly.sourcePriority, "USER_INTERPRETED");
  assert.equal(intel.weekly.sourceLabel, "周期研究");
  assert.equal(intel.weekly.periodStart, "2026-08-31");
});

test("teacher same-period evidence keeps internal priority without member-facing provenance", () => {
  const tesla = rows.find((row) => row.slug === "tsla");
  assert.ok(tesla);
  assert.equal(tesla.weekly.sourcePriority, "TEACHER");
  assert.equal(tesla.weekly.sourceLabel, "周期研究");
});

test("daily views keep independent Liuyao and Qimen separate", () => {
  const sandisk = rows.find((row) => row.slug === "sandisk");
  assert.ok(sandisk?.dailyMethods.length);
  const daily = sandisk.dailyMethods[0]!;
  assert.ok(daily.derivedSummary);
  assert.ok(daily.qimenSummary);
  assert.ok(["RESONANCE", "DIVERGENCE", "LIUYAO_MISSING", "NOT_COMPARABLE"].includes(daily.relation));
  assert.notEqual(sandisk.forecastShapeBasis, "MISSING");
  assert.equal(sandisk.weekly.authority, "INDEPENDENT_PERIOD");
  assert.equal(sandisk.weekly.sourceLabel, "周期研究");
  assert.equal(sandisk.dataCompleteness, "READY");
});

test("retired assets are absent from the active member stock dashboard", () => {
  for (const slug of ["ganfeng-lithium", "lian-tech", "lexin-medical", "kingsoft-office"]) {
    assert.equal(rows.some((row) => row.slug === slug), false, slug);
  }
});

test("member stock path API is fail-closed and cannot alter trading", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("app/api/member/stock-path/route.ts", "utf8"));
  assert.match(source, /getMemberDevicePageAccess/);
  assert.match(source, /checkMemberApiRateLimit/);
  assert.match(source, /X-MOOX-Research-Only/);
  assert.match(source, /X-MOOX-Auto-Trading-Changed.*false/);
  assert.doesNotMatch(source, /lib\/bitget|placeOrder|executeTrade/);
});

test("member page labels simulated path as non-price research", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("components/conviction/MemberStockResearchDashboard.tsx", "utf8"));
  assert.match(source, /真实日K × 月周卦模拟K线/);
  assert.match(source, /纵轴为价格，横轴为日期/);
  assert.match(source, /模拟K线不是报价或目标价/);
  assert.match(source, /月周卦关键窗/);
  assert.match(source, /没有独立日卦时，只能从已锁定周卦拆分，不补造日卦/);
  assert.match(source, /4H缠论技术面/);
  assert.match(source, /grid min-w-0 gap-3/);
  assert.match(source, /break-all text-sm/);
  assert.doesNotMatch(source, /自起卦|按老师方法解读|最高优先级|非独立周卦|老师同周期原卦/);
  assert.doesNotMatch(source, /view\.sourceLabel|view\.version/);
});

test("forecast projection emits deterministic OHLC candles on trading dates with price scale", () => {
  const sandisk = rows.find((row) => row.slug === "sandisk");
  assert.ok(sandisk);
  const dailyCandles = Array.from({ length: 22 }, (_, index) => ({
    timestamp: Date.parse("2026-07-20T00:00:00Z") + index * 86_400_000,
    open: 150 + index,
    high: 154 + index,
    low: 147 + index,
    close: 152 + index,
    volume: 1_000,
  }));
  const snapshot: MemberStockPathSnapshot = {
    key: "FOCUS:SANDISK",
    symbol: "SNDK",
    capturedAt: "2026-08-24T08:00:00Z",
    dailyCandles,
    chan4h: { labelZh: "等待三买回踩确认", direction: "BULL", confirmation: 180, invalidation: 145, waitingFor: "等待向上确认笔" },
    error: null,
  };
  const first = buildMemberStockForecastProjection({ row: sandisk, snapshot });
  const second = buildMemberStockForecastProjection({ row: sandisk, snapshot });
  assert.deepEqual(first, second);
  assert.ok(first.candles.length >= 5);
  assert.ok(first.atr14 > 0);
  assert.ok(first.candles.every((candle) => candle.high >= Math.max(candle.open, candle.close) && candle.low <= Math.min(candle.open, candle.close)));
  assert.ok(first.candles.every((candle) => ![0, 6].includes(new Date(`${candle.date}T00:00:00Z`).getUTCDay())));
  assert.ok(first.candles.some((candle) => candle.keyDay));
  const septemberSecond = first.candles.find((candle) => candle.date === "2026-09-02");
  const septemberFourth = first.candles.find((candle) => candle.date === "2026-09-04");
  assert.ok(septemberSecond && septemberFourth);
  assert.ok(septemberFourth.close < septemberSecond.close, "explicit monthly '末端转弱' segment must bend the simulated candles down");
  assert.match(first.basisLabel, /月卦|周卦/);
  assert.ok(memberStockAtr(dailyCandles) > 0);
});

test("forecast projection fails closed when both month and week evidence are missing", () => {
  const row = structuredClone(rows[0]!);
  row.monthly.direction = null;
  row.weekly.direction = null;
  row.forecastPath = [];
  const snapshot: MemberStockPathSnapshot = {
    key: row.technicalKey,
    symbol: row.symbol,
    capturedAt: "2026-08-24T08:00:00Z",
    dailyCandles: [
      { timestamp: Date.parse("2026-08-20T00:00:00Z"), open: 100, high: 104, low: 98, close: 102, volume: 1 },
      { timestamp: Date.parse("2026-08-21T00:00:00Z"), open: 102, high: 105, low: 100, close: 103, volume: 1 },
    ],
    chan4h: null,
    error: null,
  };
  const projection = buildMemberStockForecastProjection({ row, snapshot });
  assert.deepEqual(projection.candles, []);
  assert.match(projection.basisLabel, /未生成/);
});
