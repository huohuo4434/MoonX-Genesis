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
    relatedRecordIds: ["MX-OIL-20260602-0903-LIUYAO-001", "INT-WTI-20260807-20270204-EXT-001"],
  },
  {
    id: "sixyao-cxmt-ipo-first-week",
    publishedAt: "2026-07-26",
    assetId: "changxin-technology",
    assetName: lt("长鑫科技", "長鑫科技", "ChangXin Technology"),
    symbol: "688825",
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
      "不是典型连续直线上涨卦象。上市初期更可能先涨后跌、周末偏弱：前半段或继续冲高，后半段回落概率上升。中长期价值不能只依据上市第一周表现。",
      "不是典型連續直線上漲卦象。上市初期更可能先漲後跌、週末偏弱：前半段或繼續衝高，後半段回落概率上升。中長期價值不能只依據上市第一週表現。",
      "Not a classic straight-line bullish hexagram. Early listing bias is rise-then-fall with a softer weekend: early week may push higher, later week fade risk rises. Long-term value is not decided by week one."
    ),
    moonxInterpretation: lt(
      "正式方向：先涨后跌，周末偏弱。会员页以可验证方向发布，不使用观望或模糊承接区文案。",
      "正式方向：先漲後跌，週末偏弱。會員頁以可驗證方向發布，不使用觀望或模糊承接區文案。",
      "Formal direction: rise then fall, softer weekend. Member pages publish verifiable directions — no abstain or vague absorption-zone prose."
    ),
    thesis: [
      lt("确认条件：前两个交易日冲高后，后三个交易日震荡回落并周末收弱。", "確認條件：前兩個交易日衝高後，後三個交易日震盪回落並週末收弱。", "Confirmation: early-week probe higher, then later-week fade with a softer weekend close."),
      lt("失效条件：后半周仍持续放量创新高且周末未见回落。", "失效條件：後半週仍持續放量創新高且週末未見回落。", "Invalidation: late week keeps making volume highs without a weekend fade."),
    ],
    invalidation: lt(
      "后半周仍持续放量创新高且周末未见回落。",
      "後半週仍持續放量創新高且週末未見回落。",
      "Late week keeps making volume highs without a weekend fade."
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
    parentRecordId: "MX-BTC-20260727-0907-LIUYAO-001",
    derivedFromRecordIds: ["MX-BTC-20260727-0806-LIUYAO-001", "MX-BTC-20260727-0907-LIUYAO-001", "ORACLE-0009"],
    sourceStatus: "raw_source_saved",
    horizon: lt("2026-07-27 至 2026-08-02", "2026-07-27 至 2026-08-02", "2026-07-27 to 2026-08-02"),
    title: lt("比特币本周战术观察（用户自测短周期）", "比特幣本週戰術觀察（用戶自測短周期）", "Bitcoin weekly tactical watch (user self-test short cycle)"),
    rawSource: lt(
      "关联用户自测短周期 MX-BTC-20260727-0806-LIUYAO-001 与中周期 MX-BTC-20260727-0907-LIUYAO-001；原始卦盘已归档，已审核并纳入日度拆解。",
      "關聯用戶自測短周期 MX-BTC-20260727-0806-LIUYAO-001 與中周期 MX-BTC-20260727-0907-LIUYAO-001；原始卦盤已歸檔，待管理員審核。",
      "Linked to user self-test short MX-BTC-20260727-0806-LIUYAO-001 and mid MX-BTC-20260727-0907-LIUYAO-001; source charts archived, pending admin review."
    ),
    summary: lt(
      "短周期偏向先弹后跌再修复。7月30日至8月3日为主要回落观察窗口，8月4日至6日关注止跌和反弹。中周期仍偏高波动修复，9月初进入高位或转折观察。",
      "短周期偏向先彈後跌再修復。7月30日至8月3日為主要回落觀察窗口，8月4日至6日關注止跌和反彈。中周期仍偏高波動修復，9月初進入高位或轉折觀察。",
      "Short cycle: bounce, dip, then repair. Jul 30–Aug 3 is the main pullback watch; Aug 4–6 watches stabilization and rebound. Mid cycle stays high-volatility repair; early Sep enters high/turn watch."
    ),
    moonxInterpretation: lt(
      "用户自测原始卦盘已归档，已审核并纳入日度拆解。",
      "用戶自測原始卦盤已歸檔，待管理員審核。不得自動成為正式會員預測。",
      "User self-test source charts archived — pending admin review. Must not auto-publish as member forecast."
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
    tags: ["bitcoin", "weekly-tactical", "user-self-test", "pending-human-review", "parent-MX-BTC-20260727-0907"],
  },
];
