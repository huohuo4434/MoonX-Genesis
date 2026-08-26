import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DATED_EXTERNAL_INDICATORS_20260826, externalIndicatorResearchRecords20260826 } from "../lib/data/external-indicators-20260826";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("Aug 26 desktop research is dated, conditional and anonymous", () => {
  assert.ok(DATED_EXTERNAL_INDICATORS_20260826.length >= 10);
  assert.ok(DATED_EXTERNAL_INDICATORS_20260826.every((row) => /^2026-08-(26|27|28)$/.test(row.date)));
  assert.ok(DATED_EXTERNAL_INDICATORS_20260826.every((row) => row.analystAlias.endsWith("分析师")));
  assert.ok(DATED_EXTERNAL_INDICATORS_20260826.every((row) => row.reason.length >= 24));
  assert.ok(DATED_EXTERNAL_INDICATORS_20260826.filter((row) => row.asset === "BTC").every((row) => row.condition));
  assert.ok(DATED_EXTERNAL_INDICATORS_20260826.filter((row) => row.id.includes("VOLUME-RISK") || row.id.includes("MACD-RANGE")).every((row) => row.direction === "NEUTRAL"));

  const memberSafePayload = JSON.stringify(DATED_EXTERNAL_INDICATORS_20260826);
  for (const privateName of ["环球视野", "乔乔", "队长", "高山", "RINO"]) {
    assert.doesNotMatch(memberSafePayload, new RegExp(privateName, "i"));
  }
});

test("new records stay research-only and do not enter long-horizon consensus", () => {
  assert.equal(externalIndicatorResearchRecords20260826.length, 3);
  for (const record of externalIndicatorResearchRecords20260826) {
    assert.equal(record.consensusEligible, false);
    assert.equal(record.excludeFromLongTermConsensus, true);
    assert.equal(record.visibility, "internal");
  }
});

test("member heatmap and daily warnings consume the combined desktop feed", () => {
  const registry = read("lib/data/dated-external-indicators.ts");
  const memberPage = read("app/member/alpha-feed/page.tsx");
  const advisory = read("lib/forecasts/external-view-advisory.server.ts");
  const combined = registry + memberPage + advisory;
  assert.match(registry, /DATED_EXTERNAL_INDICATORS_20260826/);
  assert.match(memberPage, /DatedEvidenceSections/);
  assert.match(memberPage, /coveredAssetCount/);
  assert.match(memberPage, /!groups\.length && !datedRows\.length/);
  assert.match(memberPage, /getChinaDateKey/);
  assert.match(memberPage, /recentDatedAssetRows/);
  assert.match(memberPage, /row\.date >= earliestDate && row\.date <= todayKey/);
  assert.match(memberPage, /latestDataLabel/);
  assert.match(memberPage, /getChinaDateKey\(latestServerTimestamp\)/);
  assert.match(memberPage, /Number\.isNaN\(latestServerTimestamp\.getTime\(\)\)/);
  assert.doesNotMatch(memberPage, /lastPostAt\?\.slice\(0, 10\)/);
  assert.match(memberPage, /确认 \/ 失效/);
  assert.match(advisory, /DATED_EXTERNAL_INDICATORS\.map/);
  assert.match(advisory, /signal\.condition/);
  assert.match(advisory, /conditionBudget/);
  assert.doesNotMatch(combined, /placeBitget|submitOrder|executeOrder|newEntriesEnabled\s*=/);
});
