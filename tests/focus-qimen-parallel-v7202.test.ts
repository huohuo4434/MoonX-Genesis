import test from "node:test";
import assert from "node:assert/strict";
import type { ConvictionPeriodForecast, ConvictionForecastType } from "@/lib/data/conviction/asteroid-forecasts";
import {
  MOOX_FOCUS_QIMEN_ACCURACY_BASELINE,
  buildFocusQimenParallelReading,
  getFocusQimenUseGodRegistry,
} from "@/lib/forecasts/focus-qimen-parallel";
import { buildFocusQimenParallelView } from "@/lib/forecasts/focus-qimen-multihorizon";

const REQUIRED_ASSETS = [
  "ganfeng-lithium", "lian-tech", "lexin-medical", "cxmt", "asteroid", "sandisk",
  "nbis", "mu", "hype", "sol", "eth", "btc", "googl", "msft", "tencent",
  "kingsoft-office", "tsla", "lite",
] as const;

function forecast(input: {
  id: string;
  type: ConvictionForecastType;
  start: string;
  end: string;
  direction?: ConvictionPeriodForecast["direction"];
}): ConvictionPeriodForecast {
  return {
    id: input.id,
    assetId: "sandisk",
    forecastType: input.type,
    periodStart: input.start,
    periodEnd: input.end,
    direction: input.direction ?? "上涨",
    upProbability: 60,
    sidewaysProbability: 25,
    downProbability: 15,
    summary: `${input.type}六爻正式结论`,
    expectedPath: "六爻原始路径",
    supportLevels: [],
    resistanceLevels: [],
    riskLevel: "MEDIUM",
    catalysts: [],
    risks: [],
    ichingEvidence: { primaryHexagram: "测试卦", notes: "测试证据" },
    version: 1,
    status: "published",
    sourceType: "ICHING_RESEARCH",
    publishedAt: "2026-08-18T00:00:00.000Z",
    lockedAt: "2026-08-18T00:00:00.000Z",
    validationStatus: "UNVERIFIED",
  };
}

test("18个重点关注标的均有透明用神配置", () => {
  const registry = getFocusQimenUseGodRegistry();
  assert.deepEqual(Object.keys(registry).sort(), [...REQUIRED_ASSETS].sort());
  assert.equal(registry.btc?.basis, "TEACHER_EXPLICIT");
  assert.equal(registry.sandisk?.basis, "MOOX_INDUSTRY_OVERLAY");
  assert.match(registry.sandisk?.note ?? "", /未发现老师固定SNDK用神表/);
});

test("奇门结论不受六爻方向反向改写，只改变共振关系", () => {
  const seed = buildFocusQimenParallelReading({ assetId: "sandisk", forecastDate: "2026-08-24", liuyaoDirection: null });
  const sameLabel = seed.directionCode === "UP" ? "上涨" : seed.directionCode === "DOWN" ? "下跌" : "震荡";
  const oppositeLabel = seed.directionCode === "UP" ? "下跌" : "上涨";
  const same = buildFocusQimenParallelReading({ assetId: "sandisk", forecastDate: "2026-08-24", liuyaoDirection: sameLabel });
  const opposite = buildFocusQimenParallelReading({ assetId: "sandisk", forecastDate: "2026-08-24", liuyaoDirection: oppositeLabel });
  assert.equal(same.protocol, "PARALLEL_METHOD_NO_OVERRIDE");
  assert.equal(same.directionCode, opposite.directionCode);
  assert.equal(same.score, opposite.score);
  assert.equal(same.confidence, opposite.confidence);
  assert.equal(same.castAt, opposite.castAt);
  assert.equal(same.relation, "RESONANCE");
  assert.equal(opposite.relation, "DIVERGENCE");
});

test("同一标的同一日期固定起局，股票周末只观察且不计验证", () => {
  const first = buildFocusQimenParallelReading({ assetId: "sandisk", forecastDate: "2026-08-24", liuyaoDirection: "震荡" });
  const second = buildFocusQimenParallelReading({ assetId: "sandisk", forecastDate: "2026-08-24", liuyaoDirection: "震荡" });
  assert.equal(first.castAt, second.castAt);
  assert.equal(first.directionCode, second.directionCode);
  const weekend = buildFocusQimenParallelReading({ assetId: "sandisk", forecastDate: "2026-08-23", liuyaoDirection: null });
  assert.equal(weekend.direction, "休市观察");
  assert.equal(weekend.relation, "NOT_COMPARABLE");
  assert.equal(weekend.validationStatus, "NOT_ELIGIBLE");
  assert.equal(weekend.verificationEligible, false);
});

