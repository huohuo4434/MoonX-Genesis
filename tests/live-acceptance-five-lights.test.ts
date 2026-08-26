import test from "node:test";
import assert from "node:assert/strict";
import { deriveLiveAcceptanceLights } from "../lib/health/live-acceptance-core";

const now = new Date("2026-08-27T00:00:00.000Z");

test("five live probes distinguish healthy, paused and broken systems", () => {
  const lights = deriveLiveAcceptanceLights({
    now,
    databaseOk: true,
    content: { generatedAt: "2026-08-26T23:50:00.000Z", status: "OK", problemKeys: [] },
    verification: { state: "ACTIVE", generatedSourceHealthy: true, syncMissing: 0, latestVerifiedAt: "2026-08-26T23:00:00.000Z" },
    collector: { status: "HEALTHY", ageMinutes: 10, accountsSucceeded: 29, accountsAttempted: 29 },
    trading: { databaseReady: true, runtimePresent: true, serverHealthy: false, paused: true, pauseReason: "SECRET_DETAIL", heartbeatAgeSeconds: 90 },
  });
  assert.equal(lights.length, 5);
  assert.deepEqual(lights.map((item) => item.status), ["GREEN", "GREEN", "GREEN", "GREEN", "YELLOW"]);
  assert.doesNotMatch(lights[4]!.detailZh, /SECRET_DETAIL/);
});

test("paused runtime with lost heartbeat and incomplete collector scans are not green", () => {
  const lights = deriveLiveAcceptanceLights({
    now,
    databaseOk: true,
    content: { generatedAt: "2026-08-27T00:10:00.000Z", status: "OK", problemKeys: [] },
    verification: { state: "ACTIVE", generatedSourceHealthy: true, syncMissing: 0, latestVerifiedAt: null },
    collector: { status: "HEALTHY", ageMinutes: 2, accountsSucceeded: 20, accountsAttempted: 29 },
    trading: { databaseReady: true, runtimePresent: true, serverHealthy: false, paused: true, pauseReason: "", heartbeatAgeSeconds: 900 },
  });
  assert.equal(lights[1]!.status, "RED", "future content timestamps must fail closed");
  assert.equal(lights[3]!.status, "YELLOW");
  assert.equal(lights[4]!.status, "RED");
});

test("stale content, sync gaps and missing runtime fail visibly", () => {
  const lights = deriveLiveAcceptanceLights({
    now,
    databaseOk: false,
    content: { generatedAt: "2026-08-26T20:00:00.000Z", status: "ATTENTION", problemKeys: ["today"] },
    verification: { state: "SYNC_GAP", generatedSourceHealthy: true, syncMissing: 3, latestVerifiedAt: null },
    collector: { status: "STALE", ageMinutes: 90, accountsSucceeded: 0, accountsAttempted: 29 },
    trading: { databaseReady: false, runtimePresent: false, serverHealthy: false, paused: false, pauseReason: "", heartbeatAgeSeconds: null },
  });
  assert.ok(lights.every((item) => item.status === "RED"));
});

test("normal verification sync grace is yellow instead of a false outage", () => {
  const lights = deriveLiveAcceptanceLights({
    now,
    databaseOk: true,
    content: { generatedAt: "2026-08-26T23:50:00.000Z", status: "OK", problemKeys: [] },
    verification: { state: "SYNCING", generatedSourceHealthy: true, syncMissing: 2, latestVerifiedAt: null },
    collector: { status: "HEALTHY", ageMinutes: 2, accountsSucceeded: 29, accountsAttempted: 29 },
    trading: { databaseReady: true, runtimePresent: true, serverHealthy: true, paused: false, pauseReason: "", heartbeatAgeSeconds: 30 },
  });
  assert.equal(lights[2]!.status, "YELLOW");
});
