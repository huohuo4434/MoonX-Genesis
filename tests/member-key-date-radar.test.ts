import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { getSexagenaryDay } from "../lib/calendar/sexagenary-calendar.ts";
import { STATIC_FOCUS_ASSET_IDS, STATIC_MEMBER_AUTOMATION_FOCUS } from "../lib/data/conviction/focus-registry-core.ts";
import {
  MONTHLY_LIUYAO_FORECASTS_20260829,
  MONTHLY_LIUYAO_SOURCE_META_20260829,
  SUPPLEMENTAL_KEY_DATE_ASSET_IDS,
} from "../lib/data/conviction/us-megacap-liuyao-20260829.ts";
import { buildKeyDateRadar, keyDateStatus, splitCurrentKeyDateRadar, summarizeKeyDateRadar } from "../lib/data/key-date-radar-core.ts";
import { MEMBER_KEY_DATE_ASSET_IDS, buildMemberKeyDateRadar, memberKeyDateCoverage } from "../lib/data/member-key-date-radar.ts";
import { RESEARCH_CONSENSUS_REVIEWS_20260830 } from "../lib/data/research-consensus-20260830.ts";
import { NAV_ROUTES } from "../config/member-channel-navigation.ts";

const AS_OF = "2026-08-29";

test("key-date status distinguishes upcoming, active and review exact days", () => {
  const base = buildMemberKeyDateRadar(AS_OF).find((item) => item.focusDate > AS_OF);
  assert.ok(base);
  assert.equal(keyDateStatus(base, AS_OF), "UPCOMING");
  assert.equal(keyDateStatus(base, base.focusDate), "ACTIVE");
  assert.equal(keyDateStatus(base, "2026-12-31"), "REVIEW");
});

test("all key-date assets have at least one month and one week key date", () => {
  const coverage = memberKeyDateCoverage(AS_OF);
  assert.equal(coverage.length, MEMBER_KEY_DATE_ASSET_IDS.length);
  assert.equal(STATIC_FOCUS_ASSET_IDS.length, 24);
  assert.equal(MEMBER_KEY_DATE_ASSET_IDS.length, 25);
  assert.deepEqual(coverage.filter((row) => !row.month || !row.week), []);

  const rows = buildMemberKeyDateRadar(AS_OF);
  const monthlyAssets = new Set(rows.filter((row) => row.level === "MONTH").map((row) => row.assetId));
  const weeklyAssets = new Set(rows.filter((row) => row.level === "WEEK").map((row) => row.assetId));
  assert.deepEqual([...monthlyAssets].sort(), [...MEMBER_KEY_DATE_ASSET_IDS].sort());
  assert.deepEqual([...weeklyAssets].sort(), [...MEMBER_KEY_DATE_ASSET_IDS].sort());
});

test("radar contains only exact month or week dates and preserves traceability", () => {
  const rows = buildMemberKeyDateRadar(AS_OF);
  assert.ok(rows.length >= MEMBER_KEY_DATE_ASSET_IDS.length * 2);
  for (const item of rows) {
    assert.match(item.focusDate, /^2026-\d{2}-\d{2}$/, item.id);
    assert.equal(item.startDate, item.focusDate, item.id);
    assert.equal(item.endDate, item.focusDate, item.id);
    assert.equal(item.ganzhi, getSexagenaryDay(item.focusDate).label, item.id);
    assert.ok(item.level === "MONTH" || item.level === "WEEK", item.id);
    assert.ok(item.evidence === "EXPLICIT" || item.evidence === "DERIVED", item.id);
    assert.ok(item.sourceIds.length > 0, item.id);
    assert.ok(item.derivation.length >= 15, item.id);
    assert.ok(item.confirmation.length >= 15, item.id);
    assert.ok(item.invalidation.length >= 15, item.id);
    assert.equal(item.focusDate >= AS_OF, true, item.id);
    if (item.consensusLevel) assert.ok(item.consensusNote && item.consensusNote.length >= 20, item.id);
  }
});

