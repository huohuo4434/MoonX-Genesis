import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildAdminCycleGapSummary,
  summarizeConsultationQueue,
} from "../lib/admin/admin-home-operations.ts";

describe("admin home operations", () => {
  test("shows the exact next preparation week and next calendar month", () => {
    const summary = buildAdminCycleGapSummary(new Date("2026-08-23T09:00:00+08:00"));

    assert.equal(summary.weeklyStart, "2026-08-31");
    assert.equal(summary.weeklyEnd, "2026-09-06");
    assert.equal(summary.monthlyId, "2026-09");
    assert.equal(summary.monthlyLabel, "2026年9月");
  });

  test("does not falsely mark a complete HSTECH month as missing", () => {
    const summary = buildAdminCycleGapSummary(new Date("2026-08-23T09:00:00+08:00"));
    const hstech = summary.items.find((item) => item.assetId === "hang-seng");
    const eth = summary.items.find((item) => item.assetId === "eth");
    const silver = summary.items.find((item) => item.assetId === "silver");

    assert.ok(hstech);
    assert.equal(hstech.weeklyMissing, true);
    assert.equal(hstech.monthlyState, null);
    assert.equal(eth?.monthlyState, "INCOMPLETE");
    assert.equal(silver?.monthlyState, "MISSING");
  });

  test("counts only consultation requests that still need action", () => {
    const summary = summarizeConsultationQueue([
      { kind: "LIUYAO", status: "SUBMITTED" },
      { kind: "LIUYAO", status: "HUMAN_REVIEW" },
      { kind: "BAZI", status: "NEEDS_INFO" },
      { kind: "BAZI", status: "SYSTEM_FAILED" },
      { kind: "LIUYAO", status: "APPROVED" },
      { kind: "LIUYAO", status: "RESERVED" },
    ]);

    assert.deepEqual(summary, {
      total: 4,
      liuyao: 2,
      bazi: 2,
      awaitingDraft: 1,
      awaitingReview: 1,
      needsInfo: 1,
      failed: 1,
    });
  });
});
