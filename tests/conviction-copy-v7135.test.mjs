import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("member period card leads with a direct directional call", () => {
  const source = read("components/conviction/ConvictionDetailClient.tsx");
  assert.match(source, /MOOX 本周期结论/);
  assert.match(source, /偏多｜回踩做多优先/);
  assert.match(source, /偏空｜买跌优先/);
  assert.match(source, /中性｜先不押方向/);
  assert.match(source, /关键价位/);
  assert.match(source, /判断失效/);
});

test("Google latest weekly research states the action and invalidation plainly", () => {
  const source = read("lib/data/conviction/google-forecasts.ts");
  assert.match(source, /GOOGL-W1-20260810-V3/);
  assert.match(source, /本周偏多，回踩做多优先，不追高/);
  assert.match(source, /348–355\.5是关键支撑区/);
  assert.match(source, /378\.37–382\.4压力区/);
  assert.match(source, /有效跌破348，则本周看涨逻辑失效/);
  assert.match(source, /价格结构·支撑压力/);
  assert.doesNotMatch(source, /direction: "箱体确认"/);
});

test("public watchlist copy stays concise without leaking protected levels", () => {
  const teaser = read("lib/data/conviction/watchlist-teasers.ts");
  assert.match(teaser, /会员页先给明确方向，再给周内节奏、关键支撑压力和看错时的失效条件/);
  for (const forbidden of ["348–355.5", "378.37–382.4", "500–510", "66k", "63k", "1860"]) {
    assert.equal(teaser.includes(forbidden), false, `public teaser leaked ${forbidden}`);
  }
});

test("watchlist hero explains member value in plain language", () => {
  const source = read("components/conviction/ConvictionListClient.tsx");
  assert.match(source, /会员页直接看方向、时间和关键位/);
  assert.match(source, /看涨还是看跌、什么时候最关键、支撑压力在哪里、什么情况说明判断错了/);
});