test("August 30 research raises confidence only on aligned exact windows", () => {
  const rows = buildMemberKeyDateRadar("2026-08-30");
  const tslaLow = rows.find((item) => item.assetId === "tsla" && item.level === "MONTH" && item.focusDate === "2026-09-01");
  const tslaHigh = rows.find((item) => item.assetId === "tsla" && item.level === "MONTH" && item.focusDate === "2026-09-04");
  const gold = rows.find((item) => item.assetId === "gold" && item.level === "MONTH" && item.focusDate === "2026-09-07");
  const silver = rows.find((item) => item.assetId === "silver" && item.level === "MONTH" && item.focusDate === "2026-09-14");
  const btc = rows.find((item) => item.assetId === "btc" && item.level === "MONTH" && item.focusDate === "2026-09-10");

  assert.ok(tslaLow);
  assert.equal(tslaLow.confidence, 78);
  assert.equal(tslaLow.consensusLevel, "MULTI_METHOD_RESONANCE");
  assert.ok(tslaLow.sourceIds.length >= 3);

  assert.ok(tslaHigh);
  assert.equal(tslaHigh.action, "TOP_EXIT_WATCH");
  assert.equal(tslaHigh.confidence, 78);
  assert.equal(tslaHigh.consensusLevel, "MULTI_METHOD_RESONANCE");

  assert.ok(gold);
  assert.equal(gold.confidence, 58);
  assert.equal(gold.consensusLevel, "PARTIAL_ALIGNMENT");

  assert.ok(silver);
  assert.equal(silver.confidence, 52);
  assert.equal(silver.consensusLevel, undefined);

  assert.ok(btc);
  assert.equal(btc.confidence, 68);
  assert.equal(btc.consensusLevel, undefined);
});

test("research comparison preserves disagreement, uses anonymous method classes and stays presentation-only", () => {
  assert.equal(RESEARCH_CONSENSUS_REVIEWS_20260830.length, 7);
  assert.deepEqual(
    RESEARCH_CONSENSUS_REVIEWS_20260830.filter((review) => review.alignment === "MULTI_METHOD_RESONANCE").map((review) => review.assetId),
    ["sp500", "tsla", "silver"],
  );
  const btc = RESEARCH_CONSENSUS_REVIEWS_20260830.find((review) => review.assetId === "btc");
  assert.ok(btc);
  assert.equal(btc.alignment, "CONFLICTED");
  assert.equal(btc.confidenceDecision, "DOWN_ONE");
  assert.doesNotMatch(JSON.stringify(RESEARCH_CONSENSUS_REVIEWS_20260830), /丙午|狼叔|万里|秋六爻|Alpha/i);

  const audit = JSON.parse(fs.readFileSync("data/imports/research-consensus-20260830.json", "utf8"));
  assert.equal(audit.governance.rewriteLockedHistory, false);
  assert.equal(audit.governance.reverseLockedDirection, false);
  assert.equal(audit.governance.triggerTradingAlone, false);
  assert.equal(audit.presentation.showPersonalSourceNames, false);
});

test("derived dates disclose inference and do not fabricate teacher-supplied exact days", () => {
  const rows = buildMemberKeyDateRadar(AS_OF);
  const derived = rows.filter((item) => item.evidence === "DERIVED");
  const explicit = rows.filter((item) => item.evidence === "EXPLICIT");
  assert.ok(derived.length > 0);
  assert.ok(explicit.length > 0);
  assert.ok(derived.every((item) => /结构转折|当周段推演|锁定路径/.test(item.derivation)));
  assert.ok(derived.some((item) => /不冒充原卦明确点名/.test(item.derivation)));
  assert.ok(explicit.every((item) => /锁定记录明确点名/.test(item.derivation)));
});

