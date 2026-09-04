import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { memberSeptemberOutlook as view, memberSectorOutlook as sector } from "../lib/presentation/member-september-outlook";
import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as record, MEMBER_SEPTEMBER_ROTATION_REPORT_HISTORY as history } from "../lib/data/member-september-rotation-report-20260826";
import { MEMBER_SOURCE_CROSS_CHECK_20260904 as research } from "../lib/data/member-source-cross-check-20260901";

test("member copy states an outlook without source-processing narration in either language", () => {
  assert.doesNotMatch(JSON.stringify({ view, sector }), /新资料|月度讲座|本轮复核|本批|新奇门|同一来源|来源继续|来源偏好|口头|直播|吴老师|丙午|金兔子|new evidence|monthly talk|live Qimen|cross-check|verbal|sourceRef|sourceFamily|internalSource/i);
  const page = readFileSync("app/member/sector-resonance/page.tsx", "utf8");
  const component = readFileSync("components/member/MemberSeptemberRotationReport.tsx", "utf8");
  assert.match(page, /时间：/);
  assert.match(page, /应对：/);
  assert.doesNotMatch(`${page}${component}`, /原判断／覆盖状态|本轮复核|RESEARCH CROSS-CHECK|本批资料|cyclePattern|\.revisionReason/);
  assert.match(component, /memberSeptemberOutlook as report/);
  const board = readFileSync("components/conviction/SectorResonanceBoard.tsx", "utf8");
  assert.doesNotMatch(board, /QimenWeeklyCrossCheckPanel|WEEKLY CROSS-CHECK|网站现有方向|合并后怎么读/);
  assert.match(board, /<GroupTable/);
});

test("editorial view preserves coverage, directions, risk windows, confidence and invalidation", () => {
  assert.deepEqual(sector.rows.map((r) => r.asset), research.rows.map((r) => r.asset));
  assert.equal(view.version, record.version);
  assert.deepEqual(view.riskWindow, record.qimenMonthlyUpdate.riskWindow);
  assert.deepEqual(view.riskItems.map((r) => r.id), record.qimenMonthlyUpdate.items.map((r) => r.id));
  assert.deepEqual(view.primaryItems.map((r) => [r.id, r.confidenceZh]), record.primaryUpdate.items.map((r) => [r.id, r.confidenceZh]));
  assert.deepEqual(view.confidenceItems.map((r) => [r.id, r.index, r.max]), record.confidenceCalibration.items.map((r) => [r.id, r.index, r.max]));
  for (const asset of record.assets) {
    const shown = view.assets.find((r) => r.symbol === asset.symbol)!;
    for (const key of ["directionZh", "directionEn", "windowZh", "windowEn", "confirmationZh", "confirmationEn", "invalidationZh", "invalidationEn"] as const) assert.equal(shown[key], asset[key]);
  }
  assert.ok(view.riskItems.every((r) => r.usageZh && r.usageEn));
  assert.match(view.assets[0].conclusionZh, /持续性尚不确定/);
  assert.match(view.assets[3].conclusionZh, /月底反弹待确认/);
  assert.match(sector.rows[5].action, /不做日周交易/);
  assert.match(sector.rows[7].outlook, /不做日周预测/);
});

test("member scan view has bounded copy, with optional details closed by default", () => {
  for (const row of sector.rows) {
    assert.ok(row.outlook.length + row.rhythm.length + row.action.length <= 110, row.asset);
  }
  for (const action of view.executionZh) assert.ok(action.length <= 50);
  const component = readFileSync("components/member/MemberSeptemberRotationReport.tsx", "utf8");
  assert.match(component, /<details[^>]*data-risk-details/);
  assert.match(component, /<details[^>]*data-other-outlooks/);
  assert.doesNotMatch(component, /<details[^>]*\bopen\b|item\.boundary|item\.reason/);
  assert.match(component, /asset\.invalidationZh/);
  const weekly = readFileSync("components/conviction/SectorResonanceBoard.tsx", "utf8");
  const daily = readFileSync("components/conviction/DailySectorResonanceBoard.tsx", "utf8");
  assert.doesNotMatch(weekly + daily, /六爻详解顺序|首屏不再|不冒充|不虚构|不能越级|不从长周期|row\.longCycle/);
});

test("internal evidence and published historical copy remain available unchanged", () => {
  assert.match(research.rows[3].review, /新资料支持/);
  assert.match(record.qimenMonthlyUpdate.summaryZh, /月度讲座/);
  assert.equal(history.length, 4);
  assert.match(view.titleZh, /易老师/);
  assert.doesNotMatch(JSON.stringify(view), /独家原创|从未参考|100%|guaranteed profit/i);
});
