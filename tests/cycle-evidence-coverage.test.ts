import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  hasVerifiedMonthlyCycleEvidence,
  hasVerifiedWeeklyCycleEvidence,
} from "../lib/data/cycle-evidence-coverage.ts";

describe("verified cycle evidence coverage", () => {
  test("matches only the exact verified weekly asset and window", () => {
    for (const assetId of ["bitcoin", "eth", "nasdaq-100"]) {
      assert.equal(
        hasVerifiedWeeklyCycleEvidence(assetId, "2026-08-31", "2026-09-06"),
        true,
      );
    }

    assert.equal(
      hasVerifiedWeeklyCycleEvidence("sp500", "2026-08-31", "2026-09-06"),
      false,
    );
    assert.equal(
      hasVerifiedWeeklyCycleEvidence("bitcoin", "2026-09-07", "2026-09-13"),
      false,
    );
  });

  test("recognizes the complete ETH You-month chart as September evidence", () => {
    assert.equal(hasVerifiedMonthlyCycleEvidence("eth", "2026-09"), true);
    assert.equal(hasVerifiedMonthlyCycleEvidence("eth", "2026-10"), false);
    assert.equal(hasVerifiedMonthlyCycleEvidence("bitcoin", "2026-09"), false);
  });
});
