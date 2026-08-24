import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildWeeklyMarketSlots } from "@/lib/data/weekly-analysis";

test("weekly member payload exposes a curated BTC version change without internal revision history", () => {
  const btc = buildWeeklyMarketSlots(new Date("2026-08-25T09:00:00+08:00"))
    .flatMap((slot) => slot.kind === "published" ? [slot.analysis] : [])
    .find((row) => row.assetId === "bitcoin");

  assert.ok(btc);
  assert.equal(btc.version, 6);
  assert.match(btc.memberRevisionNotice?.previousLabelZh ?? "", /8月21日/);
  assert.match(btc.memberRevisionNotice?.previousSummaryZh ?? "", /短期高点/);
  assert.match(btc.memberRevisionNotice?.currentSummaryZh ?? "", /24日至25日先下探/);
  assert.equal("sourceIds" in btc, false);
  assert.equal("revisions" in btc, false);
});

test("weekly page puts the current version and revision chain before the long research cards", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "components/member/MemberWeeklyPage.tsx"),
    "utf8",
  );

  const glance = source.indexOf("本周一眼看懂");
  const detailGrid = source.indexOf("九大核心市场");
  assert.ok(glance >= 0);
  assert.ok(detailGrid > glance);
  assert.match(source, /版本变化/);
  assert.match(source, /当前正式版本/);
  assert.match(source, /修订原因/);
  assert.match(source, /失效条件/);
  assert.match(source, /展开概率、支撑压力与研究细节/);
});
