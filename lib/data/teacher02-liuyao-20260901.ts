import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

const common = {
  publishedAt: "2026-09-01",
  sourcePublishedAt: null,
  sourcePublishedAtVerified: false,
  ingestedAt: "2026-09-01T08:00:00+08:00",
  forecastStart: "2026-09-02",
  forecastEnd: "2026-09-04",
  market: "commodity" as const,
  framework: "oracle-six-yao" as const,
  sourceType: "external-symbolic-analysis" as const,
  publicSourceLabel: lt("辅助节奏复核", "輔助節奏複核", "Auxiliary timing review"),
  consensusEligible: false,
  visibility: "internal" as const,
  verificationEligibility: "provisional" as const,
  sourceStatus: "raw_source_saved" as const,
  status: "active" as const,
  excludeFromLongTermConsensus: true,
};

export const TEACHER02_LIUYAO_20260901: ResearchRecord[] = [
  {
    ...common,
    id: "T02-GOLD-20260902-0904-INGESTED-0901",
    assetId: "gold",
    assetName: lt("国际金价", "國際金價", "Gold"),
    symbol: "GOLD",
    sourceSymbol: "GLD",
    internalSourceRef: "C:/Users/13558/Desktop/狼叔0901/黄金白银8月底最后一周操作策略 8.31-9.4 .txt；同目录4张视频画面截图",
    direction: "bearish",
    editorialConfidence: 58,
    layer: "tactical",
    horizon: lt("收到后的剩余窗口：2026年9月2日至4日", "收到後的剩餘窗口：2026年9月2日至4日", "Remaining window after ingestion: Sep 2–4, 2026"),
    title: lt("黄金9月2日下行释放、3至4日低位确认复核", "黃金9月2日下行釋放、3至4日低位確認複核", "Gold downside release Sep 2, low confirmation Sep 3–4"),
    summary: lt(
      "来源将9月2日视为第二段乾卦接管的核心转换点，偏向继续下行或波动放大；9月3日至4日观察风险释放后的阶段低位与修复，但不预设立即V形反转。该材料在周期开始后收到，只校准剩余窗口，不回填8月31日与9月1日。",
      "來源將9月2日視為第二段乾卦接管的核心轉換點，偏向繼續下行或波動放大；9月3日至4日觀察風險釋放後的階段低位與修復，但不預設立即V形反轉。該材料在週期開始後收到，只校準剩餘窗口，不回填8月31日與9月1日。",
      "The source treats Sep 2 as the core transition into renewed downside or wider volatility, then watches Sep 3–4 for a local low and stabilization without assuming an immediate V-reversal."
    ),
    thesis: [
      lt("9月2日先按下行释放与波动放大观察。", "9月2日先按下行釋放與波動放大觀察。", "Watch Sep 2 for downside release and wider volatility."),
      lt("9月3日至4日是低位与止跌确认窗口，不是机械抄底日。", "9月3日至4日是低位與止跌確認窗口，不是機械抄底日。", "Sep 3–4 is a low/stabilization check, not a mechanical buy date."),
    ],
    risks: [lt("转录中的具体价位量纲不稳定，本记录不采用未经画面核实的价格数字。", "轉錄中的具體價位量綱不穩定，本記錄不採用未經畫面核實的價格數字。", "Transcript price scales are unreliable, so unverified levels are excluded.")],
    turningWindows: [
      { id: "gold-t02-release-0902", date: "2026-09-02", label: lt("下行释放与波动放大", "下行釋放與波動放大", "Downside release / volatility expansion") },
      { id: "gold-t02-low-0903-0904", start: "2026-09-03", end: "2026-09-04", label: lt("阶段低位与止跌确认", "階段低位與止跌確認", "Local-low and stabilization check") },
    ],
    verificationChecklist: [
      lt("9月2日是否出现继续下行或显著波动放大。", "9月2日是否出現繼續下行或顯著波動放大。", "Did Sep 2 show continued downside or a material volatility expansion?"),
      lt("9月3日至4日是否出现低位、减速或修复，而不是立刻V形反转。", "9月3日至4日是否出現低位、減速或修復，而不是立刻V形反轉。", "Did Sep 3–4 show a low, deceleration, or repair rather than an immediate V-reversal?"),
    ],
    tags: ["gold", "gld", "source:teacher02", "mid-window-ingestion", "remaining-window-only", "no-retroactive-edit", "no-auto-trade"],
  },
  {
    ...common,
    id: "T02-SILVER-20260902-0904-INGESTED-0901",
    assetId: "silver",
    assetName: lt("国际银价", "國際銀價", "Silver"),
    symbol: "SILVER",
    sourceSymbol: "SLV",
    internalSourceRef: "C:/Users/13558/Desktop/狼叔0901/黄金白银8月底最后一周操作策略 8.31-9.4 .txt；同目录4张视频画面截图",
    direction: "bearish",
    editorialConfidence: 61,
    layer: "tactical",
    horizon: lt("收到后的剩余窗口：2026年9月2日至4日", "收到後的剩餘窗口：2026年9月2日至4日", "Remaining window after ingestion: Sep 2–4, 2026"),
    title: lt("白银9月2日前后转弱、4日前后低位确认复核", "白銀9月2日前後轉弱、4日前後低位確認複核", "Silver weakens around Sep 2, checks a low near Sep 4"),
    summary: lt(
      "来源认为白银在月、周关键窗口交接后进入下行释放，9月2日前后是核心转换点，9月4日至5日仍可能有较大波动；这与网站原有先涨后跌、9月2日前后转弱路径基本一致。",
      "來源認為白銀在月、週關鍵窗口交接後進入下行釋放，9月2日前後是核心轉換點，9月4日至5日仍可能有較大波動；這與網站原有先漲後跌、9月2日前後轉弱路徑基本一致。",
      "The source expects downside release after the monthly/weekly transition, centered around Sep 2 with elevated volatility into Sep 4–5. This broadly aligns with the existing rise-then-fall path."
    ),
    thesis: [
      lt("9月2日前后是由前段强势转入后段压力的核心窗口。", "9月2日前後是由前段強勢轉入後段壓力的核心窗口。", "Around Sep 2 is the main transition from early strength to later pressure."),
      lt("急跌后不追空，先看风险是否充分释放。", "急跌後不追空，先看風險是否充分釋放。", "Do not chase after a sharp drop; first check whether risk has been sufficiently released."),
    ],
    risks: [lt("白银波动通常大于黄金，关键日允许前后一个交易时段误差。", "白銀波動通常大於黃金，關鍵日允許前後一個交易時段誤差。", "Silver is more volatile than gold; timing may shift by one session.")],
    turningWindows: [
      { id: "silver-t02-turn-0902", date: "2026-09-02", label: lt("由强转弱核心窗口", "由強轉弱核心窗口", "Core strong-to-weak transition") },
      { id: "silver-t02-low-0904", date: "2026-09-04", label: lt("低位与风险释放确认", "低位與風險釋放確認", "Low / risk-release confirmation") },
    ],
    verificationChecklist: [
      lt("9月2日前后是否由强转弱。", "9月2日前後是否由強轉弱。", "Did silver turn from strength to weakness around Sep 2?"),
      lt("9月4日前后是否出现低位或减速，而非继续无序加速。", "9月4日前後是否出現低位或減速，而非繼續無序加速。", "Did a low or deceleration appear near Sep 4 rather than uncontrolled acceleration?"),
    ],
    tags: ["silver", "slv", "source:teacher02", "mid-window-ingestion", "remaining-window-only", "aligned-with-locked-path", "no-retroactive-edit", "no-auto-trade"],
  },
];
