/**
 * Curated research imports — fills gaps and links parent/child forecasts.
 * Prefer enriching existing ResearchRecord IDs; only add when no equivalent exists.
 * Does not invent hexagrams, day paths, or unconfirmed resistance prices.
 */
import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

/** Week covered by the current tactical edition. */
export const CURRENT_WEEK = {
  start: "2026-07-27",
  end: "2026-08-02",
} as const;

/**
 * New curated records that were missing as first-class ResearchRecord entries.
 * Existing ORACLE / QIMEN / EXTERNAL ids are enriched in place elsewhere.
 */
export const curatedImportRecords: ResearchRecord[] = [
  {
    id: "technical-btc-2026-07-snapshot",
    aliases: ["oracle-btc-technical-2026-07"],
    publishedAt: "2026-07-26",
    forecastStart: "2026-07-21",
    forecastEnd: "2026-08-15",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "technical",
    sourceType: "internal-research",
    publicSourceLabel: lt("MoonX技术观察", "MoonX技術觀察", "MoonX Technical Watch"),
    direction: "bullish",
    editorialConfidence: 70,
    consensusEligible: false,
    layer: "execution",
    parentRecordId: "ORACLE-0006",
    sourceStatus: "summary_only",
    horizon: lt("执行观察 · 2026年7月快照", "執行觀察 · 2026年7月快照", "Execution watch · July 2026 snapshot"),
    title: lt("比特币技术观察位（2026年7月快照）", "比特幣技術觀察位（2026年7月快照）", "Bitcoin Technical Levels (July 2026 Snapshot)"),
    rawSource: lt(
      "既有MoonX技术研究快照：支撑 64650 / 63412 / 61500 / 58000；深度支撑区 52000–55000；压力 66956 / 67300 / 70000。",
      "既有MoonX技術研究快照：支撐 64650 / 63412 / 61500 / 58000；深度支撐區 52000–55000；壓力 66956 / 67300 / 70000。",
      "Existing MoonX technical snapshot: supports 64650 / 63412 / 61500 / 58000; deep zone 52000–55000; resistance 66956 / 67300 / 70000."
    ),
    summary: lt(
      "关键支撑关注 64650 与 63412；突破 67300 并回踩确认后，向 70000 延伸的情景增强。有效跌破 63412 后需重新评估中期上涨节奏。点位属于研究快照，非实时行情。",
      "關鍵支撐關注 64650 與 63412；突破 67300 並回踩確認後，向 70000 延伸的情景增強。有效跌破 63412 後需重新評估中期上漲節奏。點位屬於研究快照，非即時行情。",
      "Watch supports 64650 and 63412; a break and hold above 67300 strengthens the path toward 70000. A decisive break of 63412 requires reassessing the medium-term upside pace. Levels are research snapshots, not live prices."
    ),
    moonxInterpretation: lt(
      "技术分析用于支撑、压力、突破确认与失效条件，不覆盖 ORACLE-0006 的中期六爻方向。",
      "技術分析用於支撐、壓力、突破確認與失效條件，不覆蓋 ORACLE-0006 的中期六爻方向。",
      "Technical analysis supplies levels and invalidation; it does not override ORACLE-0006 medium-term six-yao direction."
    ),
    thesis: [
      lt("主要支撑：64650、63412、61500、58000。", "主要支撐：64650、63412、61500、58000。", "Main supports: 64650, 63412, 61500, 58000."),
      lt("深度支撑区：52000至55000。", "深度支撐區：52000至55000。", "Deep support zone: 52000–55000."),
      lt("主要压力：66956、67300、70000。", "主要壓力：66956、67300、70000。", "Main resistance: 66956, 67300, 70000."),
      lt("上涨确认：突破67300后回踩确认不破。", "上漲確認：突破67300後回踩確認不破。", "Upside confirmation: break 67300 then hold on retest."),
    ],
    supports: [64650, 63412, 61500, 58000],
    resistances: [66956, 67300, 70000],
    targets: [70000],
    invalidation: lt(
      "有效跌破63412后，需要重新评估中期上涨节奏。",
      "有效跌破63412後，需要重新評估中期上漲節奏。",
      "A decisive break below 63412 requires reassessing the medium-term upside rhythm."
    ),
    status: "active",
    tags: ["bitcoin", "technical", "execution", "snapshot-not-live"],
  },
  {
    id: "technical-ndx-2026-07-snapshot",
    publishedAt: "2026-07-26",
    forecastStart: "2026-07-21",
    forecastEnd: "2026-08-21",
    assetId: "nasdaq-100",
    assetName: lt("纳斯达克100", "納斯達克100", "Nasdaq 100"),
    symbol: "NDX",
    market: "index",
    framework: "technical",
    sourceType: "internal-research",
    publicSourceLabel: lt("MoonX技术观察", "MoonX技術觀察", "MoonX Technical Watch"),
    direction: "slightly-bearish",
    editorialConfidence: 65,
    consensusEligible: false,
    layer: "execution",
    parentRecordId: "ORACLE-0001",
    sourceStatus: "summary_only",
    horizon: lt("执行观察 · 2026年7月快照", "執行觀察 · 2026年7月快照", "Execution watch · July 2026 snapshot"),
    title: lt("纳斯达克技术观察区（2026年7月快照）", "納斯達克技術觀察區（2026年7月快照）", "Nasdaq Technical Observation Zones (July 2026 Snapshot)"),
    summary: lt(
      "上方观察区 7420–7450；初步下方观察区 7315–7350；较低支撑观察区 7212–7262；独立周期参考 7400。以上为观察区间，并非保证达到的目标。",
      "上方觀察區 7420–7450；初步下方觀察區 7315–7350；較低支撐觀察區 7212–7262；獨立週期參考 7400。以上為觀察區間，並非保證達到的目標。",
      "Upper watch 7420–7450; initial downside 7315–7350; lower support 7212–7262; cycle reference 7400. Observation zones only — not guaranteed targets."
    ),
    thesis: [
      lt("上方观察区：7420至7450。", "上方觀察區：7420至7450。", "Upper watch zone: 7420–7450."),
      lt("初步下方观察区：7315至7350。", "初步下方觀察區：7315至7350。", "Initial downside zone: 7315–7350."),
      lt("较低支撑观察区：7212至7262。", "較低支撐觀察區：7212至7262。", "Lower support zone: 7212–7262."),
      lt("独立周期参考：7400。", "獨立週期參考：7400。", "Independent cycle reference: 7400."),
    ],
    supports: [7315, 7262, 7212],
    resistances: [7420, 7450, 7400],
    status: "active",
    tags: ["nasdaq-100", "technical", "execution", "snapshot-not-live"],
  },
  {
    id: "research-oil-cycle-2026-h2",
    publishedAt: "2026-07-26",
    forecastStart: "2026-07-26",
    forecastEnd: "2026-10-10",
    assetId: "crude-oil",
    assetName: lt("原油", "原油", "Crude Oil"),
    symbol: "WTI / Brent",
    market: "commodity",
    framework: "cycle",
    sourceType: "internal-research",
    publicSourceLabel: lt("周期结构研究", "週期結構研究", "Cycle Structure Research"),
    direction: "neutral",
    editorialConfidence: 62,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "summary_only",
    horizon: lt("2026年下半年阶段观点", "2026年下半年階段觀點", "2026 H2 stage view"),
    title: lt("原油阶段观点：短调整、长修复", "原油階段觀點：短調整、長修復", "Crude Oil Stage View: Near-Term Digestion, Longer Repair"),
    rawSource: lt(
      "短期存在调整压力，中长期在完成回调后仍可能恢复上涨。已知支撑观察 68。7月底可能形成阶段高位；8月底至10月初关注更大低点窗口。",
      "短期存在調整壓力，中長期在完成回調後仍可能恢復上漲。已知支撐觀察 68。7月底可能形成階段高位；8月底至10月初關注更大低點窗口。",
      "Near-term digestion pressure; longer-term repair possible after the trough. Known support watch: 68. Late July may mark a local high; late Aug–early Oct watches a larger low window."
    ),
    summary: lt(
      "短线偏调整、中长线等待回调完成后的修复。支撑观察 68。上方压力：待技术更新（无人工确认的精确压力位）。",
      "短線偏調整、中長線等待回調完成後的修復。支撐觀察 68。上方壓力：待技術更新（無人工確認的精確壓力位）。",
      "Near-term digestion with longer-term repair after the trough. Support watch: 68. Upper resistance: pending technical update (no manually confirmed precise resistance)."
    ),
    moonxInterpretation: lt(
      "mixed：短期调整与中长期修复并存。禁止虚构压力价。",
      "mixed：短期調整與中長期修復並存。禁止虛構壓力價。",
      "Mixed: near-term digestion with longer-term repair. Do not invent resistance prices."
    ),
    thesis: [
      lt("已知支撑观察：68。", "已知支撐觀察：68。", "Known support watch: 68."),
      lt("7月底可能形成阶段高位。", "7月底可能形成階段高位。", "Late July may form a local high."),
      lt("8月底至10月初关注更大低点窗口。", "8月底至10月初關注更大低點窗口。", "Late August to early October: larger low-window watch."),
      lt("上方压力：待技术更新。", "上方壓力：待技術更新。", "Upper resistance: pending technical update."),
    ],
    supports: [68],
    turningWindows: [
      { id: "oil-late-jul-high", start: "2026-07-25", end: "2026-07-31", label: lt("阶段高位观察", "階段高位觀察", "Local high watch") },
      { id: "oil-trough-aug-oct", start: "2026-08-20", end: "2026-10-05", label: lt("更大低点窗口", "更大低點窗口", "Larger low window") },
    ],
    status: "active",
    tags: ["crude-oil", "cycle", "strategic", "resistance-pending"],
  },
  {
    id: "sixyao-cxmt-ipo-first-week",
    publishedAt: "2026-07-26",
    assetId: "changxin-technology",
    assetName: lt("长鑫科技", "長鑫科技", "ChangXin Technology"),
    symbol: "CXMT",
    market: "semiconductor",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("六爻研究", "六爻研究", "Oracle Research"),
    direction: "neutral",
    editorialConfidence: 58,
    consensusEligible: false,
    layer: "tactical",
    sourceStatus: "summary_only",
    horizon: lt("上市后一周", "上市後一週", "First week after listing"),
    title: lt("长鑫科技上市初期六爻观察", "長鑫科技上市初期六爻觀察", "ChangXin IPO First-Week Six-Yao Watch"),
    hexagramPrimary: lt("地山谦", "地山謙", "Earth over Mountain — Humility (Qian)"),
    hexagramChanged: lt("水山蹇", "水山蹇", "Water over Mountain — Obstruction (Jian)"),
    rawSource: lt(
      "主卦地山谦，变卦水山蹇。上市初期观察冲高、换手与多空分歧，而非连续直线上涨。",
      "主卦地山謙，變卦水山蹇。上市初期觀察衝高、換手與多空分歧，而非連續直線上漲。",
      "Primary Humility, changed Obstruction. Early listing watch focuses on spikes, turnover, and two-way flow — not a straight-line advance."
    ),
    summary: lt(
      "不是典型连续直线上涨卦象。上市初期可能冲高、巨大换手和多空分歧；上涨过程可能遇阻。更符合先交易、先承压、再观察承接。中长期价值不能只依据上市第一周表现。",
      "不是典型連續直線上漲卦象。上市初期可能衝高、巨大換手和多空分歧；上漲過程可能遇阻。更符合先交易、先承壓、再觀察承接。中長期價值不能只依據上市第一週表現。",
      "Not a classic straight-line bullish hexagram. Early listing may spike, churn, and diverge; advances may meet resistance. Sequence: trade first, absorb pressure, then watch bid support. Long-term value is not decided by week one."
    ),
    moonxInterpretation: lt(
      "方向显示：先换手，后观察承接。重点跟踪，不设强势看涨或必涨评级。",
      "方向顯示：先換手，後觀察承接。重點跟蹤，不設強勢看漲或必漲評級。",
      "Display direction: turnover first, then watch absorption. Focus tracking only — no strong-bullish or must-rise rating."
    ),
    thesis: [
      lt("确认条件：上市后资金承接稳定，回调后重新站稳关键交易区。", "確認條件：上市後資金承接穩定，回調後重新站穩關鍵交易區。", "Confirmation: stable absorption after listing and reclaim of the key trade zone after pullback."),
      lt("失效条件：上市后持续放量走弱，且无法形成有效承接。", "失效條件：上市後持續放量走弱，且無法形成有效承接。", "Invalidation: persistent volume-led weakness without effective absorption."),
    ],
    invalidation: lt(
      "上市后持续放量走弱，且无法形成有效承接。",
      "上市後持續放量走弱，且無法形成有效承接。",
      "Persistent volume-led weakness without effective absorption after listing."
    ),
    status: "active",
    tags: ["changxin", "ipo", "oracle-six-yao", "focus-tracking", "no-auto-bullish"],
  },
  {
    id: "weekly-tactical-btc-2026-07-27",
    publishedAt: "2026-07-27",
    forecastStart: "2026-07-27",
    forecastEnd: "2026-08-02",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "oracle-six-yao",
    sourceType: "internal-research",
    publicSourceLabel: lt("六爻研究", "六爻研究", "Oracle Research"),
    direction: "bullish",
    editorialConfidence: 55,
    consensusEligible: false,
    excludeFromLongTermConsensus: true,
    layer: "tactical",
    parentRecordId: "ORACLE-0006",
    derivedFromRecordIds: ["ORACLE-0006", "technical-btc-2026-07-snapshot"],
    sourceStatus: "source_image_pending_relink",
    horizon: lt("2026-07-27 至 2026-08-02", "2026-07-27 至 2026-08-02", "2026-07-27 to 2026-08-02"),
    title: lt("比特币本周战术观察（关联中期六爻）", "比特幣本週戰術觀察（關聯中期六爻）", "Bitcoin Weekly Tactical Watch (Linked to Medium-Term Six Yao)"),
    rawSource: lt(
      "项目内未找到独立的本周（07-27至08-02）BTC六爻卦图原文；已关联中期六爻 ORACLE-0006（至08-15挑战70000）。",
      "專案內未找到獨立的本週（07-27至08-02）BTC六爻卦圖原文；已關聯中期六爻 ORACLE-0006（至08-15挑戰70000）。",
      "No standalone BTC weekly hexagram chart for 07-27–08-02 was found in-repo; linked to medium-term ORACLE-0006 (70k challenge by 08-15)."
    ),
    summary: lt(
      "本周处于中期偏多情景内的节奏观察。独立本周六爻卦图待归档。执行上结合 64650 / 63412 支撑与 67300 突破确认。每日节奏属于周度趋势拆解，不确定性高于周度判断。",
      "本週處於中期偏多情景內的節奏觀察。獨立本週六爻卦圖待歸檔。執行上結合 64650 / 63412 支撐與 67300 突破確認。每日節奏屬於週度趨勢拆解，不確定性高於週度判斷。",
      "This week sits inside the medium-term bullish scenario. Standalone weekly hexagram chart pending archive. Execution watches 64650 / 63412 support and 67300 breakout confirmation. Daily rhythm is a weekly decomposition with higher uncertainty."
    ),
    moonxInterpretation: lt(
      "中长期观点已更新，本周独立卦象待补充。原始卦图待归档。",
      "中長期觀點已更新，本週獨立卦象待補充。原始卦圖待歸檔。",
      "Medium-term view is active; standalone weekly hexagram still pending. Source chart pending archive."
    ),
    thesis: [
      lt("周一至周二：观察初始方向确认（是否守住关键支撑）。", "週一至週二：觀察初始方向確認（是否守住關鍵支撐）。", "Mon–Tue: watch initial direction confirmation (key support hold)."),
      lt("周三：关注周中转折与波动。", "週三：關注週中轉折與波動。", "Wed: watch midweek turn and volatility."),
      lt("周四至周五：根据周度偏多趋势延续或技术修正。", "週四至週五：根據週度偏多趨勢延續或技術修正。", "Thu–Fri: continue the weekly bullish bias or apply technical revision."),
      lt("每日节奏属于周度趋势拆解，不确定性高于周度判断。", "每日節奏屬於週度趨勢拆解，不確定性高於週度判斷。", "Daily rhythm is derived from the weekly bias and is more uncertain."),
    ],
    supports: [64650, 63412],
    resistances: [66956, 67300],
    targets: [70000],
    invalidation: lt("有效跌破63412后重新评估本周偏多节奏。", "有效跌破63412後重新評估本週偏多節奏。", "Reassess the weekly bullish bias after a decisive break of 63412."),
    verificationChecklist: [
      lt("是否守住64650附近支撑。", "是否守住64650附近支撐。", "Did price hold near 64650?"),
      lt("是否出现67300突破并回踩确认。", "是否出現67300突破並回踩確認。", "Did 67300 break and hold on retest?"),
    ],
    status: "active",
    tags: ["bitcoin", "weekly-tactical", "hexagram-pending", "parent-ORACLE-0006"],
  },
];
