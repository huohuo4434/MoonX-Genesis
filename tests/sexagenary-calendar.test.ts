import test from "node:test";
import assert from "node:assert/strict";
import { getSexagenaryDay, listDatesByBranches } from "../lib/calendar/sexagenary-calendar";

test("sexagenary reference and adjacent dates are deterministic", () => {
  assert.equal(getSexagenaryDay("2026-07-30").label, "乙巳日");
  assert.equal(getSexagenaryDay("2026-07-31").label, "丙午日");
  assert.equal(getSexagenaryDay("2026-08-08").label, "甲寅日");
  assert.equal(getSexagenaryDay("2026-08-09").label, "乙卯日");
});

test("branch windows are converted to concrete dates", () => {
  const rows = listDatesByBranches({
    startDate: "2026-08-01",
    endDate: "2026-08-16",
    branches: ["亥", "卯", "未"],
  });
  assert.deepEqual(rows.map((r) => [r.date, r.branch]), [
    ["2026-08-01", "未"],
    ["2026-08-05", "亥"],
    ["2026-08-09", "卯"],
    ["2026-08-13", "未"],
  ]);
});
