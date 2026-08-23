import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("Substack research is excluded from every external-analyst trading overlay query", () => {
  const signals = read("lib/trading-signals/external-analyst-signals.ts");
  const exclusions = signals.match(/source <> 'SUBSTACK_CYCLE'/g) ?? [];

  assert.ok(exclusions.length >= 3, "all generic and source-specific overlay queries must exclude SUBSTACK_CYCLE");
});

test("Substack ingestion cannot call Bitget or become executable trading evidence", () => {
  const core = read("lib/research/substack-email-core.ts");
  const ingest = read("lib/research/substack-email-ingest.server.ts");
  const route = read("app/api/internal/substack-intelligence/ingest/route.ts");
  const combined = `${core}\n${ingest}\n${route}`;

  assert.match(core, /directTradingAllowed:\s*false/);
  assert.match(core, /directionAuthority:\s*false/);
  assert.match(core, /consensusEligible:\s*false/);
  assert.doesNotMatch(combined, /placeBitget|submitOrder|executeOrder|LIVE1000|paptrading/);
  assert.doesNotMatch(combined, /lib\/bitget|trading-plan|live-execution/);
});
