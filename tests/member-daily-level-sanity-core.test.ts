import test from "node:test";
import assert from "node:assert/strict";
import {
  isPlausibleMemberTechnicalScale,
  numericLevelValues,
} from "@/lib/forecasts/member-daily-level-sanity-core";

test("HSTECH rejects ETF-scale support and resistance", () => {
  assert.equal(isPlausibleMemberTechnicalScale("HSTECH", [4.5, 4.7]), false);
  assert.equal(isPlausibleMemberTechnicalScale("3033.HK", [4.5, 4.7]), false);
  assert.equal(isPlausibleMemberTechnicalScale("HSTECH", []), false);
});

test("HSTECH accepts index-scale levels and parses formatted ranges", () => {
  assert.equal(isPlausibleMemberTechnicalScale("HSTECH", [4480, 4660]), true);
  assert.deepEqual(numericLevelValues("支撑：4,480—4,520点"), [4480, 4520]);
});

test("other assets keep their native price scale", () => {
  assert.equal(isPlausibleMemberTechnicalScale("SILVER", [4.5, 4.7]), true);
});
