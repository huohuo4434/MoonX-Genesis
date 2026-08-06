import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

test("SanDisk is wired into static conviction access and UI", () => {
  const access = read("lib/data/conviction/access.ts");
  const detail = read("components/conviction/ConvictionDetailClient.tsx");
  const list = read("components/conviction/ConvictionListClient.tsx");
  for (const marker of [
    '"sandisk"',
    "listSandiskPeriodForecasts",
    "SANDISK_PERIOD_ORDER",
    "sandiskPeriodMeta",
  ]) assert.ok(access.includes(marker), `missing access marker ${marker}`);
  assert.match(detail, /"sandisk"/);
  assert.match(detail, /8月7日至31日逐日路径/);
  assert.match(list, /sandisk:\s*\{/);
  assert.match(list, /8月末前逐日路径/);
});

test("Demo literal header is used and live request remains isolated", () => {
  const client = read("lib/bitget/demo-client.ts");
  assert.match(client, /const DEMO_TRADING_HEADERS = \{ paptrading: "1" \} as const;/);
  assert.match(client, /\.\.\.\(env\.mode === "DEMO" \? DEMO_TRADING_HEADERS : \{\}\)/);
  assert.match(client, /if \(env\.mode === "DEMO"\) headers\.paptrading = "1"/);
  assert.doesNotMatch(client, /if\s*\(env\.mode\s*===\s*"LIVE_EXPERIMENT"\)[\s\S]{0,160}paptrading/);
});