test("Google September radar does not reuse the August bullish month or invent a top exit", () => {
  const rows = buildMemberKeyDateRadar(AS_OF).filter((item) => item.assetId === "googl");
  const monthly = rows.find((item) => item.level === "MONTH");
  const weekly = rows.find((item) => item.level === "WEEK");

  assert.ok(monthly);
  assert.equal(monthly.sourceIds.includes("GOOGL-M3-20260901-V1"), true);
  assert.match(monthly.primaryView, /多月卦阶段方向（2026-09-01至2026-11-30）：震荡/);
  assert.equal(monthly.action, "TURNING_RISK");
  assert.notEqual(monthly.focusDate, "2026-09-03");

  assert.ok(weekly);
  assert.equal(weekly.sourceIds.includes("GOOGL-W4-20260831-V2"), true);
  assert.match(weekly.primaryView, /周卦正式方向（2026-08-31至2026-09-06）：震荡/);
  assert.equal(weekly.action, "TURNING_RISK");
});

test("plain bullish or bearish directions never become invented exit or bottom calls", () => {
  const derived = buildMemberKeyDateRadar(AS_OF).filter((item) => item.evidence === "DERIVED");
  for (const item of derived) {
    const direction = item.primaryView.match(/）：([^。]+)/)?.[1] ?? "";
    if (/^(上涨|震荡上涨|下跌|震荡下跌)$/.test(direction) && !/锁定路径/.test(item.derivation)) {
      assert.equal(item.action, "TURNING_RISK", item.id);
    }
  }
});

test("locked path date boundaries outrank generic ratio dates", () => {
  const rows = buildMemberKeyDateRadar(AS_OF);
  const expected = [
    ["cxmt", "2026-09-28", "TOP_EXIT_WATCH"],
    ["lite", "2026-09-14", "TOP_EXIT_WATCH"],
    ["spcx", "2026-09-21", "TOP_EXIT_WATCH"],
    ["intel", "2026-09-21", "TOP_EXIT_WATCH"],
    ["gold", "2026-09-07", "TOP_EXIT_WATCH"],
    ["silver", "2026-09-21", "TOP_EXIT_WATCH"],
    ["wti-crude", "2026-09-07", "BOTTOM_WATCH"],
    ["wti-crude", "2026-09-13", "TOP_EXIT_WATCH"],
    ["wti-crude", "2026-09-21", "TOP_EXIT_WATCH"],
  ] as const;
  for (const [assetId, date, action] of expected) {
    const item = rows.find((row) => row.level === "MONTH" && row.assetId === assetId && row.focusDate === date);
    assert.ok(item, `${assetId}:${date}`);
    assert.equal(item.action, action, `${assetId}:${date}`);
    assert.match(item.derivation, /锁定路径|锁定路径文字/, `${assetId}:${date}`);
  }
});

test("cross-month residual and multi-month rows do not invent a top or bottom", () => {
  const rows = buildMemberKeyDateRadar(AS_OF);
  const kingsoft = rows.find((item) => item.assetId === "kingsoft-office" && item.level === "MONTH");
  const asteroid = rows.find((item) => item.assetId === "asteroid" && item.level === "MONTH");
  assert.ok(kingsoft);
  assert.equal(kingsoft.action, "TURNING_RISK");
  assert.match(kingsoft.derivation, /没有独立整月记录/);
  assert.ok(asteroid);
  assert.equal(asteroid.action, "TURNING_RISK");
  assert.match(asteroid.primaryView, /多月卦阶段方向/);
});

test("month-derived weekly rows identify their source instead of claiming a weekly hexagram", () => {
  const rows = buildMemberKeyDateRadar(AS_OF).filter((item) => item.level === "WEEK");
  for (const item of rows) {
    const source = item.sourceIds[0] ?? "";
    if (["GANFENG-202609-M2-V1", "LIAN-202609-M2-V1", "LEXIN-202609-M2-V1", "TENCENT-MONTH-20260901-V1", "KINGSOFT-OFFICE-M1-20260803-V1", "META-M1-20260901-V1", "NVDA-M1-20260901-V1"].includes(source)) {
      assert.match(item.primaryView, /月卦当周推演方向/);
      assert.doesNotMatch(item.primaryView, /周卦正式方向/);
    }
  }
});

