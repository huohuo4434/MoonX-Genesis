import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { summarizeMemberGrowth, type GrowthUser, type GrowthPayment } from "../lib/analytics/member-growth-core";
const now = new Date("2026-09-12T00:00:00Z");
const touch = { source: "x", landingPath: "/", capturedAt: "2026-09-01T00:00:00Z" };
const user = (id: string, extra: Partial<GrowthUser> = {}): GrowthUser => ({ id, email: `${id}@real.test`, createdAt: "2026-09-02T00:00:00Z", active: true, expiresAt: "2026-09-15T00:00:00Z", firstTouch: touch, ...extra });
const pay = (id: string, userId = "paid", extra: Partial<GrowthPayment> = {}): GrowthPayment => ({ id, userId, network: "TRC20", tx: id, confirmed: true, at: "2026-09-03T00:00:00Z", ...extra });
test("granted entitlement is not payment; expired payer still counts as paid conversion", () => {
  const report = summarizeMemberGrowth([user("gift"), user("paid", { active: false, expiresAt: "2026-09-10T00:00:00Z" })], [pay("one")], now);
  assert.equal(report.activeWithoutPayment, 1);
  assert.equal(report.windows[1]!.xPaid, 1);
  assert.equal(report.windows[1]!.xPaidPercent, 50);
  assert.equal(report.lapsed.length, 1);
});
test("mirrored transactions deduplicate across chain aliases and repeat purchase uses distinct transfers", () => {
  const report = summarizeMemberGrowth([user("paid")], [pay("one"), pay("copy", "paid", { tx: "ONE", network: "TRON" }), pay("two", "paid", { at: "2026-09-11T00:00:00Z" })], now);
  assert.equal(report.windows[1]!.confirmedOrders, 2);
  assert.equal(report.windows[1]!.firstObservedBuyers, 1);
  assert.equal(report.windows[0]!.firstObservedBuyers, 0);
  assert.equal(report.windows[0]!.repeatBuyers, 1);
  assert.equal(report.expiring.length, 1);
});
test("tests, refunds, invalid/future payment dates, rejected records and missing users do not create conversion", () => {
  const report = summarizeMemberGrowth([user("paid")], [pay("test", "paid", { test: true }), pay("refund"), pay("refund-copy", "paid", { tx: "refund", refunded: true }), pay("bad", "paid", { at: null }), pay("future", "paid", { at: "2027-01-01" }), pay("rejected", "paid", { confirmed: false }), pay("missing", "unknown")], now);
  assert.equal(report.confirmedPayers, 0);
  assert.equal(report.unresolved, 2);
});
test("one transaction attributed to different users is quarantined, not counted twice", () => {
  const report = summarizeMemberGrowth([user("paid"), user("second")], [pay("one"), pay("mirror", "second", { tx: "one" })], now);
  assert.equal(report.confirmedPayers, 0);
  assert.equal(report.unresolved, 1);
});
test("unknown and post-signup attribution stay unknown; no denominator gives null", () => {
  const report = summarizeMemberGrowth([user("paid", { firstTouch: { ...touch, capturedAt: "2026-09-03" } })], [pay("one")], now);
  assert.equal(report.windows[1]!.xRegistrations, 0);
  assert.equal(report.windows[1]!.tracked, 0);
  assert.equal(report.windows[1]!.xPaidPercent, null);
});
test("report wiring is admin-only, read-only, paginated, and errors do not become zero", () => {
  const server = readFileSync("lib/analytics/member-growth-server.ts", "utf8");
  assert.match(server, /import "server-only"/);
  assert.ok(server.indexOf('await requireAdminOrRedirect') < server.indexOf('const admin = getAdminClient'));
  assert.match(server, /range\(offset, offset \+ 999\)/);
  assert.match(server, /throw new Error\("Growth payments unavailable"\)/);
  assert.doesNotMatch(server, /\.(insert|upsert|update|delete|upload|rpc)\(/);
  const page = readFileSync("app/admin/users/page.tsx", "utf8");
  assert.match(page, /Suspense/);
  assert.match(page, /report=\{null\}/);
});
