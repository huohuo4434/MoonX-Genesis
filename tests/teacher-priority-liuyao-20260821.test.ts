import assert from "node:assert/strict";
import test from "node:test";
import {
  findTeacherPriorityLiuyaoSource,
  LIUYAO_QIMEN_PARALLEL_POLICY,
  listTeacherPriorityLiuyaoSources20260821,
  PREDICTION_SOURCE_PRIORITY,
  TEACHER_COURSE_COVERAGE_20260821,
  CONDITIONAL_LIUYAO_AUTHORITY_POLICY,
} from "../lib/data/teacher-priority-liuyao-20260821";

test("Bingwu uniquely outranks Wolf and user while Wolf and user remain equal", () => {
  assert.ok(PREDICTION_SOURCE_PRIORITY.BINGWU_TEACHER_ORIGINAL < PREDICTION_SOURCE_PRIORITY.WOLF_TEACHER_ORIGINAL);
  assert.equal(PREDICTION_SOURCE_PRIORITY.WOLF_TEACHER_ORIGINAL, PREDICTION_SOURCE_PRIORITY.USER_HEXAGRAM_TEACHER_METHOD);
  assert.ok(PREDICTION_SOURCE_PRIORITY.USER_HEXAGRAM_TEACHER_METHOD < PREDICTION_SOURCE_PRIORITY.PERIOD_PATH_DERIVATION);
});

test("Bingwu is uniquely first while Wolf and user are equal-rank before lock", () => {
  assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.uniquePrioritySourceKind, "BINGWU_TEACHER");
  assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.defaultWolfWeightPct, 50);
  assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.defaultUserWeightPct, 50);
  assert.deepEqual(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.requiredTieBreakLayers, ["QIMEN", "ANALYST_MAJORITY", "CHAN"]);
  assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.externalLayersSetDirectionDirectly, false);
  assert.equal(CONDITIONAL_LIUYAO_AUTHORITY_POLICY.lockedRecordsRemainImmutable, true);
});

test("Liuyao and Qimen are independent parallel forecasts", () => {
  assert.deepEqual(LIUYAO_QIMEN_PARALLEL_POLICY.methods, ["LIUYAO", "QIMEN"]);
  assert.equal(LIUYAO_QIMEN_PARALLEL_POLICY.agreement, "RAISE_CONFIDENCE");
  assert.equal(LIUYAO_QIMEN_PARALLEL_POLICY.disagreement, "SHOW_BOTH_AND_LOWER_CONFIDENCE");
  assert.equal(LIUYAO_QIMEN_PARALLEL_POLICY.missingEvidence, "DO_NOT_FABRICATE");
});

test("priority course topics include the latest BTC, gold, SOXL and SNDK sources without inventing missing directions", () => {
  assert.equal(TEACHER_COURSE_COVERAGE_20260821.length, 12);
  assert.ok(TEACHER_COURSE_COVERAGE_20260821.some((row) => row.asset === "WTI" && row.siteUse === "SOURCE_ARCHIVE_NO_DIRECTION_INVENTION"));
  assert.ok(TEACHER_COURSE_COVERAGE_20260821.some((row) => row.code === "BINGWU-BTC-TARGET-20260825"));
  assert.ok(TEACHER_COURSE_COVERAGE_20260821.some((row) => row.code === "BINGWU-GOLD-2M-20260825"));
  assert.ok(TEACHER_COURSE_COVERAGE_20260821.some((row) => row.code === "BINGWU-SOXL-2M-20260825"));
  assert.ok(TEACHER_COURSE_COVERAGE_20260821.some((row) => row.code === "BINGWU-SNDK-3M-20260707"));
});

test("BTC, NDX and SHCOMP teacher stage records are active only inside their source windows", () => {
  assert.match(findTeacherPriorityLiuyaoSource("BTC", "2026-08-31")?.id ?? "", /BINGWU-BTC/);
  assert.match(findTeacherPriorityLiuyaoSource("NDX", "2026-08-24")?.id ?? "", /BINGWU-NDX/);
  assert.match(findTeacherPriorityLiuyaoSource("SSEC", "2026-09-01")?.id ?? "", /BINGWU-SHCOMP/);
  assert.equal(findTeacherPriorityLiuyaoSource("NDX", "2026-09-03"), null);
  assert.ok(listTeacherPriorityLiuyaoSources20260821().every((row) => row.specialPatterns.includes("SOURCE_AUTHORITY_TEACHER_ORIGINAL")));
});

test("latest teacher phases own BTC, gold and SOXL daily derivation inside their exact windows", () => {
  const btc = findTeacherPriorityLiuyaoSource("BTC", "2026-09-07");
  assert.equal(btc?.id, "TL-BINGWU-BTC-TARGET-20260824-V2");
  assert.equal(btc?.weeklyDirection, "震荡上涨");
  assert.match(btc?.weeklyPath ?? "", /9月10日前趋势仍向上/);

  assert.equal(findTeacherPriorityLiuyaoSource("GLD", "2026-09-06")?.weeklyDirection, "震荡上涨");
  assert.equal(findTeacherPriorityLiuyaoSource("GOLD", "2026-09-07")?.weeklyDirection, "震荡下跌");
  assert.equal(findTeacherPriorityLiuyaoSource("GOLD", "2026-10-08")?.weeklyDirection, "震荡上涨");

  assert.equal(findTeacherPriorityLiuyaoSource("SOX", "2026-09-06")?.weeklyDirection, "震荡");
  assert.equal(findTeacherPriorityLiuyaoSource("SOXL", "2026-09-07")?.weeklyDirection, "震荡上涨");
  assert.equal(findTeacherPriorityLiuyaoSource("SOXL", "2026-10-08")?.weeklyDirection, "震荡");

  assert.equal(findTeacherPriorityLiuyaoSource("SNDK", "2026-09-06"), null);
  assert.equal(findTeacherPriorityLiuyaoSource("SNDK", "2026-09-07")?.weeklyDirection, "震荡上涨");
  assert.match(findTeacherPriorityLiuyaoSource("SNDK", "2026-10-07")?.weeklyPath ?? "", /大幅上涨/);
});
