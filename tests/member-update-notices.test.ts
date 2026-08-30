import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { LATEST_MEMBER_UPDATE, MEMBER_UPDATE_NOTES } from "../lib/member-updates/catalog";

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("member update catalogue is newest-first, unique and routes to member pages", () => {
  assert.ok(MEMBER_UPDATE_NOTES.length > 0);
  assert.equal(LATEST_MEMBER_UPDATE, MEMBER_UPDATE_NOTES[0]);
  assert.equal(new Set(MEMBER_UPDATE_NOTES.map((note) => note.version)).size, MEMBER_UPDATE_NOTES.length);
  for (let index = 1; index < MEMBER_UPDATE_NOTES.length; index += 1) {
    assert.ok(MEMBER_UPDATE_NOTES[index - 1]!.releasedAt >= MEMBER_UPDATE_NOTES[index]!.releasedAt);
  }
  for (const note of MEMBER_UPDATE_NOTES) {
    assert.ok(note.highlights.length >= 3);
    assert.ok(note.routeChanges.length >= 1);
    assert.ok(note.preserved.length >= 1);
    for (const route of note.routeChanges) assert.match(route.href, /^\/member\//);
  }
});

test("updates page is member-gated and renders announcement history plus route changes", () => {
  const page = read("app/member/updates/page.tsx");
  assert.match(page, /getMemberDevicePageAccess/);
  assert.match(page, /LOGIN_REQUIRED/);
  assert.match(page, /MEMBERSHIP_REQUIRED/);
  assert.match(page, /MemberDeviceGate/);
  assert.match(page, /MemberDeviceHeartbeat/);
  assert.match(page, /MEMBER_UPDATE_NOTES\.map/);
  assert.match(page, /版本升级公告/);
  assert.match(page, /原来的入口现在在哪里/);
  assert.match(page, /本次没有改变/);
});

test("latest update notice appears on member home and services", () => {
  const home = read("app/member/page.tsx");
  const services = read("app/member/consultations/page.tsx");
  for (const source of [home, services]) {
    assert.match(source, /MemberUpdateNotice/);
    assert.match(source, /LATEST_MEMBER_UPDATE/);
  }
  assert.match(home, /\/member\/updates/);
});
