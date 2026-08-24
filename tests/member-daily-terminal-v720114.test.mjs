import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const daily = read("app/member/daily/page.tsx");
const home = read("components/home/HomeLandingBoard.tsx");

assert.match(daily, /MOOX_MEMBER_DAILY_TERMINAL_V720114/);
assert.match(daily, /getMemberDevicePageAccess\(\)/, "member authorization must run before data loading");
assert.match(daily, /Promise\.allSettled\(\[\s*loadTodayForecastRows\(now\),\s*loadTomorrowForecastRows\(now\)/, "today and tomorrow should load once in parallel");
assert.doesNotMatch(daily, /getTodayForecastAccessPayload/, "member page must not repeat the today access lookup");
assert.doesNotMatch(daily, /getTomorrowSectionPayload/, "member page must not repeat tomorrow access and loading");
assert.match(daily, /todayLoadFailed/);
assert.match(daily, /系统没有把读取异常当成零条预测/);
assert.match(daily, /今日预测尚未发布/);
assert.match(daily, /下一交易日观点尚未发布/);
assert.match(daily, /同向 · 信心增强/);
assert.match(daily, /分歧 · 谨慎/);
assert.match(daily, /支撑 \/ 压力/);
assert.match(daily, /查看研判依据/);
assert.doesNotMatch(daily, /网站正式观点；不是另起日卦/);
assert.doesNotMatch(daily, /等待双法核对/);

assert.match(home, /todayPayload\?\.allowed && publishedRows\.length > 0/);
assert.match(home, /今日预测暂未读到/);
assert.match(home, /读取异常不会显示成已经发布的零条预测/);
assert.doesNotMatch(home, /buildHomeResearchReason/);

console.log("MOOX member daily terminal V7.20.11.4 regression passed");
