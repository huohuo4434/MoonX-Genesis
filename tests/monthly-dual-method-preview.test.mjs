import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("app/member/monthly/page.tsx", "utf8");

test("monthly public preview uses the parallel Liuyao-Qimen rule", () => {
  assert.match(source, /同向提高信心/);
  assert.match(source, /分歧时并列两种观点并降低信心/);
  assert.doesNotMatch(source, /先用卦象给唯一方向/);
  assert.doesNotMatch(source, /正式方向仍以月卦为准/);
});
