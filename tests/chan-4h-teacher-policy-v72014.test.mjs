import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("member headline levels are 4H-first and 1H is only a fallback", () => {
  const levels = read("lib/market-data/intraday-chan-levels.ts");
  const loader = read("lib/market-data/chan-market-data.ts");
  const marketCore = read("lib/market-data/chan-market-data-core.ts");
  const member = read("lib/forecasts/member-daily-live-levels.ts");
  const focus = read("components/conviction/FocusIntradayTechnicalCards.tsx");
  assert.match(levels, /timeframe: "4H"/);
  assert.match(levels, /4H is the main/);
  assert.match(levels, /deriveIntradayTechnicalLevels\(key, oneHour, capturedAt, "1H"\)/);
  assert.match(loader, /continuousFutures/);
  assert.match(loader, /CN_EQUITY/);
  assert.match(loader, /HK_EQUITY/);
  assert.match(marketCore, /Mainland exchanges trade exactly four real hours with a lunch recess/);
  assert.match(member, /headline levels come from the 4H center\/segment/);
  assert.match(focus, /1H战术降级/);
  assert.match(focus, /当日支撑 · \{timeframeLabel\}/);
  assert.match(focus, /当日压力 · \{timeframeLabel\}/);
});

test("teacher rulebook records Gao Shan level hierarchy without changing forecast direction authority", () => {
  const rulebook = read("lib/data/teacher-method-rulebook-20260815.ts");
  assert.match(rulebook, /gaoshan-level-hierarchy/);
  assert.match(rulebook, /四小时定主位，低级别定入场/);
  assert.match(rulebook, /不能把最近小波动冒充大级别主位/);
  assert.match(rulebook, /moox-technical-no-vote/);
});
