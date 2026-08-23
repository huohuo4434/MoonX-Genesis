import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const access = read("lib/prediction-access-server.ts");
const payload = access.slice(access.indexOf("export async function getTodayForecastAccessPayload"));
assert.ok(payload.indexOf("resolveTodayPredictionAccess(now)") < payload.indexOf("loadTodayForecastRowsWithDeadline(now)"));
assert.match(payload, /if \(!access\.allowed\)[\s\S]+getPublicTodayForecasts\(now\)/);
assert.match(payload, /checkTodayPredictionAccess\(\{ user: null, now \}\)/);
assert.match(payload, /setTimeout\(\(\) => resolve\(\[\]\), 1_800\)/);
assert.match(payload, /buildWeeklyDerivedFallbacks/);

const strategy = read("lib/presentation/strategy-center.ts");
assert.match(strategy, /STRATEGY_READ_TIMEOUT_MS = 2_500/);
assert.match(strategy, /Promise\.race/);
assert.match(strategy, /\[strategy-center\] read degraded/);

const daily = read("app/member/daily/page.tsx");
assert.match(daily, /within\(getTomorrowSectionPayload\(now\), null, 2_600\)/);
assert.match(daily, /within\(buildMemberDailyTechnicalViews\(allRows\), \{\}, 1_200\)/);

const verification = read("components/verification/PublicVerificationCenter.tsx");
assert.doesNotMatch(verification, /Date\.now\(\) - days/);
assert.match(verification, /inRange\(row\.date, range, generatedAtMs\)/);
assert.doesNotMatch(verification, /new Intl\.DateTimeFormat/);
assert.match(verification, /getUTCHours\(\)/);
assert.doesNotMatch(verification, /localeCompare/);
assert.match(verification, /useEffect\(\(\) => setInteractiveReady\(true\), \[\]\)/);
assert.match(verification, /if \(!interactiveReady\)/);

console.log("MOOX promotion readiness P0 static regression passed");
