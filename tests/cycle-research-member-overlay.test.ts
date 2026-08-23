import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMemberCycleResearchOverlays } from "@/lib/research/cycle-research-member-overlay.server";

describe("member cycle research projection", () => {
  it("allow-lists safe fields and exposes alignment versus divergence", () => {
    const overlays = getMemberCycleResearchOverlays();
    assert.equal(overlays.length, 2);
    assert.equal(overlays[0]?.relationship, "ALIGNED");
    assert.equal(overlays[1]?.relationship, "DIVERGENT");
    assert.equal(overlays[0]?.sourceDetailsExplicit, true);
    assert.equal(overlays[0]?.invalidationExplicit, false);
  });

  it("never sends internal source identity or URL to the member client", () => {
    const payload = JSON.stringify(getMemberCycleResearchOverlays()).toLowerCase();
    assert.doesNotMatch(payload, /agentmat/);
    assert.doesNotMatch(payload, /substack\.com/);
    assert.doesNotMatch(payload, /internalsourceref/);
    assert.doesNotMatch(payload, /https?:\/\//);
  });
});
