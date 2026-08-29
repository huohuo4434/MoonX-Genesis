import assert from "node:assert/strict";
import test from "node:test";
import { classifyCycleGapUrgency } from "../lib/admin/admin-home-operations.ts";

test("cycle gap urgency preserves lead time without hiding the gap", () => {
  assert.equal(classifyCycleGapUrgency({ today: "2026-08-30", periodStart: "2026-09-07" }), "PREPARATION");
  assert.equal(classifyCycleGapUrgency({ today: "2026-08-31", periodStart: "2026-09-07" }), "ACTION");
  assert.equal(classifyCycleGapUrgency({ today: "2026-09-03", periodStart: "2026-09-07" }), "ACTION");
  assert.equal(classifyCycleGapUrgency({ today: "2026-09-04", periodStart: "2026-09-07" }), "BLOCKER");
  assert.equal(classifyCycleGapUrgency({ today: "2026-09-07", periodStart: "2026-09-07" }), "BLOCKER");
});
