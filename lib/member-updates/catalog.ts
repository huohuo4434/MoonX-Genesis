export type MemberUpdateRoute = {
  oldEntry: string;
  newEntry: string;
  href: string;
  note: string;
};

export type MemberUpdateNote = {
  english?: { title: string; summary: string; highlights: readonly string[] };
  version: string;
  releasedAt: string;
  title: string;
  summary: string;
  highlights: readonly string[];
  routeChanges: readonly MemberUpdateRoute[];
  preserved: readonly string[];
};

export const MEMBER_UPDATE_NOTES: readonly MemberUpdateNote[] = [
  {
    version: "2026.09.12-navigation",
    releasedAt: "2026-09-12",
    title: "操作台集中看计划，原栏目从顶部直达",
    summary: "会员首页集中展示单个标的的长中短线与K线。原来的预测、视频和随笔仍有入口；不用再翻到页底找研究档案。",
    english: {
      title: "A focused desk, with your existing content within reach",
      summary: "Use the desk for one asset and three horizons. Forecasts, videos and notes are linked at the top, not hidden below the chart.",
      highlights: ["Six visible content shortcuts.", "Expand all tools for monthly, annual, Gann and review pages.", "A short guide explains waiting plans and illustrative candles."],
    },
    highlights: ["首页分清免费体验、会员操作台和原栏目入口。", "会员顶部直接进入日报、周报、重点关注、关键日、随笔和视频。", "展开全部栏目，找月度、年度、江恩、复盘、AI执行和会员服务。", "计划仍在完善：显示等待或点位不全时，不作为入场依据。"],
    routeChanges: [
      { oldEntry: "分散的长中短线与K线", newEntry: "会员操作台", href: "/member", note: "先选标的，再看周期；有效计划完整时展示点位。" },
      { oldEntry: "页底研究档案", newEntry: "顶部内容目录", href: "/member#member-guide", note: "六个常用入口直接展示，其余栏目点开目录即可找到。" },
      { oldEntry: "会员视频、个人见解", newEntry: "会员视频／易老师随笔", href: "/member/videos", note: "视频与随笔保留各自页面，顶部均有入口。" },
    ],
    preserved: ["本次导航调整不删除预测页面、视频或随笔。", "不修改会员期限、历史预测和复盘记录。", "不改变自动交易开关、策略、仓位或风控。"],
  },
  {
    version: "V7.21.0",
    releasedAt: "2026-08-30",
    english: {
      title: "Member navigation, next-week sectors and key dates",
      summary: "Six starting points bring forecasts, watchlists, reviews and services together. Existing pages and bookmarks still work.",
      highlights: [
        "Start with today, forecasts, focus assets, trading, reviews or services.",
        "Sector research includes this week and next week, with links to key dates.",
        "Key dates remain grouped by month and week, with individual assets and observation windows.",
        "Member services links to the video library; two videos were listed at this release.",
      ],
    },
    title: "会员频道导航、下周板块与关键日升级",
    summary: "本次改版把分散功能收进六个决策入口，同时补回关键日、会员视频和下周板块预报。原有页面没有删除，旧收藏和深层链接仍可继续使用。",
    highlights: [
      "会员首页改为六个决策入口，按“今日、周期、关注、交易、复盘、服务”顺序阅读。",
      "板块共振同时展示本周结论与下周预报，并恢复本周、下周关键日入口。",
      "关键日雷达继续按月关键日、周关键日展示具体日期、标的、抄底或逃顶动作。",
      "会员服务恢复会员视频总入口，视频库登记两期内容，可在同一页面切换。",
    ],
    routeChanges: [
      { oldEntry: "今日、明日、关键日", newEntry: "今日决策", href: "/member/daily", note: "关键日仍可从今日决策或顶部导航直接进入。" },
      { oldEntry: "年度、月度、周度预测", newEntry: "周期预测", href: "/member/weekly-report", note: "年度、月度和周度原页面全部保留。" },
      { oldEntry: "板块、股票、加密、早期雷达", newEntry: "重点关注", href: "/member/sector-resonance", note: "先看板块，再进入单个股票或加密标的。" },
      { oldEntry: "缠论、策略、多源K线", newEntry: "AI交易", href: "/member/ai-trading", note: "方向、位置、执行和风险状态集中查看。" },
      { oldEntry: "周复盘、公开验证、辅助观点", newEntry: "复盘验证", href: "/member/weekly-review", note: "周预测仍是主要复盘与准确度口径。" },
      { oldEntry: "会员卜卦、视频、账户设备", newEntry: "会员服务", href: "/member/consultations", note: "视频库与账户设备保留独立入口。" },
    ],
    preserved: [
      "原有会员页面和深层链接没有删除，旧收藏可以继续打开。",
      "已经锁定的预测、复盘记录和历史版本没有因页面改版被改写。",
      "本次只调整展示与入口，不改变AI交易权限、实盘开关和硬风控。",
    ],
  },
] as const;

export const LATEST_MEMBER_UPDATE = MEMBER_UPDATE_NOTES[0]!;

export const MEMBER_UPDATE_POLICY = [
  "会员入口或页面结构发生明显变化",
  "预测展示口径或重点模块发生明显变化",
  "AI交易、会员权益或内容服务发生明显变化",
] as const;
