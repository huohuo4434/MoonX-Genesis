import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { EXTERNAL_ANALYST_VIEWPOINTS_20260901 } from "../lib/data/external-analyst-viewpoints-20260901";
import { MEMBER_SOURCE_CROSS_CHECK_20260901 } from "../lib/data/member-source-cross-check-20260901";
import { TEACHER02_LIUYAO_20260901 } from "../lib/data/teacher02-liuyao-20260901";
import { assessExternalViewpointCard, findDuplicateExternalViewpoints } from "../lib/research/external-viewpoint-card-core";

test("September 1 videos stay research only and preserve traceable conditions", () => {
  assert.equal(EXTERNAL_ANALYST_VIEWPOINTS_20260901.length, 4);
  assert.equal(findDuplicateExternalViewpoints(EXTERNAL_ANALYST_VIEWPOINTS_20260901).length, 0);
  const assessed = EXTERNAL_ANALYST_VIEWPOINTS_20260901.map(assessExternalViewpointCard);
  assert.ok(assessed.every((item) => item.accepted));
  assert.ok(assessed.every((item) => !item.forwardScoreEligible && item.tradingEligible === false));
  assert.ok(EXTERNAL_ANALYST_VIEWPOINTS_20260901.every((item) => item.status === "NOTE_ONLY" && item.consensusEligible === false));
});

test("mid-window Liuyao revision only covers the remaining dates and cannot rewrite history", () => {
  assert.equal(TEACHER02_LIUYAO_20260901.length, 2);
  for (const record of TEACHER02_LIUYAO_20260901) {
    assert.equal(record.forecastStart, "2026-09-02");
    assert.equal(record.forecastEnd, "2026-09-04");
    assert.equal(record.consensusEligible, false);
    assert.equal(record.verificationEligibility, "provisional");
    assert.ok(record.tags.includes("no-retroactive-edit"));
    assert.ok(record.tags.includes("no-auto-trade"));
  }
  assert.match(TEACHER02_LIUYAO_20260901.find((item) => item.assetId === "gold")?.summary.zhCN ?? "", /不回填8月31日与9月1日/);
  assert.match(TEACHER02_LIUYAO_20260901.find((item) => item.assetId === "silver")?.summary.zhCN ?? "", /基本一致/);
});

test("member cross-check is anonymous, conclusion-first, and never imports trading code", () => {
  assert.deepEqual(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.map((row) => row.asset), ["黄金", "白银", "纳指", "半导体", "特斯拉", "亚马逊"]);
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.find((row) => row.asset === "黄金")?.relation, "需要修正节奏");
  assert.equal(MEMBER_SOURCE_CROSS_CHECK_20260901.rows.find((row) => row.asset === "白银")?.relation, "一致");
  const memberData = readFileSync(resolve(process.cwd(), "lib/data/member-source-cross-check-20260901.ts"), "utf8");
  const memberPage = readFileSync(resolve(process.cwd(), "app/member/sector-resonance/page.tsx"), "utf8");
  assert.doesNotMatch(memberData, /狼叔|NaNa|NANA|博主/);
  assert.doesNotMatch(`${memberData}\n${memberPage}`, /lib\/trading-signals|lib\/bitget|submitOrder|createOrder/);
  assert.match(memberPage, /MEMBER_SOURCE_CROSS_CHECK_20260901/);
});
