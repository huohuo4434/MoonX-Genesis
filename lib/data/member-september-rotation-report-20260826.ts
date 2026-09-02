export type SeptemberRotationAsset = {
  symbol: "SOXL" | "BTC" | "ETH" | "GOLD";
  nameZh: string;
  nameEn: string;
  directionZh: string;
  directionEn: string;
  tone: "positive" | "neutral" | "negative";
  windowZh: string;
  windowEn: string;
  conclusionZh: string;
  conclusionEn: string;
  confirmationZh: string;
  confirmationEn: string;
  invalidationZh: string;
  invalidationEn: string;
};

export type SeptemberRotationPhase = {
  periodZh: string;
  periodEn: string;
  soxlZh: string;
  soxlEn: string;
  btcZh: string;
  btcEn: string;
  ethZh: string;
  ethEn: string;
  goldZh: string;
  goldEn: string;
};

const MEMBER_SEPTEMBER_ROTATION_REPORT_20260826_V2 = {
  version: "SEP_ROTATION_REPORT_20260826_V2",
  publishedAt: "2026-08-26T11:30:00+08:00",
  titleZh: "9月最终结论：半导体转强，加密资产上旬冲高后转弱",
  titleEn: "September Final View: Semiconductors Strengthen as Crypto Fades After an Early Push",
  conclusionZh:
    "9月不把ETH定义为整月看涨。BTC与ETH都按“上旬仍可修复或冲高、9月7日至13日进入转弱窗、中下旬偏弱”处理；半导体9月7日后相对强弱占优，黄金由高位转为温和回调，但这不是“AI涨、加密与黄金必然跌”。",
  conclusionEn:
    "ETH is not classified as bullish for the whole month. BTC and ETH can still repair or push higher early, enter a turn-risk window from Sep 7-13, and trade softer later in September. Semiconductors can gain relative strength after Sep 7, while gold shifts from elevated levels into a mild pullback.",
  resonanceZh:
    "六爻三条跨资产路径可以拼成同一轮动图；现有奇门资料只覆盖8月24日至29日，提示半导体高风险震荡、黄金小回调、BTC高波动分化。方向存在部分呼应，但时间跨度不一致，因此标记为“跨周期部分共振”，不是满级同周期共振。",
  resonanceEn:
    "The three Liu Yao paths form a coherent cross-asset map. Existing Qimen evidence covers only Aug 24-29 and flags high-risk semiconductor chop, a small gold pullback and extreme BTC dispersion. This is partial cross-horizon alignment, not full same-window resonance.",
  inferenceZh:
    "“资金回归AI”是跨资产推演，不是卦中直接写出的因果。更稳妥的解释是相对收益预期、风险偏好和拥挤度发生轮动；若流动性整体扩张，半导体、黄金和BTC也可能短期同涨。",
  inferenceEn:
    "Capital returning to AI is a cross-asset inference, not a direct statement from the readings. The safer mechanism is rotation in expected returns, risk appetite and crowding. If system-wide liquidity expands, semiconductors, gold and BTC can still rise together temporarily.",
  assets: [
    {
      symbol: "SOXL",
      nameZh: "半导体",
      nameEn: "Semiconductors",
      directionZh: "相对转强",
      directionEn: "Relative strength",
      tone: "positive",
      windowZh: "9月7日至10月7日",
      windowEn: "Sep 7-Oct 7",
      conclusionZh: "9月中下旬至10月初是两个月高位候选区；10月7日后高振幅风险上升。",
      conclusionEn: "Mid/late September into early October is the candidate high zone; high-volatility risk rises after Oct 7.",
      confirmationZh: "9月7日后相对NDX、BTC、黄金走强，回踩后仍保持高低点抬升。",
      confirmationEn: "Outperforms NDX, BTC and gold after Sep 7 while keeping higher highs and lows after pullbacks.",
      invalidationZh: "9月7日后仍持续跑输宽基科技指数，且关键结构下破后无修复。",
      invalidationEn: "Continues to underperform broad tech after Sep 7 and fails to repair after a structural break.",
    },
    {
      symbol: "BTC",
      nameZh: "比特币",
      nameEn: "Bitcoin",
      directionZh: "先涨后跌",
      directionEn: "Rise, then fade",
      tone: "neutral",
      windowZh: "9月9日至11日重点观察",
      windowEn: "Watch Sep 9-11",
      conclusionZh: "9月10日前趋势仍可向上，但8万至8.5万美元是明显兑现区；随后更容易转入退守。",
      conclusionEn: "The trend can remain upward into Sep 10, but USD 80k-85k is a clear realization zone; defense becomes more likely afterward.",
      confirmationZh: "上冲时量价承接衰减，9月9日至11日出现冲高受阻或跌回启动区。",
      confirmationEn: "Demand fades during the push and Sep 9-11 produces an upside stall or a return into the launch zone.",
      invalidationZh: "9月10日前有效突破并持续站稳8.5万美元，回踩后仍有新增承接。",
      invalidationEn: "Breaks and holds above USD 85k before Sep 10 with fresh demand on retests.",
    },
    {
      symbol: "ETH",
      nameZh: "以太坊",
      nameEn: "Ether",
      directionZh: "先涨后跌",
      directionEn: "Rise, then fade",
      tone: "negative",
      windowZh: "9月7日至13日转弱风险最高",
      windowEn: "Highest turn risk Sep 7-13",
      conclusionZh: "月初先弱后修复；9月9日至11日前后防冲高受阻，中下旬高波动偏弱，月底仅看有限修复。",
      conclusionEn: "Early weakness can give way to a repair, but watch for an upside stall around Sep 9-11. Mid/late September is volatile and softer, with only a limited recovery near month-end.",
      confirmationZh: "上旬修复后冲高承接衰减，并在9月9日至11日后跌回启动区或转为低高点。",
      confirmationEn: "Demand fades after the early repair and price returns to the launch zone or forms lower highs after Sep 9-11.",
      invalidationZh: "9月7日至13日持续放量上行，回踩不破且高低点继续抬升。",
      invalidationEn: "Sustained high-volume advance from Sep 7-13 with retests holding and higher highs/lows continuing.",
    },
    {
      symbol: "GOLD",
      nameZh: "黄金",
      nameEn: "Gold",
      directionZh: "前强后缓降",
      directionEn: "Early strength, then mild fade",
      tone: "negative",
      windowZh: "9月7日至10月7日温和回调",
      windowEn: "Mild pullback Sep 7-Oct 7",
      conclusionZh: "9月7日前仍有高位或试高空间；之后偏慢回调，10月7日后保留小反弹。",
      conclusionEn: "Gold can remain elevated or probe higher before Sep 7, then pull back gradually, with a small rebound possible after Oct 7.",
      confirmationZh: "9月7日前保持高位，随后重心缓慢下移但没有失控破位。",
      confirmationEn: "Stays elevated before Sep 7, then drifts lower without a disorderly breakdown.",
      invalidationZh: "9月7日后持续创高并维持强趋势，或直接出现远超“温和回调”的失控下跌。",
      invalidationEn: "Keeps making sustained highs after Sep 7, or suffers a disorderly decline far beyond a mild pullback.",
    },
  ] satisfies SeptemberRotationAsset[],
  phases: [
    {
      periodZh: "8月25日—9月6日",
      periodEn: "Aug 25-Sep 6",
      soxlZh: "震荡蓄势",
      soxlEn: "Range / base",
      btcZh: "继续试高",
      btcEn: "Keeps probing higher",
      ethZh: "先弱后修复",
      ethEn: "Weak first, then repairs",
      goldZh: "高位或再试高",
      goldEn: "Elevated / another high probe",
    },
    {
      periodZh: "9月7日—9月14日",
      periodEn: "Sep 7-14",
      soxlZh: "相对转强",
      soxlEn: "Relative strength begins",
      btcZh: "上冲受限，9—11日观察变盘",
      btcEn: "Capped push; watch Sep 9-11",
      ethZh: "冲高后退守，9—11日重点观察",
      ethEn: "Push then retreat; watch Sep 9-11",
      goldZh: "由强转入缓慢回调",
      goldEn: "Strength shifts to a mild pullback",
    },
    {
      periodZh: "9月15日—10月6日",
      periodEn: "Sep 15-Oct 6",
      soxlZh: "强势 / 阶段高位候选",
      soxlEn: "Strong / candidate high zone",
      btcZh: "退守与高波动，等待新证据",
      btcEn: "Defensive / volatile; await new evidence",
      ethZh: "高波动偏弱",
      ethEn: "Volatile / softer",
      goldZh: "温和回调延续",
      goldEn: "Mild pullback continues",
    },
    {
      periodZh: "10月7日以后",
      periodEn: "After Oct 7",
      soxlZh: "高振幅，先保护利润",
      soxlEn: "High volatility; protect gains",
      btcZh: "本条资料不延伸判断",
      btcEn: "Not covered by this evidence",
      ethZh: "月底有限修复后等新卦",
      ethEn: "Limited late repair; await new reading",
      goldZh: "小幅反弹候选",
      goldEn: "Small-rebound candidate",
    },
  ] satisfies SeptemberRotationPhase[],
  executionZh: [
    "月初允许BTC、ETH修复或冲高，但只在回踩承接确认后参与；已有多单在9月7日至13日转弱窗优先保护利润，9日至11日重点看冲高能否站稳。",
    "半导体只在9月7日后出现相对强势并回踩守住时跟随，不提前抢跑；SOXL是三倍杠杆产品，必须控制单笔风险。",
    "BTC若站稳8.5万美元、ETH若在9月7日至13日持续放量且回踩不破，就暂停“冲高转弱”方案；黄金按温和回调看，不按崩跌做。",
  ],
  executionEn: [
    "BTC and ETH may repair or push higher early in the month, but participation still requires supported retests. Existing longs should prioritize profit protection in the Sep 7-13 turn window, with Sep 9-11 focused on whether breakouts can hold.",
    "Follow semiconductors only after relative strength appears after Sep 7 and survives a retest. SOXL is a 3x product, so cap risk per trade.",
    "Pause the crypto fade plan if BTC holds above USD 85k or ETH sustains high-volume gains and holds retests from Sep 7-13. Treat gold as a mild pullback, not a crash call.",
  ],
} as const;

const MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V3 = {
  ...MEMBER_SEPTEMBER_ROTATION_REPORT_20260826_V2,
  version: "SEP_ROTATION_REPORT_20260902_V3",
  publishedAt: "2026-09-02T14:05:00+08:00",
  revisionOf: MEMBER_SEPTEMBER_ROTATION_REPORT_20260826_V2.version,
  revisionReason: "新增9月奇门时间证据，只提高同向路径的研究信心；不改正式方向、概率、点位或交易权限。",
  confidenceCalibration: {
    receivedAt: "2026-09-02T14:04:00+08:00",
    sourceRef: "https://www.youtube.com/post/UgkxzhF29nHfMmQjDOD7_zIZScoRCDgJ5km_",
    sourceState: "EDITED_POST" as const,
    publicLabelZh: "新增奇门时间证据",
    publicLabelEn: "New Qimen timing evidence",
    metricZh: "方法共振指数，不是胜率",
    metricEn: "Method-consensus index, not a win rate",
    items: [
      {
        id: "BTC-SEPTEMBER-PATH",
        scopeZh: "BTC 9月先涨后跌",
        scopeEn: "BTC September rise-then-fade path",
        index: 4,
        max: 5,
        delta: 1,
        labelZh: "高",
        labelEn: "High",
        reasonZh: "新增时间证据同样指向9月上旬仍有冲高空间、下旬至10月初转弱；与现有9月9—11日第一转折窗和月度先涨后跌路径一致。",
        reasonEn: "The new timing evidence also allows an early-September push before weakness into late September and early October, aligning with the existing Sep 9-11 first-turn window and rise-then-fade monthly path.",
      },
      {
        id: "TECH-SEPTEMBER-ROTATION",
        scopeZh: "科技／半导体先强后防高点",
        scopeEn: "Technology / semiconductors strengthen before a later high-risk window",
        index: 4,
        max: 5,
        delta: 1,
        labelZh: "高",
        labelEn: "High",
        reasonZh: "新增时间证据把科技股的逢高保护窗口放在9月中下旬，与现有9月7日后相对转强、随后进入阶段高位候选区的路径一致。",
        reasonEn: "The new timing evidence places the technology profit-protection window in mid/late September, aligning with the existing post-Sep 7 relative-strength phase followed by a candidate high zone.",
      },
    ],
    unchangedZh: "农业与原油目前只加入观察清单，不提高正式信心；本次校准不修改已锁定预测，也不产生自动交易权限。",
    unchangedEn: "Agriculture and oil remain watch-list themes only. This calibration does not change locked forecasts or create automated-trading authority.",
  },
} as const;

const MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V4 = {
  ...MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V3,
  version: "SEP_ROTATION_REPORT_20260902_V4",
  publishedAt: "2026-09-02T18:10:00+08:00",
  revisionOf: MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V3.version,
  revisionReason: "新增9月2日完整六爻主判与奇门辅助资料；只发布新版本，不改写V2/V3历史。",
  primaryUpdate: {
    publicLabelZh: "核心六爻主判更新 · 第一优先级",
    publicLabelEn: "Core Liu Yao update · primary authority",
    summaryZh: "完整六爻负责本轮主判；奇门只给有明确问题、时间窗与最终答案的内容做辅助加权。不同周期不能互相代替。",
    summaryEn: "Complete Liu Yao readings own the primary call. Qimen is an auxiliary weight only when the question, window and final answer are explicit. Evidence from different horizons is not interchangeable.",
    items: [
      {
        id: "STAR50-202609",
        scopeZh: "科创50 · 9月1日至10月1日",
        scopeEn: "STAR 50 · Sep 1-Oct 1",
        authority: "PRIMARY" as const,
        confidenceZh: "中高",
        confidenceEn: "Medium-high",
        conclusionZh: "9月7日前偏低，9月7日后缓慢走高；财爻不旺，涨幅和后劲可能有限。",
        conclusionEn: "Softer before Sep 7, then a gradual rise; weak wealth lines imply limited magnitude and follow-through.",
        boundaryZh: "这是科创50本身的月度主判，可支持科技方向，但不能直接替代SNDK、MU或SOXL的个股与杠杆产品预测。",
        boundaryEn: "This is a monthly STAR 50 call. It supports the technology path but does not replace asset-specific SNDK, MU or SOXL forecasts.",
      },
      {
        id: "FED-202609",
        scopeZh: "美联储 · 9月议息",
        scopeEn: "Federal Reserve · September decision",
        authority: "PRIMARY" as const,
        confidenceZh: "中高",
        confidenceEn: "Medium-high",
        conclusionZh: "9月加息概率不高；鹰派压力仍在，10月是否进入更强紧缩窗口继续观察。",
        conclusionEn: "A September hike is unlikely. Hawkish pressure remains, while a stronger October tightening window still needs confirmation.",
        boundaryZh: "宏观结论只调整事件风险与仓位节奏，不直接翻转任何标的的锁定方向。",
        boundaryEn: "This macro conclusion adjusts event risk and sizing only; it cannot reverse any locked asset direction.",
      },
      {
        id: "WTI-202609-THREE-MONTH",
        scopeZh: "国际油价 · 未来三个月",
        scopeEn: "Crude oil · next three months",
        authority: "PRIMARY" as const,
        confidenceZh: "中",
        confidenceEn: "Medium",
        conclusionZh: "9月可能缓慢上行；10月7日至11月上旬是三个月高位候选区，11月7日后更偏向逐步回落。",
        conclusionEn: "Oil may grind higher in September. Oct 7 into early November is the candidate three-month high zone, followed by a gradual fade after Nov 7.",
        boundaryZh: "仅展示本期核心六爻结论；不恢复原油日预测、周预测或历史验证统计。",
        boundaryEn: "This displays the current core Liu Yao conclusion only. Daily, weekly and historical-verification coverage for oil remains retired.",
      },
      {
        id: "BTC-2027-150K",
        scopeZh: "BTC · 2027年高点能否突破15万美元",
        scopeEn: "BTC · can the 2027 high exceed USD 150k?",
        authority: "PRIMARY" as const,
        confidenceZh: "中高",
        confidenceEn: "Medium-high",
        conclusionZh: "2027年高点可能高于2026年，但本卦不支持突破15万美元；它只回答15万美元门槛，不给出精确最高价。",
        conclusionEn: "The 2027 high may exceed 2026, but this reading does not support a break above USD 150k. It answers the threshold question, not the exact high.",
        boundaryZh: "这是2027年长周期结论，不提高或降低2026年9月短线方向的信心。",
        boundaryEn: "This is a 2027 long-horizon conclusion and does not change confidence in the September 2026 short-term path.",
      },
      {
        id: "SPCX-20260915-QIMEN",
        scopeZh: "SPCX · 截止9月15日",
        scopeEn: "SPCX · through Sep 15",
        authority: "AUXILIARY" as const,
        confidenceZh: "低—中",
        confidenceEn: "Low-medium",
        conclusionZh: "奇门直播最终倾向跌破135美元的概率不高；9月7日至15日向上动能偏强，口头关注148、153、158附近，冲高后再防回落。",
        conclusionEn: "The live Qimen reading ultimately leaned against a break below USD 135. Upside energy looked stronger from Sep 7-15, with verbal watch levels near 148, 153 and 158 before a possible fade.",
        boundaryZh: "推演中多次出现不确定与重问，141、139/137等低点答案反复；因此只作待验证辅助，不生成正式点位或交易权限。",
        boundaryEn: "The reading included repeated uncertainty and changing low candidates around 141 and 139/137. It remains provisional support only and creates no formal level or trading authority.",
      },
    ],
    methodLearningZh: [
      "奇门金融问盘必须限定一个标的、一个时间窗和一个阈值；一卦多问或连续重问要主动降权。",
      "八字、紫微与占星的同向结论可以互相复核，但若共用同一出生资料，不能冒充三个独立票源。",
      "出生时辰未校正时，只保留对时辰不敏感的长期结构；具体事件年份和结果必须降级表达。",
      "命盘描述的是结构倾向，现实选择、行为与事件证据仍需单独核验。",
    ],
    methodLearningEn: [
      "A financial Qimen query must bind one asset, one time window and one threshold; multi-question or repeatedly re-asked charts are downweighted.",
      "Bazi, Zi Wei and astrology may cross-check one another, but shared birth data cannot be counted as three independent votes.",
      "Without a calibrated birth time, keep only time-insensitive long-cycle structure and downgrade event-year or outcome claims.",
      "A chart describes structural tendencies; real choices, conduct and event evidence still require independent verification.",
    ],
  },
  confidenceCalibration: {
    ...MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V3.confidenceCalibration,
    items: MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V3.confidenceCalibration.items.map((item) =>
      item.id === "TECH-SEPTEMBER-ROTATION"
        ? {
            ...item,
            index: 5,
            delta: 2,
            labelZh: "很高",
            labelEn: "Very high",
            reasonZh: "新增科创50完整月度六爻同样指向9月7日前偏低、9月7日后转强；与现有半导体路径同向，因此共振指数升至5/5，但财爻不旺提示涨幅与后劲仍可能有限。",
            reasonEn: "A new complete STAR 50 monthly Liu Yao reading also points to softness before Sep 7 and strength afterward. This lifts the technology consensus index to 5/5, while weak wealth lines still warn that magnitude and follow-through may be limited.",
          }
        : item,
    ),
    unchangedZh: "BTC 2027、原油三个月与9月美联储属于不同对象或周期，不改变BTC 9月信心；SPCX奇门只作待验证辅助。本次更新不修改已锁定预测、不改写历史，也不产生自动交易权限。",
    unchangedEn: "BTC 2027, three-month oil and the September Fed decision cover different assets or horizons and do not change September BTC confidence. SPCX Qimen remains provisional support only. No locked history or automated-trading authority changes.",
  },
} as const;

