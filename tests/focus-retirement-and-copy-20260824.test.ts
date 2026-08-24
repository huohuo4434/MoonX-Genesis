import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ACTIVE_STATIC_FOCUS_ASSET_IDS,
  RETIRED_STATIC_FOCUS_ASSET_IDS,
  STATIC_FOCUS_ASSET_IDS,
  listStaticMemberAutomationFocus,
} from "../lib/data/conviction/focus-registry-core";
import { listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";
import { WATCHLIST_TEASERS } from "../lib/data/conviction/watchlist-teasers";

const RETIRED = ["ganfeng-lithium", "lian-tech", "lexin-medical", "kingsoft-office"] as const;

test("four retired stocks leave every active focus surface while historical evidence remains", () => {
  assert.deepEqual([...RETIRED_STATIC_FOCUS_ASSET_IDS], [...RETIRED]);
  assert.equal(ACTIVE_STATIC_FOCUS_ASSET_IDS.length, STATIC_FOCUS_ASSET_IDS.length - RETIRED.length);

  const teaserSlugs = new Set(WATCHLIST_TEASERS.map((row) => row.slug));
  const automationIds = new Set(listStaticMemberAutomationFocus().map((row) => row.assetId));
  for (const assetId of RETIRED) {
    assert.ok(STATIC_FOCUS_ASSET_IDS.includes(assetId), `${assetId} remains in the historical registry`);
    assert.equal(ACTIVE_STATIC_FOCUS_ASSET_IDS.includes(assetId as never), false, assetId);
    assert.equal(teaserSlugs.has(assetId), false, assetId);
    assert.equal(automationIds.has(assetId), false, assetId);
    assert.ok(listStaticFocusForecasts(assetId).length > 0, `${assetId} historical forecasts remain reviewable`);
  }
});

test("member focus presentation hides process provenance and version labels", () => {
  const memberPage = readFileSync("app/member/stock-picks/page.tsx", "utf8");
  const dashboard = readFileSync("components/conviction/MemberStockResearchDashboard.tsx", "utf8");
  const comparison = readFileSync("components/conviction/SeptemberSectorComparison.tsx", "utf8");
  const detail = readFileSync("components/conviction/ConvictionDetailClient.tsx", "utf8");
  const store = readFileSync("lib/data/conviction/store.ts", "utf8");

  assert.doesNotMatch(`${memberPage}\n${dashboard}\n${comparison}`, /自起卦|按老师方法解读|最高优先级|非独立周卦|老师同周期原卦/);
  assert.doesNotMatch(dashboard, /view\.sourceLabel|view\.version/);
  assert.doesNotMatch(comparison, /row\.basis|>证据</);
  assert.match(detail, /cleanResearchText\(directionEvidence\)/);
  assert.match(detail, /自起卦\|旧自算\|用户本人排盘/);
  assert.match(store, /ACTIVE_STATIC_FOCUS_ASSET_IDS/);
  assert.match(store, /assets\.filter\(\(asset\) => activeIds\.has\(asset\.slug\)\)/);
});
