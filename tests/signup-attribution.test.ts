import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSignupAttributionTouch,
  parseSignupAttributionTouch,
  readStoredSignupAttribution,
  summarizeSignupAttribution,
} from "../lib/analytics/signup-attribution-core";

test("captures X UTM attribution without keeping the query string", () => {
  const touch = buildSignupAttributionTouch(
    "https://mooxintel.com/member/key-dates?utm_source=X&utm_medium=social&utm_campaign=gold-0903&utm_content=zh",
    "https://t.co/example",
    new Date("2026-09-03T10:00:00.000Z")
  );
  assert.deepEqual(touch, {
    source: "x",
    medium: "social",
    campaign: "gold-0903",
    content: "zh",
    landingPath: "/member/key-dates",
    referrerHost: "t.co",
    capturedAt: "2026-09-03T10:00:00.000Z",
  });
});

test("ignores ordinary internal navigation and safely rejects malformed stored values", () => {
  assert.equal(buildSignupAttributionTouch("https://mooxintel.com/register", "https://mooxintel.com/"), null);
  assert.equal(parseSignupAttributionTouch({ source: "x", landingPath: "https://evil.test", capturedAt: "bad" }), null);
});

test("expires attribution after 30 days", () => {
  const touch = buildSignupAttributionTouch("https://mooxintel.com/?utm_source=x", "", new Date("2026-08-01T00:00:00Z"));
  assert.equal(readStoredSignupAttribution(JSON.stringify(touch), new Date("2026-09-03T00:00:00Z")), null);
});

test("reports X registrations and paid conversion by registration window", () => {
  const xTouch = buildSignupAttributionTouch("https://mooxintel.com/?utm_source=x", "", new Date("2026-09-02T00:00:00Z"));
  const summary = summarizeSignupAttribution([
    { createdAt: "2026-09-02T00:00:00Z", activeMember: true, firstTouch: xTouch },
    { createdAt: "2026-09-01T00:00:00Z", activeMember: false, lastTouch: xTouch },
    { createdAt: "2026-08-01T00:00:00Z", activeMember: true, firstTouch: xTouch },
  ], 7, new Date("2026-09-03T00:00:00Z"));
  assert.deepEqual(summary, {
    registrations: 2,
    trackedRegistrations: 2,
    xRegistrations: 2,
    xActiveMembers: 1,
    xConversionPercent: 50,
  });
});

test("production wiring captures, submits, validates, stores and displays attribution", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  const form = readFileSync("components/auth/LoginForm.tsx", "utf8");
  const route = readFileSync("app/api/auth/register/route.ts", "utf8");
  const admin = readFileSync("app/admin/users/page.tsx", "utf8");
  const permissions = readFileSync("lib/auth/permissions.ts", "utf8");
  const capture = readFileSync("components/analytics/AttributionCapture.tsx", "utf8");
  assert.match(layout, /<AttributionCapture \/>/);
  assert.match(capture, /readStoredSignupAttribution\(window\.localStorage\.getItem\(ATTRIBUTION_FIRST_TOUCH_KEY\)\)/);
  assert.match(form, /attributionFirst,/);
  assert.match(form, /attributionLast,/);
  assert.match(form, /removeItem\(ATTRIBUTION_FIRST_TOUCH_KEY\)/);
  assert.match(route, /attributionSchema/);
  assert.match(route, /acquisition_first_touch/);
  assert.match(admin, /注册来源转化/);
  assert.match(admin, /summarizeSignupAttribution/);
  assert.match(permissions, /for \(let page = 1; ; page \+= 1\)/);
  assert.match(permissions, /listUsers\(\{ page, perPage \}\)/);
  assert.match(permissions, /if \(error \|\| !data\?\.users\) return \[\]/);
});
