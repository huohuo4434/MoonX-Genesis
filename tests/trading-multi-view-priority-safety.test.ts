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
  assert.match(memberPage, /未完成验证前权重 0%/);
  assert.equal(multiViewVerifiedResearchWeight({ sampleCount: 9, weightedHitRatePct: 100 }), 0);
  assert.equal(multiViewVerifiedResearchWeight({ sampleCount: 100, weightedHitRatePct: 99 }), 3);
  const overlay = read("lib/trading-signals/external-analyst-overlay.ts");
  assert.match(overlay, /verifiedResearchWeightPct = multiViewVerifiedResearchWeight/);
  assert.match(overlay, /externalVerification \?\? \{ sampleCount: 0, weightedHitRatePct: null \}/);
  assert.doesNotMatch(overlay, /overlay\.direction === "NEUTRAL" \? 1 : 4/);
});

test("opposite labels are warnings rather than direction overrides", () => {
  const memberPage = read("app/member/alpha-feed/page.tsx");
  assert.match(memberPage, /return external === moox \? "SAME" : "OPPOSITE"/);
  assert.match(memberPage, /与MOOX相反/);
  assert.doesNotMatch(memberPage, /applyApprovedXOverlay|direction\s*=\s*latest\.direction/);
});
