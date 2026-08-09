import assert from "node:assert/strict";
import test from "node:test";
import { getLiveCommissioningSafetyLimits } from "../lib/trading-signals/live-commissioning-safety";

test("post-resume first live commissioning remains capped at 0.05% risk and 30 minutes", () => {
  const limits = getLiveCommissioningSafetyLimits();
  assert.equal(limits.riskPerTradePct, 0.05);
  assert.equal(limits.maxHoldingMinutes, 30);
});
