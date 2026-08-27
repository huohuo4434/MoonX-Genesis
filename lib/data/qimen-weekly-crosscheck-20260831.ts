export type QimenWeeklyRelation = "共振" | "部分一致" | "分歧" | "未覆盖";

export type QimenWeeklyCrossCheck = {
  assetId: string;
  assetName: string;
  symbol: string;
  siteDirection: string;
  qimenDirection: string;
  relation: QimenWeeklyRelation;
  conclusion: string;
  timingNote?: string;
};

/**
 * Source-bounded review of the supplied Qimen weekly video for 2026-08-31—09-05.
 *
 * Member copy intentionally hides the analyst's identity. The source is retained
 * internally as WU-QIMEN-WEEK-20260831 and is never treated as a Liuyao chart.
 * Qimen may confirm, challenge or refine timing, but it cannot reverse the
 * locked Liuyao direction. Missing asset calls stay explicitly uncovered.
 */
export const QIMEN_WEEKLY_CROSSCHECK_20260831: readonly QimenWeeklyCrossCheck[] = [
  {
    assetId: "bitcoin",
    assetName: "比特币",
    symbol: "BTC",
    siteDirection: "上旬冲高后转弱",
    qimenDirection: "高位宽幅震荡后偏下",
    relation: "部分一致",
    conclusion: "两边都不支持追高，也都保留高位转弱路径；差别在时间，奇门把第一处下拉风险提前到9月6日至7日前后。正式方向仍由已锁定六爻阶段结论掌握。",
    timingNote: "9月6日癸未日、9月7日甲申日只作提前转弱观察窗，不是保证下跌的精确日。",
  },
  {
    assetId: "sp500",
    assetName: "标普500",
    symbol: "SPX",
    siteDirection: "震荡上涨",
    qimenDirection: "震荡偏多",
    relation: "共振",
    conclusion: "两边都允许修复，但都否定顺畅单边上涨；更适合低吸高抛和日内处理，冲高后要防被套。",
  },
  {
    assetId: "nasdaq-100",
    assetName: "纳斯达克100",
    symbol: "NDX",
    siteDirection: "先跌后涨",
    qimenDirection: "美股修复受限；半导体仅弱反弹",
    relation: "部分一致",
    conclusion: "本期没有单列纳指100，但美股与半导体背景都指向先处理压力、再看有限修复；可作为风险校准，不能冒充纳指专属奇门结论。",
  },
  {
    assetId: "sox",
    assetName: "半导体指数",
    symbol: "SOX",
    siteDirection: "本期震荡；9月7日后进入相对强势窗",
    qimenDirection: "下跌途中轻微反弹",
    relation: "分歧",
    conclusion: "8月31日至9月5日都只支持震荡或弱反弹；但对9月7日以后方向明显相反。网站保留六爻阶段方向，同时把奇门的周期见顶观点列为风险，不提前改判。",
  },
  {
    assetId: "shanghai-composite",
    assetName: "上证 / A股",
    symbol: "SHCOMP",
    siteDirection: "阶段震荡上涨",
    qimenDirection: "4000附近承压震荡",
    relation: "部分一致",
    conclusion: "两边都承认仍有上冲和政策承接，但奇门认为4000附近压力强、突破难度高；正式偏上方向保留，短线斜率和信心下调。",
  },
  {
    assetId: "hang-seng",
    assetName: "恒生科技",
    symbol: "HSTECH",
    siteDirection: "9月震荡上涨",
    qimenDirection: "反弹承压、短期难涨",
    relation: "分歧",
    conclusion: "现有六爻月度背景偏上，本期奇门偏弱。网站应并列展示，不把任何一方隐藏；在价格结构确认前以低信心震荡处理。",
  },
  {
    assetId: "gold",
    assetName: "黄金",
    symbol: "GOLD",
    siteDirection: "9月7日前高位整理偏强",
    qimenDirection: "短压后继续看多",
    relation: "共振",
    conclusion: "六爻阶段结论与本期奇门同向：短线回压不等于趋势转空，回落后仍保留修复和再试高机会。共振提高方向信心，但不生成固定买入价。",
  },
  {
    assetId: "eth",
    assetName: "以太坊 / 白银 / WTI",
    symbol: "ETH · SI · CL",
    siteDirection: "沿用各自已锁定周卦",
    qimenDirection: "本期未单列",
    relation: "未覆盖",
    conclusion: "不能把BTC结论复制给ETH，也不能把黄金结论复制给白银或原油；三类资产继续使用各自周卦与技术结构。",
  },
] as const;

export const QIMEN_WEEKLY_SOURCE_BOUNDARY_20260831 = {
  periodStart: "2026-08-31",
  periodEnd: "2026-09-05",
  reviewedAt: "2026-08-28T06:10:00+08:00",
  internalSourceId: "WU-QIMEN-WEEK-20260831",
  memberSummary: "本期奇门周盘只负责同周期复核与时间风险提示；同向提高信心，分歧并列展示，未覆盖资产不补造。",
} as const;
