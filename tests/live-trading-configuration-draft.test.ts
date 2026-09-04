import test from "node:test";
import assert from "node:assert/strict";
import { parseLiveConfigurationDraft, readLiveConfigurationDraftEvent } from "../lib/trading-signals/live-configuration-draft-core";

test("continuous duration is explicit and budget is not fixed at 1000", () => {
  for (const capitalUsdt of ["0.01", "500", "1000", "2000.50", "100000"]) {
    const draft = parseLiveConfigurationDraft({ durationMode: "CONTINUOUS", durationDays: null, capitalUsdt });
    assert.equal(draft.durationDays, null); assert.equal(draft.state, "PENDING");
    assert.equal(draft.capitalUsdt, Number(capitalUsdt).toFixed(2));
    assert.equal(draft.leverage, 2, "legacy configuration keeps the existing official cap");
    assert.equal("endsAt" in draft, false); assert.equal("initialEquityUsdt" in draft, false);
  }
  assert.equal(parseLiveConfigurationDraft({ durationMode: "FIXED", durationDays: 36525, capitalUsdt: "0500.1" }).capitalUsdt, "500.10");
  assert.equal(parseLiveConfigurationDraft({ durationMode: "CONTINUOUS", capitalUsdt: "90071992547409.91" }).capitalUsdt, "90071992547409.91");
  assert.throws(() => parseLiveConfigurationDraft({ durationMode: "CONTINUOUS", capitalUsdt: "90071992547409.92" }));
  assert.equal(parseLiveConfigurationDraft({ durationMode: "CONTINUOUS", capitalUsdt: "500", leverage: 1 }).leverage, 1);
});
test("strict amounts, durations and no execution fields at the boundary", () => {
  for (const capitalUsdt of [0, null, true, "", "0", "-1", "1e3", "Infinity", "NaN", " 1000", "1.001", "99999999999999.99"]) {
    assert.throws(() => parseLiveConfigurationDraft({ durationMode: "CONTINUOUS", capitalUsdt }));
  }
  for (const durationDays of [0, -1, 1.5, 36526, "30", null]) {
    assert.throws(() => parseLiveConfigurationDraft({ durationMode: "FIXED", durationDays, capitalUsdt: "500" }));
  }
  for (const extra of [{ mode: "LIVE" }, { state: "ACTIVE" }, { maxDrawdown: 0 }, { initialEquityUsdt: 5000 }]) {
    assert.throws(() => parseLiveConfigurationDraft({ durationMode: "CONTINUOUS", capitalUsdt: "500", ...extra }));
  }
  assert.throws(() => parseLiveConfigurationDraft({ durationMode: "CONTINUOUS", durationDays: 30, capitalUsdt: "500" }));
  for (const leverage of [0, 3, 1.5, "2", null]) {
    assert.throws(() => parseLiveConfigurationDraft({ durationMode: "CONTINUOUS", capitalUsdt: "500", leverage }));
  }
});
test("stored configuration is pending only, corruption cannot become defaults", () => {
  assert.deepEqual(readLiveConfigurationDraftEvent(null), { draft: null, revision: null, savedAt: null, applied: false });
  const draft = parseLiveConfigurationDraft({ durationMode: "CONTINUOUS", capitalUsdt: "500" });
  const event = { id: "revision", createdAt: new Date("2026-09-05T00:00:00Z"), detail: JSON.stringify({ ...draft, actorId: "private", previousRevision: null }) };
  const view = readLiveConfigurationDraftEvent(event);
  assert.equal(view.applied, false); assert.equal(view.revision, "revision");
  assert.doesNotMatch(JSON.stringify(view), /private|actorId/);
  assert.throws(() => readLiveConfigurationDraftEvent({ ...event, detail: "corrupt" }));
  assert.throws(() => readLiveConfigurationDraftEvent({ ...event, detail: JSON.stringify({ ...draft, state: "ACTIVE" }) }));
});
