import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(path), "utf8");

test("public acceptance probe is read-only, cached and returns whitelisted history", () => {
  const live = read("lib/health/live-acceptance.ts");
  assert.doesNotMatch(live, /ensureExternalAnalystTables|getStoredContentFreshnessReport|getXIntelligenceSnapshot|force:\s*true/);
  assert.match(live, /SELECT state_key, payload, updated_at/);
  assert.match(live, /getVerificationPipelineStatus\(now, \{ repairSchema: false \}\)/);
  assert.match(live, /expiresAt: now\.getTime\(\) \+ 30_000/);

  const route = read("app/api/health/acceptance/route.ts");
  assert.doesNotMatch(route, /report:\s*json/);
  assert.match(route, /acceptanceReportFreshness/);
  assert.match(route, /historicalAcceptance/);
});