test("known locked monthly key dates remain present while the rest gain full coverage", () => {
  const rows = buildMemberKeyDateRadar(AS_OF).filter((item) => item.level === "MONTH");
  const exact = rows.filter((item) => item.evidence === "EXPLICIT");
  assert.ok(exact.some((item) => item.assetId === "btc" && item.focusDate === "2026-09-10"));
  assert.ok(exact.some((item) => item.assetId === "eth" && item.focusDate === "2026-09-10"));
  assert.ok(exact.some((item) => item.assetId === "hype" && item.focusDate === "2026-09-10"));
  assert.ok(exact.some((item) => item.assetId === "tsla" && item.focusDate === "2026-09-01"));
});

test("non-crypto derived key dates do not land on a weekend", () => {
  const rows = buildMemberKeyDateRadar(AS_OF).filter((item) =>
    item.evidence === "DERIVED"
      && !/锁定路径/.test(item.derivation)
      && STATIC_MEMBER_AUTOMATION_FOCUS[item.assetId as keyof typeof STATIC_MEMBER_AUTOMATION_FOCUS]?.assetClass !== "CRYPTO"
  );
  for (const item of rows) {
    const day = new Date(`${item.focusDate}T00:00:00.000Z`).getUTCDay();
    assert.notEqual(day, 0, item.id);
    assert.notEqual(day, 6, item.id);
  }
});

test("summary and split expose exactly two current modules", () => {
  const rows = buildKeyDateRadar(buildMemberKeyDateRadar(AS_OF), AS_OF);
  const summary = summarizeKeyDateRadar(rows);
  const split = splitCurrentKeyDateRadar(rows);
  assert.equal(summary.assetCount, 25);
  assert.equal(summary.monthlyCount, split.monthly.length);
  assert.equal(summary.weeklyCount, split.weekly.length);
  assert.equal("monthlyPath" in split, false);
});

test("new SNDK September chart becomes the forward month authority without deleting old history", () => {
  const monthly = buildMemberKeyDateRadar(AS_OF).find((item) => item.assetId === "sandisk" && item.level === "MONTH");
  assert.ok(monthly);
  assert.deepEqual(monthly.sourceIds, ["SNDK-M1-20260901-V3"]);
  assert.match(monthly.primaryView, /月卦正式方向.*先涨后跌/);
  assert.equal(monthly.evidence, "DERIVED");
  assert.equal(monthly.methodViews?.length, 4);
  assert.match(monthly.finalSynthesis ?? "", /易老师综合取舍/);
});

test("META stays key-date-only while NVDA becomes a non-trading focus asset", () => {
  assert.deepEqual(SUPPLEMENTAL_KEY_DATE_ASSET_IDS, ["meta", "nvda"]);
  assert.equal(STATIC_FOCUS_ASSET_IDS.includes("meta" as never), false);
  assert.equal("meta" in STATIC_MEMBER_AUTOMATION_FOCUS, false);
  assert.equal(STATIC_FOCUS_ASSET_IDS.includes("nvda"), true);
  assert.equal(STATIC_MEMBER_AUTOMATION_FOCUS.nvda.canonicalSymbol, null, "NVDA research coverage must not grant execution authority");

  for (const assetId of SUPPLEMENTAL_KEY_DATE_ASSET_IDS) {
    const rows = buildMemberKeyDateRadar(AS_OF).filter((item) => item.assetId === assetId);
    const monthly = rows.find((item) => item.level === "MONTH");
    const weekly = rows.find((item) => item.level === "WEEK");
    assert.ok(monthly, assetId);
    assert.ok(weekly, assetId);
    assert.equal(monthly.methodViews?.length, 4, assetId);
    assert.deepEqual(monthly.methodViews?.map((view) => view.label), [
      "月令六亲流派（主判）",
      "动爻节奏流派（复核）",
      "用神强弱流派（复核）",
      "卦象取形流派（复核）",
    ]);
    assert.doesNotMatch(monthly.methodViews?.map((view) => view.label).join(" ") ?? "", /丙午|狼叔|万里|秋六爻/);
    assert.match(weekly.primaryView, /月卦当周推演方向/, assetId);
    assert.doesNotMatch(weekly.primaryView, /周卦正式方向/, assetId);
  }

  const currentNvdaWeek = buildMemberKeyDateRadar("2026-08-31")
    .find((item) => item.assetId === "nvda" && item.level === "WEEK");
  assert.match(currentNvdaWeek?.primaryView ?? "", /周卦正式方向/);
});

