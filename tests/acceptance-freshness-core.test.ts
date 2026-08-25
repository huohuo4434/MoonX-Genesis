import test from "node:test";
import assert from "node:assert/strict";
import { acceptanceReportFreshness } from "@/lib/health/acceptance-freshness-core";

const servedAt = new Date("2026-08-26T00:00:00.000Z");

test("a report more than five minutes in the future is never current", () => {
  const status = acceptanceReportFreshness({ reportAt: "2026-08-26T00:06:00.000Z", servedAt });
  assert.equal(status.reportAgeSeconds, -360);
  assert.equal(status.stale, true);
  assert.equal(status.current, false);
});

test("small clock drift is tolerated while old and invalid reports stay historical", () => {
  assert.equal(acceptanceReportFreshness({ reportAt: "2026-08-26T00:04:00.000Z", servedAt }).current, true);
  assert.equal(acceptanceReportFreshness({ reportAt: "2026-08-24T23:59:59.000Z", servedAt }).current, false);
  assert.equal(acceptanceReportFreshness({ reportAt: "not-a-date", servedAt }).current, false);
});
