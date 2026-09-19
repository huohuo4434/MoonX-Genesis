import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { publicNotes } from "../content/public-notes/market-tao-20260919";

test("seven source-linked public translations preserve dates and assets", () => {
  assert.equal(publicNotes.length, 7);
  assert.equal(new Set(publicNotes.map(n => n.id)).size, 7);
  for (const n of publicNotes) {
    assert.match(n.source, /^https:\/\/x\.com\/MarketTaoHQ\/status\/\d+$/);
    assert.match(n.date, /^2026-09-(18|19)$/);
    assert.ok(n.paragraphs.length >= 3);
    if (n.image) for (const suffix of ["-zh.webp", "-original.jpg"]) {
      assert.ok(existsSync(`public/images/public-notes/20260919/${n.image}${suffix}`));
    }
  }
});
test("key conditional prices and provenance remain explicit", () => {
  const body = publicNotes.map(n => n.paragraphs.join(" ")).join(" ");
  for (const value of ["70–71", "60.5", "55", "90–105", "171", "127–135", "147", "156", "0.000052–0.000056"]) assert.ok(body.includes(value));
  assert.ok(body.includes("条件"));
  assert.ok(body.includes("实时"));
});
test("public catalogue is isolated from member content and trading", () => {
  const component = readFileSync("components/member/PublicNotes.tsx", "utf8");
  assert.doesNotMatch(component, /member-notes\/store|supabase|bitget|dangerouslySetInnerHTML/);
  const page = readFileSync("app/member/notes/page.tsx", "utf8");
  const guest = page.split("if (!access.authenticated)")[1].split("const previewOnly")[0];
  assert.match(guest, /PublicNotes/);
  assert.doesNotMatch(guest, /MemberNotesClient/);
  assert.match(page, /getMemberDevicePageAccess\(\{ failClosed: true \}\)/);
});
