import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildFocusDetailedReport } from "../lib/data/conviction/focus-dossier-core.ts";
import { listSandiskPeriodForecasts } from "../lib/data/conviction/sandisk-forecasts.ts";
import { WATCHLIST_TEASERS } from "../lib/data/conviction/watchlist-teasers.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("SanDisk is a published focus asset with SNDK presentation", () => {
  const seed = read("lib/data/conviction/seed.ts");
  const catalog = read("lib/presentation/asset-catalog.ts");
  assert.match(seed, /id:\s*"sandisk"/);
  assert.match(seed, /slug:\s*"sandisk"/);
  assert.match(seed, /symbol:\s*"SNDK"/);
  assert.match(seed, /nameZh:\s*"闪迪"/);
  assert.match(catalog, /assetId:\s*"sandisk"[\s\S]{0,180}symbol:\s*"SNDK"/);
});

test("SanDisk member research exposes three daily stages through August 31", () => {
  const forecast = read("lib/data/conviction/sandisk-forecasts.ts");
  for (const marker of [
    'forecastType: "WEEK"',
    'forecastType: "WEEK_2"',
    'forecastType: "WEEK_3"',
    'forecastType: "MONTH_1"',
    'forecastType: "MONTH_3"',
    'forecastType: "YEAR_1"',
    'forecastType: "YEAR_5"',
    'date: "2026-08-07"',
    'date: "2026-08-31"',
    "六亲旺衰·结构力量",
    "主卦互卦变卦·时间轴",
  ]) {
    assert.ok(forecast.includes(marker), `missing ${marker}`);
  }
  const dailyDates = [...forecast.matchAll(/date:\s*"2026-08-(\d{2})"/g)].map((match) => Number(match[1]));
  for (let day = 7; day <= 31; day += 1) {
    assert.ok(dailyDates.includes(day), `missing August ${day} daily path`);
  }
});

test("SanDisk is wired into static conviction access and UI", async () => {
  const access = read("lib/data/conviction/access.ts");
  const registry = read("lib/data/conviction/focus-static-forecast-registry.ts");
  const detail = read("components/conviction/ConvictionDetailClient.tsx");
  for (const marker of [
    '"sandisk"',
    "SANDISK_PERIOD_ORDER",
    "sandiskPeriodMeta",
  ]) assert.ok(access.includes(marker), `missing access marker ${marker}`);
  assert.match(access, /listStaticFocusForecasts\(assetId\)/);
  assert.match(registry, /case "sandisk": return listSandiskPeriodForecasts\(\)/);
  assert.match(detail, /"sandisk"/);
  const dossier = buildFocusDetailedReport({ assetId: "sandisk", forecasts: listSandiskPeriodForecasts(), asOfDate: "2026-08-15", nowMs: Date.parse("2026-08-15T02:00:00.000Z") });
  const august = dossier.backgroundHorizons.find((item) => item.forecastType === "MONTH_1" && item.periodStart === "2026-08-07" && item.periodEnd === "2026-08-31");
  assert.ok(august, "SNDK Aug 7-31 background must remain in the shared Focus report");
  assert.equal(august.dailyPath.length, 25);
  assert.deepEqual([august.dailyPath[0]?.date, august.dailyPath.at(-1)?.date], ["2026-08-07", "2026-08-31"]);
  globalThis.React = React;
  const { FocusDossierPanel } = await import("../components/conviction/FocusDossierPanel.tsx");
  const rendered = renderToStaticMarkup(React.createElement(FocusDossierPanel, { dossier }));
  assert.match(rendered, /2026-08-07/);
  assert.match(rendered, /2026-08-31/);
  const teaser = WATCHLIST_TEASERS.find((item) => item.slug === "sandisk");
  assert.ok(teaser);
  assert.match([teaser.headlineZh, teaser.hookZh, teaser.coverageZh, ...teaser.lockedPreviewZh].join(" "), /逐日/);
});

test("Demo literal header is used and live request remains isolated", () => {
  const client = read("lib/bitget/demo-client.ts");
  assert.match(client, /const DEMO_TRADING_HEADERS = \{ paptrading: "1" \} as const;/);
  assert.match(client, /\.\.\.\(env\.mode === "DEMO" \? DEMO_TRADING_HEADERS : \{\}\)/);
  assert.match(client, /if \(env\.mode === "DEMO"\) headers\.paptrading = "1"/);
  assert.doesNotMatch(client, /if\s*\(env\.mode\s*===\s*"LIVE_EXPERIMENT"\)[\s\S]{0,160}paptrading/);
});
