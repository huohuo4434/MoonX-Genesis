import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTeacher02Rev322PathCalibration,
  TEACHER02_REV322_PREFLIGHT,
  TEACHER02_REV322_RULES,
  TEACHER02_REV322_SOURCE_META,
  teacher02Rev322MarketKindForAsset,
} from "../lib/research/teacher02-rev322.ts";

describe("teacher02 Rev3.2.2 visible rule engine", () => {
  it("stores the visible version boundary without claiming the original Word is complete", () => {
    assert.equal(TEACHER02_REV322_SOURCE_META.version, "Rev3.2.2");
    assert.match(TEACHER02_REV322_SOURCE_META.sourceNature, /不是原始Word逐字全文/);
    assert.equal(TEACHER02_REV322_PREFLIGHT.length, 8);
    assert.ok(TEACHER02_REV322_RULES.some((rule) => rule.id === "REV322-G3"));
    assert.ok(TEACHER02_REV322_RULES.some((rule) => rule.id === "REV322-G5"));
    assert.equal(
      TEACHER02_REV322_RULES.find((rule) => rule.id === "REV322-G4-G6")?.automaticUse,
      false
    );
  });

  it("separates 7x24 assets from conventional securities", () => {
    assert.equal(teacher02Rev322MarketKindForAsset("ethereum"), "CONTINUOUS_7X24");
    assert.equal(teacher02Rev322MarketKindForAsset("bitcoin"), "CONTINUOUS_7X24");
    assert.equal(teacher02Rev322MarketKindForAsset("gold"), "SECURITIES");
    assert.equal(teacher02Rev322MarketKindForAsset("sp500"), "SECURITIES");
  });

  it("creates an inclusive 3/4/3 natural-day split that preserves the full period", () => {
    const calibration = buildTeacher02Rev322PathCalibration({
      assetId: "ethereum",
      forecastStart: "2026-08-03",
      forecastEnd: "2026-08-10",
    });
    assert.ok(calibration);
    assert.equal(calibration?.totalNaturalDays, 8);
    assert.deepEqual(
      calibration?.segments.map((segment) => [segment.label, segment.start, segment.end, segment.naturalDayCount]),
      [
        ["前段", "2026-08-03", "2026-08-04", 2],
        ["中段", "2026-08-05", "2026-08-07", 3],
        ["后段", "2026-08-08", "2026-08-10", 3],
      ]
    );
    assert.match(calibration?.weekendPolicy ?? "", /周六和周日不顺延/);
  });

  it("keeps security segment dates natural and explicitly requires G3 for weekend critical points", () => {
    const calibration = buildTeacher02Rev322PathCalibration({
      assetId: "gold",
      forecastStart: "2026-08-03",
      forecastEnd: "2026-08-10",
    });
    assert.ok(calibration);
    assert.equal(calibration?.marketKind, "SECURITIES");
    assert.ok(calibration?.appliedRuleIds.includes("REV322-G3"));
    assert.ok(calibration?.appliedRuleIds.includes("REV322-G5"));
    assert.match(calibration?.weekendPolicy ?? "", /法定节假日仍需交易日历确认/);
  });
});
