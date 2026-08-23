import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";
import { buildFocusDetailedReport } from "../lib/data/conviction/focus-dossier-core";

const nowMs = Date.parse("2026-08-23T20:30:00+08:00");

function find(assetId: "spcx" | "lite", id: string) {
  return listStaticFocusForecasts(assetId).find((forecast) => forecast.id === id);
}

test("SPCX preserves locked history and adds teacher-priority September path", () => {
  const rows = listStaticFocusForecasts("spcx");
  const month = find("spcx", "SPCX-YOU-20260823-V3");
  assert.ok(rows.some((forecast) => forecast.id === "SPCX-M3-20260806-V2"), "locked V2 history must remain");
  assert.equal(month?.direction, "先涨后跌");
  assert.equal(month?.calendarMonthPath?.length, 5);
  assert.match(month?.consensusLabel ?? "", /老师原课.*同向/);
  assert.ok(month?.methodViews?.some((view) => /老师原课/.test(view.label) && view.weight === 65));
  assert.match(month?.rollingUpdate?.originalLockedView ?? "", /SPCX-M3-20260806-V2/);
  assert.match(month?.risks.join(" ") ?? "", /缺同周期奇门盘|没有同周期奇门盘/);
});

test("SPCX active weekly authority follows the new chart instead of the higher horizon", () => {
  const dossier = buildFocusDetailedReport({
    assetId: "spcx",
    forecasts: listStaticFocusForecasts("spcx"),
    asOfDate: "2026-09-23",
    nowMs,
  });
  assert.equal(dossier.dailyAuthority?.forecastId, "SPCX-W3-20260921-V3");
  assert.equal(dossier.weeklyAuthority?.direction, "先涨后跌");
  assert.match(dossier.longTermBackground ?? "", /一年维度|大波段/);
});

test("LITE keeps the long-term comparison while publishing short-term divergence", () => {
  const rows = listStaticFocusForecasts("lite");
  const month = find("lite", "LITE-YOU-20260823-V2");
  const pullback = find("lite", "LITE-W2-20260914-V2");
  const october = find("lite", "LITE-OCT-20260823-V2");
  assert.ok(rows.some((forecast) => forecast.id === "LITE-YE-20260817-V1"), "locked year-end record must remain");
  assert.equal(month?.direction, "震荡上涨");
  assert.match(month?.consensusLabel ?? "", /既有LITE长周期方向一致/);
  assert.equal(pullback?.direction, "震荡下跌");
  assert.match(pullback?.consensusLabel ?? "", /暂时相反/);
  assert.equal(october?.direction, "先涨后跌");
  assert.match(october?.consensusLabel ?? "", /中途回撤而非长期反转/);
});

test("LITE 2027 remains a low-consensus new sample without fabricated teacher or Qimen evidence", () => {
  const year = find("lite", "LITE-Y2027-20260823-V2");
  assert.equal(year?.direction, "先涨后跌");
  assert.equal(year?.consensusStars, 1);
  assert.match(year?.consensusLabel ?? "", /没有老师同周期原卦.*奇门年盘/);
  assert.equal(year?.methodViews?.length, 1);
  assert.ok(year?.methodViews?.every((view) => !/奇门|老师原课/.test(view.label)));
});

test("new records have valid editorial scenario weights and no private identity leakage", () => {
  const rows = [
    ...listStaticFocusForecasts("spcx"),
    ...listStaticFocusForecasts("lite"),
  ].filter((forecast) => forecast.publishedAt === "2026-08-23T20:10:00+08:00");
  assert.equal(rows.length, 13);
  for (const forecast of rows) {
    assert.equal(forecast.upProbability + forecast.sidewaysProbability + forecast.downProbability, 100);
    assert.equal(forecast.supportLevels.length, 0);
    assert.equal(forecast.resistanceLevels.length, 0);
    const text = JSON.stringify(forecast);
    assert.doesNotMatch(text, /C:\\\\Users|出生|生辰|姓名|吴昌烨|狼叔|金兔子/);
  }
});

test("member dossier preserves two-stage directions instead of collapsing them to a one-word call", () => {
  const source = readFileSync("components/conviction/ConvictionDetailClient.tsx", "utf8");
  assert.match(source, /label: `↑ \$\{label\}`/);
  assert.match(source, /label: `↓ \$\{label\}`/);
  assert.match(source, /完整路径是前段走强、后段转弱/);
  assert.match(source, /convictionDirectionLabelZh\(item\.direction\)/);
  assert.doesNotMatch(source, /return \{ label: "↓ 看跌"/);
});
