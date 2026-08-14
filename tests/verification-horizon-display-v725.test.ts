import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DAILY_PUBLIC_DETAIL_LIMIT,
  selectPublicVerificationDetails,
} from "../lib/accuracy/verification-display-policy";

test("daily compact view is recent-first and never outcome-selected", () => {
  const rows = Array.from({ length: 15 }, (_, index) => ({
    id: String(index),
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    period: "DAILY" as const,
    result: index === 14 ? "MISS" : "FULL_HIT",
  }));
  const selected = selectPublicVerificationDetails(rows, "DAILY");
  assert.equal(selected.visible.length, DAILY_PUBLIC_DETAIL_LIMIT);
  assert.equal(selected.archivedCount, 3);
  assert.equal(selected.visible[0]?.result, "MISS");
  assert.deepEqual(selected.visible.map((row) => row.date), [...selected.visible.map((row) => row.date)].sort().reverse());
});

test("weekly and monthly views are not compacted", () => {
  const weekly = Array.from({ length: 20 }, (_, index) => ({ id: `w${index}`, date: `2026-${String(index + 1).padStart(2, "0")}-01`, period: "WEEKLY" as const }));
  assert.equal(selectPublicVerificationDetails(weekly, "WEEKLY").visible.length, 20);
  assert.equal(selectPublicVerificationDetails([], "MONTHLY").archivedCount, 0);
});

test("verification UI exposes three horizons and discloses outcome-neutral selection", () => {
  const ui = fs.readFileSync(path.join(process.cwd(), "components/verification/PublicVerificationCenter.tsx"), "utf8");
  assert.match(ui, /\["DAILY", "WEEKLY", "MONTHLY"\]/);
  assert.match(ui, /不按命中结果挑选/);
  assert.match(ui, /月度验证样本将在完整月份结束/);
  assert.match(ui, /selectPublicVerificationDetails/);
  assert.doesNotMatch(ui, /filter\([^\n]*(FULL_HIT|MISS)[^\n]*\).*slice/s);
});
