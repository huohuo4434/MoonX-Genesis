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
    headlineZh: "SPCX：实际走势提前，旧版不覆盖，新版重新校准下一阶段",
    headlineEn: "SPCX: timing moved forward; the original stays locked and V2 recalibrates what comes next",
    hookZh: "第一轮走势已经给了新信息。真正值钱的不是复述已经发生的上涨，而是下一次确认、回踩与失效条件怎么处理。",
    hookEn: "The first move already delivered new information. The useful part now is how the next confirmation, pullback and invalidation are handled — not retelling the move that already happened.",
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
    headlineZh: "太空狗：公开页只告诉你研究做到了哪一层，不再公开目标梯度答案",
    headlineEn: "ASTEROID: public view shows research depth — not the target-ladder answers",
    hookZh: "MOOX已经把逐日节奏、周结构、目标情景与失效条件拆开验证。非会员可以看到研究框架，但看不到各档目标、激活条件和关键日期。",
    hookEn: "MOOX separates daily timing, weekly structure, target scenarios and invalidation rules. Public users can see the research framework, not the scenario answers or activation windows.",
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
    headlineZh: "Google：多周期连续性很高，但真正关键的是哪一段开始出现分歧",
    headlineEn: "Google: multi-horizon structure is coherent — the edge is knowing where disagreement begins",
    hookZh: "公开层只展示研究完整度和正在跟踪的变量。具体方向、周内节奏、外部技术箱体与转折条件全部进入会员研究。",
    hookEn: "The public layer shows research depth and tracked variables only. Direction, weekly path, external technical boxes and turning conditions stay inside member research.",
    coverageZh: "连续周卦 / 月度 / 3个月 / 技术箱体",
    coverageEn: "Sequential weeks / monthly / 3-month / technical boxes",
    lockedPreviewZh: ["本周与后续周路径", "外部技术支撑压力", "9月以后分歧结构", "双框架证据链"],
    lockedPreviewEn: ["Weekly roadmap", "External technical levels", "Post-August divergence", "Dual-framework evidence"],
    accent: "blue",
    priority: 3,
  },
  {
    slug: "sandisk",
    assetType: "STOCK",
    eyebrowZh: "存储周期专题 · 多周期档案",
    eyebrowEn: "Memory-cycle dossier · multi-horizon archive",
    headlineZh: "SNDK：存储景气与价格结构同时跟踪，后程波动怎么切换比一句看多更重要",
    headlineEn: "SNDK: cycle strength matters, but the transition into late-stage volatility matters more than a simple bullish label",
    hookZh: "公开页保留产业逻辑与研究覆盖，不再展示第三段上冲、回撤窗口等可直接用于交易的结论。",
    hookEn: "The public page keeps the industry thesis and coverage, while actionable late-stage rally/pullback windows stay locked.",
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
    headlineZh: "微软：财报重估后进入高位关键区，周、月、后续月份已经拼成完整路线",
    headlineEn: "Microsoft: after the earnings re-rating, weekly and monthly readings now form a full high-level roadmap",
    hookZh: "旧版只有一个月视角，现在已补齐连续周、月度与后续风险阶段。非会员只看到‘研究已经完成’，不再直接看到哪周强、哪月危险。",
    hookEn: "The old page had only a one-month view. It now includes sequential weeks, monthly structure and later risk phases, while public users see completion status rather than the answers.",
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
    headlineZh: "长鑫：好公司与好买点不是一回事，短中期和长期逻辑已经明显分叉",
    headlineEn: "CXMT: a strong company and a good entry are not the same thing — short/medium and long-term views have diverged",
    hookZh: "上市后的极端重估改变了分析起点。MOOX保留旧预测，同时新增三段周度、月度、3个月、1年和10年版本，公开页不泄露具体下跌或修复窗口。",
    hookEn: "The post-IPO re-rating changed the starting point. MOOX preserves the original forecast and adds three weekly windows plus monthly and long-cycle versions without exposing the actionable path publicly.",
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
    headlineZh: "美光：HBM、DRAM与NAND三条线一起看，不把单一利好当成确定答案",
    headlineEn: "Micron: HBM, DRAM and NAND are tracked together rather than reducing the thesis to one catalyst",
    hookZh: "公开页保留产业逻辑；多周期卦象、技术结构和价格确认分开统计，具体方向只在会员页出现。",
    hookEn: "Public users get the industry thesis. Multi-horizon Liu Yao, technical structure and price confirmation remain separate and member-only.",
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
    headlineZh: "HYPE：真正有价值的是节奏和失效条件，而不是一句‘涨或跌’",
    headlineEn: "HYPE: timing and invalidation matter more than a one-word up/down call",
    hookZh: "平台活跃度、流动性与市场风险偏好共同决定弹性；详细方向与时间窗口仅会员展示。",
    hookEn: "Platform activity, liquidity and crypto risk appetite drive elasticity; detailed direction and timing remain member-only.",
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
    headlineZh: "BTC：两位技术博主短线看法不完全一样，但对‘先确认/消化，再看下一段’形成了交集",
    headlineEn: "BTC: two technical sources disagree on the immediate move, but converge on confirmation before the next leg",
    hookZh: "MOOX不把任何博主当成答案。8月1日锁定的多周期六爻保留不动，8月8日两组技术观点只作为会员页的独立交叉验证票。",
    hookEn: "MOOX does not treat any creator as the answer. The Aug. 1 locked Liu Yao research remains unchanged; two Aug. 8 technical views are added only as independent member cross-checks.",
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
    headlineZh: "ETH：短期、中期和长期不能用同一句话概括，MOOX按周期分别验证",
    headlineEn: "ETH: near-, medium- and long-term views are not collapsed into one call; MOOX validates them separately",
    hookZh: "公开页只保留网络与产业基础；短期方向、周期切换和长期回撤风险全部在会员档案中分层展示。",
    hookEn: "The public page keeps network fundamentals only; tactical direction, cycle transitions and long-term drawdown risk are layered inside the member dossier.",
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
    headlineZh: "腾讯：连续三周和9—12月路线已经补齐，短期风险与年底窗口分层看",
    headlineEn: "Tencent: three sequential weeks and the Sep–Dec roadmap are now complete",
    hookZh: "公开层只告诉你研究已经补到连续周卦、原始月卦和四个独立月卦；哪一周最危险、哪个月最顺、年底大卦如何约束局部强势，都留在会员专题里。",
    hookEn: "Public users can see the research depth: sequential weeks, the original monthly chart and four independent calendar months. The risk week, strongest month and year-end constraint remain member-only.",
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
    headlineZh: "金山办公：题材强不代表价格一定强，研究重点放在估值与资金兑现",
    headlineEn: "Kingsoft Office: a strong theme does not guarantee strong price action; valuation and positioning matter",
    hookZh: "非会员可以看到产业逻辑与风险项，但不会再看到未来一个月的具体方向结论。",
    hookEn: "Public users see the industry case and risk factors, while the one-month directional call stays locked.",
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
