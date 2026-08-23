import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { multiViewVerifiedResearchWeight } from "../lib/research/member-multi-view-core";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("priority multi-view remains presentation-only and cannot open trades", () => {
  const memberServer = read("lib/trading-signals/member-multi-view.server.ts");
  const memberPage = read("app/member/alpha-feed/page.tsx");
  const registry = read("lib/trading-signals/x-source-registry.server.ts");
  assert.doesNotMatch(memberServer + memberPage + registry, /placeBitget|submitOrder|tradingEligible\s*:\s*true|newEntriesEnabled/);
  assert.match(memberPage, /不覆盖MOOX正式方向，也不单独触发实盘/);
  assert.match(memberPage, /少于10个有效验证样本仍为0%权重/);
  assert.equal(multiViewVerifiedResearchWeight({ sampleCount: 9, weightedHitRatePct: 100 }), 0);
  assert.equal(multiViewVerifiedResearchWeight({ sampleCount: 100, weightedHitRatePct: 99 }), 3);
  const overlay = read("lib/trading-signals/external-analyst-overlay.ts");
  assert.match(overlay, /verifiedResearchWeightPct = multiViewVerifiedResearchWeight/);
  assert.match(overlay, /externalVerification \?\? \{ sampleCount: 0, weightedHitRatePct: null \}/);
  assert.doesNotMatch(overlay, /overlay\.direction === "NEUTRAL" \? 1 : 4/);
});

test("opposite labels are warnings rather than direction overrides", () => {
  const memberPage = read("app/member/alpha-feed/page.tsx");
  const advisory = read("lib/forecasts/external-view-advisory.server.ts");
  const access = read("lib/prediction-access-server.ts");
  assert.match(memberPage, /同向/);
  assert.match(memberPage, /相反/);
  assert.match(advisory, /存在反向证据，需谨慎并等待价格确认/);
  assert.match(advisory, /return \{ \.\.\.forecast, risks \}/);
  assert.doesNotMatch(advisory, /confidence\s*:|probabilities\s*:|direction\s*:\s*forecast/);
  assert.match(access, /applyExternalViewAdvisories/);
  assert.doesNotMatch(memberPage, /applyApprovedXOverlay|direction\s*=\s*latest\.direction/);
});

test("desktop technical and news notes are dated, anonymous and research-only", () => {
  const data = read("lib/data/external-indicators-20260823.ts");
  for (const token of ["EXT-BTC-TECH-20260822","EXT-NDX-WEEKLY-TECH-","EXT-NVDA-EVENT-20260826","EXT-MRVL-EVENT-20260827","本周技术背景（不是单日卦）","consensusEligible: false","visibility: \"internal\""]) {
    assert.ok(data.includes(token), token);
  }
  assert.doesNotMatch(data, /天星命理/);
  const combined = data + read("lib/forecasts/external-view-advisory.server.ts") + read("app/member/alpha-feed/page.tsx");
  assert.doesNotMatch(combined, /placeBitget|submitOrder|executeOrder|LIVE1000/);
});
