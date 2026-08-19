import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

/**
 * Distilled forward BTC asset-Bazi / cycle research from the user's supplied
 * Datou materials. No long transcript is stored here; only the forecast claims
 * needed for scoring and future verification.
 */
export const btcMarketBazi20260820Records: ResearchRecord[] = [
  {
    id: "BTC-MARKET-BAZI-20260808-AUGSEP-REBOUND",
    publishedAt: "2026-08-08",
    sourcePublishedAt: "2026-08-08T10:41:00+08:00",
    sourcePublishedAtVerified: false,
    ingestedAt: "2026-08-20T06:12:00+08:00",
    verificationEligibility: "provisional",
    forecastStart: "2026-08-08",
    forecastEnd: "2026-09-30",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "cycle",
    sourceType: "public-analyst",
    publicSourceLabel: lt("研究者·资产八字", "研究者·資產八字", "Researcher · Asset Bazi"),
    direction: "bullish",
    editorialConfidence: 62,
    consensusEligible: true,
    horizon: lt("2026年8月至9月", "2026年8月至9月", "August–September 2026"),
    title: lt("BTC丙申/丁酉月反弹通道先验", "BTC丙申/丁酉月反彈通道先驗", "BTC Aug–Sep rebound regime prior"),
    summary: lt(
      "事前观点认为BTC在7月底后进入8—9月反弹通道，8月应突破前期震荡上沿；约73,000先观察，约84,000仅为技术目标猜测。8月突破实际晚于原先‘下周’时间窗口，因此方向记为部分兑现、择时不记满分。",
      "事前觀點認為BTC在7月底後進入8—9月反彈通道，8月應突破前期震盪上沿；約73,000先觀察，約84,000僅為技術目標猜測。8月突破實際晚於原先‘下週’時間窗口，因此方向記為部分兌現、擇時不記滿分。",
      "The forward view expected BTC to enter a rebound channel through August–September and break the prior range in August. ~73k was the first checkpoint and ~84k only an indicative technical objective. The breakout came later than the stated timing window, so direction is treated as partially validated rather than a full timing hit."
    ),
    thesis: [
      lt("8—9月的月令/资产八字环境偏向反弹，不应把单日偏空自动外推为整月持续下跌。", "8—9月的月令/資產八字環境偏向反彈，不應把單日偏空自動外推為整月持續下跌。", "The August–September asset-Bazi regime leans rebound; a bearish daily call should not automatically be extrapolated into a full-month decline."),
      lt("方向先验只负责修正置信度与风险；若与奇门冲突，需4H/30m/5m右侧确认后才允许小仓反向执行。", "方向先驗只負責修正置信度與風險；若與奇門衝突，需4H/30m/5m右側確認後才允許小倉反向執行。", "The regime prior only adjusts conviction and risk. If it conflicts with Qimen, a small countertrend execution requires 4H/30m/5m right-side confirmation."),
    ],
    targets: [73000, 84000],
    invalidation: lt("若8—9月价格结构重新跌破并持续失守主要日线底部结构，则月度反弹先验降权。", "若8—9月價格結構重新跌破並持續失守主要日線底部結構，則月度反彈先驗降權。", "If price decisively loses the major daily bottom structure during Aug–Sep, downgrade the rebound prior."),
    verificationChecklist: [
      lt("方向：8—9月是否总体出现可交易反弹。", "方向：8—9月是否總體出現可交易反彈。", "Direction: whether Aug–Sep produces a tradable rebound."),
      lt("时间：原‘下周突破’是否按时；延迟兑现必须单独记分。", "時間：原‘下週突破’是否按時；延遲兌現必須單獨記分。", "Timing: whether the stated next-week breakout was on time; delayed realization is scored separately."),
      lt("目标：73k与84k分别独立验证，不因方向命中自动视为目标命中。", "目標：73k與84k分別獨立驗證，不因方向命中自動視為目標命中。", "Targets: verify 73k and 84k separately; a correct direction does not imply target accuracy."),
    ],
    status: "active",
    visibility: "internal",
    layer: "strategic",
    sourceStatus: "summary_only",
    tags: ["bitcoin", "theory:market-bazi", "horizon:month", "regime:rebound", "source:datou-anonymized", "forward-locked"],
  },
];
