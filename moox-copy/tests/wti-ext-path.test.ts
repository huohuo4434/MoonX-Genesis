import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { listResearchRecords } from "../lib/data/research-records.ts";
import {
  WTI_EXT_PATH_RECORD_ID,
  WTI_MOONX_MIDTERM_ID,
  getWtiExtPathAdminCard,
  wtiPathExt20260807Records,
} from "../lib/data/wti-path-ext-20260807.ts";
import { filterPublicResearchRecords, resolveResearchVisibility } from "../lib/research/visibility.ts";
import {
  compareNewWtiLiuyaoToExternalPath,
  getWtiExtPathEngineWeightPct,
  mustNotDrivePublicWtiDirection,
} from "../lib/research/wti-ext-path-engine.ts";
import { listPublishedWeeklyAnalyses } from "../lib/data/weekly-analysis.ts";
import { formatDateTimeChina } from "../lib/utils/datetime.ts";
import { lt } from "../lib/i18n/config.ts";
import type { ResearchRecord } from "../types/research.ts";

describe("WTI internal path INT-WTI-20260807-20270204-EXT-001", () => {
  test("ingested exactly once and linked to MoonX mid-term", async () => {
    const records = await listResearchRecords();
    const hits = records.filter((r) => r.id === WTI_EXT_PATH_RECORD_ID);
    assert.equal(hits.length, 1);
    const rec = hits[0]!;
    assert.equal(rec.visibility, "internal");
    assert.equal(rec.publishGate, "internal_review");
    assert.equal(rec.consensusEligible, false);
    assert.equal(rec.excludeFromLongTermConsensus, true);
    assert.equal(rec.comparison?.earlyStageAlignment, "高");
    assert.equal(rec.comparison?.laterStageStatus, "待六爻复核");
    assert.ok(rec.comparison?.comparedRecordIds.includes(WTI_MOONX_MIDTERM_ID));
    const moonx = records.find((r) => r.id === WTI_MOONX_MIDTERM_ID);
    assert.ok(moonx?.relatedRecordIds?.includes(WTI_EXT_PATH_RECORD_ID));
  });

  test("not public and not in member weekly published list", async () => {
    const records = await listResearchRecords();
    const rec = records.find((r) => r.id === WTI_EXT_PATH_RECORD_ID)!;
    assert.equal(resolveResearchVisibility(rec), "internal");
    assert.equal(filterPublicResearchRecords([rec]).length, 0);
    const weekly = listPublishedWeeklyAnalyses();
    assert.ok(!weekly.some((w) => w.id.includes("INT-WTI") || /65—80|突破120/.test(w.headline + w.weeklyPath)));
  });

  test("engine weights: early ≤20, later 0", () => {
    assert.equal(getWtiExtPathEngineWeightPct("2026-09-15"), 20);
    assert.equal(getWtiExtPathEngineWeightPct("2026-10-31"), 20);
    assert.equal(getWtiExtPathEngineWeightPct("2026-11-01"), 0);
    assert.equal(mustNotDrivePublicWtiDirection(WTI_EXT_PATH_RECORD_ID, "2026-11-15"), true);
    assert.equal(mustNotDrivePublicWtiDirection(WTI_EXT_PATH_RECORD_ID, "2026-09-01"), false);
  });

  test("admin card fields", () => {
    const card = getWtiExtPathAdminCard();
    assert.equal(card.id, WTI_EXT_PATH_RECORD_ID);
    assert.match(card.earlyConclusion, /震荡下跌/);
    assert.match(card.laterStatus, /六爻/);
    assert.match(card.adminNote, /前期可以使用/);
  });

  test("auto-compare lowers weight when liuyao rejects later rally", () => {
    const fake: ResearchRecord = {
      id: "MX-WTI-FAKE-LIUYAO-LATER",
      publishedAt: "2026-10-20",
      assetId: "crude-oil",
      assetName: lt("WTI", "WTI", "WTI"),
      symbol: "WTI",
      market: "commodity",
      framework: "oracle-six-yao",
      sourceType: "internal-research",
      publicSourceLabel: lt("测", "測", "t"),
      direction: "bearish",
      editorialConfidence: 60,
      consensusEligible: false,
      horizon: lt("测", "測", "t"),
      title: lt("不支持后期上涨", "不支持後期上漲", "Reject later rally"),
      summary: lt(
        "六爻显示11月后继续下跌，否定重新上涨，技术未确认突破前高。",
        "六爻顯示11月後繼續下跌，否定重新上漲，技術未確認突破前高。",
        "Rejects later rally"
      ),
      thesis: [],
      status: "pending",
      tags: ["crude-oil"],
    };
    const result = compareNewWtiLiuyaoToExternalPath(fake);
    assert.ok(result);
    assert.ok(result!.verdict === "冲突" || result!.verdict === "部分一致" || result!.verdict === "证据不足");
    assert.equal(result!.laterWeightPct, 0);
  });

  test("no duplicate seed rows", () => {
    assert.equal(wtiPathExt20260807Records.length, 1);
  });

  test("datetime formatter never doubles 北京时间", () => {
    const once = formatDateTimeChina("2026-07-26T20:00:00+08:00");
    assert.equal((once.match(/北京时间/g) ?? []).length, 1);
    const again = formatDateTimeChina(once);
    assert.equal(again.includes("（北京时间）（北京时间）"), false);
    assert.equal((again.match(/北京时间/g) ?? []).length, 1);
  });
});
