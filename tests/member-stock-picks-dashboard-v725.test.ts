import assert from "node:assert/strict";
import test from "node:test";
import { buildMemberStockPickResearchRows } from "../lib/data/conviction/stock-picks-dashboard-core";
import { CONVICTION_ASSET_SEED } from "../lib/data/conviction/seed";
import type { ConvictionPublicCard } from "../types/conviction-asset";

function cards(): ConvictionPublicCard[] {
  return CONVICTION_ASSET_SEED.map((asset) => ({
    ...asset,
    exchange: asset.exchange ?? null,
    network: asset.network ?? null,
    contractAddress: asset.contractAddress ?? null,
    marketCap: asset.marketCap ?? null,
    marketCapCurrency: asset.marketCapCurrency ?? null,
    marketCapUpdatedAt: asset.marketCapUpdatedAt ?? null,
    researchStatusZh: "已发布",
    researchStatusEn: "Published",
    detailHref: `/featured-stocks/${asset.slug}`,
  }));
}

const rows = buildMemberStockPickResearchRows({
  cards: cards(),
  asOfDate: "2026-08-24",
  nowMs: Date.parse("2026-08-24T08:00:00Z"),
});

test("stock dashboard follows month-week-day chain and keeps missing weekly evidence explicit", () => {
  const intel = rows.find((row) => row.slug === "intel");
  assert.ok(intel);
  assert.equal(intel.monthly.sourcePriority, "USER_INTERPRETED");
  assert.equal(intel.weekly.direction, null);
  assert.match(intel.weekly.summary, /不能冒充周判断/);
  assert.match(intel.currentStage.note, /周卦与真实K线确认|震荡/);
});

test("teacher same-period evidence is marked as highest priority", () => {
  const tesla = rows.find((row) => row.slug === "tsla");
  assert.ok(tesla);
  assert.equal(tesla.weekly.sourcePriority, "TEACHER");
  assert.match(tesla.weekly.sourceLabel, /最高优先级/);
});

test("daily views keep derived Liuyao and Qimen separate", () => {
  const sandisk = rows.find((row) => row.slug === "sandisk");
  assert.ok(sandisk?.dailyMethods.length);
  const daily = sandisk.dailyMethods[0]!;
  assert.ok(daily.derivedSummary);
  assert.ok(daily.qimenSummary);
  assert.ok(["RESONANCE", "DIVERGENCE", "LIUYAO_MISSING", "NOT_COMPARABLE"].includes(daily.relation));
  assert.notEqual(sandisk.forecastShapeBasis, "MISSING");
});

test("member stock path API is fail-closed and cannot alter trading", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("app/api/member/stock-path/route.ts", "utf8"));
  assert.match(source, /getMemberDevicePageAccess/);
  assert.match(source, /checkMemberApiRateLimit/);
  assert.match(source, /X-MOOX-Research-Only/);
  assert.match(source, /X-MOOX-Auto-Trading-Changed.*false/);
  assert.doesNotMatch(source, /lib\/bitget|placeOrder|executeTrade/);
});

test("member page labels simulated path as non-price research", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("components/conviction/MemberStockResearchDashboard.tsx", "utf8"));
  assert.match(source, /形态指数，不是价格目标/);
  assert.match(source, /没有独立日卦时，只能从已锁定周卦拆分，不补造日卦/);
  assert.match(source, /4H缠论技术面/);
});
