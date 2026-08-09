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
    headlineZh: "SPCX：解锁后的走势比原判断更快，周、月和中期卦已经重新对齐",
    headlineEn: "SPCX: the first move arrived early; the next question is breakout continuation or failed pullback",
    hookZh: "会员页先给唯一方向，再说明周卦、月卦和更大周期为什么同向；技术区最后只负责列关键价位。",
    hookEn: "The public page shows coverage only. Members get the next-stage bias, validation levels, pullback conditions and invalidation.",
    coverageZh: "逐日 / 周度 / 月度 / 中长期 / 技术结构",
    coverageEn: "Daily / weekly / monthly / longer-term / technical structure",
    lockedPreviewZh: ["本周唯一方向", "多周期共振证据", "后续周期路线", "技术点位参考"],
    lockedPreviewEn: ["Next-stage path", "Confirmation & invalidation", "Live support/resistance", "Why V1 became V2"],
    accent: "gold",
    priority: 1,
  },
  {
    slug: "asteroid",
    assetType: "CRYPTO",
    eyebrowZh: "高波动专题 · 多情景压力测试",
    eyebrowEn: "High-volatility dossier · scenario stress test",
    headlineZh: "太空狗：波动再大也先定方向，多周期卦一致时才提高确定性",
    headlineEn: "ASTEROID: high volatility is not about guessing the top; timing, target tiers and invalidation matter",
    hookZh: "会员页先给本周唯一方向和多周期共振，再拆逐日节奏与目标情景；技术条件不参与改方向。",
    hookEn: "The public page shows research depth. Members get daily direction, target tiers, activation conditions and core turning windows.",
    coverageZh: "逐日 / 本周 / 下周 / 月度 / 目标情景",
    coverageEn: "Daily / this week / next week / monthly / scenarios",
    lockedPreviewZh: ["本周唯一方向", "周/月共振", "逐日节奏", "目标情景与点位"],
    lockedPreviewEn: ["Target scenario ladder", "Daily direction path", "Core timing windows", "Dual-framework Liu Yao"],
    accent: "rose",
    priority: 2,
  },
  {
    slug: "googl",
    assetType: "STOCK",
    eyebrowZh: "AI龙头专题 · 双框架复核",
    eyebrowEn: "AI mega-cap dossier · dual-framework review",
    headlineZh: "Google：本周与8月卦象已经同向，后续三周也按同一套规则逐段判断",
    headlineEn: "Google: four weekly windows, monthly and 3-month roadmaps are complete, with key price zones added",
    hookZh: "会员页第一行直接给看涨、看跌或不明确；随后展示周卦与月卦是否共振，技术点位最后再看。",
    hookEn: "The public page shows coverage only. Members get the directional call first, then timing, key levels and invalidation.",
    coverageZh: "连续周卦 / 月度 / 3个月 / 技术箱体",
    coverageEn: "Sequential weeks / monthly / 3-month / technical boxes",
    lockedPreviewZh: ["本周唯一方向", "周/月共振证据", "后续三周方向", "技术点位参考"],
    lockedPreviewEn: ["Clear weekly call", "Key support & resistance", "Later regime shifts", "Invalidation"],
    accent: "blue",
    priority: 3,
  },
  {
    slug: "sandisk",
    assetType: "STOCK",
    eyebrowZh: "存储周期专题 · 多周期档案",
    eyebrowEn: "Memory-cycle dossier · multi-horizon archive",
    headlineZh: "SNDK：行业景气是一回事，周卦、月卦是否同向才决定MOOX方向",
    headlineEn: "SNDK: the memory cycle is strong, but late-stage price action cannot be read from industry pricing alone",
    hookZh: "会员页把短周期和长周期分开投票；能形成共振就给唯一方向，不能形成就明确写不明确。",
    hookEn: "The public page keeps the industry thesis and coverage; members get the daily path, stage windows, levels and late-stage turns.",
    coverageZh: "逐日 / 周期窗口 / 月度 / 3个月 / 1年 / 5年",
    coverageEn: "Daily / cycle windows / monthly / 3-month / 1-year / 5-year",
    lockedPreviewZh: ["本周唯一方向", "多周期是否共振", "逐日节奏", "技术点位"],
    lockedPreviewEn: ["Daily path", "Stage windows", "Levels & confirmation", "Long-cycle view"],
    accent: "cyan",
    priority: 4,
  },
  {
    slug: "msft",
    assetType: "STOCK",
    eyebrowZh: "新增完整专题 · V2多周期复算",
    eyebrowEn: "Expanded dossier · V2 multi-horizon recalibration",
    headlineZh: "微软：财报急涨之后，本周、后两周和9—10月的方向已经分层",
    headlineEn: "Microsoft: after the earnings surge, the next three weeks and Sep–Oct risk windows are mapped",
    hookZh: "会员页先给每个周期唯一方向，再看周卦与月卦能不能共振；高位压力只作为技术点位放在最后。",
    hookEn: "The public page shows coverage only; members get the three-week rotation, month-end shift, later risk months and high-level resistance.",
    coverageZh: "周度×3 / 月度 / 3个月 / 外部技术箱体",
    coverageEn: "3 weekly windows / monthly / 3-month / external technical box",
    lockedPreviewZh: ["本周唯一方向", "三周方向路线", "9—10月方向", "技术点位参考"],
    lockedPreviewEn: ["Three-week rotation", "Month-end transition", "Later risk phase", "Technical resistance box"],
    accent: "emerald",
    priority: 5,
  },
  {
    slug: "cxmt",
    assetType: "STOCK",
    eyebrowZh: "长鑫科技 · 上市后V3复盘",
    eyebrowEn: "CXMT · post-IPO V3 review",
    headlineZh: "长鑫：短周卦与月卦并不完全一致，冲突本身就是这阶段最重要的答案",
    headlineEn: "CXMT: the long-term company thesis is strong, but the stock first has to digest its extreme post-IPO valuation",
    hookZh: "会员页不硬凑多空：周卦、月卦同向就给唯一方向；出现冲突就把冲突写明，并继续跟踪下一周期。",
    hookEn: "The public page shows the research horizon; members get separate calls for the three-week path, valuation digestion, bottoming and long cycle.",
    coverageZh: "周度×3 / 月度 / 3个月 / 1年 / 10年",
    coverageEn: "3 weekly windows / monthly / 3-month / 1-year / 10-year",
    lockedPreviewZh: ["本周唯一方向", "周/月是否冲突", "中期方向", "长期产业周期"],
    lockedPreviewEn: ["Three-week path", "Valuation digestion", "Medium-term bottoming", "Long industry cycle"],
    accent: "violet",
    priority: 6,
  },
  {
    slug: "mu",
    assetType: "STOCK",
    eyebrowZh: "AI存储核心观察",
    eyebrowEn: "Core AI-memory watch",
    headlineZh: "美光：产业逻辑只做背景，真正的方向看当前周卦与中期卦能否同向",
    headlineEn: "Micron: the AI-memory thesis remains intact, but the stock depends on HBM, DRAM and NAND staying in sync",
    hookZh: "会员页先给玄学唯一方向和共振强度，再补产业背景与技术点位，顺序不会反过来。",
    hookEn: "The public page explains the industry thesis; members get the current call, key price structure, cycle turn and method consensus.",
    coverageZh: "多周期 / 技术结构 / 存储周期",
    coverageEn: "Multi-horizon / technical / memory cycle",
    lockedPreviewZh: ["当前唯一方向", "多周期共振", "周期拐点", "技术点位"],
    lockedPreviewEn: ["Current direction", "Key price structure", "Cycle turn", "Method consensus"],
    accent: "slate",
    priority: 7,
  },
  {
    slug: "hype",
    assetType: "CRYPTO",
    eyebrowZh: "7×24高波动观察",
    eyebrowEn: "24/7 high-volatility watch",
    headlineZh: "HYPE：高波动也不回避方向，先看卦象是否一致，再谈入场位置",
    headlineEn: "HYPE: in a high-volatility asset, entry windows and invalidation matter more than a one-word call",
    hookZh: "会员页先给唯一方向；周期不一致就明确写不明确，技术只负责7×24市场里的位置选择。",
    hookEn: "The public page keeps the project and liquidity backdrop; members get near-term direction, key windows, invalidation and cycle consensus.",
    coverageZh: "7×24 / 周期 / 风险窗口",
    coverageEn: "24/7 / cycle / risk windows",
    lockedPreviewZh: ["短期唯一方向", "周期共振", "关键时间窗", "技术点位"],
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
    headlineZh: "BTC：外部技术有分歧没关系，MOOX方向只看周卦、月卦和中期卦是否同向",
    headlineEn: "BTC: short-term technical views disagree, so MOOX separates pullback-first and breakout-first paths",
    hookZh: "会员页先给8/10–16唯一方向和多周期共振，再把不同技术观点留下来只做点位参考。",
    hookEn: "The public page hides exact levels; members get the Aug 10–16 call, where the technical views disagree, confirmation zones and longer cycles.",
    coverageZh: "连续周度 / 1月 / 3月 / 1年 / 10年 / 技术观点",
    coverageEn: "Sequential weeks / 1M / 3M / 1Y / 10Y / technical views",
    lockedPreviewZh: ["8/10–16唯一方向", "多周期共振", "中长期方向", "技术点位分歧"],
    lockedPreviewEn: ["Aug 10–16 direction", "Technical disagreement", "Key confirmation zone", "Longer cycles"],
    accent: "violet",
    priority: 9.5,
  },
  {
    slug: "eth",
    assetType: "CRYPTO",
    eyebrowZh: "主流加密多周期研究",
    eyebrowEn: "Major-crypto multi-horizon research",
    headlineZh: "ETH：短线、月度和中期分别定方向，同一时间窗口只保留一个正式观点",
    headlineEn: "ETH: the short- and medium-term calls differ, so 1–3 days, one month and long term are separated",
    hookZh: "会员页按7×24周期给唯一方向；跨周期同向时提升共振等级，技术只补具体价位。",
    hookEn: "The public page keeps network fundamentals; members get the short-term call, medium-term shift, long-term risk and 24/7 validation.",
    coverageZh: "短期 / 3个月 / 1年 / 3年 / 10年",
    coverageEn: "Near-term / 3-month / 1-year / 3-year / 10-year",
    lockedPreviewZh: ["短期唯一方向", "月/季共振", "长期方向", "技术点位"],
    lockedPreviewEn: ["Near-term direction", "Medium cycle", "Long bull/bear shifts", "24/7 validation"],
    accent: "indigo",
    priority: 9,
  },
  {
    slug: "tencent",
    assetType: "STOCK",
    eyebrowZh: "新卦补全 · 连续三周 + 9–12月",
    eyebrowEn: "New charts added · 3 weeks + Sep–Dec",
    headlineZh: "腾讯：连续三周和9—12月卦已经补齐，哪里同向、哪里冲突直接给结论",
    headlineEn: "Tencent: the roadmap from the next three weeks through year-end is now complete",
    hookZh: "会员页逐周期给唯一方向；周卦、月卦冲突就明确写冲突，不再用技术突破替玄学补方向。",
    hookEn: "The public page shows research depth; members get three-week regime shifts, Sep–Dec monthly direction, macro constraints and invalidation.",
    coverageZh: "连续三周 / 原月卦 / 9–12月 / 恒科比较",
    coverageEn: "3 weeks / original monthly / Sep–Dec / HSTECH comparison",
    lockedPreviewZh: ["本周唯一方向", "三周方向", "9–12月逐月方向", "多周期共振"],
    lockedPreviewEn: ["3-week regime shifts", "Sep–Dec monthly path", "Macro constraint", "Confirmation & invalidation"],
    accent: "cyan",
    priority: 10,
  },
  {
    slug: "kingsoft-office",
    assetType: "STOCK",
    eyebrowZh: "国产软件估值观察",
    eyebrowEn: "Domestic-software valuation watch",
    headlineZh: "金山办公：题材和估值都只是背景，正式方向仍由周期卦象来定",
    headlineEn: "Kingsoft Office: the theme is strong, but returns depend on valuation and whether capital keeps paying up",
    hookZh: "会员页先给月度唯一方向与六爻依据；技术与估值只作为位置和背景，不拥有方向否决权。",
    hookEn: "The public page shows the industry case and risks; members get the monthly call, triggers, Liu Yao structure and re-rating conditions.",
    coverageZh: "月度 / 估值 / 资金 / 六爻",
    coverageEn: "Monthly / valuation / positioning / Liu Yao",
    lockedPreviewZh: ["月度唯一方向", "六爻依据", "共振强度", "技术点位"],
    lockedPreviewEn: ["Monthly direction", "Risk trigger", "Liu Yao structure", "Re-rating conditions"],
    accent: "rose",
    priority: 11,
  },
];

export const WATCHLIST_TEASER_BY_SLUG = Object.fromEntries(
  WATCHLIST_TEASERS.map((item) => [item.slug, item])
) as Record<string, WatchlistTeaser>;