test("未来一周固定展示7天，六爻与奇门并列且不互相覆盖", () => {
  const view = buildFocusQimenParallelView({
    assetId: "sandisk",
    asOfDate: "2026-08-18",
    nowMs: Date.parse("2026-08-18T12:00:00.000Z"),
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    dailyPath: [
      { date: "2026-08-24", state: "PENDING", direction: "上涨", summary: "六爻周一" },
      { date: "2026-08-25", state: "PENDING", direction: "下跌", summary: "六爻周二" },
    ],
    forecasts: [],
    auditRows: [],
  });
  assert.equal(view.dailyRows.length, 7);
  assert.equal(view.dailyRows[0]?.liuyaoDirection, "上涨");
  assert.equal(view.dailyRows[0]?.qimen.protocol, "PARALLEL_METHOD_NO_OVERRIDE");
  assert.equal(view.dailyRows[5]?.qimen.direction, "休市观察");
  assert.equal(view.dailyRows[6]?.qimen.direction, "休市观察");
});

test("周月年六爻周期各生成独立奇门周期盘，日/次日不重复进入多周期表", () => {
  const view = buildFocusQimenParallelView({
    assetId: "sandisk",
    asOfDate: "2026-08-18",
    nowMs: Date.parse("2026-08-18T12:00:00.000Z"),
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    dailyPath: [],
    forecasts: [
      forecast({ id: "TODAY", type: "TODAY", start: "2026-08-24", end: "2026-08-24" }),
      forecast({ id: "TOMORROW", type: "TOMORROW", start: "2026-08-25", end: "2026-08-25" }),
      forecast({ id: "WEEK", type: "WEEK", start: "2026-08-24", end: "2026-08-30" }),
      forecast({ id: "MONTH", type: "MONTH_1", start: "2026-09-01", end: "2026-09-30" }),
      forecast({ id: "YEAR", type: "YEAR_1", start: "2027-01-01", end: "2027-12-31" }),
    ],
    auditRows: [],
  });
  assert.deepEqual(view.horizonRows.map((row) => row.forecastType), ["WEEK", "MONTH_1", "YEAR_1"]);
  assert.equal(new Set(view.horizonRows.map((row) => row.castAt)).size, 3);
  assert.ok(view.horizonRows.every((row) => row.methodLabel === "时家奇门·周期起局"));
  assert.ok(view.horizonRows.every((row) => row.protocol === "PARALLEL_METHOD_NO_OVERRIDE"));
});

test("历史补盘与休市样本不冒充奇门命中率，只有显式结果标记才计分", () => {
  const view = buildFocusQimenParallelView({
    assetId: "sandisk",
    asOfDate: MOOX_FOCUS_QIMEN_ACCURACY_BASELINE,
    nowMs: Date.parse("2026-08-18T12:00:00.000Z"),
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    dailyPath: [{ date: "2026-08-18", state: "OCCURRED", direction: "上涨", summary: "历史六爻" }],
    forecasts: [forecast({ id: "OLD-WEEK", type: "WEEK", start: "2026-08-17", end: "2026-08-23" })],
    auditRows: [
      { forecastDate: "2026-08-19", validationStatus: "HIT", qimenEvidence: "无奇门结果标记" },
      { forecastDate: "2026-08-20", validationStatus: "MISS", qimenEvidence: "FOCUS_QIMEN_RESULT=HIT" },
    ],
  });
  assert.ok(view.dailyRows.some((row) => row.qimen.validationStatus === "RETROACTIVE_BASELINE"));
  assert.equal(view.horizonRows[0]?.validationStatus, "RETROACTIVE_BASELINE");
  assert.equal(view.stats.liuyaoVerified.samples, 2);
  assert.equal(view.stats.qimenVerified.samples, 1);
  assert.equal(view.stats.qimenVerified.hits, 1);
});
