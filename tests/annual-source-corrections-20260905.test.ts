import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import seed from "../data/teacher-knowledge-seed.json";
import { ANNUAL_SOURCE_REVIEW, correctAnnualCase, correctAnnualLesson, correctAnnualResearch } from "../lib/research/annual-source-corrections-20260905";
import type { TeacherCaseRecord, TeacherLessonRecord } from "../lib/teacher-knowledge/types";
import { listResearchRecords, getResearchRecord } from "../lib/data/research-records";
import { listAnnualForecastRoadmaps2026 } from "../lib/research/annual-forecast-roadmap-2026";

test("HSI correction matches exact case/source and preserves stored history and outcomes", () => {
  const raw = seed.cases.find(row => row.id === "seed_case_0002") as TeacherCaseRecord;
  const before = JSON.stringify(raw);
  const fixed = correctAnnualCase(raw);
  assert.equal(fixed.asset, "HSI");
  assert.equal(JSON.stringify(raw), before);
  assert.equal(fixed.validationStatus, raw.validationStatus);
  assert.equal(fixed.actualResult, raw.actualResult);
  assert.equal(correctAnnualCase(fixed), fixed);
  const unrelated = { ...raw, sourceLessonId: "another-lesson" };
  assert.equal(correctAnnualCase(unrelated), unrelated);
});

test("lesson assets and tags cannot continue feeding HSTECH; transcript unchanged", () => {
  const raw = seed.lessons.find(row => row.id === "seed_lesson_0009") as unknown as TeacherLessonRecord;
  const fixed = correctAnnualLesson(raw);
  assert.deepEqual(fixed.assets, ["HSI"]);
  assert.ok(!fixed.tags.includes("HSTECH"));
  assert.equal(fixed.rawTranscript, raw.rawTranscript);
  assert.deepEqual(raw.assets, ["HSTECH"]);
  assert.equal(correctAnnualLesson(fixed), fixed);
});

test("BTC current case removes unsupported ranking, recording the original conclusion", () => {
  const raw = seed.cases.find(row => row.id === "seed_case_0007") as TeacherCaseRecord;
  const fixed = correctAnnualCase(raw);
  assert.doesNotMatch(fixed.teacherConclusion, /次级/);
  assert.ok(fixed.validationNotes?.includes(raw.teacherConclusion));
  assert.match(raw.teacherConclusion, /次级/);
  assert.deepEqual(fixed.timingWindows, raw.timingWindows);
  assert.equal(correctAnnualCase(fixed), fixed);
});

test("research list and alias lookup correct all ranking displays, preserving scores/authority", async () => {
  const records = await listResearchRecords();
  const row = await getResearchRecord("MX-BTC-2026-ANNUAL-001");
  assert.ok(row);
  assert.equal(records.filter(item => item.id === "ORACLE-0009").length, 1);
  assert.doesNotMatch(JSON.stringify([row.summary, row.scenarios, row.turningWindows, row.monthlyActivation]), /次级|次級|secondary high/i);
  assert.equal(correctAnnualResearch(row), row);
  assert.deepEqual(row.scenarios?.map(item => item.probability), [65, 78, 60]);
  assert.ok(row.retrospectiveNotes?.some(note => note.zhCN.includes(ANNUAL_SOURCE_REVIEW.version)));
  const source = readFileSync(new URL("../lib/data/research-records.ts", import.meta.url), "utf8");
  assert.match(source, /2027年1月次级高点/); // immutable original is still present
  assert.ok(listAnnualForecastRoadmaps2026().every(item => item.historicalScoringEligible === false));
});

test("member pages render explicit cross-year amendment without new day signals or order wiring", () => {
  for (const page of ["annual-outlook", "key-dates"]) {
    const source = readFileSync(new URL(`../app/member/${page}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, /<BtcAnnualWindowAmendment/);
    assert.match(source, /getMemberDevicePageAccess/);
  }
  const component = readFileSync(new URL("../components/research/BtcAnnualWindowAmendment.tsx", import.meta.url), "utf8");
  assert.match(component, /review.btcEn/);
  assert.match(ANNUAL_SOURCE_REVIEW.btcZh, /2027年1月/);
  assert.match(ANNUAL_SOURCE_REVIEW.boundaryZh, /不是具体卖出日/);
  const store = readFileSync(new URL("../lib/teacher-knowledge/store.ts", import.meta.url), "utf8");
  assert.match(store, /store.cases.map\(correctAnnualCase\)/);
  assert.match(store, /store.lessons.map\(correctAnnualLesson\)/);
});
