import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const page = read("app/member/daily/page.tsx");
const helper = read("lib/forecasts/member-daily-live-levels.ts");

assert.match(page, /MOOX_V72065_MEMBER_DAILY_LIVE_LEVELS/);
assert.match(page, /buildMemberDailyTechnicalViews/);
assert.match(page, />失效位</);
assert.doesNotMatch(page, /cleanDailyLevel\(forecast\.supportLevels/);
assert.doesNotMatch(page, /buildDailyInvalidation\(forecast\)/);
assert.match(helper, /listDailyVerificationResults/);
assert.match(helper, /source: "VERIFIED_OHLC"/);
assert.match(helper, /return `跌破 \$\{support\}`/);
assert.match(helper, /return `站上 \$\{resistance\}`/);
assert.match(helper, /return `上破 \$\{resistance\} \/ 下破 \$\{support\}`/);
assert.match(helper, /support: "—"/);
assert.match(helper, /resistance: "—"/);
assert.match(helper, /invalidation: "—"/);

console.log("MOOX V7.20.6.5 MEMBER DAILY LIVE LEVELS STATIC REGRESSION PASSED");
