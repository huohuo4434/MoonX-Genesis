import test from "node:test";
import assert from "node:assert/strict";
import { isCurrentHeartbeatGeneration } from "@/lib/auth/member-device-heartbeat-core";

test("an older heartbeat response cannot overwrite a newer blocking response", () => {
  assert.equal(isCurrentHeartbeatGeneration({ responseGeneration: 1, latestGeneration: 2, cancelled: false }), false);
});

test("only the latest live heartbeat may update the member-content guard", () => {
  assert.equal(isCurrentHeartbeatGeneration({ responseGeneration: 2, latestGeneration: 2, cancelled: false }), true);
  assert.equal(isCurrentHeartbeatGeneration({ responseGeneration: 2, latestGeneration: 2, cancelled: true }), false);
});
