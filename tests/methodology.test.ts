import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULT_METHODOLOGY_MODULES } from "../lib/methodology/defaults.ts";
import { applyRuntimeGates } from "../lib/methodology/gates.ts";
import { buildForecastModuleEvidence } from "../lib/methodology/evidence.ts";
import { NAV_ROUTES, PUBLIC_PRIMARY_NAV, buildPublicFooterColumns } from "../config/navigation.ts";

describe("methodology public surface", () => {
  test("nav includes methodology between verification and pricing", () => {
    const keys = PUBLIC_PRIMARY_NAV.map((n) => n.key);
    const v = keys.indexOf("nav.verification");
    const m = keys.indexOf("nav.methodology");
    const p = keys.indexOf("nav.pricing");
    assert.ok(v >= 0 && m === v + 1 && p === m + 1);
    assert.equal(NAV_ROUTES.methodology, "/methodology");
    assert.equal(PUBLIC_PRIMARY_NAV[m]?.labelZh, "预测方法");
  });

  test("footer includes methodology", () => {
    const product = buildPublicFooterColumns().find((c) => c.titleKey === "footer.product");
    assert.ok(product?.links.some((l) => l.href === "/methodology" && l.labelZh === "预测方法"));
  });

  test("analyst module is hidden when intelligence snapshot is off", () => {
    const gated = applyRuntimeGates(DEFAULT_METHODOLOGY_MODULES, {
      intelligenceSnapshotEnabled: false,
    });
    const analyst = gated.find((m) => m.id === "analyst")!;
    assert.equal(analyst.enabled, false);
    assert.equal(analyst.publicDisplay, false);
  });

  test("liuyao copy is research-dimension not deterministic", () => {
    const liuyao = DEFAULT_METHODOLOGY_MODULES.find((m) => m.id === "liuyao")!;
    assert.ok(/研究维度|研究输入/.test(liuyao.summaryZh));
    assert.ok(/不是确定性|不构成/.test(liuyao.summaryZh));
    assert.equal(/神准|稳赚|固定收益/.test(liuyao.summaryZh), false);
    assert.ok(/not deterministic|research input/i.test(liuyao.summaryEn));
  });

  test("evidence differs by forecast fields — no identical hardcode blocks", () => {
    const a = buildForecastModuleEvidence({
      symbol: "BTC",
      directionLabel: "震荡上涨",
      summary: "围绕区间震荡，MoonX综合判断节奏偏稳",
      probabilities: { up: 40, flat: 35, down: 25 },
      supportLevels: ["100000"],
      resistanceLevels: ["108000"],
      catalysts: ["MoonX综合判断"],
      risks: ["波动放大"],
      confidence: 55,
    });
    const b = buildForecastModuleEvidence({
      symbol: "SPX",
      directionLabel: "先跌后涨",
      summary: "宽度回升后反弹",
      probabilities: { up: 48, flat: 30, down: 22 },
      supportLevels: ["5200"],
      resistanceLevels: ["5400"],
      invalidation: "跌破支撑",
      confidence: 52,
    });
    assert.ok(a.length >= 2);
    assert.ok(b.length >= 2);
    const aBlob = a.map((x) => x.conclusionZh).join("|");
    const bBlob = b.map((x) => x.conclusionZh).join("|");
    assert.notEqual(aBlob, bBlob);
    assert.ok(a.some((x) => x.moduleId === "liuyao"));
    assert.equal(
      b.some((x) => x.moduleId === "liuyao"),
      false
    );
  });

  test("weight ranges are descriptive not invented fixed single percents only", () => {
    for (const m of DEFAULT_METHODOLOGY_MODULES.filter((x) => x.enabled && x.publicDisplay)) {
      assert.ok(m.weightRangeZh.length > 0);
      assert.ok(/动态|区间|默认|约/.test(m.weightRangeZh));
    }
  });
});
