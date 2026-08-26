import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("weekly Liuyao seed registers the CLI server-only shim before dynamic app imports", () => {
  const script = source("scripts/seed-weekly-liuyao-sources.ts");
  const shim = script.indexOf('request === "server-only"');
  const storeImport = script.indexOf('await import("../lib/weekly-source/store")');
  assert.ok(shim >= 0 && storeImport > shim);
  assert.match(script, /require\.resolve\("\.\/shims\/server-only\.ts"\)/);
});

test("I Ching master-rule seed supplies its required deterministic id", () => {
  const script = source("scripts/seed-iching-engine.ts");
  assert.match(script, /masterRule\.create\([\s\S]*?data:\s*\{[\s\S]*?id: r\.ruleCode,/);
  const masterRuleCreate = script.slice(
    script.indexOf("prisma.masterRule.create"),
    script.indexOf("insertedRules++;"),
  );
  assert.doesNotMatch(masterRuleCreate, /createdBy: "seed"/);
});

test("production bootstrap never sends a payment test email", () => {
  const script = source("scripts/run-bootstrap-if-requested.ts");
  assert.match(script, /RUN_PAYMENT_EMAIL_TEST === "true"/);
  assert.match(script, /VERCEL_ENV !== "production"/);
  assert.match(script, /NODE_ENV !== "production"/);
  const gate = script.indexOf("if (allowPaymentEmailTest)");
  const send = script.indexOf('runStep("payment-email-test"');
  assert.ok(gate >= 0 && send > gate);
});

test("Vercel postbuild does not replay every legacy Supabase SQL migration", () => {
  const script = source("scripts/run-bootstrap-if-requested.ts");
  const skip = script.indexOf("if (onVercel)");
  const legacyRunner = script.indexOf('runStep("apply-migrations"');
  assert.ok(skip >= 0 && legacyRunner > skip);
  assert.match(script, /skipped legacy Supabase SQL replay/);
});

test("Vercel postbuild never generates, verifies or seeds forecast content", () => {
  const postbuild = source("scripts/run-postbuild-safe.ts");
  assert.doesNotMatch(postbuild, /seed-weekly-liuyao|seed-iching|seed-master-intelligence/);

  const bootstrap = source("scripts/run-bootstrap-if-requested.ts");
  assert.match(bootstrap, /RUN_BOOTSTRAP_CONTENT_MAINTENANCE === "true" && !onVercel/);
  const gate = bootstrap.indexOf("if (allowContentMaintenance)");
  for (const command of ["seed-daily-forecasts", "verify-review", "fix-hstech-index"]) {
    assert.ok(bootstrap.indexOf(command) > gate, `${command} must stay behind the explicit gate`);
  }
  assert.match(bootstrap, /independent cron\/manual jobs only/);
});
