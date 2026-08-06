export type ExpectationTemperature = "LOW" | "BALANCED" | "HIGH" | "EXTREME";

export interface ExpectationSnapshot {
  expectationScore: number;
  expectationTemperature: ExpectationTemperature;
  gapScore: number;
  deliveryDifficulty: 1 | 2 | 3 | 4 | 5;
  thesisZh: string;
  thesisEn: string;
  watchZh: string;
  watchEn: string;
  updatedAt: string;
}

const UPDATED_AT = "2026-08-06";

const SNAPSHOTS: Record<string, ExpectationSnapshot> = {
  cxmt: {
    expectationScore: 48,
    expectationTemperature: "BALANCED",
    gapScore: 62,
    deliveryDifficulty: 2,
    thesisZh: "公开市场定价仍未充分覆盖国产DRAM、DDR5放量与AI服务器需求。",
    thesisEn: "Public-market pricing has not fully reflected domestic DRAM, DDR5 ramp and AI-server demand.",
    watchZh: "产能兑现、产品良率与上市后估值。",
    watchEn: "Capacity delivery, product yield and post-listing valuation.",
    updatedAt: UPDATED_AT,
  },
  asteroid: {
    expectationScore: 82,
    expectationTemperature: "EXTREME",
    gapScore: -38,
    deliveryDifficulty: 5,
    thesisZh: "社区热度已计入较多乐观预期，后续更依赖新增流动性而非基本面。",
    thesisEn: "Community momentum already embeds substantial optimism; further upside relies on new liquidity.",
    watchZh: "成交量、持币集中度与社区扩散速度。",
    watchEn: "Volume, holder concentration and community diffusion.",
    updatedAt: UPDATED_AT,
  },
  mu: {
    expectationScore: 74,
    expectationTemperature: "HIGH",
    gapScore: 24,
    deliveryDifficulty: 4,
    thesisZh: "AI存储需求仍强，但市场已要求价格、毛利率和指引持续超预期。",
    thesisEn: "AI-memory demand remains strong, but price, margin and guidance now need repeated upside surprises.",
    watchZh: "HBM、DRAM价格、数据中心收入与下一季指引。",
    watchEn: "HBM, DRAM pricing, data-center revenue and next-quarter guidance.",
    updatedAt: UPDATED_AT,
  },
  hype: {
    expectationScore: 78,
    expectationTemperature: "HIGH",
    gapScore: -18,
    deliveryDifficulty: 5,
    thesisZh: "平台增长与代币叙事已被广泛交易，增量需要真实手续费和生态扩张。",
    thesisEn: "Platform growth and token narrative are widely priced; new upside needs real fees and ecosystem expansion.",
    watchZh: "交易量、手续费、解锁与链上活跃度。",
    watchEn: "Trading volume, fees, unlocks and on-chain activity.",
    updatedAt: UPDATED_AT,
  },
  googl: {
    expectationScore: 68,
    expectationTemperature: "HIGH",
    gapScore: 18,
    deliveryDifficulty: 4,
    thesisZh: "AI投入已获得认可，下一阶段要验证Cloud利润、Gemini商业化与资本开支回报。",
    thesisEn: "AI investment is recognized; the next phase must validate Cloud profit, Gemini monetization and capex returns.",
    watchZh: "Cloud利润率、AI收入、搜索份额与CapEx。",
    watchEn: "Cloud margin, AI revenue, search share and capex.",
    updatedAt: UPDATED_AT,
  },
  msft: {
    expectationScore: 76,
    expectationTemperature: "HIGH",
    gapScore: 9,
    deliveryDifficulty: 5,
    thesisZh: "市场已充分交易Azure与Copilot增长，供给能力和投入回报决定下一段估值。",
    thesisEn: "Azure and Copilot growth are heavily priced; capacity and returns on investment drive the next valuation leg.",
    watchZh: "Azure增速、Copilot采用率、GPU供给与CapEx。",
    watchEn: "Azure growth, Copilot adoption, GPU supply and capex.",
    updatedAt: UPDATED_AT,
  },
  tencent: {
    expectationScore: 55,
    expectationTemperature: "BALANCED",
    gapScore: 27,
    deliveryDifficulty: 3,
    thesisZh: "广告、游戏和云业务提供现金流，AI商业化仍有进一步验证空间。",
    thesisEn: "Ads, games and cloud support cash flow while AI monetization still has room to prove itself.",
    watchZh: "广告增速、游戏流水、云利润与AI产品采用。",
    watchEn: "Ad growth, game bookings, cloud profit and AI adoption.",
    updatedAt: UPDATED_AT,
  },
  "kingsoft-office": {
    expectationScore: 70,
    expectationTemperature: "HIGH",
    gapScore: -6,
    deliveryDifficulty: 4,
    thesisZh: "国产软件与AI办公叙事较强，收入转化需要跟上估值扩张。",
    thesisEn: "Domestic software and AI-office narratives are strong; revenue conversion must catch up with valuation.",
    watchZh: "订阅增长、AI付费率、政企订单与利润率。",
    watchEn: "Subscription growth, AI paid conversion, enterprise orders and margin.",
    updatedAt: UPDATED_AT,
  },
  eth: {
    expectationScore: 61,
    expectationTemperature: "BALANCED",
    gapScore: 19,
    deliveryDifficulty: 3,
    thesisZh: "ETF、质押和链上金融构成中期支撑，但需要真实资金流与活跃度确认。",
    thesisEn: "ETF, staking and on-chain finance support the medium term, but flows and activity must confirm it.",
    watchZh: "ETF净流入、质押比例、L2活跃度与Gas收入。",
    watchEn: "ETF net flows, staking ratio, L2 activity and gas revenue.",
    updatedAt: UPDATED_AT,
  },
};

const DEFAULT_SNAPSHOT: ExpectationSnapshot = {
  expectationScore: 50,
  expectationTemperature: "BALANCED",
  gapScore: 0,
  deliveryDifficulty: 3,
  thesisZh: "当前预期与公开信息大致平衡，等待新的价格或基本面催化。",
  thesisEn: "Current expectations broadly match public information; a new price or fundamental catalyst is needed.",
  watchZh: "价格结构、成交量与下一项核心催化。",
  watchEn: "Price structure, volume and the next material catalyst.",
  updatedAt: UPDATED_AT,
};

export function getExpectationSnapshot(slug: string): ExpectationSnapshot {
  return SNAPSHOTS[slug] ?? DEFAULT_SNAPSHOT;
}

export function expectationTemperatureLabel(
  temperature: ExpectationTemperature,
  english: boolean
): string {
  const labels: Record<ExpectationTemperature, [string, string]> = {
    LOW: ["预期偏低", "Low expectations"],
    BALANCED: ["预期均衡", "Balanced"],
    HIGH: ["预期较高", "High expectations"],
    EXTREME: ["预期极高", "Extreme expectations"],
  };
  return labels[temperature][english ? 1 : 0];
}
