import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("weekly-to-daily direction is const after canonical direction migration", () => {
  const src = fs.readFileSync("lib/forecasts/weekly-to-daily.ts", "utf8");
  assert.match(src, /const direction = directionForDay\(weekly, progress, moving\.active\);/);
  assert.doesNotMatch(src, /let direction = directionForDay\(weekly, progress, moving\.active\);/);
});
