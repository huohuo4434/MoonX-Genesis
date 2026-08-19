import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const EXPECTED = [
  "ganfeng-lithium", "lian-tech", "lexin-medical", "cxmt", "asteroid", "sandisk", "nbis", "mu",
  "hype", "sol", "eth", "btc", "googl", "msft", "tencent", "kingsoft-office", "tsla", "lite", "spcx",
];
const read = (path) => readFileSync(path, "utf8");

function declaredFocusIds() {
  const source = read("lib/data/conviction/focus-registry-core.ts");
  const match = source.match(/STATIC_FOCUS_ASSET_IDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\s*as const\)/);
  assert.ok(match?.[1], "STATIC_FOCUS_ASSET_IDS declaration missing");
  return [...match[1].matchAll(/"([^"]+)"/g)].map((row) => row[1]);
}

test("one canonical 19-asset universe drives focus research", () => {
  const ids = declaredFocusIds();
  assert.deepEqual(ids, EXPECTED);
  const teasers = read("lib/data/conviction/watchlist-teasers.ts");
  for (const assetId of EXPECTED) assert.match(teasers, new RegExp(`slug:\\s*"${assetId}"`), `teaser missing ${assetId}`);
  assert.equal((teasers.match(/\bslug:\s*"/g) ?? []).length, EXPECTED.length);
  const staticRegistry = read("lib/data/conviction/focus-static-forecast-registry.ts");
  for (const token of ["TSLA", "LITE", "Spcx"]) assert.match(staticRegistry, new RegExp(token));
});

test("current authority falls back to formal longer periods and can generate daily rows", () => {
  const policy = read("lib/data/conviction/focus-daily-policy-core.ts");
  const generation = read("lib/data/conviction/focus-daily-generation-core.ts");
  const dossier = read("lib/data/conviction/focus-dossier-core.ts");
  assert.match(policy, /selectFocusCurrentAuthority/);
  assert.match(policy, /MONTH_1/);
  assert.match(policy, /focusAuthorityDisplayWindow/);
  assert.match(policy, /focusAuthorityDerivedStep/);
  assert.match(generation, /MOOX_PERIOD_DERIVED/);
  assert.match(generation, /selectFormalCurrentFocusAuthority/);
  assert.match(dossier, /dailyAuthority:/);
  assert.match(dossier, /双观点日分析已就绪/);
  assert.doesNotMatch(dossier, /当前正式周缺失.*日分析/);
});

test("future cadence may change with realized market action while history stays append-only", () => {
  const policy = read("lib/data/conviction/focus-daily-policy-core.ts");
  const generation = read("lib/data/conviction/focus-daily-generation-core.ts");
  assert.match(policy, /forecastDate\s*<=\s*input\.asOfDate/);
  assert.match(policy, /EARLY_RALLY/);
  assert.match(policy, /EARLY_DROP/);
  assert.match(policy, /整固偏强/);
  assert.match(policy, /今日涨幅提前兑现/);
  assert.match(generation, /FOCUS_LIUYAO_DIRECTION=/);
  assert.match(generation, /FOCUS_LIUYAO_SUMMARY=/);
  assert.match(generation, /MOOX_ROLLING_REVISION/);
  assert.match(generation, /previousVersionId/);
  assert.doesNotMatch(generation, /deleteMany|updateMany\(|\.delete\(/);
});

test("every focus detail uses Liuyao + Qimen + current rhythm in one standard panel", () => {
  const panel = read("components/conviction/FocusQimenParallelPanel.tsx");
  const dossierPanel = read("components/conviction/FocusDossierPanel.tsx");
  const detail = read("components/conviction/ConvictionDetailClient.tsx");
  assert.match(panel, /六爻/);
  assert.match(panel, /奇门/);
  assert.match(panel, /当前节奏/);
  assert.match(dossierPanel, /FocusQimenParallelPanel/);
  assert.match(detail, /FocusDossierPanel/);
  assert.match(read("app/featured-stocks/spcx/page.tsx"), /ConvictionDetailClient/);
  assert.doesNotMatch(read("app/featured-stocks/spcx/page.tsx"), /SpcxResearchPage/);
});

test("Qimen definitions cover all canonical focus assets", () => {
  const qimen = read("lib/forecasts/focus-qimen-parallel.ts");
  for (const assetId of EXPECTED) {
    const key = assetId.includes("-") ? `"${assetId}"` : assetId;
    assert.match(qimen, new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*\\{`), `Qimen definition missing ${assetId}`);
  }
  assert.match(qimen, /角色=奇门独立观点/);
  assert.doesNotMatch(qimen, /角色=与六爻并列且不覆盖/);
});

test("visible focus UI removes repetitive methodology boilerplate", () => {
  const visibleFiles = [
    "components/conviction/FocusDossierPanel.tsx",
    "components/conviction/FocusQimenParallelPanel.tsx",
    "components/conviction/ResearchSpotlightCard.tsx",
    "components/conviction/ConvictionListClient.tsx",
    "components/conviction/MemberRecommendationList.tsx",
  ];
  const forbidden = ["不推翻", "不覆盖", "不反向修改", "不改变正式方向", "不改正式方向", "不替代本期", "正式周方向权威", "唯一方向"];
  for (const file of visibleFiles) {
    const source = read(file);
    for (const phrase of forbidden) assert.doesNotMatch(source, new RegExp(phrase), `${file}: ${phrase}`);
  }
  const detail = read("components/conviction/ConvictionDetailClient.tsx");
  assert.match(detail, /cleanResearchText/);
  assert.match(detail, /不推翻\|不覆盖\|不反向修改\|不改变/);
});

test("focus background refresh runs independently of page rendering", () => {
  const vercel = JSON.parse(read("vercel.json"));
  const cron = vercel.crons.find((row) => row.path === "/api/cron/prepare-focus-week");
  assert.ok(cron, "prepare-focus-week cron missing");
  assert.equal(cron.schedule, "35 */2 * * *");
  const detailRoute = read("app/featured-stocks/[slug]/page.tsx");
  assert.doesNotMatch(detailRoute, /loadBars|fetchYahoo|fetchBitget|resolveFocusDailyAuxiliaryEvidence/);
});
