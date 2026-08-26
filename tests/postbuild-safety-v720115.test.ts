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
