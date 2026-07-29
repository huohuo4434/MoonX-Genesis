/**
 * Seeded Conviction List assets. Admin overrides (market cap, contract, etc.)
 * merge on top via moonx-data storage when available.
 */
import type { ConvictionAsset } from "@/types/conviction-asset";

export const CONVICTION_ASSETS_MAX = 5;

export const CONVICTION_ASSET_SEED: ConvictionAsset[] = [
  {
    id: "cxmt",
    slug: "cxmt",
    assetType: "STOCK",
    nameZh: "长鑫科技",
    nameEn: "Changxin Memory Technologies",
    symbol: "688825",
    exchange: "上海证券交易所科创板",
    network: null,
    contractAddress: null,
    contractPendingAdminConfirm: false,
    status: "published",
    riskLevel: "高",
    rating: "A+",
    tags: ["DRAM", "DDR5", "LPDDR5", "AI Memory", "国产替代", "科创板新股"],
    summaryZh:
      "长鑫科技是一家一体化存储器制造企业，专注于动态随机存取存储芯片DRAM的设计、研发、生产和销售，产品覆盖DDR和LPDDR系列，并应用于服务器、移动设备、个人电脑、智能汽车等市场。",
    summaryEn:
      "Changxin Memory is an integrated memory manufacturer focused on DRAM design, R&D, production, and sales across DDR and LPDDR families for servers, mobile, PCs, and smart vehicles.",
    thesisZh: [
      "中国通用DRAM产业的重要企业。",
      "AI服务器和数据中心发展可能扩大高性能存储需求。",
      "DDR5、LPDDR5等产品具有长期升级需求。",
      "国产存储替代具有长期产业逻辑。",
      "新股上市初期具有较高关注度和较大波动性。",
    ],
    thesisEn: [
      "A key player in China’s commodity DRAM industry.",
      "AI servers and data centers may expand high-performance memory demand.",
      "DDR5 / LPDDR5 upgrades support a multi-year product cycle.",
      "Domestic substitution remains a long-term structural theme.",
      "Early post-IPO phase brings elevated attention and volatility.",
    ],
    catalystsZh: [
      "AI服务器需求",
      "DDR5产品放量",
      "服务器存储需求",
      "产能与技术升级",
      "国产替代进程",
      "财报与经营数据",
    ],
    catalystsEn: [
      "AI server demand",
      "DDR5 volume ramp",
      "Server memory demand",
      "Capacity and process upgrades",
      "Domestic substitution progress",
      "Earnings and operating data",
    ],
    risksZh: [
      "上市初期波动风险",
      "估值较高风险",
      "存储周期下行风险",
      "行业竞争风险",
      "技术迭代风险",
      "扩产及盈利兑现风险",
    ],
    risksEn: [
      "Elevated post-IPO volatility",
      "Rich valuation risk",
      "Memory downcycle risk",
      "Industry competition",
      "Technology iteration risk",
      "Capacity expansion and earnings delivery risk",
    ],
    marketCap: null,
    marketCapCurrency: "CNY",
    marketCapUpdatedAt: null,
    researchUpdatedAt: "2026-07-28",
    displayOrder: 1,
    isPublished: true,
    memberForecastStockId: "688825",
  },
  {
    id: "asteroid",
    slug: "asteroid",
    assetType: "CRYPTO",
    nameZh: "太空狗",
    nameEn: "Asteroid",
    aliasZh: "太空狗",
    aliases: ["Asteroid", "太空狗", "火箭狗", "asteroid", "ASTEROID"],
    symbol: "ASTEROID",
    exchange: null,
    network: null,
    contractAddress: "0xf280b16ef293d8e534e370794ef26bf312694126",
    contractPendingAdminConfirm: false,
    status: "published",
    riskLevel: "极高",
    rating: "A-",
    tags: ["Micro Cap", "Community", "High Volatility", "Crypto", "Long-term Watch"],
    summaryZh:
      "Asteroid属于小市值、高波动加密资产。其价格表现可能高度依赖社区发展、市场流动性、交易渠道和整体加密市场风险偏好。MOOX将其作为高风险长期观察资产，而不是低风险核心资产。",
    summaryEn:
      "Asteroid is a micro-cap, high-volatility crypto asset. Outcomes may depend heavily on community, liquidity, venues, and crypto risk appetite. MOOX tracks it as a high-risk long-term watch — not a low-risk core holding.",
    thesisZh: [
      "市值较小，价格弹性可能较高。",
      "社区发展和流动性改善可能形成估值催化。",
      "新交易平台、新合作或生态功能可能扩大市场关注。",
      "已进入MOOX长期跟踪和验证名单。",
      "适合高风险观察，不适合作为低风险核心持仓。",
    ],
    thesisEn: [
      "Smaller market cap may imply higher price elasticity.",
      "Community growth and liquidity improvement can catalyze re-rating.",
      "New venues, partnerships, or product features may expand attention.",
      "Already on the MOOX long-term tracking and verification list.",
      "Suitable for high-risk observation — not a low-risk core holding.",
    ],
    catalystsZh: [
      "社区增长",
      "交易量增长",
      "流动性改善",
      "新增交易平台",
      "生态功能",
      "项目路线图",
      "加密市场风险偏好",
    ],
    catalystsEn: [
      "Community growth",
      "Volume growth",
      "Liquidity improvement",
      "New trading venues",
      "Product features",
      "Roadmap delivery",
      "Crypto risk-on regime",
    ],
    risksZh: [
      "极高波动",
      "流动性不足",
      "小市值操纵风险",
      "项目执行风险",
      "合约安全风险",
      "交易平台下架风险",
      "本金大幅损失风险",
    ],
    risksEn: [
      "Extreme volatility",
      "Thin liquidity",
      "Micro-cap manipulation risk",
      "Execution risk",
      "Contract security risk",
      "Venue delisting risk",
      "Risk of large capital loss",
    ],
    marketCap: 26_180_000,
    marketCapCurrency: "USD",
    marketCapUpdatedAt: "2026-07-28T12:00:00+08:00",
    researchUpdatedAt: "2026-07-29",
    displayOrder: 2,
    isPublished: true,
    memberForecastStockId: null,
  },
];

if (CONVICTION_ASSET_SEED.length > CONVICTION_ASSETS_MAX) {
  throw new Error(`Conviction list hard cap is ${CONVICTION_ASSETS_MAX}`);
}

export const CONVICTION_MEMBER_LOCKS = [
  { key: "today", labelZh: "今日分析", labelEn: "Today analysis" },
  { key: "tomorrow", labelZh: "下一交易日", labelEn: "Next session" },
  { key: "weekly", labelZh: "本周路径", labelEn: "Weekly path" },
  { key: "mid", labelZh: "中长期研究", labelEn: "Medium/long-term research" },
  { key: "levels", labelZh: "关键价位", labelEn: "Key levels" },
  { key: "history", labelZh: "完整验证", labelEn: "Full verification" },
] as const;
