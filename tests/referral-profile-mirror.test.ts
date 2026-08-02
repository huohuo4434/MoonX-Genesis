import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const servicePath = path.join(root, "lib/referral/service.ts");
const source = fs.readFileSync(servicePath, "utf8");

test("referral invite creation repairs the profiles mirror before Prisma create", () => {
  assert.match(source, /async function ensureReferralProfileMirror/);
  const mirrorCall = source.indexOf("await ensureReferralProfileMirror(user)");
  const inviteCall = source.indexOf("const invite = await ensureReferralInvite(");
  assert.ok(mirrorCall >= 0, "profile mirror call is missing");
  assert.ok(inviteCall >= 0, "invite creation call is missing");
  assert.ok(mirrorCall < inviteCall, "profile mirror must be repaired before invite creation");
});

test("referral page does not expose raw database errors", () => {
  assert.match(source, /邀请信息暂时无法生成，请刷新页面后重试。/);
  assert.doesNotMatch(source, /message:\s*err instanceof Error \? err\.message/);
});
