import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const engine = read("lib/forecasts/qimen-first-policy.ts");
const daily = read("lib/forecasts/daily-pipeline.ts");
const access = read("lib/prediction-access-server.ts");
const home = read("components/home/HomeLandingBoard.tsx");
const type = read("types/daily-forecast.ts");
const ui = read("lib/forecasts/generated-to-ui.ts");
const fallback = read("lib/forecasts/public-daily-fallback.ts");

must(engine.includes("MOOX_QIMEN_TIME_ROTATING_V3_20260818"), "V3 engine missing");
must(engine.includes('primary: ["戊"]') && engine.includes('primary: ["辛"]'), "teacher product anchors missing");
must(engine.includes("qimenMysticNote") && engine.includes("qimenAgreementLabel"), "homepage Qimen fields missing in engine");
must(engine.includes('"2026-08-18": "2026-08-17T22:09:00.000Z"'), "today repair cast audit missing");
must(daily.includes("MOOX_QIMEN_FIRST_V72005_PRE_TECH"), "V7.20.0.5 pre-technical Qimen integration lost");
must(access.includes("MOOX_QIMEN_DAILY_RESONANCE_V7201_ACCESS"), "access-layer Qimen overlay missing");
must(home.includes("MOOX_QIMEN_DAILY_RESONANCE_V7201_METHOD"), "homepage methodology marker missing");
must(home.includes("qimenMysticNote") && home.includes("奇门看势，六爻验应，技术定点"), "homepage Qimen copy missing");
must(type.includes("qimenEvidence?: string") && type.includes("qimenMysticNote?: string"), "DailyForecast Qimen fields missing");
must(ui.includes("MOOX_QIMEN_DAILY_RESONANCE_V7201_RAW"), "generated UI raw evidence bridge missing");
must(fallback.includes("MOOX_QIMEN_DAILY_RESONANCE_V7201_FALLBACK"), "fallback Qimen integration missing");

console.log("QIMEN DAILY RESONANCE V7.20.1 STATIC REGRESSION PASSED");
