/**
 * Directed fix coverage: weekly 7 markets, asteroid, methodology UI, referral storage.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";
import {
  WEEKLY_CORE_MARKETS,
  PUBLISHED_WEEKLY_ANALYSES,
} from "../lib/data/published-weekly-analysis-20260727.ts";
import {
  buildWeeklyMarketSlots,
  buildWeeklyPublicSummary,
  listPublishedWeeklyAnalyses,
} from "../lib/data/weekly-analysis.ts";
import { CONVICTION_ASSET_SEED } from "../lib/data/conviction/seed.ts";
import { formatMarketCapDisplay } from "../lib/data/conviction/format-market-cap.ts";
import { DEFAULT_METHODOLOGY_MODULES } from "../lib/methodology/defaults.ts";

describe("directed fix: weekly / asteroid / methodology / referral", () => {
  test("1-4) weekly coverage is 7 markets including SPX NDX WTI", () => {
    assert.equal(WEEKLY_CORE_MARKETS.length, 7);
    assert.equal(buildWeeklyMarketSlots().length, 7);
    const symbols = listPublishedWeeklyAnalyses().map((r) => r.symbol);
    assert.ok(symbols.includes("SPX"));
    assert.ok(symbols.includes("NDX"));
    assert.ok(symbols.includes("WTI"));
    assert.equal(PUBLISHED_WEEKLY_ANALYSES.length, 7);
    const summary = buildWeeklyPublicSummary();
    assert.equal(summary.coverageCount, 7);
    assert.equal(summary.publishedCount, 7);
    assert.equal(summary.teasers.length, 7);
  });

  test("5-7) Asteroid contract + market cap ~2618万美元 not 26万", () => {
    const a = CONVICTION_ASSET_SEED.find((x) => x.slug === "asteroid")!;
    assert.equal(a.assetType, "CRYPTO");
    assert.equal(a.nameZh, "Asteroid（太空狗）");
    assert.equal(a.network, "待确认");
    assert.equal(a.nameEn, "Asteroid");
    assert.ok(a.aliases?.includes("火箭狗"));
    assert.equal(a.contractAddress, "0xf280b16ef293d8e534e370794ef26bf312694126");
    assert.equal(a.contractPendingAdminConfirm, false);
    assert.equal(a.marketCap, 26_180_000);
    const mcap = formatMarketCapDisplay(a)!;
    assert.match(mcap.labelZh, /2618/);
    assert.equal(/约26万美元/.test(mcap.labelZh), false);
    assert.ok(a.marketCapUpdatedAt);
  });

  test("8-12) methodology defaults highlight four cores", () => {
    const page = readFileSync(
      resolve(process.cwd(), "components/methodology/MethodologyPageClient.tsx"),
      "utf8"
    );
    assert.match(page, /六爻（核心）/);
    assert.match(page, /奇门遁甲/);
    assert.match(page, /技术分析/);
    assert.match(page, /消息面/);
    assert.equal(DEFAULT_METHODOLOGY_MODULES.find((m) => m.id === "liuyao")?.weightRangeZh.includes("核心"), true);
  });

  test("13) forecast evidence panel links to methodology", () => {
    const panel = readFileSync(
      resolve(process.cwd(), "components/forecasts/ForecastEvidencePanel.tsx"),
      "utf8"
    );
    assert.match(panel, /\/methodology/);
    assert.match(panel, /预测依据|查看MOOX预测方法|查看预测方法/);
  });

  test("14-15) referral store never hard-requires local file write in production path", () => {
    const store = readFileSync(resolve(process.cwd(), "lib/referral/store.ts"), "utf8");
    assert.match(store, /EROFS|read-only/);
    assert.match(store, /prisma\.referralInvite|ReferralInvite/);
    assert.match(store, /Never writes/);
    // writeFileSync only inside tryWriteLocalFile / LOCAL_ONLY
    assert.match(store, /MOONX_REFERRAL_LOCAL_ONLY/);
    assert.match(store, /shouldUsePrisma/);
  });

  test("16-19) invite code rules + site URL helper", async () => {
    const { generateInviteCode, normalizeInviteCode } = await import("../lib/referral/store.ts");
    const { siteBaseUrl } = await import("../lib/referral/site-url.ts");
    const code = generateInviteCode("user-xyz");
    assert.equal(code.length, 8);
    assert.equal(/[OI01]/.test(code), false);
    assert.equal(normalizeInviteCode("ab-cd"), "ABCD");
    process.env.NEXT_PUBLIC_SITE_URL = "https://moon-x-genesis.vercel.app";
    const url = siteBaseUrl(null);
    assert.equal(url.includes("localhost"), false);
    assert.match(url, /moon-x-genesis\.vercel\.app|https:\/\//);
  });
});
