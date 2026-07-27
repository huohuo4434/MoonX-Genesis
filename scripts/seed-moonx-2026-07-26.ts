/**
 * One-off seed script: writes content/moonx/latest.json (+ history copy + source notes).
 * Run: npx tsx scripts/seed-moonx-2026-07-26.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { MoonXDocumentSchema } from "../lib/moonx/schema";

type LT = { zhCN: string; zhTW: string; en: string };

function lt(zhCN: string, zhTW: string, en: string): LT {
  return { zhCN, zhTW, en };
}

const LABELS = {
  support: lt("支撑", "支撐", "Support"),
  majorSupport: lt("强支撑", "強支撐", "Major Support"),
  resistance: lt("压力", "壓力", "Resistance"),
  majorResistance: lt("强压力", "強壓力", "Major Resistance"),
  target: lt("目标", "目標", "Target"),
  invalidation: lt("失效位", "失效位", "Invalidation"),
  consolidation: lt("震荡区间", "震盪區間", "Consolidation Zone"),
  turningWindow: lt("转折窗口", "轉折窗口", "Turning Window"),
};

const RESEARCH_DATE = "2026-07-26";
const VERSION = "2026-07-26-v1";
const LAST_UPDATED = "2026-07-26T12:00:00.000Z";

function btcChart() {
  return {
    chartTitle: lt("比特币情景预测", "比特幣情境預測", "Bitcoin Scenario Forecast"),
    forecastWindow: { start: "2026-07-26", end: "2026-08-15" },
    referencePrice: 65200,
    pricePrecision: 0,
    historicalCandleCount: 35,
    forecastCandleCount: 18,
    seed: 190726,
    historicalWaypoints: [
      { progress: 0, price: 62800 },
      { progress: 0.5, price: 67450, label: "Prior Rebound High" },
      { progress: 1, price: 65200 },
    ],
    historicalVolatility: 0.016,
    levels: [
      { id: "btc-support-64650", price: 64650, kind: "support" as const, label: LABELS.support },
      { id: "btc-support-61500", price: 61500, kind: "support" as const, label: LABELS.support },
      { id: "btc-major-support-58000", price: 58000, kind: "major-support" as const, label: LABELS.majorSupport },
      { id: "btc-invalidation-63412", price: 63412, kind: "invalidation" as const, label: LABELS.invalidation },
      { id: "btc-resistance-66956", price: 66956, kind: "resistance" as const, label: LABELS.resistance },
      { id: "btc-major-resistance-67300", price: 67300, kind: "major-resistance" as const, label: LABELS.majorResistance },
      { id: "btc-target-70000", price: 70000, kind: "target" as const, label: LABELS.target },
    ],
    zones: [
      {
        id: "btc-consolidation",
        from: 63412,
        to: 64650,
        kind: "consolidation" as const,
        label: LABELS.consolidation,
      },
      {
        id: "btc-deep-support",
        from: 52000,
        to: 55000,
        kind: "support" as const,
        label: lt("深度周期支撑区", "深度週期支撐區", "Deep Cycle Support Zone"),
      },
    ],
    turningWindows: [
      {
        id: "btc-early-aug-rebound",
        label: LABELS.turningWindow,
        startDate: "2026-08-01",
        endDate: "2026-08-08",
        note: lt("8月初反弹窗口", "8月初反彈窗口", "Early-August rebound window"),
      },
      {
        id: "btc-correction-risk",
        label: LABELS.turningWindow,
        startDate: "2026-08-09",
        endDate: "2026-08-15",
        note: lt("8月初上涨后的回调风险窗口", "8月初上漲後的回調風險窗口", "Correction-risk window after the early-August advance"),
      },
    ],
    scenarios: {
      base: {
        summary: lt(
          "测试支撑后反弹尝试指向70,000，随后回调风险上升。",
          "測試支撐後反彈嘗試指向70,000，隨後回調風險上升。",
          "Support test, then a rebound attempt toward 70,000 before renewed correction risk."
        ),
        logic: lt(
          "初期震荡或回调测试64,650支撑。若守住，反弹结构保持完整，比特币可挑战66,956及67,300强压力，8月15日前可能尝试70,000，但8月初反弹或局部高点后回调风险增加。",
          "初期震盪或回調測試64,650支撐。若守住，反彈結構保持完整，比特幣可挑戰66,956及67,300強壓力，8月15日前可能嘗試70,000，但8月初反彈或局部高點後回調風險增加。",
          "Initial consolidation or pullback tests the 64,650 support. If it holds, the rebound structure remains intact and Bitcoin can challenge 66,956 and then the 67,300 major resistance. An attempt toward 70,000 is possible before August 15, but correction risk increases after an early-August rebound or local peak."
        ),
        volatility: 0.018,
        waypoints: [
          { progress: 0, price: 65200 },
          { progress: 0.1, price: 64850, label: "Initial Pullback" },
          { progress: 0.2, price: 64650, majorTurningPoint: true, label: "Support Test" },
          { progress: 0.45, price: 66956, majorTurningPoint: true, label: "Rebound High" },
          { progress: 0.6, price: 67300, majorTurningPoint: true, label: "Resistance Test" },
          { progress: 0.85, price: 70000, majorTurningPoint: true, label: "Target Attempt" },
          { progress: 1, price: 68400, label: "Correction Risk Rising" },
        ],
      },
      bull: {
        summary: lt(
          "守住64,650上方，突破67,300并略超70,000，回调较浅。",
          "守住64,650上方，突破67,300並略超70,000，回調較淺。",
          "Holds above 64,650, breaks 67,300, and slightly exceeds 70,000 with only a shallow pullback."
        ),
        logic: lt(
          "比特币守住64,650且无深度回测， decisively突破67,300，8月15日前达到或略超70,000，途中回调较浅，更大级别上升趋势结构保持完整。",
          "比特幣守住64,650且無深度回測， decisively突破67,300，8月15日前達到或略超70,000，途中回調較淺，更大級別上升趨勢結構保持完整。",
          "Bitcoin holds above 64,650 without a deep retest, breaks decisively through 67,300, and reaches or slightly exceeds 70,000 before August 15. Any pullback along the way remains shallow, keeping the larger uptrend structure intact."
        ),
        volatility: 0.015,
        waypoints: [
          { progress: 0, price: 65200 },
          { progress: 0.15, price: 65050, label: "Shallow Pullback" },
          { progress: 0.5, price: 67300, majorTurningPoint: true, label: "Breaks Major Resistance" },
          { progress: 0.8, price: 70800, majorTurningPoint: true, label: "Exceeds Target" },
          { progress: 1, price: 70200, label: "Holds Above Target" },
        ],
      },
      bear: {
        summary: lt(
          "66,956–67,300附近失败，跌破63,412失效位，风险指向58,000。",
          "66,956–67,300附近失敗，跌破63,412失效位，風險指向58,000。",
          "Fails near 66,956–67,300, breaks the 63,412 invalidation, and risks a move toward 58,000."
        ),
        logic: lt(
          "反弹尝试在66,956至67,300附近失败。 decisively跌破63,412失效位将打开向61,500的移动，若卖压持续则更深风险指向58,000强支撑。",
          "反彈嘗試在66,956至67,300附近失敗。 decisively跌破63,412失效位將打開向61,500的移動，若賣壓持續則更深風險指向58,000強支撐。",
          "The rebound attempt fails near 66,956 to 67,300. A decisive break below the 63,412 invalidation level opens a move toward 61,500, with deeper risk toward the 58,000 major support if selling pressure continues."
        ),
        volatility: 0.021,
        waypoints: [
          { progress: 0, price: 65200 },
          { progress: 0.25, price: 66956, majorTurningPoint: true, label: "Rebound Attempt Fails" },
          { progress: 0.5, price: 63412, majorTurningPoint: true, label: "Breaks Invalidation" },
          { progress: 0.75, price: 61500, majorTurningPoint: true, label: "Support Test" },
          { progress: 1, price: 59200, label: "Deeper Risk Toward 58,000" },
        ],
      },
    },
  };
}

function ndxChart() {
  return {
    chartTitle: lt("纳斯达克缓慢走低情景", "納斯達克緩慢走低情境", "Nasdaq Gradual Decline Scenario"),
    forecastWindow: { start: "2026-07-26", end: "2026-08-21" },
    referencePrice: 7400,
    pricePrecision: 0,
    historicalCandleCount: 35,
    forecastCandleCount: 18,
    seed: 220726,
    historicalWaypoints: [
      { progress: 0, price: 7580 },
      { progress: 0.6, price: 7500, label: "Small-Cycle Peak" },
      { progress: 1, price: 7400 },
    ],
    historicalVolatility: 0.006,
    levels: [] as [],
    zones: [
      { id: "ndx-obs-down", from: 7315, to: 7350, kind: "consolidation" as const, label: lt("下行观察区", "下行觀察區", "Downside Observation Zone") },
      { id: "ndx-obs-rebound", from: 7420, to: 7450, kind: "resistance" as const, label: lt("反弹/压力观察区", "反彈/壓力觀察區", "Rebound/Pressure Observation Zone") },
      { id: "ndx-obs-lower", from: 7212, to: 7262, kind: "support" as const, label: lt("更低观察区", "更低觀察區", "Lower Observation Zone") },
    ],
    turningWindows: [
      { id: "ndx-jul27-28", label: LABELS.turningWindow, startDate: "2026-07-27", endDate: "2026-07-28", note: lt("短暂反弹窗口", "短暫反彈窗口", "Brief rebound window") },
      { id: "ndx-jul31-aug7", label: LABELS.turningWindow, startDate: "2026-07-31", endDate: "2026-08-07", note: lt("重要转折窗口/可能低点", "重要轉折窗口/可能低點", "Important turning window / possible low") },
    ],
    scenarios: {
      base: {
        summary: lt("缓慢震荡走低，8月初短暂反弹可能难以持续。", "緩慢震盪走低，8月初短暫反彈可能難以持續。", "Slow oscillating decline with a temporary early-August rebound that may not hold."),
        logic: lt("整体趋势缓慢走低。7月27–28可能出现短暂反弹，随后在7月31–8月7转折窗口再度走低。8月初低点后或有短 recovery，但可能只是暂时的。", "整體趨勢緩慢走低。7月27–28可能出現短暫反彈，隨後在7月31–8月7轉折窗口再度走低。8月初低點後或有短 recovery，但可能只是暫時的。", "The broader trend stays gradually lower — a slow oscillating decline rather than a crash. A brief rebound may appear around July 27–28 before a renewed decline into the July 31–August 7 turning window. A short recovery can follow the early-August low, but it may remain only temporary."),
        volatility: 0.007,
        waypoints: [
          { progress: 0, price: 7400 }, { progress: 0.08, price: 7430, majorTurningPoint: true, label: "Brief Rebound" },
          { progress: 0.25, price: 7330, label: "Renewed Decline" }, { progress: 0.42, price: 7315, majorTurningPoint: true, label: "Turning-Window Low" },
          { progress: 0.65, price: 7430, majorTurningPoint: true, label: "Short Recovery" }, { progress: 1, price: 7350, label: "Recovery Fades" },
        ],
      },
      bull: {
        summary: lt("7,315–7,350观察区守住并收复7,450上方。", "7,315–7,350觀察區守住並收復7,450上方。", "The 7,315–7,350 observation zone holds and price recovers back above 7,450."),
        logic: lt("7,315–7,350下行观察区守住且未深度破位，指数 convincingly 收复7,420–7,450区域，反弹延续超出基准情景。", "7,315–7,350下行觀察區守住且未深度破位，指數 convincingly 收復7,420–7,450區域，反彈延續超出基準情境。", "The 7,315–7,350 downside observation zone holds without a deeper breakdown, and the index recovers convincingly back above the 7,420–7,450 zone, extending the temporary rebound further than the base case expects."),
        volatility: 0.006,
        waypoints: [{ progress: 0, price: 7400 }, { progress: 0.3, price: 7340, majorTurningPoint: true, label: "Zone Holds" }, { progress: 0.65, price: 7460, majorTurningPoint: true, label: "Recovers Above Zone" }, { progress: 1, price: 7490, label: "Extends Higher" }],
      },
      bear: {
        summary: lt("7,315失守，指向7,212–7,262更低观察区。", "7,315失守，指向7,212–7,262更低觀察區。", "7,315 fails and price moves toward the lower 7,212–7,262 observation zone."),
        logic: lt("7,315下行观察区未能守住，跌势延伸至7,212–7,262更低观察区，且无 meaningful 8月初反弹。", "7,315下行觀察區未能守住，跌勢延伸至7,212–7,262更低觀察區，且無 meaningful 8月初反彈。", "The 7,315 downside observation zone fails to hold, and the decline extends toward the 7,212–7,262 lower observation zone without a meaningful early-August rebound."),
        volatility: 0.008,
        waypoints: [{ progress: 0, price: 7400 }, { progress: 0.35, price: 7300, majorTurningPoint: true, label: "7,315 Fails" }, { progress: 0.7, price: 7240, majorTurningPoint: true, label: "Lower Zone Test" }, { progress: 1, price: 7225, label: "Stays Weak" }],
      },
    },
  };
}

function soxChart() {
  return {
    chartTitle: lt("半导体周期情景", "半導體週期情境", "Semiconductor Cycle Scenario"),
    forecastWindow: { start: "2026-07-26", end: "2026-10-15" },
    referencePrice: 850,
    pricePrecision: 0,
    historicalCandleCount: 35,
    forecastCandleCount: 18,
    seed: 330726,
    historicalWaypoints: [{ progress: 0, price: 940 }, { progress: 0.7, price: 900, label: "Small-Cycle Peak" }, { progress: 1, price: 850 }],
    historicalVolatility: 0.02,
    levels: [
      { id: "sox-support-810", price: 810, kind: "support" as const, label: LABELS.support },
      { id: "sox-major-support-670", price: 670, kind: "major-support" as const, label: LABELS.majorSupport },
      { id: "sox-resistance-1030", price: 1030, kind: "resistance" as const, label: LABELS.resistance },
      { id: "sox-major-resistance-1080", price: 1080, kind: "major-resistance" as const, label: LABELS.majorResistance },
    ],
    zones: [
      { id: "sox-support-zone", from: 670, to: 810, kind: "support" as const, label: lt("存储支撑区", "儲存支撐區", "Memory Support Zone") },
      { id: "sox-resistance-zone", from: 1030, to: 1080, kind: "resistance" as const, label: lt("存储压力区", "儲存壓力區", "Memory Resistance Zone") },
    ],
    turningWindows: [
      { id: "sox-aug7", label: LABELS.turningWindow, startDate: "2026-08-04", endDate: "2026-08-10", note: lt("约8月7日", "約8月7日", "Around August 7") },
      { id: "sox-sep7", label: LABELS.turningWindow, startDate: "2026-09-07", endDate: "2026-09-14", note: lt("9月7日后", "9月7日後", "After September 7") },
      { id: "sox-trough", label: LABELS.turningWindow, startDate: "2026-09-15", endDate: "2026-10-15", note: lt("大级别底部窗口", "大級別底部窗口", "Major trough window") },
    ],
    scenarios: {
      base: {
        summary: lt("约8月7日前偏弱，之后逐步但不稳定修复，更大底部仍在前方。", "約8月7日前偏弱，之後逐步但不穩定修復，更大底部仍在前方。", "Weak into approximately August 7, then a gradual but unstable recovery with a larger trough ahead."),
        logic: lt("板块约8月7日前维持弱势，之后 gradual 反弹但不稳定，可能再次 correction。9月至10月中旬或形成更大 sector trough。", "板塊約8月7日前維持弱勢，之後 gradual 反彈但不穩定，可能再次 correction。9月至10月中旬或形成更大 sector trough。", "The sector stays weak into roughly August 7. A gradual rebound begins afterward but remains unstable, and another correction may occur. A larger sector trough may still form between September and mid-October before a more durable recovery."),
        volatility: 0.022,
        waypoints: [{ progress: 0, price: 850 }, { progress: 0.15, price: 775, majorTurningPoint: true, label: "Weak Into Aug 7" }, { progress: 0.35, price: 880, label: "Gradual Rebound" }, { progress: 0.5, price: 800, label: "Another Correction" }, { progress: 0.68, price: 715, majorTurningPoint: true, label: "Larger Trough" }, { progress: 1, price: 840, label: "Stabilizing" }],
      },
      bull: {
        summary: lt("8月支撑守住，9月7日后修复明显加强。", "8月支撐守住，9月7日後修復明顯加強。", "Support holds through August and recovery strengthens meaningfully after September 7."),
        logic: lt("670–810支撑区未深度破位，9月7日后 Sandisk 及 wider memory complex 进入 stronger bullish phase。", "670–810支撐區未深度破位，9月7日後 Sandisk 及 wider memory complex 進入 stronger bullish phase。", "The 670–810 support zone holds without a deeper breakdown, and the recovery strengthens meaningfully after September 7 as Sandisk and the wider memory complex enter a stronger bullish phase."),
        volatility: 0.019,
        waypoints: [{ progress: 0, price: 850 }, { progress: 0.15, price: 805, label: "Support Holds" }, { progress: 0.55, price: 900, majorTurningPoint: true, label: "Recovery Strengthens" }, { progress: 1, price: 990, majorTurningPoint: true, label: "Approaches Resistance Zone" }],
      },
      bear: {
        summary: lt("8月初修复失败，更大 trough 延迟且更深。", "8月初修復失敗，更大 trough 延遲且更深。", "The early-August recovery fails and the larger trough is delayed and deeper, into September or October."),
        logic: lt("8月初反弹尝试 outright 失败，更大 trough 延迟至9月或10月并 undercut 670 major support。", "8月初反彈嘗試 outright 失敗，更大 trough 延遲至9月或10月並 undercut 670 major support。", "The early-August recovery attempt fails outright. The larger trough is delayed further into September or October and undercuts the 670 major support, consistent with the fundamental-risk view that the storage investment narrative may be deteriorating."),
        volatility: 0.026,
        waypoints: [{ progress: 0, price: 850 }, { progress: 0.15, price: 770, label: "Weak Into Aug 7" }, { progress: 0.3, price: 820, majorTurningPoint: true, label: "Rebound Attempt Fails" }, { progress: 0.7, price: 655, majorTurningPoint: true, label: "Trough Delayed & Deeper" }, { progress: 1, price: 700, label: "Remains Weak" }],
      },
    },
  };
}

function goldChart() {
  return {
    chartTitle: lt("黄金压力情景", "黃金壓力情境", "Gold Resistance Scenario"),
    forecastWindow: { start: "2026-07-26", end: "2026-08-07" },
    referencePrice: 4090,
    historicalCandleCount: 35,
    forecastCandleCount: 18,
    seed: 440726,
    historicalWaypoints: [{ progress: 0, price: 3960 }, { progress: 0.55, price: 3942, label: "Weekly Trough" }, { progress: 1, price: 4090 }],
    historicalVolatility: 0.005,
    levels: [
      { id: "gold-support-4060", price: 4060, kind: "support" as const, label: LABELS.support },
      { id: "gold-major-support-3942", price: 3942, kind: "major-support" as const, label: LABELS.majorSupport },
      { id: "gold-resistance-4200", price: 4200, kind: "resistance" as const, label: LABELS.resistance },
      { id: "gold-major-resistance-4318", price: 4318, kind: "major-resistance" as const, label: lt("强压力 (4,303–4,333)", "強壓力 (4,303–4,333)", "Major Resistance (4,303–4,333)") },
    ],
    zones: [{ id: "gold-consolidation", from: 4060, to: 4200, kind: "consolidation" as const, label: LABELS.consolidation }],
    turningWindows: [{ id: "gold-support-retest", label: LABELS.turningWindow, startDate: "2026-08-03", endDate: "2026-08-07", note: lt("可能支撑回测窗口", "可能支撐回測窗口", "Possible support retest window") }],
    scenarios: {
      base: {
        summary: lt("4,200下方震荡修复，反复承压并可能回测支撑。", "4,200下方震盪修復，反覆承壓並可能回測支撐。", "Range-bound recovery below 4,200, with repeated pressure and a possible support retest."),
        logic: lt("黄金从支撑修复但在4,200压力下方反复受阻，在支撑与压力间 consolidation， advance 前可能回测支撑。", "黃金從支撐修復但在4,200壓力下方反覆受阻，在支撐與壓力間 consolidation， advance 前可能回測支撐。", "Gold recovers from support but faces repeated pressure below the 4,200 resistance. Price consolidates between support and resistance, with a possible retest of support before another advance attempt."),
        volatility: 0.005,
        waypoints: [{ progress: 0, price: 4090 }, { progress: 0.2, price: 4185, majorTurningPoint: true, label: "Pressure Below 4,200" }, { progress: 0.4, price: 4105, label: "Pulls Back" }, { progress: 0.65, price: 4190, majorTurningPoint: true, label: "Repeated Pressure" }, { progress: 1, price: 4075, label: "Support Retest" }],
      },
      bull: {
        summary: lt(" decisively 突破4,200并尝试4,303–4,333强压力区。", " decisively 突破4,200並嘗試4,303–4,333強壓力區。", "Breaks 4,200 decisively and attempts the 4,303–4,333 major resistance zone."),
        logic: lt("黄金以稳定 confirmed 方式突破4,200而非 brief spike，改善中期 outlook 并打开4,303–4,333尝试。", "黃金以穩定 confirmed 方式突破4,200而非 brief spike，改善中期 outlook 並打開4,303–4,333嘗試。", "Gold breaks 4,200 with a stable, confirmed move rather than a brief spike, improving the medium-term outlook and opening an attempt at the 4,303–4,333 resistance zone."),
        volatility: 0.0045,
        waypoints: [{ progress: 0, price: 4090 }, { progress: 0.45, price: 4200, majorTurningPoint: true, label: "Breaks 4,200" }, { progress: 1, price: 4290, majorTurningPoint: true, label: "Attempts 4,303–4,333" }],
      },
      bear: {
        summary: lt("4,200下方反复失败，回测4,060或3,942强支撑。", "4,200下方反覆失敗，回測4,060或3,942強支撐。", "Fails repeatedly below 4,200 and retests 4,060 or the 3,942 major support."),
        logic: lt("黄金在4,200压力下方反复失败并回测支撑，跌破4,060将打开3,942 major support 回测。", "黃金在4,200壓力下方反覆失敗並回測支撐，跌破4,060將打開3,942 major support 回測。", "Gold fails repeatedly below the 4,200 resistance and returns to test support before any further advance, with a break of 4,060 opening a retest of the 3,942 major support."),
        volatility: 0.0055,
        waypoints: [{ progress: 0, price: 4090 }, { progress: 0.35, price: 4150, label: "Fails Below 4,200" }, { progress: 0.65, price: 4060, majorTurningPoint: true, label: "Breaks 4,060" }, { progress: 1, price: 3965, majorTurningPoint: true, label: "Retests 3,942" }],
      },
    },
  };
}

function oilChart() {
  return {
    chartTitle: lt("原油回调情景", "原油回調情境", "Crude Oil Correction Scenario"),
    forecastWindow: { start: "2026-07-26", end: "2026-10-10" },
    referencePrice: 75,
    historicalCandleCount: 35,
    forecastCandleCount: 18,
    seed: 550726,
    historicalWaypoints: [{ progress: 0, price: 68 }, { progress: 0.75, price: 73, label: "Rebound From Support" }, { progress: 1, price: 75 }],
    historicalVolatility: 0.018,
    levels: [{ id: "oil-support-68", price: 68, kind: "support" as const, label: LABELS.support }],
    zones: [{ id: "oil-peak-zone", from: 74, to: 78, kind: "peak" as const, label: lt("7月底周期峰值区", "7月底週期峰值區", "Late-July Cycle Peak Zone") }],
    turningWindows: [{ id: "oil-trough", label: LABELS.turningWindow, startDate: "2026-08-20", endDate: "2026-10-05", note: lt("大级别谷底窗口", "大級別谷底窗口", "Major trough window") }],
    scenarios: {
      base: {
        summary: lt("7月底峰值后回调，大谷底窗口后尝试长期修复。", "7月底峰值後回調，大谷底窗口後嘗試長期修復。", "Correction from the late-July peak into a major trough window, then a long-term recovery attempt."),
        logic: lt("原油接近7月底 cycle peak 与 resistance。短线 decline 或 consolidation 跟随——当前 move 不应追高。8月底至10月初或出现更有吸引力的 long-term entry window。", "原油接近7月底 cycle peak 與 resistance。短線 decline 或 consolidation 跟隨——當前 move 不應追高。8月底至10月初或出現更有吸引力的 long-term entry window。", "Oil is near a late-July cycle peak and resistance area. A short-term decline or consolidation follows — the current move should not be chased higher. A more attractive long-term entry window may appear between late August and early October, with the long-term cycle outlook constructive after the correction."),
        volatility: 0.02,
        waypoints: [{ progress: 0, price: 75 }, { progress: 0.1, price: 74, label: "Late-July Peak" }, { progress: 0.3, price: 71, label: "Near-term Decline" }, { progress: 0.55, price: 73, label: "Volatile Rebound" }, { progress: 0.75, price: 68, majorTurningPoint: true, label: "Major Trough" }, { progress: 1, price: 71.5, label: "Long-term Recovery Begins" }],
      },
      bull: {
        summary: lt("地缘冲击打断回调并 retest 7月底峰值区。", "地緣衝擊打斷回調並 retest 7月底峰值區。", "A geopolitical shock interrupts the decline and price retests the late-July peak zone."),
        logic: lt("地缘事件 interrupt 预期 correction， sudden spike retest 7月底 cycle peak zone 而非 allow decline unfold。", "地緣事件 interrupt 預期 correction， sudden spike retest 7月底 cycle peak zone 而非 allow decline unfold。", "A geopolitical event interrupts the expected correction, causing another sudden price spike that retests the late-July cycle peak zone rather than allowing the decline to unfold as expected."),
        volatility: 0.028,
        waypoints: [{ progress: 0, price: 75 }, { progress: 0.4, price: 76.5, majorTurningPoint: true, label: "Geopolitical Shock Retest" }, { progress: 0.7, price: 74, label: "Volatile, Elevated" }, { progress: 1, price: 75.5, label: "Holds Near Peak Zone" }],
      },
      bear: {
        summary: lt("68支撑跌破，回调超出基准情景。", "68支撐跌破，回調超出基準情境。", "The 68 support breaks and the correction extends well beyond the base case trough."),
        logic: lt("68支撑 decisively 跌破， correction 比基准情景更深， delay 并 deepen eventual long-term recovery window。", "68支撐 decisively 跌破， correction 比基準情境更深， delay 並 deepen eventual long-term recovery window。", "Support at 68 breaks decisively and the correction extends further than the base case expects, delaying and deepening the eventual long-term recovery window."),
        volatility: 0.024,
        waypoints: [{ progress: 0, price: 75 }, { progress: 0.3, price: 70, label: "Decline Continues" }, { progress: 0.5, price: 67.5, majorTurningPoint: true, label: "Support 68 Breaks" }, { progress: 1, price: 62, majorTurningPoint: true, label: "Correction Extends" }],
      },
    },
  };
}

const macroLiquidityConditions = [
  lt("油价停止创新高或进入回调阶段。", "油價停止創新高或進入回調階段。", "Oil stops making new highs or enters a correction phase."),
  lt("原油从7月底周期峰值区回调。", "原油從7月底週期峰值區回調。", "Crude oil corrects from the late-July cycle peak zone."),
  lt("美债收益率企稳或回落。", "美債收益率企穩或回落。", "US Treasury yields stabilize or decline."),
  lt("比特币现货ETF净流入转正。", "比特幣現貨ETF淨流入轉正。", "Bitcoin spot ETF flows turn positive."),
  lt("稳定币总供应量扩张。", "穩定幣總供應量擴張。", "Stablecoin aggregate supply expands."),
  lt("美股科技/半导体结束短线 correction。", "美股科技/半導體結束短線 correction。", "US tech / semiconductor equities end their near-term correction."),
  lt("比特币 decisively 突破67,300或66,956压力。", "比特幣 decisively 突破67,300或66,956壓力。", "Bitcoin breaks decisively through 67,300 or 66,956 resistance."),
];

const document = {
  version: VERSION,
  snapshotId: VERSION,
  researchDate: RESEARCH_DATE,
  lastUpdated: LAST_UPDATED,
  status: "draft-pending-verification" as const,
  statusLabel: lt("草稿 — 待验证", "草稿 — 待驗證", "Draft — Pending Verification"),
  dataType: lt("精选研究快照", "精選研究快照", "Curated research snapshot"),
  dataSourceDisclosure: lt(
    "来自用户提供的分析师笔记与 MoonX Oracle 记录的精选合成。非实时行情数据。",
    "來自用戶提供的分析師筆記與 MoonX Oracle 記錄的精選合成。非即時行情數據。",
    "Curated from user-provided analyst notes and MoonX Oracle records. This is not live market data."
  ),
  mainConclusion: [
    lt(
      "风险资产目前呈现两阶段结构：",
      "風險資產目前呈現兩階段結構：",
      "Risk assets currently show a two-stage structure:"
    ),
    lt(
      "1. 7月底至8月初：美股指数、半导体与原油仍承压。",
      "1. 7月底至8月初：美股指數、半導體與原油仍承壓。",
      "1. Late July to early August: US indexes, semiconductors and oil remain under pressure."
    ),
    lt(
      "2. 8月初转折窗口后：可能出现短 recovery，但8月底至10月仍是 major correction 与 accumulation 窗口。",
      "2. 8月初轉折窗口後：可能出現短 recovery，但8月底至10月仍是 major correction 與 accumulation 窗口。",
      "2. After the early-August turning window: a short recovery may begin, but late August through October remains a major risk and accumulation window."
    ),
    lt(
      "比特币相对其他风险资产更强。近端结构支持8月15日前再次尝试70,000，但 cycle 模型 warn 8月初反弹后 correction 风险。",
      "比特幣相對其他風險資產更強。近端結構支持8月15日前再次嘗試70,000，但 cycle 模型 warn 8月初反彈後 correction 風險。",
      "Bitcoin is relatively stronger than other risk assets. The near-term structure supports another attempt toward 70,000 before August 15, but cycle models warn of renewed correction risk after the early-August rebound."
    ),
  ],
  riskDisclaimer: lt(
    "本快照为仅供教育目的的研究合成，属草稿，尚未与实际结果验证，不构成投资建议。不应将其解读为保证、已验证 track record 或交易建议。",
    "本快照為僅供教育目的的研究合成，屬草稿，尚未與實際結果驗證，不構成投資建議。不應將其解讀為保證、已驗證 track record 或交易建議。",
    "This snapshot is a research synthesis for educational purposes only. It is a draft, has not been verified against actual outcomes, and does not constitute financial advice. Nothing here should be read as a guarantee, a verified track record, or a recommendation to trade."
  ),
  assets: [
    {
      id: "bitcoin",
      symbol: "BTC",
      category: "crypto" as const,
      localizedName: lt("比特币", "比特幣", "Bitcoin"),
      localizedSummary: lt("短线偏多，中线防回撤；等待宏观流动性轮动确认。", "短線偏多，中線防回撤；等待宏觀流動性輪動確認。", "Short-term bullish with medium-term pullback risk; waiting for macro liquidity-rotation confirmation."),
      shortView: lt("短线偏多", "短線偏多", "Short-term Bullish"),
      status: "Waiting for liquidity-rotation confirmation",
      researchDate: RESEARCH_DATE,
      lastUpdated: LAST_UPDATED,
      forecastHorizon: lt("2026-07-26 至 2026-08-15", "2026-07-26 至 2026-08-15", "2026-07-26 to 2026-08-15"),
      direction: "bullish" as const,
      confidence: 68,
      scenarioWeights: { base: 50, bull: 34, bear: 16 },
      supportLevels: [64650, 63412, 61500, 58000],
      resistanceLevels: [66956, 67300],
      targetLevels: [70000],
      invalidationLevels: [63412],
      consolidationZones: [
        { from: 63412, to: 64650, label: LABELS.consolidation },
        { from: 52000, to: 55000, label: lt("深度周期支撑区", "深度週期支撐區", "Deep Cycle Support Zone") },
      ],
      turningWindows: btcChart().turningWindows,
      frameworkFactors: [
        {
          id: "btc-macro-liquidity-rotation",
          framework: "Macro Liquidity Rotation",
          directionScore: 55,
          weight: 20,
          confidence: 70,
          status: "Waiting" as const,
          explanation: lt(
            "在油价驱动的通胀/资本回流美国减弱后，比特币、稳定币及美国加密基础设施可能吸引国际资本进入美元体系。需明确：比特币≠直接购买美国国债；稳定币、ETF、托管与交易所是连接桥梁。",
            "在油價驅動的通脹/資本回流美國減弱後，比特幣、穩定幣及美國加密基礎設施可能吸引國際資本進入美元體系。需明確：比特幣≠直接購買美國國債；穩定幣、ETF、託管與交易所是連接橋樑。",
            "After oil-driven inflation and capital repatriation to the US weaken, Bitcoin, stablecoins, and US crypto infrastructure may attract international capital into the dollar system. Bitcoin is not direct US-government-debt demand; stablecoins, ETFs, custodians, and exchanges are the bridge."
          ),
          confirmationConditions: macroLiquidityConditions,
        },
        { id: "btc-oracle", framework: "Oracle Six Yao", directionScore: 75, weight: 25, confidence: 68, status: "Active" as const, explanation: lt("强烈看涨信号，原 Oracle 结论估计8月15日前突破70,000概率较高。", "強烈看漲信號，原 Oracle 結論估計8月15日前突破70,000機率較高。", "Strong bullish signal. The original Oracle conclusion estimated a high probability of Bitcoin breaking 70,000 before August 15.") },
        { id: "btc-gann", framework: "Gann Structure", directionScore: 60, weight: 15, confidence: 65, status: "Partially Confirmed" as const, explanation: lt("从66,956的下跌视为63,412上方的回调；守住64,650 constructive。", "從66,956的下跌視為63,412上方的回調；守住64,650 constructive。", "The decline from 66,956 is treated as a pullback while price remains above 63,412. Holding 64,650 is constructive.") },
        { id: "btc-harmonic", framework: "Harmonic Structure", directionScore: 55, weight: 15, confidence: 60, status: "Partially Confirmed" as const, explanation: lt("比特币相对 resilient；若四小时 lower support 守住，上升趋势可延续。", "比特幣相對 resilient；若四小時 lower support 守住，上升趨勢可延續。", "Bitcoin remains relatively resilient. If the four-hour lower support holds, the uptrend can continue.") },
        { id: "btc-cycle", framework: "Cycle Structure", directionScore: 40, weight: 10, confidence: 65, status: "Waiting" as const, explanation: lt("8月初或现 rebound high；8月底/9月或再现 cycle trough。", "8月初或現 rebound high；8月底/9月或再現 cycle trough。", "A rebound high may occur around early August. Another cycle trough may develop in late August or early September.") },
        { id: "btc-flow", framework: "Market Flow & Risk", directionScore: -25, weight: 15, confidence: 70, status: "Active" as const, explanation: lt("ETF净流出与机构转账 create 近端 downside risk，与 bullish Oracle 信号冲突。", "ETF淨流出與機構轉賬 create 近端 downside risk，與 bullish Oracle 信號衝突。", "ETF net outflow and institutional transfers create near-term downside risk and conflict with the bullish Oracle signal.") },
      ],
      confirmationConditions: macroLiquidityConditions,
      riskConditions: [
        lt("ETF净流出与机构转账与看涨 Oracle 信号冲突。", "ETF淨流出與機構轉賬與看漲 Oracle 信號衝突。", "ETF net outflow and institutional transfers conflict with the bullish Oracle signal."),
        lt(" decisively 跌破63,412将 weaken 反弹结构。", " decisively 跌破63,412將 weaken 反彈結構。", "A decisive break below 63,412 would weaken the rebound structure."),
        lt("8月初 rebound high 后 correction 风险增加。", "8月初 rebound high 後 correction 風險增加。", "Correction risk increases after the early-August rebound or local peak."),
      ],
      sourceReferences: ["lib/data/intelligence-snapshot.ts", "lib/data/forecast-chart-scenarios.ts"],
      verificationStatus: "draft-pending-verification" as const,
      verificationChecklist: [
        lt("比特币是否突破67,300？", "比特幣是否突破67,300？", "Does Bitcoin break 67,300?"),
        lt("8月15日前是否突破70,000？", "8月15日前是否突破70,000？", "Does Bitcoin break 70,000 before 2026-08-15?"),
        lt("63,412是否保持支撑？", "63,412是否保持支撐？", "Does 63,412 remain supported?"),
        lt("8月初反弹后是否开始新 correction？", "8月初反彈後是否開始新 correction？", "Does a new correction begin after the early-August rebound?"),
      ],
      trendPath: [
        lt("短线回调或 consolidation 可能继续。", "短線回調或 consolidation 可能繼續。", "A short-term pullback or consolidation may continue first."),
        lt("若63,412–64,650保持支撑，更大 rebound 结构 intact。", "若63,412–64,650保持支撐，更大 rebound 結構 intact。", "If 63,412 to 64,650 remains supported, the larger rebound structure remains intact."),
        lt("8月15日前可能挑战67,300及70,000。", "8月15日前可能挑戰67,300及70,000。", "Bitcoin may challenge 67,300 and then 70,000 before August 15."),
      ],
      themes: [lt("机构ETF流", "機構ETF流", "Institutional ETF flows"), lt("宏观流动性轮动", "宏觀流動性輪動", "Macro liquidity rotation")],
      relevantFrameworks: ["Macro Capital Cycle", "Oracle Six Yao", "Gann Structure", "Harmonic Structure", "Cycle Structure", "Market Flow & Risk", "Macro Liquidity Rotation"],
      mainSupportLabel: lt("64,650", "64,650", "64,650"),
      mainResistanceLabel: lt("66,956", "66,956", "66,956"),
      invalidationLabel: lt(" decisively 跌破63,412", " decisively 跌破63,412", "Decisive break below 63,412"),
      nextTurningWindowLabel: lt("8月初反弹窗口", "8月初反彈窗口", "Early-August rebound window"),
      chart: btcChart(),
      strategicWatchlistSettings: {
        enabled: true,
        rating: "bullish" as const,
        status: "active" as const,
        horizon: lt("中期至长期", "中期至長期", "Medium to long term"),
        mainThemes: [lt("周期结构", "週期結構", "Cycle Structure"), lt("机构资金流", "機構資金流", "Institutional Flows"), lt("ETF累积", "ETF累積", "ETF Accumulation")],
        thesis: lt("多框架研究趋于一致看涨：短线偏多，中线关注64,650–63,412支撑，情景路径指向8月15日前挑战70,000。", "多框架研究趨於一致看漲：短線偏多，中線關注64,650–63,412支撐，情境路徑指向8月15日前挑戰70,000。", "Multiple frameworks converge on a bullish view: short-term bullish, medium-term focus on the 64,650–63,412 support band, with the scenario path pointing to a 70,000 challenge before August 15."),
        risks: [lt(" decisively 跌破63,412将使情景失效。", " decisively 跌破63,412將使情境失效。", "A decisive break below 63,412 invalidates the scenario."), lt("8月初反弹后 correction 风险增加。", "8月初反彈後 correction 風險增加。", "Correction risk increases after the early-August rebound.")],
        nextEvent: lt("70,000情景验证截止日", "70,000情境驗證截止日", "70,000 scenario verification deadline"),
        nextEventDate: "2026-08-15",
        listingStatus: "n/a" as const,
        trackMetrics: [],
      },
      tags: ["crypto", "btc", "etf"],
    },
    {
      id: "nasdaq-100",
      symbol: "NDX",
      category: "us-equity" as const,
      localizedName: lt("纳斯达克100", "納斯達克100", "Nasdaq 100"),
      localizedSummary: lt("缓慢震荡走低，跌幅未必剧烈。", "緩慢震盪走低，跌幅未必劇烈。", "Gradual oscillating decline — the move need not be violent."),
      shortView: lt("缓慢看跌", "緩慢看跌", "Gradual Bearish"),
      status: "Gradual Bearish Trend",
      researchDate: RESEARCH_DATE,
      lastUpdated: LAST_UPDATED,
      forecastHorizon: lt("2026-07-21 至 2026-08-21", "2026-07-21 至 2026-08-21", "2026-07-21 to 2026-08-21"),
      direction: "bearish" as const,
      confidence: 71,
      scenarioWeights: { base: 50, bull: 9, bear: 41 },
      supportLevels: [7315, 7212],
      resistanceLevels: [7420, 7450],
      targetLevels: [],
      invalidationLevels: [7315],
      consolidationZones: [{ from: 7315, to: 7350, label: lt("下行观察区", "下行觀察區", "Downside Observation Zone") }],
      turningWindows: ndxChart().turningWindows,
      frameworkFactors: [
        { id: "ndx-oracle", framework: "Oracle Six Yao", directionScore: -55, weight: 30, confidence: 72, status: "Active" as const, explanation: lt("7月21日至8月21日纳斯达克 expected 缓慢 limited decline。", "7月21日至8月21日納斯達克 expected 緩慢 limited decline。", "From July 21 to August 21, the Nasdaq is expected to move gradually lower through a slow and limited decline.") },
        { id: "ndx-cycle", framework: "Cycle Structure", directionScore: -45, weight: 25, confidence: 70, status: "Active" as const, explanation: lt("美指或达 small-cycle peak；8月初 trough 后 short rebound。", "美指或達 small-cycle peak；8月初 trough 後 short rebound。", "The US index has likely reached a small-cycle peak. A trough is expected around early August, followed by a short rebound.") },
        { id: "ndx-tech", framework: "Technical Structure", directionScore: -40, weight: 20, confidence: 68, status: "Active" as const, explanation: lt("7月27–28 brief rebound 后或再 decline 至7月31–8月7窗口。", "7月27–28 brief rebound 後或再 decline 至7月31–8月7窗口。", "A brief rebound around July 27 to July 28 may be followed by another decline into the July 31 to August 7 turning window.") },
        { id: "ndx-macro", framework: "Macro Capital Cycle", directionScore: -50, weight: 25, confidence: 71, status: "Active" as const, explanation: lt("科技与半导体 capital flows 走弱；AI capex 与 FCF 担忧。", "科技與半導體 capital flows 走弱；AI capex 與 FCF 擔憂。", "Technology and semiconductor capital flows are weakening. Concerns about AI capital expenditure, negative free cash flow and shareholder tolerance create downside risk.") },
      ],
      confirmationConditions: [],
      riskConditions: [lt("关键支撑失败或扩大为更大 correction。", "關鍵支撐失敗或擴大為更大 correction。", "If key support fails, a normal slow decline could expand into a larger correction.")],
      sourceReferences: ["lib/data/intelligence-snapshot.ts", "lib/data/forecast-chart-scenarios.ts"],
      verificationStatus: "draft-pending-verification" as const,
      verificationChecklist: [
        lt("8月21日前是否维持缓慢 decline？", "8月21日前是否維持緩慢 decline？", "Does the index remain in a slow decline through August 21?"),
        lt("7月27–28是否出现 temporary rebound？", "7月27–28是否出現 temporary rebound？", "Does a temporary rebound occur around July 27 to July 28?"),
      ],
      trendPath: [lt("一个月趋势 expected 缓慢 lower。", "一個月趨勢 expected 緩慢 lower。", "The broader one-month trend is expected to remain gradually lower.")],
      themes: [lt("AI capex", "AI capex", "AI capex"), lt("成长股资金流", "成長股資金流", "Growth equity flows")],
      relevantFrameworks: ["Oracle Six Yao", "Cycle Structure", "Technical Structure", "Macro Capital Cycle"],
      chart: ndxChart(),
      tags: ["us-equity", "ndx"],
    },
    {
      id: "semiconductors-storage",
      symbol: "SOX / Memory",
      category: "semiconductor" as const,
      localizedName: lt("半导体与存储", "半導體與儲存", "Semiconductors & Storage"),
      localizedSummary: lt("8月7日前偏弱，之后逐步修复，但中期分歧较大。", "8月7日前偏弱，之後逐步修復，但中期分歧較大。", "Weak until early August, then gradual recovery — mid-term views diverge."),
      shortView: lt("8月7日前偏弱", "8月7日前偏弱", "Weak Until Early August"),
      status: "Weak Until Early August / Recovery Afterward",
      researchDate: RESEARCH_DATE,
      lastUpdated: LAST_UPDATED,
      forecastHorizon: lt("2026-07-26 至 2026-10-15", "2026-07-26 至 2026-10-15", "2026-07-26 to 2026-10-15"),
      direction: "bearish" as const,
      confidence: 73,
      scenarioWeights: { base: 50, bull: 10, bear: 40 },
      supportLevels: [810, 670],
      resistanceLevels: [1030, 1080],
      targetLevels: [],
      invalidationLevels: [670],
      consolidationZones: [{ from: 670, to: 810, label: lt("存储支撑区", "儲存支撐區", "Memory Support Zone") }],
      turningWindows: soxChart().turningWindows,
      frameworkFactors: [
        { id: "sox-oracle-etf", framework: "Oracle Six Yao", directionScore: -60, weight: 25, confidence: 75, status: "Active" as const, explanation: lt("半导体ETF 6月17日至8月7日 weak/declining；8月7日后 gradual recovery。", "半導體ETF 6月17日至8月7日 weak/declining；8月7日後 gradual recovery。", "Semiconductor ETF: the trend from June 17 to August 7 is weak or declining. After August 7, the sector may gradually recover.") },
        { id: "sox-oracle-sandisk", framework: "Oracle Six Yao", directionScore: -35, weight: 15, confidence: 70, status: "Waiting" as const, explanation: lt("Sandisk 约8月7日前 weak，9月7日后 stronger bullish phase。", "Sandisk 約8月7日前 weak，9月7日後 stronger bullish phase。", "Sandisk: remains weak until approximately August 7, then gradually rises. A stronger bullish phase may begin after September 7.") },
        { id: "sox-cycle", framework: "Cycle Structure", directionScore: -55, weight: 25, confidence: 73, status: "Active" as const, explanation: lt("存储或达7月底 small-cycle peak；9–10月或 form 更重要 bottom。", "儲存或達7月底 small-cycle peak；9–10月或 form 更重要 bottom。", "Memory may reach a small-cycle peak near the end of July, then decline toward a trough in mid-to-late August. The broader semiconductor sector may form a more important bottom between September and mid-October.") },
        { id: "sox-flow", framework: "Market Flow & Risk", directionScore: -45, weight: 20, confidence: 72, status: "Active" as const, explanation: lt("科技与半导体 funds continued outflows。", "科技與半導體 funds continued outflows。", "Technology and semiconductor funds are showing continued outflows.") },
        { id: "sox-macro", framework: "Macro Capital Cycle", directionScore: -50, weight: 15, confidence: 70, status: "Active" as const, explanation: lt("AI infrastructure spending pace 受质疑；hardware chain 承压。", "AI infrastructure spending pace 受質疑；hardware chain 承壓。", "The market is questioning whether AI infrastructure spending can continue at the same pace. High capital expenditure, weaker free cash flow and shareholder resistance could pressure the hardware chain.") },
      ],
      confirmationConditions: [],
      riskConditions: [lt("8月7日后 recovery 可能只是 temporary rebound。", "8月7日後 recovery 可能只是 temporary rebound。", "The recovery after August 7 may be only a temporary rebound rather than a new sustained uptrend.")],
      sourceReferences: ["lib/data/intelligence-snapshot.ts", "lib/data/forecast-chart-scenarios.ts"],
      verificationStatus: "draft-pending-verification" as const,
      verificationChecklist: [lt("8月7日前 weakness 是否 persist？", "8月7日前 weakness 是否 persist？", "Does semiconductor weakness persist until approximately August 7?")],
      trendPath: [lt("板块约8月7日前维持 weak。", "板塊約8月7日前維持 weak。", "The sector remains weak into approximately August 7.")],
      themes: [lt("存储周期", "儲存週期", "Memory cycle"), lt("AI硬件链", "AI硬體鏈", "AI hardware chain")],
      relevantFrameworks: ["Oracle Six Yao", "Cycle Structure", "Market Flow & Risk", "Macro Capital Cycle"],
      chart: soxChart(),
      tags: ["semiconductor", "memory"],
    },
    {
      id: "gold",
      symbol: "XAU",
      category: "commodity" as const,
      localizedName: lt("国际黄金", "國際黃金", "International Gold"),
      localizedSummary: lt("震荡修复，8月7日前突破4200难度较大。", "震盪修復，8月7日前突破4200難度較大。", "Range-bound recovery — breaking 4,200 before August 7 faces meaningful difficulty."),
      shortView: lt("压力下震荡", "壓力下震盪", "Range Below Resistance"),
      status: "Neutral to Slightly Bullish Below Major Resistance",
      researchDate: RESEARCH_DATE,
      lastUpdated: LAST_UPDATED,
      forecastHorizon: lt("2026-07-26 至 2026-08-07", "2026-07-26 至 2026-08-07", "2026-07-26 to 2026-08-07"),
      direction: "neutral" as const,
      confidence: 61,
      scenarioWeights: { base: 50, bull: 28, bear: 22 },
      supportLevels: [4060, 3942],
      resistanceLevels: [4200, 4318],
      targetLevels: [4318],
      invalidationLevels: [3942],
      consolidationZones: [{ from: 4060, to: 4200, label: LABELS.consolidation }],
      turningWindows: goldChart().turningWindows,
      frameworkFactors: [
        { id: "gold-oracle", framework: "Oracle Six Yao", directionScore: -15, weight: 35, confidence: 61, status: "Active" as const, explanation: lt("8月7日前突破4,200 probability considered low；near resistance neutral-to-slightly-bearish。", "8月7日前突破4,200 probability considered low；near resistance neutral-to-slightly-bearish。", "The probability of breaking 4,200 before August 7 is considered low. The signal is neutral to slightly bearish near resistance.") },
        { id: "gold-gann", framework: "Gann Structure", directionScore: 25, weight: 35, confidence: 65, status: "Partially Confirmed" as const, explanation: lt("从3,942 rebound 可能大于 simple bounce；守住4,060 preserve upside。", "從3,942 rebound 可能大於 simple bounce；守住4,060 preserve upside。", "The rebound from 3,942 may be larger than a simple short bounce. Holding above 4,060 preserves upside momentum.") },
        { id: "gold-cycle", framework: "Cycle Structure", directionScore: 10, weight: 30, confidence: 60, status: "Waiting" as const, explanation: lt("6月底/7月初 weekly trough；9月底或 another larger trough。", "6月底/7月初 weekly trough；9月底或 another larger trough。", "Gold formed an important weekly trough around late June or early July. Another larger trough may occur around late September.") },
      ],
      confirmationConditions: [],
      riskConditions: [lt("4,200下方反复失败并回测支撑。", "4,200下方反覆失敗並回測支撐。", "Gold may repeatedly fail below 4,200 and return to test support before the next larger advance.")],
      sourceReferences: ["lib/data/intelligence-snapshot.ts", "lib/data/forecast-chart-scenarios.ts"],
      verificationStatus: "draft-pending-verification" as const,
      verificationChecklist: [lt("8月7日前是否 remain below 4,200？", "8月7日前是否 remain below 4,200？", "Does gold remain below 4,200 before August 7?")],
      trendPath: [lt("从重要支撑 area attempting recovery。", "從重要支撐 area attempting recovery。", "Gold is attempting to recover from an important support area.")],
      themes: [lt("通胀对冲", "通脹對沖", "Inflation hedge")],
      relevantFrameworks: ["Oracle Six Yao", "Gann Structure", "Cycle Structure"],
      chart: goldChart(),
      tags: ["gold", "commodity"],
    },
    {
      id: "crude-oil",
      symbol: "WTI / Brent",
      category: "commodity" as const,
      localizedName: lt("原油", "原油", "Crude Oil"),
      localizedSummary: lt("短线处于波峰后调整期，长线等待下一次谷底。", "短線處於波峰後調整期，長線等待下一次谷底。", "Near-term correction after a cycle peak; long-term outlook constructive after the trough."),
      shortView: lt("短线看跌", "短線看跌", "Near-term Bearish"),
      status: "Near-term Bearish / Long-term Bullish After Correction",
      researchDate: RESEARCH_DATE,
      lastUpdated: LAST_UPDATED,
      forecastHorizon: lt("2026-07-26 至 2026-10-10", "2026-07-26 至 2026-10-10", "2026-07-26 to 2026-10-10"),
      direction: "bearish" as const,
      confidence: 69,
      scenarioWeights: { base: 50, bull: 10, bear: 40 },
      supportLevels: [68],
      resistanceLevels: [78],
      targetLevels: [],
      invalidationLevels: [68],
      consolidationZones: [{ from: 74, to: 78, label: lt("7月底周期峰值区", "7月底週期峰值區", "Late-July Cycle Peak Zone") }],
      turningWindows: oilChart().turningWindows,
      frameworkFactors: [
        { id: "oil-cycle", framework: "Cycle Structure", directionScore: -65, weight: 40, confidence: 70, status: "Active" as const, explanation: lt("从68 rebound 达7月底 peak；short-term correction expected；8月底–10月初 major trough。", "從68 rebound 達7月底 peak；short-term correction expected；8月底–10月初 major trough。", "Oil rebounded strongly from the key support near 68 and has reached a late-July cycle peak. A short-term correction is expected. The next major trough may appear between late August and early October.") },
        { id: "oil-tech", framework: "Technical Structure", directionScore: -55, weight: 30, confidence: 68, status: "Active" as const, explanation: lt("Short-term sell signal；至少 one four-hour downward leg expected。", "Short-term sell signal；至少 one four-hour downward leg expected。", "A short-term sell signal has appeared, with at least one four-hour downward leg expected.") },
        { id: "oil-harmonic", framework: "Harmonic Structure", directionScore: -50, weight: 30, confidence: 65, status: "Active" as const, explanation: lt("Wave structure points to near-term decline before next larger move。", "Wave structure points to near-term decline before next larger move。", "Wave structure points to a near-term decline before the next larger move.") },
      ],
      confirmationConditions: [],
      riskConditions: [lt("地缘事件可能 interrupt 预期 correction。", "地緣事件可能 interrupt 預期 correction。", "A geopolitical event could interrupt the expected correction and cause another sudden price spike.")],
      sourceReferences: ["lib/data/intelligence-snapshot.ts", "lib/data/forecast-chart-scenarios.ts"],
      verificationStatus: "draft-pending-verification" as const,
      verificationChecklist: [lt("是否从7月底 peak decline？", "是否從7月底 peak decline？", "Does oil decline from the late-July peak?")],
      trendPath: [lt("接近7月底 cycle peak；不应追高。", "接近7月底 cycle peak；不應追高。", "Oil is near a late-July cycle peak and resistance area. The current move should not be chased higher.")],
      themes: [lt("周期峰值", "週期峰值", "Cycle peak"), lt("地缘风险", "地緣風險", "Geopolitical risk")],
      relevantFrameworks: ["Cycle Structure", "Technical Structure", "Harmonic Structure"],
      chart: oilChart(),
      tags: ["oil", "commodity"],
    },
    {
      id: "shanghai-composite",
      symbol: "SSE",
      category: "china-equity" as const,
      localizedName: lt("上证指数", "上證指數", "Shanghai Composite"),
      localizedSummary: lt("长期看涨：7月底–8月初左侧布局，年底及春节前或再走强。", "長期看漲：7月底–8月初左側佈局，年底及春節前或再走強。", "Long-term bullish: left-side positioning late Jul–early Aug; year-end / pre-Spring-Festival advance possible."),
      shortView: lt("长期看涨", "長期看漲", "Long-term Bullish"),
      status: "Left-side accumulation / H2 advance scenario",
      researchDate: RESEARCH_DATE,
      lastUpdated: LAST_UPDATED,
      forecastHorizon: lt("2026年8月至2027年2月", "2026年8月至2027年2月", "August 2026 to February 2027"),
      direction: "strong-bullish" as const,
      confidence: 80,
      scenarioWeights: { base: 50, bull: 35, bear: 15 },
      supportLevels: [],
      resistanceLevels: [],
      targetLevels: [4500, 5000],
      invalidationLevels: [],
      consolidationZones: [],
      turningWindows: [
        { id: "shcomp-left-side", startDate: "2026-07-27", endDate: "2026-08-07", label: lt("左侧观察与逐步建仓", "左側觀察與逐步建倉", "Left-side observation and staged accumulation"), note: lt("7月底至8月初左侧布局窗口", "7月底至8月初左側佈局窗口", "Late July to early August left-side positioning window") },
        { id: "shcomp-aug7-activation", startDate: "2026-08-04", endDate: "2026-08-10", label: lt("较早激活窗口（约8月7日）", "較早激活窗口（約8月7日）", "Earlier activation window (~Aug 7)") },
        { id: "shcomp-aug22", startDate: "2026-08-22", endDate: "2026-08-22", label: lt("第一轮重要上涨", "第一輪重要上漲", "First important advance") },
        { id: "shcomp-sep", startDate: "2026-09-01", endDate: "2026-09-30", label: lt("9月趋势延续", "9月趨勢延續", "September trend continuation") },
        { id: "shcomp-oct", startDate: "2026-10-01", endDate: "2026-10-31", label: lt("10月高波动与轮动", "10月高波動與輪動", "October volatility and rotation") },
        { id: "shcomp-nov-dec", startDate: "2026-11-01", endDate: "2026-12-31", label: lt("11–12月年底行情", "11–12月年底行情", "Nov–Dec year-end advance") },
        { id: "shcomp-nov-jan", startDate: "2026-11-01", endDate: "2027-01-31", label: lt("11月–1月更高区间观察", "11月–1月更高區間觀察", "Nov–Jan higher-range watch") },
      ],
      frameworkFactors: [
        { id: "shcomp-qimen", framework: "Qimen Structure", directionScore: 70, weight: 50, confidence: 80, status: "Waiting" as const, explanation: lt("奇门研究认为A股H2或进入 left-side 与 year-end rally 情景。", "奇門研究認為A股H2或進入 left-side 與 year-end rally 情景。", "Qimen research holds that A-shares may enter a left-side positioning and year-end rally scenario in H2.") },
        { id: "shcomp-policy", framework: "Macro Capital Cycle", directionScore: 55, weight: 30, confidence: 75, status: "Partially Confirmed" as const, explanation: lt("科技产业政策、股权财政与资本市场支持或提高权益市场重要性。", "科技產業政策、股權財政與資本市場支持或提高權益市場重要性。", "Technology-industry policy, equity-based fiscal financing, and capital-market support may raise the importance of the equity market.") },
        { id: "shcomp-linkage", framework: "Market Flow & Risk", directionScore: -20, weight: 20, confidence: 65, status: "Active" as const, explanation: lt("科技股与美股科技板块存在联动风险。", "科技股與美股科技板塊存在聯動風險。", "Tech stocks carry linkage risk with the US technology sector.") },
      ],
      confirmationConditions: [],
      riskConditions: [
        lt("10月进入高波动阶段。", "10月進入高波動階段。", "October enters a high-volatility phase."),
        lt("指数上涨不代表所有个股同步上涨。", "指數上漲不代表所有個股同步上漲。", "An index advance does not mean every stock rises in tandem."),
        lt("5,000点高度依赖政策、流动性和全球市场配合（情景参考，非保证）。", "5,000點高度依賴政策、流動性和全球市場配合（情境參考，非保證）。", "The 5,000 level is highly dependent on policy, liquidity, and global-market cooperation (scenario reference, not a guarantee)."),
      ],
      sourceReferences: ["lib/data/research-records.ts", "lib/data/long-range-forecasts.ts"],
      verificationStatus: "draft-pending-verification" as const,
      verificationChecklist: [lt("8月22日前后上涨动能是否增强？", "8月22日前後上漲動能是否增強？", "Does upside momentum strengthen around August 22?")],
      trendPath: [
        lt("4,500与5,000为情景目标参考，非保证。", "4,500與5,000為情境目標參考，非保證。", "4,500 and 5,000 are scenario target references, not guarantees."),
      ],
      themes: [
        lt("科技产业政策", "科技產業政策", "Technology-industry policy"),
        lt("国产半导体", "國產半導體", "Domestic semiconductors"),
        lt("AI与算力", "AI與算力", "AI and computing"),
        lt("股权财政", "股權財政", "Equity-finance policy"),
        lt("地方政府产业投资", "地方政府產業投資", "Regional government equity investment"),
        lt("资本市场支持", "資本市場支持", "Capital-market support"),
      ],
      relevantFrameworks: ["Qimen Structure", "Macro Capital Cycle", "Market Flow & Risk"],
      isLongRange: true,
      tags: ["a-shares", "china-equity", "qimen"],
    },
    {
      id: "hang-seng",
      symbol: "HSTECH",
      category: "hong-kong-equity" as const,
      localizedName: lt("恒生科技指数", "恆生科技指數", "Hang Seng TECH Index"),
      localizedSummary: lt("短期与中期方向高度一致，情绪修复和科技成长动能强于A股。", "短期與中期方向高度一致，情緒修復和科技成長動能強於A股。", "Short- and medium-term direction highly aligned; sentiment repair and tech-growth momentum appear stronger than A-shares."),
      shortView: lt("看涨修复", "看漲修復", "Bullish Recovery"),
      status: "Q3 Recovery / Q4 Policy Support",
      researchDate: RESEARCH_DATE,
      lastUpdated: LAST_UPDATED,
      forecastHorizon: lt("2026年Q3–Q4", "2026年Q3–Q4", "Q3–Q4 2026"),
      direction: "bullish" as const,
      confidence: 78,
      scenarioWeights: { base: 50, bull: 35, bear: 15 },
      supportLevels: [],
      resistanceLevels: [],
      targetLevels: [],
      invalidationLevels: [],
      consolidationZones: [],
      turningWindows: [
        { id: "hk-q3", startDate: "2026-07-01", endDate: "2026-09-30", label: lt("Q3修复及走强", "Q3修復及走強", "Q3 recovery and strengthening") },
        { id: "hk-q4", startDate: "2026-10-01", endDate: "2026-12-31", label: lt("Q4政策支持", "Q4政策支持", "Q4 policy support") },
      ],
      frameworkFactors: [
        { id: "hk-qimen", framework: "Qimen Structure", directionScore: 55, weight: 45, confidence: 78, status: "Waiting" as const, explanation: lt("恒生科技指数前期调整较充分，Q3有望进入较强修复。", "恆生科技指數前期調整較充分，Q3有望進入較強修復。", "Hang Seng TECH Index has corrected sufficiently, with Q3 2026 poised for a stronger recovery phase.") },
        { id: "hk-china-narrative", framework: "Macro Capital Cycle", directionScore: 50, weight: 35, confidence: 75, status: "Partially Confirmed" as const, explanation: lt("恒生科技或受益于中国科技叙事；A股走强时资金或回流。", "恒生科技或受益於中國科技敘事；A股走強時資金或回流。", "Hang Seng Tech may benefit from the China technology narrative. Improving risk appetite for China assets may drive capital inflows.") },
        { id: "hk-global", framework: "Market Flow & Risk", directionScore: -25, weight: 20, confidence: 70, status: "Active" as const, explanation: lt("全球流动性、美股科技回调与政策落地不确定性。", "全球流動性、美股科技回調與政策落地不確定性。", "Global liquidity conditions, US technology correction risk, and policy implementation uncertainty.") },
      ],
      confirmationConditions: [],
      riskConditions: [
        lt("全球流动性环境。", "全球流動性環境。", "Global liquidity conditions."),
        lt("美股科技回调风险。", "美股科技回調風險。", "US technology correction risk."),
        lt("中美市场联动风险。", "中美市場聯動風險。", "China-US market linkage risk."),
        lt("政策落地的不确定性。", "政策落地的不確定性。", "Policy implementation uncertainty."),
      ],
      sourceReferences: ["lib/data/research-records.ts"],
      verificationStatus: "draft-pending-verification" as const,
      verificationChecklist: [lt("Q3是否进入较强修复？", "Q3是否進入較強修復？", "Does Q3 enter a stronger recovery phase?")],
      trendPath: [lt("阿里巴巴等大型互联网资产为重点观察对象。", "阿里巴巴等大型互聯網資產為重點觀察對象。", "Large internet names such as Alibaba are key names to watch.")],
      themes: [lt("恒生科技修复", "恆生科技修復", "Hang Seng TECH recovery"), lt("恒生科技", "恒生科技", "Hang Seng Tech"), lt("中国资产风险偏好", "中國資產風險偏好", "China asset risk appetite")],
      relevantFrameworks: ["Qimen Structure", "Macro Capital Cycle", "Market Flow & Risk"],
      tags: ["hang-seng-tech", "hstech", "qimen"],
    },
    {
      id: "changxin-technology",
      symbol: "688825",
      category: "semiconductor" as const,
      localizedName: lt("长鑫科技", "長鑫科技", "ChangXin Technology"),
      localizedSummary: lt("国产DRAM战略核心资产；上市前观察，不臆测 verified 上市日期。", "國產DRAM戰略核心資產；上市前觀察，不臆測 verified 上市日期。", "Core domestic DRAM strategic asset; pre-IPO watch — no verified listing date asserted."),
      shortView: lt("上市观察", "上市觀察", "IPO Watch"),
      status: "Pre-IPO strategic watch",
      researchDate: RESEARCH_DATE,
      lastUpdated: LAST_UPDATED,
      forecastHorizon: lt("2026年至2028年", "2026年至2028年", "2026 to 2028"),
      direction: "watch" as const,
      confidence: 65,
      scenarioWeights: { base: 50, bull: 30, bear: 20 },
      supportLevels: [],
      resistanceLevels: [],
      targetLevels: [],
      invalidationLevels: [],
      consolidationZones: [],
      turningWindows: [],
      frameworkFactors: [
        { id: "cxmt-strategic", framework: "Macro Capital Cycle", directionScore: 40, weight: 40, confidence: 65, status: "Waiting" as const, explanation: lt("国产DRAM及AI内存替代战略中的核心资产。", "國產DRAM及AI記憶體替代戰略中的核心資產。", "Positioned as a core asset in the domestic DRAM and AI-memory substitution strategy.") },
        { id: "cxmt-cycle", framework: "Cycle Structure", directionScore: 0, weight: 30, confidence: 60, status: "Waiting" as const, explanation: lt("DRAM价格周期与HBM研发进度不确定性高。", "DRAM價格週期與HBM研發進度不確定性高。", "DRAM price-cycle volatility and HBM R&D progress carry high uncertainty.") },
        { id: "cxmt-listing", framework: "Market Flow & Risk", directionScore: 10, weight: 30, confidence: 55, status: "Waiting" as const, explanation: lt("上市初期换手率与资金承接需持续观察。", "上市初期換手率與資金承接需持續觀察。", "Early turnover and capital absorption require ongoing observation after listing.") },
      ],
      confirmationConditions: [],
      riskConditions: [
        lt("DRAM价格周期波动。", "DRAM價格週期波動。", "DRAM price-cycle volatility."),
        lt("HBM及先进存储研发进度不确定。", "HBM及先進儲存研發進度不確定。", "Uncertainty in HBM and advanced-memory R&D progress."),
      ],
      sourceReferences: ["lib/data/strategic-watchlist.ts"],
      verificationStatus: "pending" as const,
      verificationChecklist: [lt("IPO定价与首日交易数据待 verified。", "IPO定價與首日交易數據待 verified。", "IPO pricing and first-day trading data pending verification.")],
      trendPath: [],
      themes: [lt("DRAM", "DRAM", "DRAM"), lt("AI内存", "AI記憶體", "AI Memory"), lt("国产替代", "國產替代", "Domestic substitution")],
      relevantFrameworks: ["Macro Capital Cycle", "Cycle Structure", "Market Flow & Risk"],
      strategicWatchlistSettings: {
        enabled: true,
        rating: "watch" as const,
        status: "pre-ipo-watch" as const,
        horizon: lt("2026年至2028年", "2026年至2028年", "2026 to 2028"),
        mainThemes: [lt("DRAM", "DRAM", "DRAM"), lt("AI内存", "AI記憶體", "AI Memory"), lt("国产半导体替代", "國產半導體替代", "Domestic Semiconductor Substitution")],
        thesis: lt("长鑫科技为国产DRAM及AI内存替代战略核心资产；上市前持续观察，不断言已 verified 的上市日期或发行价。", "長鑫科技為國產DRAM及AI記憶體替代戰略核心資產；上市前持續觀察，不斷言已 verified 的上市日期或發行價。", "ChangXin Technology is a core asset in the domestic DRAM and AI-memory substitution strategy; under pre-IPO watch without asserting a verified listing date or IPO price."),
        risks: [lt("DRAM价格周期波动。", "DRAM價格週期波動。", "DRAM price-cycle volatility."), lt("上市初期资金承接需观察。", "上市初期資金承接需觀察。", "Early capital absorption requires ongoing observation.")],
        listingStatus: "preIPO" as const,
        listingDate: null,
        ipoPrice: null,
        priceCurrency: "CNY",
        totalShares: null,
        impliedMarketCap: null,
        valuationStatus: null,
        activateOnListing: true,
        trackMetrics: ["IPO price", "Opening price", "First-day high", "First-day low", "First-day turnover", "First-week close", "First-week maximum drawdown", "Implied market capitalization", "DRAM price cycle", "Institutional participation", "Capital acceptance after listing", "Valuation compared with global memory companies"],
        warning: lt("离岸盘前衍生品价格不是官方上市股票价格，可能存在较大溢价或折价。", "離岸盤前衍生品價格不是官方上市股票價格，可能存在較大溢價或折價。", "The offshore pre-market derivative is not the official Shanghai-listed equity price and may trade at a substantial premium or discount."),
      },
      tags: ["changxin", "dram", "pre-ipo"],
    },
  ],
  timeline: [
    {
      id: "changxin-ipo-watch",
      start: "2026-07-26",
      end: "2026-08-31",
      title: lt("长鑫科技科创板上市观察", "長鑫科技科創板上市觀察", "ChangXin Technology STAR Market IPO Watch"),
      description: lt("待验证的 speculative 上市观察窗口；不断言已 verified 的上市日期或发行价。", "待驗證的 speculative 上市觀察窗口；不斷言已 verified 的上市日期或發行價。", "Pending speculative IPO watch window — no verified listing date or IPO price is asserted."),
      categories: ["china-equity", "semiconductor"] as ("china-equity" | "semiconductor")[],
      verification: "pending" as const,
    },
    { id: "ashares-left-side-window", start: "2026-07-27", end: "2026-08-07", title: lt("A股左侧观察窗口", "A股左側觀察窗口", "A-Share Left-Side Observation Window"), categories: ["china-equity", "qimen"], verification: "pending" as const },
    { id: "nasdaq-short-rebound", start: "2026-07-27", end: "2026-07-28", title: lt("纳斯达克短暂反弹窗口", "納斯達克短暫反彈窗口", "Nasdaq Short Rebound Window"), categories: ["us-equity", "oracle"], verification: "pending" as const },
    { id: "nasdaq-important-turning", start: "2026-07-31", end: "2026-08-07", title: lt("纳斯达克重要转折窗口", "納斯達克重要轉折窗口", "Nasdaq Important Turning Window"), categories: ["us-equity", "oracle"], verification: "pending" as const },
    { id: "semiconductor-turning", date: "2026-08-07", title: lt("半导体疲软/修复转折点", "半導體疲軟/修復轉折點", "Semiconductor Weakness/Recovery Turning Point"), categories: ["semiconductor", "oracle"], verification: "pending" as const },
    { id: "gold-4200-deadline", date: "2026-08-07", title: lt("黄金4,200压力验证截止日", "黃金4,200壓力驗證截止日", "Gold 4,200 Resistance Verification Deadline"), categories: ["commodity", "oracle"], verification: "pending" as const },
    { id: "btc-70000-deadline", date: "2026-08-15", title: lt("比特币70,000情景验证截止日", "比特幣70,000情境驗證截止日", "Bitcoin 70,000 Scenario Verification Deadline"), categories: ["crypto", "oracle"], verification: "pending" as const },
    { id: "ashares-first-advance", date: "2026-08-22", title: lt("A股第一轮重要上涨窗口", "A股第一輪重要上漲窗口", "A-Share First Important Advance Window"), categories: ["china-equity", "qimen"], verification: "pending" as const },
    { id: "china-tech-strengthening", start: "2026-09-01", end: "2026-09-30", title: lt("中国科技与A股趋势强化窗口", "中國科技與A股趨勢強化窗口", "China Tech & A-Share Trend-Strengthening Window"), categories: ["china-equity", "semiconductor", "qimen"], verification: "pending" as const },
    { id: "storage-acceleration", start: "2026-09-07", end: "2026-09-30", title: lt("存储板块修复加速窗口", "儲存板塊修復加速窗口", "Storage Recovery Acceleration Window"), categories: ["semiconductor", "oracle"], verification: "pending" as const },
    { id: "semiconductor-trough-window", start: "2026-09-01", end: "2026-10-15", title: lt("半导体/存储潜在大级别底部窗口", "半導體/儲存潛在大級別底部窗口", "Possible Larger Semiconductor/Storage Trough Window"), categories: ["semiconductor", "oracle"], verification: "pending" as const },
    { id: "ashares-4500-window", start: "2026-10-01", end: "2026-10-31", title: lt("A股4,500情景目标与高波动窗口", "A股4,500情境目標與高波動窗口", "A-Share 4,500 Scenario Target & High-Volatility Window"), categories: ["china-equity", "qimen"], verification: "pending" as const },
    { id: "ashares-year-end-advance", start: "2026-11-01", end: "2027-01-31", title: lt("A股年末/春节前上涨窗口", "A股年末/春節前上漲窗口", "A-Share Year-End / Pre-Spring-Festival Advance Window"), categories: ["china-equity", "qimen"], verification: "pending" as const },
    { id: "nasdaq-low-window-1", start: "2026-11-01", end: "2026-12-31", title: lt("纳斯达克可能低点窗口", "納斯達克可能低點窗口", "Nasdaq Possible Low Window"), categories: ["us-equity", "oracle"], verification: "pending" as const },
    { id: "nasdaq-low-window-2", start: "2027-02-01", end: "2027-03-31", title: lt("纳斯达克第二可能低点窗口", "納斯達克第二可能低點窗口", "Nasdaq Second Possible Low Window"), categories: ["us-equity", "oracle"], verification: "pending" as const },
    { id: "nasdaq-recovery-window", start: "2027-04-01", end: "2027-07-31", title: lt("纳斯达克修复窗口", "納斯達克修復窗口", "Nasdaq Recovery Window"), categories: ["us-equity", "oracle"], verification: "pending" as const },
    { id: "long-range-systemic-risk-watch", start: "2028-09-01", end: "2028-11-30", title: lt("长期系统性风险观察开始", "長期系統性風險觀察開始", "Long-Range Systemic-Risk Watch Begins"), categories: ["us-equity", "oracle"], verification: "pending" as const, isLongRange: true },
    { id: "long-range-global-stress", start: "2028-09-01", end: "2029-12-31", title: lt("全球金融风险情景窗口", "全球金融風險情境窗口", "Possible Global Financial Stress Scenario"), categories: ["us-equity", "oracle"], verification: "pending" as const, isLongRange: true },
    { id: "long-range-recovery-2030", start: "2030-01-01", end: "2030-12-31", title: lt("长期修复情景", "長期修復情境", "Long-Range Recovery Scenario"), categories: ["us-equity", "oracle"], verification: "pending" as const, isLongRange: true },
    { id: "long-range-improving-cycle", start: "2031-01-01", end: "2032-12-31", title: lt("改善周期", "改善週期", "Improving Cycle"), categories: ["us-equity", "oracle"], verification: "pending" as const, isLongRange: true },
    { id: "long-range-stronger-cycle", start: "2034-01-01", end: "2035-12-31", title: lt("更强长期周期", "更強長期週期", "Stronger Long-Range Cycle"), categories: ["us-equity", "oracle"], verification: "pending" as const, isLongRange: true },
  ],
};

const parsed = MoonXDocumentSchema.safeParse(document);
if (!parsed.success) {
  console.error("Validation failed:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const root = path.join(process.cwd(), "content", "moonx");
mkdirSync(path.join(root, "history"), { recursive: true });
mkdirSync(path.join(root, "source-notes"), { recursive: true });

const json = JSON.stringify(parsed.data, null, 2);
const latestPath = path.join(root, "latest.json");
const historyPath = path.join(root, "history", `${VERSION}.json`);
writeFileSync(latestPath, json, "utf8");
writeFileSync(historyPath, json, "utf8");

const sourceNotes = `# MoonX Source Notes — ${RESEARCH_DATE}

Seed sources for \`content/moonx/latest.json\` (snapshot \`${VERSION}\`):

- \`lib/data/intelligence-snapshot.ts\` — asset scores, framework evidence, main conclusion, risk disclaimer
- \`lib/data/forecast-chart-scenarios.ts\` — chart waypoints, levels, zones, turning windows, scenario paths (bitcoin, nasdaq-100, semiconductors-storage, gold, crude-oil)
- \`lib/data/research-records.ts\` — Qimen long-range A-share and Hang Seng TECH research (shanghai-composite, hang-seng)
- \`lib/data/long-range-forecasts.ts\` — unified timeline events (ChangXin IPO event replaced with speculative IPO watch window)
- \`lib/data/strategic-watchlist.ts\` — ChangXin pre-IPO watchlist metrics and offshore derivative warning

Status: draft-pending-verification. Not live market data.
`;
writeFileSync(path.join(root, "source-notes", `${RESEARCH_DATE}.md`), sourceNotes, "utf8");

console.log("Wrote:", latestPath);
console.log("Wrote:", historyPath);
console.log("Asset ids:", parsed.data.assets.map((a) => a.id).join(", "));
console.log("Approx size:", Math.round(json.length / 1024), "KB");
