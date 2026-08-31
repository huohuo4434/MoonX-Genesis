export type MemberSourceCrossCheckRow = {
  asset: string;
  relation: "一致" | "部分一致" | "需要修正节奏";
  official: string;
  review: string;
  action: string;
};

export const MEMBER_SOURCE_CROSS_CHECK_20260901 = {
  receivedAt: "2026-09-01",
  title: "9月1日研究层复核",
  boundary: "只校准收到资料后的剩余窗口；不改已锁定周方向，不回填8月31日与9月1日，也不单独触发自动交易。",
  methodNote: "方法升级：高周期先定背景，具体事件单独判断；六爻负责方向与路径，奇门只校准时机，宏观和技术负责确认、延迟、减仓与失效。增加变量不能变成增加事后借口。",
  rows: [
    {
      asset: "黄金",
      relation: "需要修正节奏",
      official: "正式周方向仍为震荡 / 待确认，不改成单边看空。",
      review: "9月2日提高下行释放与波动放大警戒；9月3—4日观察阶段低位和止跌，不预设立即V形反转。",
      action: "撤销“到日期就转强”的理解；先看闭合K线、减速和承接，再判断修复。",
    },
    {
      asset: "白银",
      relation: "一致",
      official: "先涨后跌，9月2日前后进入后段压力。",
      review: "新资料同样把9月2日前后视为由强转弱窗口，9月4日前后观察风险释放。",
      action: "提高转弱节奏信心，但急跌后不追空，关键日允许前后一个交易时段误差。",
    },
    {
      asset: "纳指",
      relation: "一致",
      official: "本周先跌后涨，前段承压、中后段等待修复。",
      review: "外部复核也认为短线估值与利率承压，中期科技逻辑未被一次回落破坏。",
      action: "保留先压后修复；收益率降温、指数止跌和相对强弱回升后才确认修复。",
    },
    {
      asset: "半导体",
      relation: "部分一致",
      official: "板块分化，部分标的9月2日后有转强候选。",
      review: "短线资金流和高估值压力仍在，AI需求逻辑未坏，但不能按日历自动转多。",
      action: "把“转强日”改读为“确认窗口”：必须出现板块止跌、连续收盘与结构抬高。",
    },
    {
      asset: "特斯拉",
      relation: "部分一致",
      official: "保留9月初转强候选，后段仍有压力观察。",
      review: "单日上涨可能来自大型科技轮动，不能据此认定新趋势。",
      action: "需要回踩承接和第二个交易日确认；单日冲高回吐则候选失效。",
    },
    {
      asset: "亚马逊",
      relation: "一致",
      official: "现有月度背景偏弱，缺少独立周卦，不补造周方向。",
      review: "广告竞价诉讼增加利润率与商业模式风险，但案件仍处早期。",
      action: "提高监管风险提示，不把一条新闻直接变成周度做空信号。",
    },
  ] satisfies MemberSourceCrossCheckRow[],
} as const;
