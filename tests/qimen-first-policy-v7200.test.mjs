import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dailyPath = path.join(root, "lib", "forecasts", "daily-pipeline.ts");
const policyPath = path.join(root, "lib", "forecasts", "qimen-first-policy.ts");
const registryPath = path.join(root, "data", "qimen-financial-method-v7200.json");
const uiPath = path.join(root, "lib", "forecasts", "generated-to-ui.ts");

for (const required of [dailyPath, policyPath, registryPath, uiPath]) {
  if (!fs.existsSync(required)) throw new Error(`Missing required file: ${required}`);
}
const daily = fs.readFileSync(dailyPath, "utf8");
const policy = fs.readFileSync(policyPath, "utf8");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const ui = fs.readFileSync(uiPath, "utf8");

const marker = "MOOX_WEEKLY_LIUYAO_AUTHORITY_QIMEN_PARALLEL_V720130";
const markerAt = daily.indexOf(marker);
const technicalAt = daily.indexOf("buildTechnicalLevelsWithRetry", markerAt);
const persistAt = daily.indexOf("persistDailyRevision", markerAt);

const checks = [
  [daily.includes("MOOX_QIMEN_FIRST_V72005_IMPORT"), "daily pipeline import marker"],
  [markerAt >= 0, "pre-technical Qimen apply marker"],
  [daily.includes("applyQimenFirstToGeneratedDaily"), "generated daily policy call"],
  [technicalAt > markerAt, "Qimen runs before technical level construction"],
  [persistAt > markerAt, "Qimen runs before DB persistence"],
  [!daily.includes("return applyQimenFirstDailyPolicy(report)"), "no legacy final-report wrapper"],
  [ui.includes("MOOX_QIMEN_PARALLEL_V720130_UI"), "daily UI parallel Qimen marker"],
  [ui.includes("[normalizeDailyLanguage(r.expectedPath), r.liuyaoEvidence, qimenSummary"), "Liuyao-derived path appears before parallel Qimen in UI summary"],
  [policy.includes("LIUYAO_QIMEN_PARALLEL_FORECAST_RESONANCE_V6"), "policy hierarchy"],
  [policy.includes("personalBaziVote: \"DISABLED_FOR_PUBLIC_MARKET_DIRECTION\""), "Bazi isolation"],
  [policy.includes("canBeOverriddenByQimen: false"), "Qimen cannot override Liuyao authority"],
  [policy.includes("LEVELS_ENTRY_INVALIDATION_ONLY_NO_DIRECTION_VOTE"), "technical boundary"],
  [policy.includes("ONE_DAILY_MASTER_CHART_PERSISTED_OR_DETERMINISTIC_RESEARCH_WINDOW"), "stable cast policy"],
  [policy.includes("qimenEvidence = renderQimenEvidence"), "persisted Qimen evidence"],
  [policy.includes('const keys = ["marketCode"'), "GeneratedDaily marketCode detection"],
  [policy.includes("MOOX可复现实现"), "chart implementation label"],
  [policy.includes("不冒充老师未公开的人工取宫法"), "source boundary"],
  [registry.publicMarketBaziVote === false, "registry Bazi boundary"],
];
for (const [ok, label] of checks) {
  if (!ok) throw new Error(`Regression failed: ${label}`);
}
const forbidden = [
  "placeOrder(", "setLeverage(", "cancelOrder(", "AUTO_ORDER=true",
  "BITGET_API_SECRET", "paymentIntent", "membership.update",
];
for (const token of forbidden) {
  if (policy.includes(token)) throw new Error(`Forbidden execution primitive: ${token}`);
}
console.log("LIUYAO QIMEN PARALLEL FORECAST STATIC REGRESSION PASSED");
