/**
 * Weekly→daily pipeline + 6 liuyao sources + cron idempotency + progress revise.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CANONICAL_WEEKLY_LIUYAO_SOURCES } from "../lib/weekly-source/canonical-six.ts";
import { getDayGanzhi } from "../lib/calendar/ganzhi.ts";
import { movingLinesActiveNearDate } from "../lib/forecasts/moving-line-map.ts";
import { assessMarketProgress } from "../lib/forecasts/market-progress.ts";
import {
  generateDailyFromWeekly,
  reviseAsNewVersion,
} from "../lib/forecasts/weekly-to-daily.ts";
import {
  generateCoreMarketsFromWeeklyPure,
  resolvePipelinePhase,
  CORE_DAILY_MARKETS,
} from "../lib/forecasts/daily-pipeline.ts";
import { WEEKLY_CORE_MARKETS, PUBLISHED_WEEKLY_ANALYSES } from "../lib/data/published-weekly-analysis-20260727.ts";
import { TOMORROW_SCHEDULE_COPY } from "../lib/calendar/publish-windows.ts";
import { CONVICTION_ASSET_SEED } from "../lib/data/conviction/seed.ts";
import { formatMarketCapDisplay } from "../lib/data/conviction/format-market-cap.ts";
import { getPublicTodayForecasts } from "../lib/data/daily-forecasts.ts";
import { checkTodayPredictionAccess } from "../lib/prediction-access.ts";

describe("weekly liuyao six sources", () => {
  test("1) six sources present with stable ids", () => {
    assert.equal(CANONICAL_WEEKLY_LIUYAO_SOURCES.length, 6);
    assert.deepEqual(
      CANONICAL_WEEKLY_LIUYAO_SOURCES.map((s) => s.id).sort(),
      [
        "WFS-NDX-20260728-V1",
        "WFS-NDX-20260803-V1",
        "WFS-SPX-20260728-V1",
        "WFS-SPX-20260803-V1",
        "WFS-WTI-20260728-V1",
        "WFS-WTI-20260803-V1",
      ].sort()
    );
  });

  test("2-7) moving lines match confirmation", () => {
    const byId = Object.fromEntries(CANONICAL_WEEKLY_LIUYAO_SOURCES.map((s) => [s.id, s]));
    assert.deepEqual(byId["WFS-SPX-20260728-V1"]!.movingLines, [2, 6]);
    assert.deepEqual(byId["WFS-SPX-20260803-V1"]!.movingLines, [3, 6]);
    assert.deepEqual(byId["WFS-NDX-20260728-V1"]!.movingLines, [5]);
    assert.deepEqual(byId["WFS-NDX-20260803-V1"]!.movingLines, [1, 3, 5, 6]);
    assert.deepEqual(byId["WFS-WTI-20260728-V1"]!.movingLines, [2, 4, 6]);
    assert.deepEqual(byId["WFS-WTI-20260803-V1"]!.movingLines, []);
  });

  test("8) no moving lines does not invent a turn date", () => {
    const w = CANONICAL_WEEKLY_LIUYAO_SOURCES.find((s) => s.id === "WFS-WTI-20260803-V1")!;
    const moving = movingLinesActiveNearDate({
      movingLines: w.movingLines,
      tradingDays: ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"],
      forecastDate: "2026-08-05",
    });
    assert.equal(moving.hasMovingLines, false);
    assert.match(moving.labels.join(""), /不编造具体变盘日/);
    const d = generateDailyFromWeekly({ weekly: w, forecastDate: "2026-08-05", status: "LOCKED" });
    assert.match(d.liuyaoEvidence ?? "", /无动爻/);
    assert.equal(d.sourceWeeklyForecastId, w.id);
    assert.ok(!/\d{4}-\d{2}-\d{2}.*变盘/.test(d.liuyaoEvidence ?? ""));
  });
});

describe("weekly page + daily generation", () => {
  test("9-12) weekly coverage includes all 9 core markets", () => {
    assert.equal(WEEKLY_CORE_MARKETS.length, 9);
    const syms = WEEKLY_CORE_MARKETS.map((m) => m.displaySymbol);
    assert.ok(syms.includes("SPX"));
    assert.ok(syms.includes("NDX"));
    assert.ok(syms.includes("CL") || WEEKLY_CORE_MARKETS.some((m) => m.symbol === "WTI"));
    const published = PUBLISHED_WEEKLY_ANALYSES.map((w) => w.symbol);
    assert.ok(published.includes("SPX"));
    assert.ok(published.includes("NDX"));
    assert.ok(published.includes("WTI"));
  });

  test("13-14) tomorrow traces to weekly source; no daily re-hexagram required", () => {
    const rows = generateCoreMarketsFromWeeklyPure("2026-07-30", "LOCKED");
    assert.ok(rows.length >= 3);
    const spx = rows.find((r) => r.marketCode === "SPX");
    assert.ok(spx);
    assert.match(spx!.sourceWeeklyForecastId, /^WFS-SPX-/);
    assert.equal(spx!.upProbability + spx!.sidewaysProbability + spx!.downProbability, 100);
  });

  test("15-18) pipeline phases + idempotent ids", () => {
    const morning = new Date("2026-07-29T00:35:00Z");
    const afternoon = new Date("2026-07-29T07:55:00Z");
    const evening = new Date("2026-07-29T12:05:00Z");
    assert.equal(resolvePipelinePhase(morning), "lock");
    assert.equal(resolvePipelinePhase(afternoon), "lock");
    assert.equal(resolvePipelinePhase(evening), "lock");
    const a = generateCoreMarketsFromWeeklyPure("2026-07-30", "LOCKED");
    const b = generateCoreMarketsFromWeeklyPure("2026-07-30", "LOCKED");
    assert.deepEqual(
      a.map((x) => x.id).sort(),
      b.map((x) => x.id).sort()
    );
  });

  test("19-21) progress revise near resistance / support / invalidation V2", () => {
    const w = CANONICAL_WEEKLY_LIUYAO_SOURCES.find((s) => s.id === "WFS-SPX-20260728-V1")!;
    const ahead = assessMarketProgress({
      weeklyDirection: w.weeklyDirection,
      weeklyPath: w.weeklyPath,
      baseDirection: "上涨",
      baseUp: 55,
      baseFlat: 25,
      baseDown: 20,
      basePath: "周初上涨",
      snapshot: {
        lastPrice: 6490,
        previousClose: 6400,
        weekOpen: 6380,
        weekHigh: 6500,
        weekLow: 6360,
        nearestSupport: 6350,
        nearestResistance: 6500,
        atr: 40,
        weekReturnPct: 1.8,
      },
    });
    assert.equal(ahead.status, "AHEAD");
    assert.ok(ahead.upProbability < 55);

    const support = assessMarketProgress({
      weeklyDirection: "震荡下跌",
      weeklyPath: "周初震荡，周中转弱",
      baseDirection: "下跌",
      baseUp: 20,
      baseFlat: 30,
      baseDown: 50,
      basePath: "下跌",
      snapshot: {
        lastPrice: 100,
        previousClose: 110,
        weekOpen: 112,
        weekHigh: 112,
        weekLow: 99,
        nearestSupport: 100,
        nearestResistance: 120,
        atr: 3,
        weekReturnPct: -2.5,
      },
    });
    assert.equal(support.status, "AHEAD");
    assert.ok(support.downProbability < 50);

    const v1 = generateDailyFromWeekly({
      weekly: w,
      forecastDate: "2026-07-30",
      version: 1,
      status: "LOCKED",
    });
    const v2 = reviseAsNewVersion(v1, w, {
      lastPrice: 1,
      previousClose: 1,
      weekOpen: 1,
      weekHigh: 1,
      weekLow: 1,
      nearestSupport: 1,
      nearestResistance: 1,
      atr: 1,
      weekReturnPct: 0,
    });
    assert.equal(v2.version, 2);
    assert.equal(v2.previousVersionId, v1.id);
    assert.notEqual(v2.id, v1.id);
  });
});

describe("access + empty + methodology + asteroid + referral", () => {
  test("22) yesterday cannot masquerade as today", () => {
    const today = getPublicTodayForecasts(new Date("2026-07-30T04:00:00+08:00"));
    assert.ok(today.every((f) => f.forecastForDate === "2026-07-30"));
  });

  test("23-26) access gates", () => {
    assert.equal(
      checkTodayPredictionAccess({
        user: null,
        now: new Date("2026-07-29T10:00:00+08:00"),
      }).allowed,
      false
    );
    assert.equal(
      checkTodayPredictionAccess({
        user: { email: "a@b.c", membershipExpiresAt: null },
        now: new Date("2026-07-29T08:00:00+08:00"),
      }).allowed,
      true
    );
    assert.equal(
      checkTodayPredictionAccess({
        user: {
          email: "a@b.c",
          membershipExpiresAt: "2099-01-01T00:00:00.000Z",
        },
        now: new Date("2026-07-29T01:00:00+08:00"),
      }).allowed,
      true
    );
    assert.equal(
      checkTodayPredictionAccess({
        user: { email: "admin@x.com", isAdmin: true },
        now: new Date("2026-07-29T01:00:00+08:00"),
      }).allowed,
      true
    );
  });

  test("27-28) empty copy without wave disclaimer", () => {
    assert.equal(TOMORROW_SCHEDULE_COPY.waitingTitle, "下一交易日预测尚未发布");
    assert.equal(
      TOMORROW_SCHEDULE_COPY.waitingBody,
      "预测生成并锁定后将在此处开放，会员可第一时间查看。"
    );
    assert.equal(TOMORROW_SCHEDULE_COPY.waitingBody.includes("不会使用波浪"), false);
  });

  test("29-31) methodology page is visual with four cores + flow", () => {
    const src = readFileSync(
      resolve("components/methodology/MethodologyPageClient.tsx"),
      "utf8"
    );
    assert.match(src, /六爻（核心）/);
    assert.match(src, /奇门遁甲/);
    assert.match(src, /技术分析/);
    assert.match(src, /消息面/);
    assert.match(src, /周卦与六爻/);
    assert.match(src, /FLOW_ZH/);
  });

  test("32-34) Asteroid contract + 2618万美元", () => {
    const a = CONVICTION_ASSET_SEED.find((x) => x.slug === "asteroid")!;
    assert.equal(a.contractAddress, "0xf280b16ef293d8e534e370794ef26bf312694126");
    assert.equal(a.marketCap, 26_180_000);
    assert.equal(a.network, "Ethereum / 以太坊");
    assert.match(a.nameZh, /Asteroid/);
    const mcap = formatMarketCapDisplay(a)!;
    assert.match(mcap.labelZh, /2618/);
    assert.equal(mcap.labelZh.includes("约26万"), false);
  });

  test("35-36) referral store never writes production FS", () => {
    const store = readFileSync(resolve("lib/referral/store.ts"), "utf8");
    assert.match(store, /VERCEL/);
    assert.match(store, /shouldUsePrisma|prisma\.referralInvite/);
    assert.match(store, /if \(process\.env\.VERCEL/);
  });

  test("ganzhi deterministic", () => {
    const g = getDayGanzhi("1984-02-02");
    assert.equal(g.ganzhiLabel, "甲子");
  });

  test("core daily markets list is 9", () => {
    assert.equal(CORE_DAILY_MARKETS.length, 9);
  });
});
