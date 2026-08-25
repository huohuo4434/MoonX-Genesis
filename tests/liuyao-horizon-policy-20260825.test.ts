import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLiuyaoPeriod,
  getLiuyaoHorizonRule,
  LIUYAO_HORIZON_RULES,
  LIUYAO_REQUIRED_HORIZONS,
  shouldCreateRoutineLiuyaoGap,
} from "../lib/research/liuyao-horizon-policy";
import { RESEARCH_AUTHORITY_CHAIN } from "../lib/research/research-protocol";
import {
  MOOX_DAILY_ANALYSIS_POLICY,
  MOOX_PREDICTION_GOVERNANCE_VERSION,
  MOOX_PREDICTION_LAYERS,
} from "../lib/forecasts/prediction-governance";

test("year month week form the required trunk while quarter stays optional", () => {
  assert.deepEqual(LIUYAO_HORIZON_RULES.map((rule) => rule.kind), ["YEAR", "QUARTER", "MONTH", "WEEK"]);
  assert.deepEqual(LIUYAO_REQUIRED_HORIZONS, ["YEAR", "MONTH", "WEEK"]);
  assert.equal(shouldCreateRoutineLiuyaoGap("QUARTER"), false);
  assert.equal(getLiuyaoHorizonRule("QUARTER").requirement, "OPTIONAL_BRIDGE");
  assert.equal(getLiuyaoHorizonRule("WEEK").maySetOfficialDirection, true);
  assert.equal(getLiuyaoHorizonRule("YEAR").maySetOfficialDirection, false);
  assert.ok(LIUYAO_HORIZON_RULES.every((rule) => !rule.fileNameTemplate.includes("日卦")));
});

test("period formatting is explicit and idempotent", () => {
  assert.equal(formatLiuyaoPeriod("MONTH", "2026年9月"), "月卦｜2026年9月");
  assert.equal(formatLiuyaoPeriod("WEEK", "周卦｜2026-08-31至2026-09-06"), "周卦｜2026-08-31至2026-09-06");
  assert.equal(formatLiuyaoPeriod("YEAR", "  "), "");
});

test("research protocol no longer promotes Qimen over Liuyao direction authority", () => {
  assert.match(RESEARCH_AUTHORITY_CHAIN[0], /年卦.*月卦/);
  assert.match(RESEARCH_AUTHORITY_CHAIN[1], /周卦.*正式方向/);
  assert.match(RESEARCH_AUTHORITY_CHAIN[2], /奇门.*时间窗口/);
  assert.doesNotMatch(RESEARCH_AUTHORITY_CHAIN.join("\n"), /奇门：第一方向/);
  assert.doesNotMatch(RESEARCH_AUTHORITY_CHAIN.join("\n"), /六爻：辅助确认/);
  assert.equal(MOOX_PREDICTION_GOVERNANCE_VERSION, "2026-08-25.v4");
  assert.match(MOOX_PREDICTION_LAYERS[0].authorityZh, /季卦只在.*按需补充/);
  assert.equal(MOOX_DAILY_ANALYSIS_POLICY.requiresDailyHexagram, false);
});
