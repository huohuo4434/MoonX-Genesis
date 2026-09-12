import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MEMBER_RESEARCH_NAV, MOBILE_BOTTOM_NAV } from "../config/member-channel-navigation";
const read = (path: string) => readFileSync(path, "utf8");
test("primary navigation is one desk plus content, review and services", () => {
  assert.equal(MEMBER_RESEARCH_NAV.length, 5);
  assert.equal(MEMBER_RESEARCH_NAV[0]?.href, "/member");
  assert.ok(MEMBER_RESEARCH_NAV.some(x => x.href === "/member/videos"));
  assert.ok(MOBILE_BOTTOM_NAV.some(x => x.href === "/member"));
  assert.equal(MEMBER_RESEARCH_NAV.filter(x => /daily|key-dates|sector-resonance/.test(x.href)).length, 0);
});
test("member gates precede the compact desk; research remains reachable", () => {
  for (const route of ["daily", "key-dates", "sector-resonance"]) {
    const source = read(`app/member/${route}/page.tsx`);
    assert.ok(source.indexOf('gate.status === "DEVICE_REQUIRED"') < source.indexOf('const { MemberOperationDesk }'));
    assert.match(source, route === "sector-resonance" ? /params.detail !== "1"/ : /research !== "1"/);
  }
  const source = read("components/member/MemberOperationDesk.tsx");
  assert.match(source, /daily\?research=1/);
  assert.match(source, /key-dates\?research=1/);
  assert.match(source, /sector-resonance\?detail=1/);
  assert.doesNotMatch(source, /method:\s*["']POST|api\/admin|placeOrder|submitOrder/);
});
test("selected asset never retains another asset's candles or plans", () => {
  const source = read("components/member/MemberOperationDesk.tsx");
  assert.match(source, /data.assetId !== asset/);
  assert.match(source, /state\?\.asset === asset/);
  assert.match(source, /controller.abort\(\)/);
  assert.match(read("components/member/ConciseTradePlans.tsx"), /!symbol \|\| plan.symbol === symbol/);
});
test("compact candles keep quote basis, staleness and simulated labels", () => {
  const source = read("components/member/DailyCandleChart.tsx");
  assert.match(source, /projection=\{data.stale \? undefined : projection\}/);
  assert.match(source, /data.quoteSymbol/);
  assert.match(source, /data.source/);
  assert.match(source, /右侧未来情景模拟/);
  assert.match(source, /日线位置不等于日内入场已确认/);
});
