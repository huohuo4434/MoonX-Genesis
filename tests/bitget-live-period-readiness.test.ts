// Bitget live safety regressions: offline only, no exchange requests.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { livePeriodReadiness, requireCurrentLiveEquity, readLiveUsdtEquity } from "../lib/bitget/live-period-readiness-core";

const row = { status: "ACTIVE", startedAt: "2026-09-01T00:00:00Z", endsAt: "2026-09-06T03:00:00Z" };
test("an ACTIVE label cannot override missing, corrupt or elapsed periods", () => {
  const now = new Date("2026-09-06T02:59:59.999Z");
  assert.equal(livePeriodReadiness(row, now), "READY");
  assert.equal(livePeriodReadiness(row, new Date(row.endsAt)), "EXPIRED");
  for (const endsAt of [null, "", "bad-date"]) assert.equal(livePeriodReadiness({ ...row, endsAt }, now), "INVALID");
  assert.equal(livePeriodReadiness({ ...row, startedAt: row.endsAt }, now), "INVALID");
  assert.equal(livePeriodReadiness({ ...row, startedAt: "2026-09-06T02:59:59.9995Z" }, new Date("2026-09-06T02:58:00Z")), "NOT_DUE");
  assert.equal(livePeriodReadiness(row, new Date(NaN)), "INVALID");
  assert.equal(livePeriodReadiness(null, now), "UNAVAILABLE");
  assert.equal(livePeriodReadiness({ ...row, status: "STOPPED" }, now), "STOPPED");
  assert.equal(livePeriodReadiness({ ...row, status: "COMPLETED" }, now), "EXPIRED");
  assert.equal(livePeriodReadiness({ ...row, status: "NOT_STARTED", startedAt: null, endsAt: null }, now), "NOT_STARTED");
});
test("scan begun before expiry must not treat the later submit check as active", () => {
  let mockSubmissions = 0;
  assert.equal(livePeriodReadiness(row, new Date("2026-09-06T02:59:00Z")), "READY");
  if (livePeriodReadiness(row, new Date("2026-09-06T03:00:01Z")) === "READY") mockSubmissions++;
  assert.equal(mockSubmissions, 0);
});
test("zero equity is real, unavailable equity cannot fall back to spendable or historic balances", () => {
  assert.equal(requireCurrentLiveEquity(0), 0);
  assert.equal(requireCurrentLiveEquity(789.12), 789.12);
  for (const value of [null, undefined, NaN, Infinity, -1, "0", "1000", false, {}]) assert.throws(() => requireCurrentLiveEquity(value), /LIVE_EQUITY_UNAVAILABLE/);
});
test("raw UTA zero stays zero and missing total USDT equity is not replaced by USD or one coin", () => {
  const payload = { usdtEquity: "0", accountEquity: "1000", assets: [{ coin: "USDT", balance: "1000", equity: "1000" }] };
  assert.equal(readLiveUsdtEquity(payload), 0);
  assert.equal(readLiveUsdtEquity({ usdtEquity: "123.45" }), 123.45);
  for (const usdtEquity of [null, undefined, "", " ", "NaN", "Infinity", "-1", {}, false]) assert.throws(() => readLiveUsdtEquity({ ...payload, usdtEquity }));
  assert.throws(() => readLiveUsdtEquity({}));
  const client = readFileSync("lib/bitget/demo-client.ts", "utf8");
  assert.equal(client.match(/mode === "LIVE_EXPERIMENT" \? readLiveUsdtEquity\(account\) : finiteNumber/g)?.length, 2);
});
test("live final check reads period evaluator and never rewrites experiment to start over", () => {
  const client = readFileSync("lib/bitget/demo-client.ts", "utf8");
  const reader = client.slice(client.indexOf("export async function readBitgetLiveExperimentStatus"), client.indexOf("export async function syncBitgetLiveExperimentStatus"));
  assert.match(reader, /livePeriodReadiness/);
  assert.match(reader, /active: period === "READY"/);
  assert.doesNotMatch(reader, /UPDATE|DELETE/);
  assert.match(client, /requireCurrentLiveEquity\(balance.equityUsdt\)/);
  assert.doesNotMatch(client, /balance.equityUsdt \|\| balance.availableUsdt/);
  const form = readFileSync("components/live-trading/LiveConfigurationDraftClient.tsx", "utf8");
  assert.match(form, /capitalUsdt: data.draft.capitalUsdt, leverage: data.draft.leverage/);
});
