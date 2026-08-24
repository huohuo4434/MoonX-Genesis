import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const qimen = read("lib/forecasts/qimen-first-policy.ts");
const wu = read("lib/data/qimen-wu-weekly-20260824.ts");
const weekly = read("lib/data/published-weekly-analysis-20260824.ts");
const registry = JSON.parse(read("data/qimen-financial-method-v7200.json"));
const teacher = JSON.parse(read("data/teacher-knowledge-seed.json"));

assert(qimen.includes("LIUYAO_QIMEN_PARALLEL_FORECAST_RESONANCE_V6"), "Parallel Liuyao-Qimen policy version missing");
assert(qimen.includes('const MOOX_QIMEN_CAST_SEED_VERSION = "QIMEN_PRIMARY_TEACHER_YONGSHEN_LIUYAO_AUX_V2"'), "Daily master-chart seed must stay stable");
assert(qimen.includes("getWuWeeklyCalibration"), "Wu weekly calibration is not wired into Qimen daily policy");
assert(qimen.includes("getDailyMarketBaziRegime"), "Existing market-Bazi regime layer was lost");
assert(qimen.includes('primary: ["己"]') && qimen.includes("A股先看己土"), "A-share Wu anchor correction missing");
assert(qimen.includes("pathOrder = \"UNKNOWN\"") || qimen.includes('pathOrder: "UNKNOWN"'), "Unknown-path discipline missing");
assert(qimen.includes("数字原始评分") && qimen.includes("老师语义校准"), "Audit trail must retain raw digital score + teacher semantic layer");
assert(qimen.includes("吴老师目标日窗口"), "Target-day event window evidence missing");

assert(wu.includes('WU_QIMEN_WEEKLY_NOT_EXPLICITLY_COVERED = ["ETH", "NDX", "SILVER", "WTI"]'), "Teacher source boundary for uncovered assets missing");
assert(wu.includes('date: "2026-08-26"') && wu.includes('kind: "RESCUE_SUPPORT"'), "8/26 target-day rescue window missing");
assert(wu.includes('date: "2026-08-27"') && wu.includes('kind: "DOWNSIDE_BLACK_SWAN_RISK"'), "8/27 target-day downside-risk window missing");
assert(wu.includes("老师明确不知道先上冲再跌还是直接跌"), "BTC unknown path source boundary missing");

const ids = [...weekly.matchAll(/id: "WEEKLY-/g)].length;
assert(ids === 9, `Expected 9 weekly core market records, got ${ids}`);
assert(weekly.includes('overallDirection: "震荡"') && weekly.includes("上证下周宽幅震荡"), "A-share weekly correction missing");
assert(weekly.includes("黄金下周偏回调"), "Gold Qimen/Liuyao resonance row missing");
assert(weekly.includes("本期吴老师没有单列ETH") || weekly.includes("吴老师本期没有单列ETH"), "ETH source boundary missing");

assert(registry.version === "7.20.14.0", "Financial Qimen method registry version mismatch");
assert(registry.policy === "CONDITIONAL_LIUYAO_SOURCE_AUTHORITY_QIMEN_PARALLEL_FORECAST_RESONANCE", "Financial Qimen policy registry mismatch");
assert(registry.interpretationVersion === "WU_SEMANTIC_V1_20260820", "Wu semantic interpretation registry missing");
assert(registry.teacherAlignment?.eventWindows?.calendarRule?.includes("目标交易日"), "Target-day branch rule missing");

const rules = new Set((teacher.rules ?? []).map((r) => r.ruleCode));
for (let i = 201; i <= 208; i++) assert(rules.has(`MR-WU-QM-0${i}`), `Teacher rule MR-WU-QM-0${i} missing`);

const forbiddenOrderTerms = ["placeOrder(", "submitOrder(", "setLeverage(", "CRON_SECRET="];
const joined = [qimen, wu, weekly].join("\n");
for (const token of forbiddenOrderTerms) assert(!joined.includes(token), `Research patch unexpectedly contains execution/payment primitive: ${token}`);

console.log("PASS wu-qimen-semantic-v720109");
