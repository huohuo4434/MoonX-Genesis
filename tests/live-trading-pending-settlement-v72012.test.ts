import assert from "node:assert/strict";
import test from "node:test";
import { auditUnifiedLiveCustody } from "../lib/trading-signals/unified-live-custody-core";

test("authoritative matching exchange position settles a pending live slice", () => {
  const audit = auditUnifiedLiveCustody({
    snapshotAvailable: true,
    positions: [{
      positionKey: "ETHUSDT:LONG",
      symbol: "ETHUSDT",
      side: "LONG",
      quantity: 0.02,
    }],
    orders: [],
    slices: [{
      id: "live-pending-eth",
      symbol: "ETHUSDT",
      horizon: "MEDIUM",
      side: "LONG",
      status: "PENDING",
      quantity: 0.02,
      openedAt: new Date("2026-08-26T00:00:00.000Z"),
      maxHoldMinutes: 7 * 24 * 60,
      exchangePositionKey: null,
    }],
    now: new Date("2026-08-26T00:03:00.000Z"),
  });

  assert.deepEqual(audit.matchedPendingSlices.map((slice) => slice.id), ["live-pending-eth"]);
  assert.deepEqual(audit.siteOnlySlices, []);
  assert.equal(audit.freezeNewEntries, true, "missing exchange protection must still block new exposure");
});