export const MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 = {
  ...MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V4,
  version: "SEP_ROTATION_REPORT_20260902_V5",
  publishedAt: "2026-09-02T18:45:00+08:00",
  revisionOf: MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V4.version,
  revisionReason: "新增9月8日至10月8日完整奇门月度复核；同向内容加权、冲突内容降权，只发布V5并保留V2—V4历史。",
  qimenMonthlyUpdate: {
    publicLabelZh: "9月8日至10月8日奇门复核",
    publicLabelEn: "Qimen cross-check · Sep 8-Oct 8",
    summaryZh: "新增月盘把9月21日以后列为风险抬升段，9月27日前后为地缘与全球股市波动中心候选。它只调整时间和研究信心，不覆盖完整六爻主判。",
    summaryEn: "The new monthly chart raises risk after Sep 21, with Sep 27 as a candidate center for geopolitical and global-equity volatility. It adjusts timing and research confidence only and cannot override the complete Liu Yao call.",
    riskWindow: {
      start: "2026-09-21",
      end: "2026-09-29",
      focusDate: "2026-09-27",
      actionZh: "保护利润 / 不追高",
      actionEn: "Protect gains / avoid chasing",
      noteZh: "上中旬若受政策或议息消息推动冲高，21日后转入防守；27日前后只视为风险中心候选，不是机械做空日。",
      noteEn: "If policy or rate headlines lift markets in early/mid September, turn defensive after Sep 21. Sep 27 is a candidate risk center, not an automatic short date.",
    },
    items: [
      {
        id: "GLOBAL-RISK-20260927",
        scopeZh: "全球风险 · 9月21日以后",
        scopeEn: "Global risk · after Sep 21",
        relationship: "ALIGNED" as const,
        relationshipZh: "同向",
        relationshipEn: "Aligned",
        conclusionZh: "上半月相对好做，下半月流动性与地缘风险抬升；9月27日前后是波动中心候选。",
        conclusionEn: "The first half is comparatively tradable, while liquidity and geopolitical risk rise later; Sep 27 is a candidate volatility center.",
        usageZh: "增强现有中下旬保护利润和月底高波动预案，不新增交易方向。",
        usageEn: "Strengthens the existing late-month profit-protection and volatility plan without adding a new direction.",
      },
      {
        id: "BTC-20260908-1008-QIMEN",
        scopeZh: "BTC · 9月8日至10月8日",
        scopeEn: "BTC · Sep 8-Oct 8",
        relationship: "PARTIAL" as const,
        relationshipZh: "部分一致",
        relationshipEn: "Partially aligned",
        conclusionZh: "月底至10月初防双向插针与多空双杀；低点可观察，但更完整的买入与反转机会偏向10月至11月。",
        conclusionEn: "Watch for two-sided wicks and liquidation into late September and early October. A low may be observed, but the fuller buy/reversal window leans toward October-November.",
        usageZh: "与中下旬偏弱、月底有限修复大体同向，但不支持把9月27日写成确定底部，因此BTC维持4/5。",
        usageEn: "Broadly aligns with late-month softness and a limited repair, but does not prove Sep 27 is the bottom; BTC remains 4/5.",
      },
      {
        id: "TECH-20260908-1008-QIMEN",
        scopeZh: "科技／半导体 · 9月8日至10月8日",
        scopeEn: "Technology / semiconductors · Sep 8-Oct 8",
        relationship: "CONFLICTED" as const,
        relationshipZh: "存在冲突",
        relationshipEn: "Conflicted",
        conclusionZh: "SOX指数内部明显分化，多数成分上行受限；更偏向少数超跌、苹果链或华为链机会，上中旬冲高后要保护利润。",
        conclusionEn: "SOX is internally divided and most constituents face capped upside. Opportunities lean toward selected oversold, Apple-chain or Huawei-chain names, with profit protection after early/mid-month rallies.",
        usageZh: "不翻转科创50与半导体完整六爻主判，但把科技共振从5/5下调到4/5，强调选股而非板块普涨。",
        usageEn: "Does not reverse the complete STAR 50/semiconductor Liu Yao call, but lowers technology consensus from 5/5 to 4/5 and favors selection over a broad rally.",
      },
      {
        id: "GOLD-20260908-1008-QIMEN",
        scopeZh: "黄金 · 9月8日至10月8日",
        scopeEn: "Gold · Sep 8-Oct 8",
        relationship: "ALIGNED" as const,
        relationshipZh: "同向",
        relationshipEn: "Aligned",
        conclusionZh: "短线仍有减仓空间，随后可能回到4000—4100附近；4100—4300只作中长线观察区，不是正式保证点位。",
        conclusionEn: "Short-term de-risking remains reasonable before a possible return toward 4,000-4,100. The 4,100-4,300 area is a longer-horizon watch zone, not a guaranteed formal level.",
        usageZh: "与9月7日后温和回调同向，黄金方法共振提高到4/5，但跌幅仍由K线确认。",
        usageEn: "Aligns with the mild pullback after Sep 7 and lifts gold method consensus to 4/5, while price action must confirm magnitude.",
      },
      {
        id: "WTI-20260908-1008-QIMEN",
        scopeZh: "原油 · 9月8日至10月8日",
        scopeEn: "Crude oil · Sep 8-Oct 8",
        relationship: "ALIGNED" as const,
        relationshipZh: "同向",
        relationshipEn: "Aligned",
        conclusionZh: "运输受阻与地缘摩擦可能放大油价上行动能，与现有9月缓慢上行、10月高位候选路径一致。",
        conclusionEn: "Transport disruption and geopolitical friction may amplify oil upside, aligning with the existing September grind-up and October candidate-high path.",
        usageZh: "专项研究共振提高到4/5；仍不恢复原油日预测、周预测、历史验证或自动交易。",
        usageEn: "Special-research consensus rises to 4/5. Oil daily/weekly forecasts, verification and automated trading remain retired.",
      },
    ],
  },
  confidenceCalibration: {
    ...MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V4.confidenceCalibration,
    sourceState: "FULL_TRANSCRIPT_AND_VISIBLE_CHART" as const,
    publicLabelZh: "最新奇门权重校准",
    publicLabelEn: "Latest Qimen weight calibration",
    items: [
      ...MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V4.confidenceCalibration.items.map((item) =>
        item.id === "TECH-SEPTEMBER-ROTATION"
          ? {
              ...item,
              index: 4,
              delta: 1,
              labelZh: "高",
              labelEn: "High",
              reasonZh: "完整六爻仍支持9月7日后科技相对转强，但新奇门月盘认为SOX多数成分上行受限、板块分化，因此从V4的5/5降至4/5；只降低信心，不翻转方向。",
              reasonEn: "Complete Liu Yao still supports post-Sep 7 relative technology strength, but the new monthly Qimen chart sees capped SOX breadth and internal divergence. Consensus falls from 5/5 to 4/5 without reversing direction.",
            }
          : item.id === "BTC-SEPTEMBER-PATH"
            ? {
                ...item,
                reasonZh: "新月盘同样提示月底至10月初高波动和快速下杀风险，但又保留资金关注与低点机会；与现有先涨后跌路径部分一致，维持4/5而不继续加权。",
                reasonEn: "The new monthly chart also flags late-September/early-October volatility and fast downside risk, while retaining attention and a possible low. It partially aligns with the rise-then-fade path, so BTC stays 4/5.",
              }
            : item,
      ),
      {
        id: "GOLD-SEPTEMBER-PATH",
        scopeZh: "黄金9月前强后回调",
        scopeEn: "Gold September strength then pullback",
        index: 4,
        max: 5,
        delta: 1,
        labelZh: "高",
        labelEn: "High",
        reasonZh: "奇门月盘明确给出短线减仓与随后回落观察，与现有9月7日后温和回调路径同向；口头价格区只作观察，不升格为正式点位。",
        reasonEn: "The monthly Qimen chart explicitly supports short-term de-risking and a later pullback, aligning with the existing mild fade after Sep 7. Verbal price zones remain watch levels only.",
      },
      {
        id: "WTI-SPECIAL-PATH",
        scopeZh: "原油专项上行路径",
        scopeEn: "Crude oil special upside path",
        index: 4,
        max: 5,
        delta: 1,
        labelZh: "高",
        labelEn: "High",
        reasonZh: "运输受阻与地缘风险的奇门解释，与现有9月缓慢上行、10月高位候选专项六爻同向；仅提高专项研究信心。",
        reasonEn: "Qimen transport and geopolitical risk aligns with the existing September grind-up and October candidate-high Liu Yao path, raising special-research confidence only.",
      },
    ],
    unchangedZh: "完整六爻继续拥有正式方向；奇门只调整时机与研究信心，不修改已锁定预测。A股、恒生科技、标普和原油不恢复日/周预测或历史验证，本次更新不产生自动交易权限。",
    unchangedEn: "Complete Liu Yao retains formal direction; Qimen adjusts timing and research confidence only and does not modify locked forecasts. A-shares, Hang Seng Tech, the S&P 500 and oil remain retired from daily/weekly forecasts and historical verification. No automated-trading authority is created.",
  },
} as const;

export const MEMBER_SEPTEMBER_ROTATION_REPORT_HISTORY = [
  MEMBER_SEPTEMBER_ROTATION_REPORT_20260826_V2,
  MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V3,
  MEMBER_SEPTEMBER_ROTATION_REPORT_20260902_V4,
] as const;
