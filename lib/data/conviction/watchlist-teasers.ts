import type { ConvictionAssetType } from "@/types/conviction-asset";

export type WatchlistTeaser = {
  slug: string;
  assetType: ConvictionAssetType;
  nameZh?: string;
  nameEn?: string;
  symbol?: string;
  detailHref?: string;
  rating?: string;
  riskZh?: string;
  eyebrowZh: string;
  eyebrowEn: string;
  headlineZh: string;
  headlineEn: string;
  hookZh: string;
  hookEn: string;
  coverageZh: string;
  coverageEn: string;
  lockedPreviewZh: [string, string, string, string];
  lockedPreviewEn: [string, string, string, string];
  accent: "gold" | "rose" | "blue" | "cyan" | "emerald" | "violet" | "indigo" | "slate";
  priority: number;
};

/**
 * Public conversion layer only.
 * IMPORTANT: this file must never contain member directions, exact key dates,
 * support/resistance levels, target ladders, or full Liu Yao conclusions.
 */
export const WATCHLIST_TEASERS: WatchlistTeaser[] = [
  {
    slug: "spcx",
    assetType: "STOCK",
    nameZh: "SPCX",
    nameEn: "SPCX",
    symbol: "SPCX",
    detailHref: "/markets/watchlist/spcx",
    rating: "A",
    riskZh: "高",
    eyebrowZh: "解锁后复算 · V2",
    eyebrowEn: "Post-unlock recalibration · V2",
    headlineZh: "SPCX：第一波提前兑现，下一步看二次突破还是回踩失效",
    headlineEn: "SPCX: the first move arrived early; the next question is breakout continuation or failed pullback",
    hookZh: "公开页只保留研究范围。会员页直接给下一阶段方向、关键验证位、回踩条件和失效条件。",
    hookEn: "The public page shows coverage only. Members get the next-stage bias, validation levels, pullback conditions and invalidation.",
    coverageZh: "逐日 / 周度 / 月度 / 中长期 / 技术结构",
    coverageEn: "Daily / weekly / monthly / longer-term / technical structure",
    lockedPreviewZh: ["下一阶段主路径", "关键确认与失效条件", "实时支撑压力", "V1 → V2 修订理由"],
    lockedPreviewEn: ["Next-stage path", "Confirmation & invalidation", "Live support/resistance", "Why V1 became V2"],
    accent: "gold",
    priority: 1,
  },
  {
    slug: "asteroid",
    assetType: "CRYPTO",
    eyebrowZh: "高波动专题 · 多情景压力测试",
    eyebrowEn: "High-volatility dossier · scenario stress test",
    headlineZh: "太空狗：高波动不靠猜顶，真正要看逐日节奏、目标梯度和失效条件",
    headlineEn: "ASTEROID: high volatility is not about guessing the top; timing, target tiers and invalidation matter",
    hookZh: "公开页展示研究深度；会员页直接给逐日方向、各档目标、激活条件和核心转折窗口。",
    hookEn: "The public page shows research depth. Members get daily direction, target tiers, activation conditions and core turning windows.",
    coverageZh: "逐日 / 本周 / 下周 / 月度 / 目标情景",
    coverageEn: "Daily / this week / next week / monthly / scenarios",
    lockedPreviewZh: ["目标情景梯度", "逐日方向路径", "核心转折窗口", "双框架六爻证据"],
    lockedPreviewEn: ["Target scenario ladder", "Daily direction path", "Core timing windows", "Dual-framework Liu Yao"],
    accent: "rose",
    priority: 2,
  },
  {
    slug: "googl",
    assetType: "STOCK",
    eyebrowZh: "AI龙头专题 · 双框架复核",
    eyebrowEn: "AI mega-cap dossier · dual-framework review",
    headlineZh: "Google：连续四周、月度和3个月路线已经拆完，关键价格区间也已纳入验证",
    headlineEn: "Google: four weekly windows, monthly and 3-month roadmaps are complete, with key price zones added",
    hookZh: "公开页只展示研究覆盖。会员页先给明确方向，再给周内节奏、关键支撑压力和看错时的失效条件。",
    hookEn: "The public page shows coverage only. Members get the directional call first, then timing, key levels and invalidation.",
    coverageZh: "连续周卦 / 月度 / 3个月 / 技术箱体",
    coverageEn: "Sequential weeks / monthly / 3-month / technical boxes",
    lockedPreviewZh: ["本周明确方向", "关键支撑与压力", "后续周强弱切换", "看错后的失效条件"],
    lockedPreviewEn: ["Clear weekly call", "Key support & resistance", "Later regime shifts", "Invalidation"],
    accent: "blue",
    priority: 3,
  },
  {
    slug: "sandisk",
    assetType: "STOCK",
    eyebrowZh: "存储周期专题 · 多周期档案",
    eyebrowEn: "Memory-cycle dossier · multi-horizon archive",
    headlineZh: "SNDK：存储景气还在，但股价后半程怎么走不能只看行业涨价",
    headlineEn: "SNDK: the memory cycle is strong, but late-stage price action cannot be read from industry pricing alone",
    hookZh: "公开页保留产业逻辑和研究范围；会员页直接给逐日路径、阶段窗口、支撑压力和后程转折。",
    hookEn: "The public page keeps the industry thesis and coverage; members get the daily path, stage windows, levels and late-stage turns.",
    coverageZh: "逐日 / 周期窗口 / 月度 / 3个月 / 1年 / 5年",
    coverageEn: "Daily / cycle windows / monthly / 3-month / 1-year / 5-year",
    lockedPreviewZh: ["逐日路径", "阶段窗口", "支撑压力与确认条件", "长期存储周期判断"],
    lockedPreviewEn: ["Daily path", "Stage windows", "Levels & confirmation", "Long-cycle view"],
    accent: "cyan",
    priority: 4,
  },
  {
    slug: "msft",
    assetType: "STOCK",
    eyebrowZh: "新增完整专题 · V2多周期复算",
    eyebrowEn: "Expanded dossier · V2 multi-horizon recalibration",
    headlineZh: "微软：财报急涨后进入高位区，后面三周和9—10月风险已经拆开",
    headlineEn: "Microsoft: after the earnings surge, the next three weeks and Sep–Oct risk windows are mapped",
    hookZh: "公开页只展示研究覆盖；会员页直接给三周强弱切换、月末变化、后续风险月和高位压力区。",
    hookEn: "The public page shows coverage only; members get the three-week rotation, month-end shift, later risk months and high-level resistance.",
    coverageZh: "周度×3 / 月度 / 3个月 / 外部技术箱体",
    coverageEn: "3 weekly windows / monthly / 3-month / external technical box",
    lockedPreviewZh: ["三周强弱切换", "月末结构变化", "后续风险阶段", "技术压力箱体"],
    lockedPreviewEn: ["Three-week rotation", "Month-end transition", "Later risk phase", "Technical resistance box"],
    accent: "emerald",
    priority: 5,
  },
  {
    slug: "cxmt",
    assetType: "STOCK",
    eyebrowZh: "长鑫科技 · 上市后V3复盘",
    eyebrowEn: "CXMT · post-IPO V3 review",
    headlineZh: "长鑫：公司长期逻辑强，但股价短期要先消化上市后的极端估值",
    headlineEn: "CXMT: the long-term company thesis is strong, but the stock first has to digest its extreme post-IPO valuation",
    hookZh: "公开页只展示研究跨度；会员页把三周节奏、月度估值消化、中期筑底和长期产业周期分开给结论。",
    hookEn: "The public page shows the research horizon; members get separate calls for the three-week path, valuation digestion, bottoming and long cycle.",
    coverageZh: "周度×3 / 月度 / 3个月 / 1年 / 10年",
    coverageEn: "3 weekly windows / monthly / 3-month / 1-year / 10-year",
    lockedPreviewZh: ["三周节奏拆分", "估值消化路径", "中期筑底条件", "长期产业周期"],
    lockedPreviewEn: ["Three-week path", "Valuation digestion", "Medium-term bottoming", "Long industry cycle"],
    accent: "violet",
    priority: 6,
  },
  {
    slug: "mu",
    assetType: "STOCK",
    eyebrowZh: "AI存储核心观察",
    eyebrowEn: "Core AI-memory watch",
    headlineZh: "美光：AI存储逻辑没变，但股价要看HBM、DRAM、NAND能不能继续共振",
    headlineEn: "Micron: the AI-memory thesis remains intact, but the stock depends on HBM, DRAM and NAND staying in sync",
    hookZh: "公开页讲产业逻辑；会员页直接给当前方向、关键价格结构、周期拐点和方法共识。",
    hookEn: "The public page explains the industry thesis; members get the current call, key price structure, cycle turn and method consensus.",
    coverageZh: "多周期 / 技术结构 / 存储周期",
    coverageEn: "Multi-horizon / technical / memory cycle",
    lockedPreviewZh: ["当前方向", "关键价格结构", "周期拐点", "方法共识"],
    lockedPreviewEn: ["Current direction", "Key price structure", "Cycle turn", "Method consensus"],
    accent: "slate",
    priority: 7,
  },
  {
    slug: "hype",
    assetType: "CRYPTO",
    eyebrowZh: "7×24高波动观察",
    eyebrowEn: "24/7 high-volatility watch",
    headlineZh: "HYPE：高波动资产最怕只看方向，启动窗口和失效窗口更重要",
    headlineEn: "HYPE: in a high-volatility asset, entry windows and invalidation matter more than a one-word call",
    hookZh: "公开页保留项目和流动性背景；会员页直接给短期方向、关键窗口、失效条件和周期共识。",
    hookEn: "The public page keeps the project and liquidity backdrop; members get near-term direction, key windows, invalidation and cycle consensus.",
    coverageZh: "7×24 / 周期 / 风险窗口",
    coverageEn: "24/7 / cycle / risk windows",
    lockedPreviewZh: ["短期方向", "关键窗口", "失效条件", "周期共识"],
    lockedPreviewEn: ["Near-term direction", "Key windows", "Invalidation", "Cycle consensus"],
    accent: "indigo",
    priority: 8,
  },
  {
    slug: "btc",
    assetType: "CRYPTO",
    nameZh: "比特币",
    nameEn: "Bitcoin",
    symbol: "BTC",
    rating: "A+",
    riskZh: "高",
    eyebrowZh: "核心加密专题 · 外部技术交叉验证",
    eyebrowEn: "Core crypto dossier · external technical cross-check",
    headlineZh: "BTC：短线技术意见有分歧，MOOX把‘先回踩’和‘直接突破’两条路拆开验证",
    headlineEn: "BTC: short-term technical views disagree, so MOOX separates pullback-first and breakout-first paths",
    hookZh: "公开页不泄露具体价位；会员页直接给8/10–16方向、两套技术观点的分歧点、确认区和中长期周期。",
    hookEn: "The public page hides exact levels; members get the Aug 10–16 call, where the technical views disagree, confirmation zones and longer cycles.",
    coverageZh: "连续周度 / 1月 / 3月 / 1年 / 10年 / 技术观点",
    coverageEn: "Sequential weeks / 1M / 3M / 1Y / 10Y / technical views",
    lockedPreviewZh: ["8/10–16正式方向", "外部技术分歧", "关键确认区", "中长期周期"],
    lockedPreviewEn: ["Aug 10–16 direction", "Technical disagreement", "Key confirmation zone", "Longer cycles"],
    accent: "violet",
    priority: 9.5,
  },
  {
    slug: "eth",
    assetType: "CRYPTO",
    eyebrowZh: "主流加密多周期研究",
    eyebrowEn: "Major-crypto multi-horizon research",
    headlineZh: "ETH：短线和中期不是同一个方向，必须按1–3天、1个月和长期分开看",
    headlineEn: "ETH: the short- and medium-term calls differ, so 1–3 days, one month and long term are separated",
    hookZh: "公开页保留网络和产业基础；会员页直接给短线方向、中期切换、长期风险和7×24验证。",
    hookEn: "The public page keeps network fundamentals; members get the short-term call, medium-term shift, long-term risk and 24/7 validation.",
    coverageZh: "短期 / 3个月 / 1年 / 3年 / 10年",
    coverageEn: "Near-term / 3-month / 1-year / 3-year / 10-year",
    lockedPreviewZh: ["短期方向", "中期周期", "长期牛熊切换", "7×24验证"],
    lockedPreviewEn: ["Near-term direction", "Medium cycle", "Long bull/bear shifts", "24/7 validation"],
    accent: "indigo",
    priority: 9,
  },
  {
    slug: "tencent",
    assetType: "STOCK",
    eyebrowZh: "新卦补全 · 连续三周 + 9–12月",
    eyebrowEn: "New charts added · 3 weeks + Sep–Dec",
    headlineZh: "腾讯：连续三周到年底的路线已经补齐，短线拐点和9—12月强弱分开看",
    headlineEn: "Tencent: the roadmap from the next three weeks through year-end is now complete",
    hookZh: "公开页只展示研究跨度；会员页直接给三周强弱切换、9—12月逐月方向、大周期约束和失效条件。",
    hookEn: "The public page shows research depth; members get three-week regime shifts, Sep–Dec monthly direction, macro constraints and invalidation.",
    coverageZh: "连续三周 / 原月卦 / 9–12月 / 恒科比较",
    coverageEn: "3 weeks / original monthly / Sep–Dec / HSTECH comparison",
    lockedPreviewZh: ["三周强弱切换", "9–12月逐月路线", "大周期约束", "确认与失效条件"],
    lockedPreviewEn: ["3-week regime shifts", "Sep–Dec monthly path", "Macro constraint", "Confirmation & invalidation"],
    accent: "cyan",
    priority: 10,
  },
  {
    slug: "kingsoft-office",
    assetType: "STOCK",
    eyebrowZh: "国产软件估值观察",
    eyebrowEn: "Domestic-software valuation watch",
    headlineZh: "金山办公：题材够强，但真正决定收益的是估值和资金能不能继续兑现",
    headlineEn: "Kingsoft Office: the theme is strong, but returns depend on valuation and whether capital keeps paying up",
    hookZh: "公开页展示产业逻辑和风险；会员页直接给月度方向、风险触发、六爻结构和重新评估条件。",
    hookEn: "The public page shows the industry case and risks; members get the monthly call, triggers, Liu Yao structure and re-rating conditions.",
    coverageZh: "月度 / 估值 / 资金 / 六爻",
    coverageEn: "Monthly / valuation / positioning / Liu Yao",
    lockedPreviewZh: ["月度方向", "风险触发", "六爻结构", "重新评估条件"],
    lockedPreviewEn: ["Monthly direction", "Risk trigger", "Liu Yao structure", "Re-rating conditions"],
    accent: "rose",
    priority: 11,
  },
];

export const WATCHLIST_TEASER_BY_SLUG = Object.fromEntries(
  WATCHLIST_TEASERS.map((item) => [item.slug, item])
) as Record<string, WatchlistTeaser>;
