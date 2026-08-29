import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { getSexagenaryDay } from "../lib/calendar/sexagenary-calendar.ts";
import { STATIC_FOCUS_ASSET_IDS, STATIC_MEMBER_AUTOMATION_FOCUS } from "../lib/data/conviction/focus-registry-core.ts";
import { buildKeyDateRadar, keyDateStatus, splitCurrentKeyDateRadar, summarizeKeyDateRadar } from "../lib/data/key-date-radar-core.ts";
import { buildMemberKeyDateRadar, memberKeyDateCoverage } from "../lib/data/member-key-date-radar.ts";
import { MEMBER_RESEARCH_NAV, NAV_ROUTES } from "../config/member-channel-navigation.ts";

const AS_OF = "2026-08-29";

test("key-date status distinguishes upcoming, active and review exact days", () => {
  const base = buildMemberKeyDateRadar(AS_OF).find((item) => item.focusDate > AS_OF);
  assert.ok(base);
  assert.equal(keyDateStatus(base, AS_OF), "UPCOMING");
  assert.equal(keyDateStatus(base, base.focusDate), "ACTIVE");
  assert.equal(keyDateStatus(base, "2026-12-31"), "REVIEW");
});

test("all website focus assets have at least one month and one week key date", () => {
  const coverage = memberKeyDateCoverage(AS_OF);
  assert.equal(coverage.length, STATIC_FOCUS_ASSET_IDS.length);
  assert.equal(STATIC_FOCUS_ASSET_IDS.length, 23);
  assert.deepEqual(coverage.filter((row) => !row.month || !row.week), []);

  const rows = buildMemberKeyDateRadar(AS_OF);
  const monthlyAssets = new Set(rows.filter((row) => row.level === "MONTH").map((row) => row.assetId));
  const weeklyAssets = new Set(rows.filter((row) => row.level === "WEEK").map((row) => row.assetId));
  assert.deepEqual([...monthlyAssets].sort(), [...STATIC_FOCUS_ASSET_IDS].sort());
  assert.deepEqual([...weeklyAssets].sort(), [...STATIC_FOCUS_ASSET_IDS].sort());
});

test("radar contains only exact month or week dates and preserves traceability", () => {
  const rows = buildMemberKeyDateRadar(AS_OF);
  assert.ok(rows.length >= STATIC_FOCUS_ASSET_IDS.length * 2);
  for (const item of rows) {
    assert.match(item.focusDate, /^2026-\d{2}-\d{2}$/, item.id);
    assert.equal(item.startDate, item.focusDate, item.id);
    assert.equal(item.endDate, item.focusDate, item.id);
    assert.equal(item.ganzhi, getSexagenaryDay(item.focusDate).label, item.id);
    assert.ok(item.level === "MONTH" || item.level === "WEEK", item.id);
    assert.ok(item.evidence === "EXPLICIT" || item.evidence === "DERIVED", item.id);
    assert.ok(item.sourceIds.length > 0, item.id);
    assert.ok(item.derivation.length >= 15, item.id);
    assert.ok(item.confirmation.length >= 15, item.id);
    assert.ok(item.invalidation.length >= 15, item.id);
    assert.equal(item.focusDate >= AS_OF, true, item.id);
  }
});

test("derived dates disclose inference and do not fabricate teacher-supplied exact days", () => {
  const rows = buildMemberKeyDateRadar(AS_OF);
  const derived = rows.filter((item) => item.evidence === "DERIVED");
  const explicit = rows.filter((item) => item.evidence === "EXPLICIT");
  assert.ok(derived.length > 0);
  assert.ok(explicit.length > 0);
  assert.ok(derived.every((item) => /结构转折|当周段推演/.test(item.derivation)));
  assert.ok(derived.some((item) => /不冒充原卦明确点名/.test(item.derivation)));
  assert.ok(explicit.every((item) => /锁定记录明确点名/.test(item.derivation)));
});

test("known locked monthly key dates remain present while the rest gain full coverage", () => {
  const rows = buildMemberKeyDateRadar(AS_OF).filter((item) => item.level === "MONTH");
  const exact = rows.filter((item) => item.evidence === "EXPLICIT");
  assert.ok(exact.some((item) => item.assetId === "btc" && item.focusDate === "2026-09-10"));
  assert.ok(exact.some((item) => item.assetId === "eth" && item.focusDate === "2026-09-10"));
  assert.ok(exact.some((item) => item.assetId === "hype" && item.focusDate === "2026-09-10"));
  assert.ok(exact.some((item) => item.assetId === "tsla" && item.focusDate === "2026-09-01"));
});

test("non-crypto derived key dates do not land on a weekend", () => {
  const rows = buildMemberKeyDateRadar(AS_OF).filter((item) =>
    item.evidence === "DERIVED" && STATIC_MEMBER_AUTOMATION_FOCUS[item.assetId as keyof typeof STATIC_MEMBER_AUTOMATION_FOCUS]?.assetClass !== "CRYPTO"
  );
  for (const item of rows) {
    const day = new Date(`${item.focusDate}T00:00:00.000Z`).getUTCDay();
    assert.notEqual(day, 0, item.id);
    assert.notEqual(day, 6, item.id);
  }
});

test("summary and split expose exactly two current modules", () => {
  const rows = buildKeyDateRadar(buildMemberKeyDateRadar(AS_OF), AS_OF);
  const summary = summarizeKeyDateRadar(rows);
  const split = splitCurrentKeyDateRadar(rows);
  assert.equal(summary.assetCount, 23);
  assert.equal(summary.monthlyCount, split.monthly.length);
  assert.equal(summary.weeklyCount, split.weekly.length);
  assert.equal("monthlyPath" in split, false);
});

test("member route is gated, discoverable and no longer renders a monthly path-window module", () => {
  const page = fs.readFileSync("app/member/key-dates/page.tsx", "utf8");
  assert.match(page, /getMemberDevicePageAccess/);
  assert.match(page, /MEMBERSHIP_REQUIRED/);
  assert.match(page, /DEVICE_REQUIRED/);
  assert.match(page, />月关键日</);
  assert.match(page, />周关键日</);
  assert.match(page, /不再单列“月路径窗口”/);
  assert.doesNotMatch(page, /MONTH_PATH|agenda\.monthlyPath/);
  assert.equal(NAV_ROUTES.memberKeyDates, "/member/key-dates");
  assert.equal(MEMBER_RESEARCH_NAV.some((item) => item.href === NAV_ROUTES.memberKeyDates), true);
});
