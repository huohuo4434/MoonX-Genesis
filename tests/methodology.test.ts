import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULT_METHODOLOGY_MODULES } from "../lib/methodology/defaults.ts";
import { applyRuntimeGates } from "../lib/methodology/gates.ts";
import { buildForecastModuleEvidence } from "../lib/methodology/evidence.ts";
import { NAV_ROUTES, PUBLIC_PRIMARY_NAV, buildPublicFooterColumns } from "../config/navigation.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("methodology public surface", () => {
  test("top nav prioritizes the current decision path and keeps methodology out of the primary row", () => {
    const keys = PUBLIC_PRIMARY_NAV.map((n) => n.key);
    assert.equal(keys[0], "nav.todayView");
    assert.ok(keys.includes("nav.weeklyAnalysis"));
    assert.ok(keys.includes("nav.aiTradingDesk"));
    assert.equal(NAV_ROUTES.methodology, "/methodology");
    assert.equal(PUBLIC_PRIMARY_NAV.some((item) => item.key === "nav.methodology"), false);
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

  test("liuyao is core research input not deterministic", () => {
    const liuyao = DEFAULT_METHODOLOGY_MODULES.find((m) => m.id === "liuyao")!;
    assert.ok(/研究输入|核心/.test(liuyao.summaryZh));
    assert.ok(/不是确定性|不构成/.test(liuyao.summaryZh));
    assert.equal(/神准|稳赚|固定收益/.test(liuyao.summaryZh), false);
    assert.ok(/not deterministic|research input/i.test(liuyao.summaryEn));
    assert.match(liuyao.weightRangeZh, /核心/);
  });

  test("four core pillars include qimen and news", () => {
    const ids = DEFAULT_METHODOLOGY_MODULES.filter((m) => m.publicDisplay).map((m) => m.id);
    assert.ok(ids.includes("liuyao"));
    assert.ok(ids.includes("qimen"));
    assert.ok(ids.includes("market_structure"));
    assert.ok(ids.includes("macro_flows"));
    assert.equal(DEFAULT_METHODOLOGY_MODULES.find((m) => m.id === "macro_flows")?.nameZh, "消息面");
    assert.equal(DEFAULT_METHODOLOGY_MODULES.find((m) => m.id === "market_structure")?.nameZh, "技术分析");
  });

  test("evidence differs by forecast fields — no identical hardcode blocks", () => {
    const a = buildForecastModuleEvidence({
      symbol: "BTC",
      directionLabel: "震荡上涨",
      summary: "围绕区间震荡",
      probabilities: { up: 40, flat: 35, down: 25 },
      supportLevels: ["100000"],
      resistanceLevels: ["108000"],
      catalysts: ["流动性改善"],
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
    assert.ok(b.some((x) => x.moduleId === "liuyao"));
    assert.ok(a.some((x) => x.moduleId === "qimen"));
  });

  test("weight labels use priority language", () => {
    for (const m of DEFAULT_METHODOLOGY_MODULES.filter((x) => x.enabled && x.publicDisplay)) {
      assert.ok(m.weightRangeZh.length > 0);
      assert.ok(/核心|高|中高|辅助|点位工具|中长期旁证/.test(m.weightRangeZh));
    }
  });

  test("methodology page client is visual with four cores", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/methodology/MethodologyPageClient.tsx"),
      "utf8"
    );
    assert.match(src, /六爻（核心）/);
    assert.match(src, /奇门遁甲/);
    assert.match(src, /技术分析/);
    assert.match(src, /消息面/);
    assert.match(src, /最终预测输出/);
  });
});
