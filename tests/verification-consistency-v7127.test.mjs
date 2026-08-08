import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("v7.12.7 public accuracy fixtures respect the official 2026-08-01 baseline", () => {
  const source = read("tests/public-accuracy-history.test.ts");
  assert.match(source, /forecastDate: "2026-08-02"/);
  assert.match(source, /todayKey 2026-08-03/);
  assert.doesNotMatch(source, /2026-07-/);
});

test("v7.12.7 keeps the official baseline policy unchanged", () => {
  const filter = read("lib/accuracy/public-history-filter.ts");
  assert.match(filter, /OFFICIAL_DAILY_VERIFICATION_START = "2026-08-01"/);
  assert.match(filter, /r\.forecastDate < OFFICIAL_DAILY_VERIFICATION_START/);
});
