import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const daily = read("lib/forecasts/daily-pipeline.ts");
const rolling = read("lib/forecasts/daily-rolling-core.ts");
const member = read("app/member/daily/page.tsx");
const home = read("components/home/HomeLandingBoard.tsx");
const xRoute = read("app/api/cron/x-intelligence-report/route.ts");
const dailyRoute = read("app/api/cron/generate-daily-forecasts/route.ts");
const reason = read("lib/forecasts/daily-display-reason.ts");
const xMatrix = read("lib/trading-signals/x-opinion-matrix.ts");
const weeklyDaily = read("lib/forecasts/weekly-to-daily.ts");
const technicalStructure = read("lib/market-data/technical-price-structure.ts");

assert(daily.includes("MOOX_V72051_DAILY_TRUTH_PIPELINE"), "daily truth marker missing");
assert(daily.includes("buildSnapshotFallbackLevels"), "technical fallback missing");
assert(!daily.includes('dailyTechnicalInputPolicy(market) === "ETH_NO_BTC_LEVEL_REUSE"'), "ETH is still forced blank");
assert(daily.includes("getApprovedXForecastOverlay"), "approved X overlay missing");
assert(!daily.includes("buildXIntelligenceAutoWeight"), "unapproved automatic X weighting still active");
assert(rolling.includes("TECHNICAL_LEVELS_CHANGED"), "technical level revision persistence missing");
assert(rolling.includes("RESEARCH_EVIDENCE_CHANGED"), "research evidence revision persistence missing");
assert(!rolling.includes('return { shouldCreate: false, reasons: ["MARKET_PROGRESS_UNAVAILABLE"] }'), "market progress still freezes all revisions");
assert(member.includes("研判依据"), "member daily research reason column missing");
assert(member.includes("buildDailyInvalidation"), "member daily invalidation builder missing");
assert(!member.includes("先看明确方向，再看关键位和失效条件"), "banned member daily filler still present");
assert(!member.includes("完整研究依据按需展开"), "banned method filler still present");
assert(home.includes("buildHomeResearchReason"), "homepage concise evidence missing");
assert(home.includes('const researchReason = forecast ? buildHomeResearchReason(forecast) : "";'), "homepage forecast narrowing missing");
assert(!home.includes('{buildHomeResearchReason(forecast) ?'), "unsafe optional forecast call remains in homepage JSX");
assert(home.includes("seen = new Set<string>()"), "homepage verification dedupe missing");
assert(!home.includes("盘语</span>"), "homepage still labels qimen as mystical filler");
assert(reason.includes("六爻：") && reason.includes("奇门：") && reason.includes("结论："), "reason composer incomplete");
assert(!reason.includes("技术分析只负责支撑、压力、入场与失效位"), "banned methodology phrase leaked into display helper");
assert(xRoute.includes("runContentFreshnessSelfCheck({ repair: true"), "15m X post-check missing");
assert(dailyRoute.includes("runContentFreshnessSelfCheck({ repair: true"), "daily post-update repair/self-check missing");
assert(xMatrix.includes("getApprovedXForecastOverlay"), "X opinion approval matrix missing");
assert(weeklyDaily.includes("conciseWeeklyReason(weekly.interpretation)"), "weekly hexagram explanation is not carried into daily evidence");
assert(technicalStructure.includes("const isBearish") && technicalStructure.includes("下行确认增强") && technicalStructure.includes("压力区上沿"), "bearish confirmation/invalidation is not direction-aware");

console.log("MOOX V7.20.5.2 DAILY TRUTH + FRESHNESS STATIC REGRESSION PASSED");
