import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("alpha-feed public preview and member report bypass the retired DOM reconstruction", () => {
  const page = read("app/member/alpha-feed/page.tsx");
  const guard = read("components/system/SiteClarityGuards.tsx");
  assert.ok((page.match(/data-moox-alpha-feed-native="1"/g) ?? []).length >= 2);
  assert.match(guard, /main\.dataset\.mooxAlphaFeedNative === "1"/);
  assert.match(guard, /\[data-moox-alpha-feed-native="1"\]/);
});
