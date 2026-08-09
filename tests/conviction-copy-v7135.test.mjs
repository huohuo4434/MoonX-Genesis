import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("member period card leads with a direct directional call", () => {
  const source = read("components/conviction/ConvictionDetailClient.tsx");
  assert.match(source, /MOOX 本周期唯一方向/);
  assert.match(source, /看涨｜唯一方向/);
  assert.match(source, /看跌｜唯一方向/);
  assert.match(source, /方向不明确/);
  assert.match(source, /技术点位（不决定方向）/);
  assert.match(source, /以上只管位置与风控，不改变上方MOOX唯一方向/);
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
  assert.match(teaser, /会员页先给唯一方向/);
  assert.match(teaser, /技术区最后只负责列关键价位|技术点位最后再看|技术点位参考/);
  for (const forbidden of ["348–355.5", "378.37–382.4", "500–510", "66k", "63k", "1860"]) {
    assert.equal(teaser.includes(forbidden), false, `public teaser leaked ${forbidden}`);
  }
});

test("watchlist hero explains member value in plain language", () => {
  const source = read("components/conviction/ConvictionListClient.tsx");
  assert.match(source, /玄学定方向，技术找点位/);
  assert.match(source, /重点关注按本周多周期卦象共振强度自动排序/);
  assert.match(source, /看涨和看跌一视同仁/);
});
