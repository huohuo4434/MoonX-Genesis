import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  hasVerifiedMonthlyCycleEvidence,
  hasVerifiedCurrentOrUpcomingWeeklyCycleEvidence,
  hasVerifiedWeeklyCycleEvidence,
} from "../lib/data/cycle-evidence-coverage.ts";

describe("verified cycle evidence coverage", () => {
  test("matches only the exact verified weekly asset and window", () => {
    for (const assetId of [
      "bitcoin",
      "eth",
      "nasdaq-100",
      "sp500",
      "shanghai-composite",
      "hang-seng",
      "mu",
      "msft",
    ]) {
      assert.equal(
        hasVerifiedWeeklyCycleEvidence(assetId, "2026-08-31", "2026-09-06"),
        true,
      );
    }

    assert.equal(
      hasVerifiedWeeklyCycleEvidence("bitcoin", "2026-09-07", "2026-09-13"),
      false,
    );
  });

  test("recognizes source coverage that is current or upcoming", () => {
    assert.equal(hasVerifiedCurrentOrUpcomingWeeklyCycleEvidence("mu", "2026-08-25"), true);
    assert.equal(hasVerifiedCurrentOrUpcomingWeeklyCycleEvidence("mu", "2026-09-07"), true);
  });

  test("keeps the supplied SPX, SHCOMP and HSTECH five-week sequence on file", () => {
    const windows = [
      ["2026-08-31", "2026-09-06"],
      ["2026-09-07", "2026-09-13"],
      ["2026-09-14", "2026-09-20"],
      ["2026-09-21", "2026-09-27"],
      ["2026-09-28", "2026-10-04"],
    ] as const;
    for (const assetId of ["sp500", "shanghai-composite", "hang-seng"]) {
      for (const [start, end] of windows) {
        assert.equal(hasVerifiedWeeklyCycleEvidence(assetId, start, end), true);
      }
    }
  });

  test("recognizes the complete ETH You-month chart as September evidence", () => {
    assert.equal(hasVerifiedMonthlyCycleEvidence("eth", "2026-09"), true);
    assert.equal(hasVerifiedMonthlyCycleEvidence("mu", "2026-09"), true);
    assert.equal(hasVerifiedMonthlyCycleEvidence("msft", "2026-09"), true);
    assert.equal(hasVerifiedMonthlyCycleEvidence("tencent", "2026-09"), true);
    assert.equal(hasVerifiedMonthlyCycleEvidence("eth", "2026-10"), false);
    assert.equal(hasVerifiedMonthlyCycleEvidence("bitcoin", "2026-09"), false);
  });
});
