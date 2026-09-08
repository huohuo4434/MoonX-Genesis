import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canMutateNote,
  isSameOriginJson,
  noteMutation,
  pageOffset,
} from "../lib/member-notes/core";

const id = "f1678c40-8a2c-4dd9-9185-c070170ba54e";
test("only admin can publish, archive or moderate; members can reply or withdraw their own", () => {
  for (const action of ["save", "archive", "moderate"] as const) {
    assert.equal(canMutateNote(false, action), false);
    assert.equal(canMutateNote(true, action), true);
  }
  assert.equal(canMutateNote(false, "reply"), true);
  assert.equal(canMutateNote(false, "withdraw"), true);
});
test("strict payloads reject forged identity, roles, malformed IDs and excessive text", () => {
  const reply = {
    action: "reply",
    id,
    postId: id,
    body: "  Useful observation  ",
  };
  assert.equal(noteMutation.safeParse(reply).success, true);
  for (const extra of [
    { author_id: id },
    { isAdmin: true },
    { is_teacher: true },
    { role: "admin" },
  ])
    assert.equal(noteMutation.safeParse({ ...reply, ...extra }).success, false);
  for (const body of ["", "  ", "a".repeat(2001), null])
    assert.equal(noteMutation.safeParse({ ...reply, body }).success, false);
  assert.equal(
    noteMutation.safeParse({ ...reply, id: "../other" }).success,
    false,
  );
});
test("post content lengths and lifecycle are bounded", () => {
  const post = {
    action: "save",
    id,
    title: "Headline",
    body: "First line\nPaid text",
    commentsOpen: true,
    status: "published",
  };
  assert.equal(noteMutation.safeParse(post).success, true);
  assert.equal(
    noteMutation.safeParse({ ...post, title: "x".repeat(161) }).success,
    false,
  );
  assert.equal(
    noteMutation.safeParse({ ...post, body: "x".repeat(12001) }).success,
    false,
  );
  assert.equal(
    noteMutation.safeParse({ ...post, status: "archived" }).success,
    false,
  );
});
test("writes require same-origin JSON including rejecting absent Origin", () => {
  const request = (origin?: string, content = "application/json") =>
    new Request("https://mooxintel.com/api/member/notes", {
      headers: { ...(origin ? { origin } : {}), "content-type": content },
    });
  assert.equal(isSameOriginJson(request("https://mooxintel.com")), true);
  assert.equal(
    isSameOriginJson(
      request("https://mooxintel.com", "application/json; charset=utf-8"),
    ),
    true,
  );
  assert.equal(isSameOriginJson(request("https://attacker.example")), false);
  assert.equal(isSameOriginJson(request()), false);
  assert.equal(
    isSameOriginJson(request("https://mooxintel.com", "text/plain")),
    false,
  );
});
test("pagination rejects negative, fractional and unbounded offsets", () => {
  assert.equal(pageOffset(null), 0);
  assert.equal(pageOffset("30"), 30);
  for (const offset of ["-1", "1.5", "1e5", "100001", "abc"])
    assert.throws(() => pageOffset(offset));
});
test("server preview projection excludes bodies and replies; fresh membership and device gate protect writes", () => {
  const store = readFileSync("lib/member-notes/store.ts", "utf8");
  const route = readFileSync("app/api/member/notes/route.ts", "utf8");
  const preview = store.match(/const previewColumns =\s*"([^"]+)"/)?.[1] ?? "";
  assert.ok(preview.includes("preview"));
  assert.ok(!preview.includes("body"));
  assert.ok(!preview.includes("author"));
  assert.match(store, /select\(previewOnly \? previewColumns : noteColumns\)/);
  assert.match(
    route,
    /if \(access.previewOnly\) throw new Error\("FORBIDDEN"\)/,
  );
  assert.match(route, /getMemberDevicePageAccess\(\{ failClosed: true \}\)/);
  assert.match(
    route,
    /if \(!canMutateNote\(access.isAdmin, parsed.data.action\)\)/,
  );
  assert.match(store, /query = query.eq\("author_id", userId\)/);
  assert.match(route, /size > 110000/);
  assert.match(route, /private, no-store/);
});
test("database enforces deny-direct-access, bounded preview, retry dedupe and distributed reply cooldown", () => {
  const sql = readFileSync(
    "supabase/migrations/20260908223940_member_notes_and_replies.sql",
    "utf8",
  );
  assert.equal((sql.match(/enable row level security/g) ?? []).length, 2);
  assert.match(sql, /from public, anon, authenticated/);
  assert.match(sql, /left\(split_part\(btrim\(body\), E'\\n', 1\), 120\)/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(
    sql,
    /existing.author_id=p_author_id and existing.post_id=p_post_id and existing.body=p_body/,
  );
  assert.match(sql, /interval '10 seconds'/);
  assert.match(sql, /target.status <> 'published' or not target.comments_open/);
  assert.doesNotMatch(sql, /security definer|drop table|delete from/i);
});
