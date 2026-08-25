export type SeptemberRotationAsset = {
  symbol: "SOXL" | "BTC" | "GOLD";
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
  goldZh: string;
  goldEn: string;
};

export const MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 = {
  version: "SEP_ROTATION_REPORT_20260826_V1",
  publishedAt: "2026-08-26T07:00:00+08:00",
  titleZh: "9月资金轮动地图：半导体转强，黄金降温，BTC上冲受限",
  titleEn: "September Rotation Map: Semiconductors Strengthen, Gold Cools, BTC Upside Is Capped",
  conclusionZh:
    "主线不是“AI涨、黄金和BTC必然跌”，而是9月7日后相对强弱可能切换：半导体进入更强窗口，黄金由高位强势转为温和回调，BTC在9月10日前仍可上冲，但8万至8.5万美元上方卖压增强。",
  conclusionEn:
    "The thesis is not that AI rises while gold and BTC must fall. It is a relative-strength rotation after Sep 7: semiconductors enter a stronger window, gold moves from elevated strength into a mild pullback, and BTC can still probe higher into Sep 10 but faces heavier supply around USD 80k-85k.",
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
      directionZh: "上冲受限",
      directionEn: "Capped upside",
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
      goldZh: "小幅反弹候选",
      goldEn: "Small-rebound candidate",
    },
  ] satisfies SeptemberRotationPhase[],
  executionZh: [
    "9月7日前不因轮动预期提前追SOXL或抢跑做空黄金、BTC；先等相对强弱真正切换。",
    "9月7日后同时观察SOXL/NDX相对强度、BTC在8万至8.5万美元的承接、黄金是否由高位转为缓降；三项至少两项确认，再提高轮动判断信心。",
    "BTC的9月9日至11日是窗口，不是保证见顶日；黄金是温和回调预期，不是崩跌；SOXL是三倍杠杆产品，10月7日后首先考虑保护利润。",
  ],
  executionEn: [
    "Before Sep 7, do not chase SOXL or pre-emptively short gold/BTC solely on the rotation thesis; wait for relative strength to switch.",
    "After Sep 7, track SOXL/NDX relative strength, BTC demand around USD 80k-85k, and whether gold shifts from elevated levels into a gradual fade. Raise confidence only when at least two of the three confirm.",
    "Sep 9-11 is a BTC window, not a guaranteed top date. Gold is a mild-pullback thesis, not a crash call. SOXL is a 3x product, so protect gains first after Oct 7.",
  ],
} as const;
