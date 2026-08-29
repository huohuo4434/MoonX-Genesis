import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MEMBER_RESEARCH_NAV, NAV_ROUTES } from "../config/member-channel-navigation.ts";
import { buildKeyDateRadar, keyDateStatus, summarizeKeyDateRadar } from "../lib/data/key-date-radar-core.ts";
import { MEMBER_KEY_DATE_RADAR_ITEMS } from "../lib/data/member-key-date-radar.ts";

test("key-date status distinguishes upcoming, active and review windows", () => {
  const base = MEMBER_KEY_DATE_RADAR_ITEMS.find((item) => item.id === "btc-top-20260909-11")!;
  assert.equal(keyDateStatus(base, "2026-09-08"), "UPCOMING");
  assert.equal(keyDateStatus(base, "2026-09-10"), "ACTIVE");
  assert.equal(keyDateStatus(base, "2026-09-12"), "REVIEW");
});
test("radar sorts live windows before review and never counts review as current opportunity", () => {
  const rows = buildKeyDateRadar(MEMBER_KEY_DATE_RADAR_ITEMS, "2026-08-29");
  const summary = summarizeKeyDateRadar(rows);
  assert.notEqual(rows[0]?.status, "REVIEW");
  assert.equal(rows.at(-1)?.status, "REVIEW");
  assert.equal(summary.assetCount, new Set(rows.filter((row) => row.status !== "REVIEW").map((row) => row.assetId)).size);
  assert.equal(summary.bottomCount, rows.filter((row) => row.status !== "REVIEW" && row.action === "BOTTOM_WATCH").length);
});

test("every published radar item is traceable and includes confirmation plus invalidation", () => {
  assert.ok(MEMBER_KEY_DATE_RADAR_ITEMS.length >= 10);
  for (const item of MEMBER_KEY_DATE_RADAR_ITEMS) {
    assert.match(item.startDate, /^2026-\d{2}-\d{2}$/);
    assert.match(item.endDate, /^2026-\d{2}-\d{2}$/);
    assert.ok(item.startDate <= item.endDate, item.id);
    assert.ok(item.sourceIds.length > 0, item.id);
    assert.ok(item.confirmation.length >= 15, item.id);
    assert.ok(item.invalidation.length >= 15, item.id);
    assert.ok(item.confidence >= 0 && item.confidence <= 100, item.id);
  }
});

test("derived dates are explicitly separated from exact monthly evidence", () => {
  const derived = MEMBER_KEY_DATE_RADAR_ITEMS.filter((item) => item.evidence === "MONTH_PATH_DERIVED");
  const explicit = MEMBER_KEY_DATE_RADAR_ITEMS.filter((item) => item.evidence === "MONTH_EXPLICIT");
  assert.ok(derived.length > 0);
  assert.ok(explicit.length > 0);
  assert.ok(derived.some((item) => /推演|不是老师给出的精确|不强造/.test(`${item.title}${item.primaryView}`)));
});

test("member route is gated and discoverable from the member navigation", () => {
  const page = fs.readFileSync("app/member/key-dates/page.tsx", "utf8");
  assert.match(page, /getMemberDevicePageAccess/);
  assert.match(page, /MEMBERSHIP_REQUIRED/);
  assert.match(page, /DEVICE_REQUIRED/);
  assert.equal(NAV_ROUTES.memberKeyDates, "/member/key-dates");
  assert.equal(MEMBER_RESEARCH_NAV.some((item) => item.href === NAV_ROUTES.memberKeyDates), true);
});
