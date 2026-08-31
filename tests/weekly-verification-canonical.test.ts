import assert from "node:assert/strict";
import test from "node:test";
import { selectCanonicalWeeklyVerificationRows } from "@/lib/accuracy/weekly-history-canonical";
import { listAllPublishedWeeklyAnalyses, listCanonicalPublishedWeeklyAnalyses } from "@/lib/data/weekly-analysis";

test("one pre-window locked weekly authority is selected without looking at the outcome", () => {
  const authorities = listCanonicalPublishedWeeklyAnalyses();
  const btc = authorities.filter((row) => row.assetId === "bitcoin" && row.weekStart === "2026-08-24");
  assert.deepEqual(btc.map((row) => row.id), ["WEEKLY-BTC-20260824-V6"]);
  assert.ok(authorities.length < listAllPublishedWeeklyAnalyses().length);

  const rows = [
    { weeklyAnalysisId: "WEEKLY-BTC-20260824-V5", assetId: "bitcoin", weekStart: "2026-08-24", weekEnd: "2026-08-30", result: "FULL_HIT" },
    { weeklyAnalysisId: "WEEKLY-BTC-20260824-V6", assetId: "bitcoin", weekStart: "2026-08-24", weekEnd: "2026-08-30", result: "MISS" },
  ];
  const selected = selectCanonicalWeeklyVerificationRows(rows, authorities);
  assert.equal(selected.length, 1);
  assert.equal(selected[0]!.weeklyAnalysisId, "WEEKLY-BTC-20260824-V6");
  assert.equal(selected[0]!.result, "MISS");
});

test("legacy cycles without a registered authority fall back to the highest version", () => {
  const rows = [
    { weeklyAnalysisId: "LEGACY-ABC-V1", assetId: "legacy", weekStart: "2026-01-05", weekEnd: "2026-01-11" },
    { weeklyAnalysisId: "LEGACY-ABC-V3", assetId: "legacy", weekStart: "2026-01-05", weekEnd: "2026-01-11" },
  ];
  assert.equal(selectCanonicalWeeklyVerificationRows(rows, [])[0]!.weeklyAnalysisId, "LEGACY-ABC-V3");
});