test("supplied charts remain source-traceable and do not invent exact chart dates", () => {
  assert.equal(MONTHLY_LIUYAO_SOURCE_META_20260829.sandisk.sourceFile, "ea25d744b26c438a5e104597231c4c18.jpg");
  assert.equal(MONTHLY_LIUYAO_SOURCE_META_20260829.sandisk.lineInputFile, "66a53fb089d93e11cc3a9ab10602db5c.jpg");
  assert.equal(MONTHLY_LIUYAO_SOURCE_META_20260829.meta.sourceFile, "2474b076f6d3b5e944b2124e9309f1ed.jpg");
  assert.equal(MONTHLY_LIUYAO_SOURCE_META_20260829.nvda.sourceFile, "a0f01ea1ce96545857ccea6a9b5ab987.jpg");
  assert.deepEqual(MONTHLY_LIUYAO_FORECASTS_20260829.map((row) => row.ichingEvidence.primaryHexagram), ["水风井", "水山蹇", "艮为山（六冲）"]);
  assert.ok(MONTHLY_LIUYAO_FORECASTS_20260829.every((row) => !row.keyDates?.length));
});

test("member route is gated, discoverable and groups monthly and weekly dates by sector and asset", () => {
  const page = fs.readFileSync("app/member/key-dates/page.tsx", "utf8");
  assert.match(page, /getMemberDevicePageAccess/);
  assert.match(page, /MEMBERSHIP_REQUIRED/);
  assert.match(page, /DEVICE_REQUIRED/);
  assert.match(page, />月关键日</);
  assert.match(page, />周关键日</);
  assert.match(page, /锁定路径日期/);
  assert.match(page, /半导体 \/ AI基础设施/);
  assert.match(page, /同一品种的月关键日与周关键日放在一起/);
  assert.match(page, /月关键日行动总览/);
  assert.match(page, /周关键日行动总览/);
  assert.match(page, /观点共振复核/);
  assert.match(page, /共振不会改写已经锁定的正式方向/);
  assert.match(page, /LatestResearchConsensus/);
  assert.match(page, /抄底观察/);
  assert.match(page, /逃顶 \/ 减仓观察/);
  assert.match(page, /只观察 \/ 不操作/);
  assert.doesNotMatch(page, /变盘确认/);
  assert.match(page, /9月7日至10月7日相对转强/);
  assert.match(page, /8月29日新补的9月整月卦已发布为V3/);
  assert.match(page, /查看四种流派方法对比/);
  assert.match(page, /月令六亲流派负责主判/);
  assert.doesNotMatch(page, /丙午老师法|狼叔法|万里法|秋六爻法/);
  assert.match(page, /"nvda"/);
  assert.match(page, /"meta"/);
  assert.match(page, /AssetKeyDateGroup/);
  assert.doesNotMatch(page, /KeyDateCard/);
  assert.doesNotMatch(page, /MONTH_PATH|agenda\.monthlyPath/);
  assert.equal(NAV_ROUTES.memberKeyDates, "/member/key-dates");
  assert.equal(NAV_ROUTES.memberKeyDates, "/member/key-dates");
});
