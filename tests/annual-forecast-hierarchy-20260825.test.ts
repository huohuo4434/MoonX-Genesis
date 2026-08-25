import assert from "node:assert/strict";
import test from "node:test";
import { resolveForecastHorizonHierarchy } from "../lib/forecasts/forecast-horizon-hierarchy";
import { getAnnualForecastRoadmap2026, listAnnualForecastRoadmaps2026 } from "../lib/research/annual-forecast-roadmap-2026";
import { MEMBER_RESEARCH_NAV } from "../config/member-channel-navigation";

test("年度正式层覆盖21个资产且8月25日前不参与历史统计", () => {
  const rows = listAnnualForecastRoadmaps2026();
  assert.equal(rows.length, 21);
  assert.ok(rows.every((item) => item.locked && item.version === 1));
  assert.ok(rows.every((item) => item.historicalScoringEligible === false));
  assert.ok(rows.every((item) => item.months.map((month) => month.month).join(",") === "2026-09,2026-10,2026-11,2026-12"));
  assert.equal(getAnnualForecastRoadmap2026("NDX")?.assetId, "nasdaq-100");
  assert.equal(getAnnualForecastRoadmap2026("INTC")?.assetId, "intel");
  assert.equal(getAnnualForecastRoadmap2026("CXMT"), null);
  assert.ok(MEMBER_RESEARCH_NAV.some((item) => item.href === "/member/annual-outlook" && item.groupKey === "forecast"));
});

test("年、月、周同向提高信心，但周卦仍拥有当周方向", () => {
  const result = resolveForecastHorizonHierarchy({
    annualDirection: "震荡上涨",
    monthlyDirection: "先跌后涨",
    weeklyDirection: "上涨",
  });
  assert.equal(result.authority, "WEEK");
  assert.equal(result.officialDirection, "上涨");
  assert.equal(result.confidence, "HIGH");
});

test("月周冲突降低信心，不让年卦越级覆盖周卦", () => {
  const result = resolveForecastHorizonHierarchy({
    annualDirection: "上涨",
    monthlyDirection: "震荡上涨",
    weeklyDirection: "先涨后跌",
  });
  assert.equal(result.authority, "WEEK");
  assert.equal(result.officialDirection, "先涨后跌");
  assert.equal(result.monthlyWeeklyRelation, "DIVERGENT");
  assert.equal(result.confidence, "LOW");
});

test("只有年卦时只形成年度候选，不伪造周方向", () => {
  const result = resolveForecastHorizonHierarchy({ annualDirection: "先涨后跌" });
  assert.equal(result.authority, "YEAR");
  assert.match(result.note, /等待独立月卦和周卦/);
});
