import type { QimenWeeklyCrossCheck } from "@/lib/data/qimen-weekly-crosscheck-20260831";

/**
 * Source-bounded review of the supplied Qimen weekly video for 2026-09-07—09-12.
 *
 * Member copy intentionally hides the analyst's identity. Qimen only confirms
 * or refines timing; it never rewrites the locked Liuyao direction or creates
 * direct trading authority.
 */
export const QIMEN_WEEKLY_CROSSCHECK_20260907: readonly QimenWeeklyCrossCheck[] = [
  {
    assetId: "us-equities",
    assetName: "美股 / 大型科技",
    symbol: "SPX · NDX",
    siteDirection: "标普先涨后跌；纳指下跌；大型科技整体偏空",
    qimenDirection: "短线情绪偏上，但流动性受限；科技仓适合逢高兑现",
    relation: "部分一致",
    conclusion: "两边都不支持把反弹直接解释为新一轮主升。奇门允许短线拉升，网站则保留标普见高转弱、纳指偏弱的已锁定路径；若上涨，只提高减仓观察优先级，不翻转正式方向。",
    timingNote: "9月7—12日只按短线反弹处理；9月14—20日进入逢高减仓观察，9月21日前复核科技仓风险。",
  },
  {
    assetId: "sox",
    assetName: "半导体指数",
    symbol: "SOX · SOXL",
    siteDirection: "9月7—13日半导体板块强共振偏多",
    qimenDirection: "大概率高波动上扬，但不支持延伸成长线看多",
    relation: "共振",
    conclusion: "同周期方向一致，因此提高9月7—12日半导体修复与上扬的观察信心；但这只是短线窗口，不把一次利好拉升升级为整月无条件看多。",
    timingNote: "9月7—12日为上扬观察窗；9月14—20日转入逢高减仓观察，9月21日前完成风险复核。没有顶部结构时不按日期机械清仓。",
  },
  {
    assetId: "gold",
    assetName: "黄金",
    symbol: "GOLD",
    siteDirection: "9月7—13日先涨后跌",
    qimenDirection: "4100—4300震荡或弱反弹，短线难回前高；中长期仍偏多",
    relation: "部分一致",
    conclusion: "两边都允许前段修复，但都不支持追逐强突破。网站继续保留先涨后跌路径；奇门只加强短线反弹有限、回落后仍需观察中线承接的节奏。",
  },
  {
    assetId: "bitcoin",
    assetName: "比特币",
    symbol: "BTC",
    siteDirection: "9月7—13日先涨后跌",
    qimenDirection: "可能小幅上冲或维持宽幅震荡，短线未必跌得动",
    relation: "部分一致",
    conclusion: "前段上冲方向一致，但奇门没有确认本周一定完成后段下跌。正式先涨后跌路径不变；若冲高后没有转弱结构，就继续观察，不凭未申日标签提前做空。",
    timingNote: "未日、申日风险尚未锁定到具体一周；只记为后续风险窗，不制造精确下跌日。",
  },
  {
    assetId: "uncovered",
    assetName: "ETH / 白银 / 原油",
    symbol: "ETH · SI · CL",
    siteDirection: "沿用各自已锁定周期记录",
    qimenDirection: "本期未单列",
    relation: "未覆盖",
    conclusion: "不能把BTC结论复制给ETH，也不能把黄金结论复制给白银或原油；三类资产继续使用各自锁定周期与技术结构。",
  },
] as const;

export const QIMEN_WEEKLY_SOURCE_BOUNDARY_20260907 = {
  periodStart: "2026-09-07",
  periodEnd: "2026-09-12",
  sourceRecordedAt: "2026-09-03T11:00:00+08:00",
  reviewedAt: "2026-09-03T19:00:00+08:00",
  internalSourceId: "WU-QIMEN-WEEK-20260907",
  memberSummary: "本期奇门周盘只复核同周期方向与退出节奏：同向提高短线信心，分歧并列展示；不改已锁定六爻方向，不直接触发交易。",
} as const;
