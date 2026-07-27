import { MultiHorizonSummary } from "@/components/home/MultiHorizonSummary";
import { toAssetForecastSummary } from "@/lib/data/home-forecast-layers";
import { getResearchRecord } from "@/lib/data/research-records";
import { toAssetIntelligenceSnapshot } from "@/lib/moonx/adapters";
import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";

const HOME_ASSET_IDS = ["bitcoin", "nasdaq-100", "shanghai-composite", "hang-seng", "gold"] as const;

/** Multi-horizon block — kept after weekly strip; separate from dated daily forecasts. */
export async function HomeMultiHorizonSection() {
  const [doc, btcAnnual, cryptoRisk, usEquityAnnual] = await Promise.all([
    loadMoonXResearchAsync(),
    getResearchRecord("ORACLE-0009"),
    getResearchRecord("MX-CRYPTO-RISK-2026-ANNUAL-001"),
    getResearchRecord("MX-US-EQUITY-2026-ANNUAL-001"),
  ]);
  const nextObservationByAsset: Record<string, string> = {
    gold: "2026-07-29",
  };

  const assets = HOME_ASSET_IDS.map((id) => {
    const raw = doc.assets.find((asset) => asset.id === id);
    if (!raw) return null;
    const summary = toAssetForecastSummary(toAssetIntelligenceSnapshot(raw));
    const nextObservation = nextObservationByAsset[id];
    return nextObservation ? { ...summary, nextObservation } : summary;
  }).filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));

  return (
    <MultiHorizonSummary
      assets={assets}
      bitcoinAnnualOutlook={
        btcAnnual
          ? {
              titleZhCN: "2026全年展望",
              titleEn: "2026 annual outlook",
              summaryZhCN: btcAnnual.summary.zhCN,
              summaryEn: btcAnnual.summary.en,
              noteZhCN: "年度观点与短期预测分开展示，互不覆盖。置信度74%为编辑权重，非正式统计准确率。",
              noteEn:
                "Annual outlook is shown separately from the short-term forecast. 74% is editorial weight, not a statistical hit rate.",
            }
          : undefined
      }
      bitcoinAnnualRiskNote={
        cryptoRisk
          ? {
              titleZhCN: "年度风险提示",
              titleEn: "Annual risk note",
              summaryZhCN: "年度风险：黑客、平台资金及信任事件风险较高，但系统性崩溃不是基准情景。",
              summaryEn:
                "Annual risk: elevated hack / platform-funding / trust-event risk, but systemic collapse is not the base case.",
              noteZhCN: "风险性质研究，不是BTC涨跌方向；不得覆盖 ORACLE-0009 价格展望。",
              noteEn: "Risk-character research — not a BTC price direction; does not override ORACLE-0009.",
            }
          : undefined
      }
      usEquityAnnualOutlook={
        usEquityAnnual
          ? {
              titleZhCN: "2026美股年度路径",
              titleEn: "2026 US equity annual path",
              summaryZhCN: usEquityAnnual.summary.zhCN,
              summaryEn: usEquityAnnual.summary.en,
              noteZhCN: "年度卦仅作多周期参考；首页短线仍由短周期研究决定。立秋后略微看跌。",
              noteEn:
                "Annual path is multi-horizon context only; homepage short-term stays on short-cycle research. Slightly bearish after Start of Autumn.",
            }
          : undefined
      }
    />
  );
}
