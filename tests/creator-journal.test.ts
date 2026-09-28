import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { MEMBER_RESEARCH_NAV, MOBILE_BOTTOM_NAV } from "../config/member-channel-navigation";
import { publicNotes } from "../content/public-notes/market-tao-20260919";
import { mstrPathNote } from "../content/public-notes/mstr-path-20260928";
const read = (path: string) => readFileSync(path, "utf8");

test("journal replaces live dashboard on the home and member landing only", () => {
  assert.match(read("app/page.tsx"), /<CreatorHome/);
  assert.doesNotMatch(read("app/page.tsx"), /HomeLandingBoard|FedDecisionTeaser/);
  assert.match(read("app/member/page.tsx"), /redirect\(`/);
  assert.match(read("app/member/page.tsx"), /\/member\/notes#member-posts/);
  assert.doesNotMatch(read("app/member/page.tsx"), /MemberOperationDesk/);
  for (const item of [...MEMBER_RESEARCH_NAV, ...MOBILE_BOTTOM_NAV]) {
    assert.doesNotMatch(item.labelZh, /操作台|自动交易/);
  }
  for (const path of ["app/member/monthly/page.tsx", "app/member/weekly-review/page.tsx", "app/member/daily/page.tsx"]) assert.ok(existsSync(path));
});

test("public feed uses dated sources and no account or market polling", () => {
  const home = read("components/community/CreatorHome.tsx");
  assert.match(home, /publicNotes.map/);
  assert.match(home, /mstrPathNote\.zh/);
  assert.match(home, /cryptoRiskNote\.summary/);
  assert.doesNotMatch(home, /useEffect|setInterval|fetch\(|getAccessUser|Math.random/);
  assert.match(home, /Original Chinese post/);
  for (const note of publicNotes) {
    assert.match(note.date, /^2026-09-\d{2}$/);
    if (note.image) assert.ok(existsSync(`public/images/public-notes/20260919/${note.image}-zh.webp`));
  }
  for (const image of mstrPathNote.images) assert.ok(existsSync(`public${image.path}`));
});

test("member gating and existing protected publishing remain enforced", () => {
  const page = read("app/member/notes/page.tsx");
  assert.match(page, /getMemberDevicePageAccess\(\{ failClosed: true \}\)/);
  assert.match(page, /!access.isActiveMember && !access.isAdmin/);
  assert.match(page, /gate.status !== "ALLOWED"/);
  assert.match(page, /isAdmin=\{access.isAdmin\}/);
  assert.match(page, /!previewOnly && <MemberDeviceHeartbeat/);
  const client = read("components/member/MemberNotesClient.tsx");
  assert.match(client, /isAdmin && \(/);
  assert.match(client, /id="member-posts"/);
  assert.match(client, /发布新观点/);
  assert.match(client, /发布到会员频道/);
  const api = read("app/api/member/notes/route.ts");
  assert.match(api, /isSameOriginJson/);
  assert.match(api, /canMutateNote/);
  assert.match(api, /LOGIN_REQUIRED/);
});

test("published full text and deep links are retained", () => {
  const archive = read("components/member/PublicNotes.tsx");
  assert.match(archive, /MstrPathNote20260928/);
  assert.match(archive, /CryptoRiskNote20260925/);
  assert.match(archive, /note-\$\{note.id\}/);
  assert.match(archive, /note.paragraphs.map/);
  assert.match(archive, /note.source/);
});
