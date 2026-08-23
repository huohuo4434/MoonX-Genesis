import assert from "node:assert/strict";
import test from "node:test";
import {
  findTeacherPriorityLiuyaoSource,
  LIUYAO_QIMEN_PARALLEL_POLICY,
  listTeacherPriorityLiuyaoSources20260821,
  PREDICTION_SOURCE_PRIORITY,
  TEACHER_COURSE_COVERAGE_20260821,
} from "../lib/data/teacher-priority-liuyao-20260821";

test("teacher originals outrank user hexagrams inside the Liuyao source hierarchy", () => {
  assert.ok(PREDICTION_SOURCE_PRIORITY.TEACHER_ORIGINAL < PREDICTION_SOURCE_PRIORITY.USER_HEXAGRAM_TEACHER_METHOD);
  assert.ok(PREDICTION_SOURCE_PRIORITY.USER_HEXAGRAM_TEACHER_METHOD < PREDICTION_SOURCE_PRIORITY.PERIOD_PATH_DERIVATION);
});

test("Liuyao and Qimen are independent parallel forecasts", () => {
  assert.deepEqual(LIUYAO_QIMEN_PARALLEL_POLICY.methods, ["LIUYAO", "QIMEN"]);
  assert.equal(LIUYAO_QIMEN_PARALLEL_POLICY.agreement, "RAISE_CONFIDENCE");
  assert.equal(LIUYAO_QIMEN_PARALLEL_POLICY.disagreement, "SHOW_BOTH_AND_LOWER_CONFIDENCE");
  assert.equal(LIUYAO_QIMEN_PARALLEL_POLICY.missingEvidence, "DO_NOT_FABRICATE");
});

test("all eight priority course topics are inventoried without inventing missing directions", () => {
  assert.equal(TEACHER_COURSE_COVERAGE_20260821.length, 8);
  assert.ok(TEACHER_COURSE_COVERAGE_20260821.some((row) => row.asset === "WTI" && row.siteUse === "SOURCE_ARCHIVE_NO_DIRECTION_INVENTION"));
});

test("BTC, NDX and SHCOMP teacher stage records are active only inside their source windows", () => {
  assert.match(findTeacherPriorityLiuyaoSource("BTC", "2026-08-31")?.id ?? "", /BINGWU-BTC/);
  assert.match(findTeacherPriorityLiuyaoSource("NDX", "2026-08-24")?.id ?? "", /BINGWU-NDX/);
  assert.match(findTeacherPriorityLiuyaoSource("SSEC", "2026-09-01")?.id ?? "", /BINGWU-SHCOMP/);
  assert.equal(findTeacherPriorityLiuyaoSource("NDX", "2026-09-03"), null);
  assert.ok(listTeacherPriorityLiuyaoSources20260821().every((row) => row.specialPatterns.includes("SOURCE_AUTHORITY_TEACHER_ORIGINAL")));
});
