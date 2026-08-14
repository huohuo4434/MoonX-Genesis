import "server-only";

import type { MemberFounderCyclePack } from "@/types/member-founder-cycle";

const pack: MemberFounderCyclePack = {
  schemaVersion: "2026-08-14.v1",
  title: { zh: "创始人命理周期研究", en: "Founder Cycle Research" },
  sourceArtifact: "黄仁勋马斯克.zip",
  ingestedAt: "2026-08-14",
  sourcePublishedAt: null,
  verificationStatus: "UNVERIFIED_SOURCE_CLAIM",
  executionAuthority: "RESEARCH_ONLY",
  consensusEligible: false,
  tradingEligible: false,
  archiveNotice: { zh: "首批结构化档案，依据当前上传包；后续可追加，但不事后改写本次版本。", en: "First structured archive based on the current uploaded package. Later additions are allowed, but this version will not be rewritten with hindsight." },
  methodology: [
    { title: { zh: "八字结构", en: "Bazi structure" }, description: { zh: "记录老师提供的候选命盘与结构标签，不把未校时命盘写成事实。", en: "Records the teacher-supplied candidate chart and structure labels without treating an uncalibrated birth time as fact." } },
    { title: { zh: "紫微校时与交叉验证", en: "Zi Wei calibration and cross-check" }, description: { zh: "用出生输入、宫位描述和人生节点交叉核对；不补造缺失星盘。", en: "Cross-checks birth inputs, palace descriptions and life events; missing chart data is never invented." } },
    { title: { zh: "大运流年", en: "Luck cycles and annual timing" }, description: { zh: "把老师提出的年份与窗口保存为待验证分支，而不是确定事件。", en: "Stores proposed years and windows as hypotheses pending verification, not predetermined events." } },
    { title: { zh: "历史事件回测", en: "Historical event backtest" }, description: { zh: "未来用可核实的职业、公司与市场事件评估命盘假设和阈值，不回写历史预测。", en: "Uses verifiable career, company and market events to assess chart assumptions and thresholds without rewriting historical forecasts." } },
  ],
  cases: [
    {
      id: "JENSEN_HUANG",
      name: { zh: "黄仁勋", en: "Jensen Huang" },
      assumedBazi: "癸卯 / 甲寅 / 辛卯 / 丙申",
      birthInput: { zh: "紫微输入：1963-02-17 16:00，北京；尚未独立校时。", en: "Zi Wei input: 1963-02-17 16:00, Beijing; birth time has not been independently calibrated." },
      calibrationStatus: { zh: "候选命盘，未独立校时", en: "Candidate chart; birth time not independently calibrated" },
      structureTags: [
        { zh: "财帛宫：巨门、太阳（老师资料）", en: "Wealth palace: Ju Men and Tai Yang (teacher material)" },
        { zh: "夫妻宫：天梁、天机（老师资料）", en: "Spouse palace: Tian Liang and Tian Ji (teacher material)" },
        { zh: "2018 后呈杀破狼性质（老师资料）", en: "Post-2018 period described as Sha-Po-Lang-like (teacher material)" },
      ],
      claims: [
        { id: "jensen-day-master", category: "BAZI_STRUCTURE", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "资料把日主描述为辛金、财多身弱；喜金，也喜己土、丑土一类湿土；癸水可用，但壬水过多不利。", en: "The material describes a Xin-metal day master with abundant wealth and a weak self; metal and moist earth such as Ji and Chou are favorable, Gui water may be useful, while excessive Ren water is unfavorable." }, mooxInterpretation: { zh: "这是候选命盘内部的用神假设，需与可核实事件逐项回验，不能独立推导公司或股价。", en: "This is an internal useful-element hypothesis for the candidate chart and requires event-by-event validation; it cannot independently predict a company or share price." } },
        { id: "jensen-history-1993-1999", category: "HISTORICAL_BACKTEST", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "资料列出 1993 年创立公司、1999 年上市作为人物周期回验节点。", en: "The material lists the 1993 company founding and 1999 listing as founder-cycle backtest milestones." }, mooxInterpretation: { zh: "只把年份作为待核实事件索引；人物周期拟合不等于公司八字已获验证。", en: "The years are retained only as event indices pending verification; a founder-cycle fit does not validate a company chart." } },
        { id: "jensen-history-2001-positive", category: "HISTORICAL_BACKTEST", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "资料把 2001 辛巳年的强上涨表现作为正向回验样本。", en: "The material treats the strong rise in the 2001 Xin-Si year as a positive backtest sample." }, mooxInterpretation: { zh: "这是网页整理中的正例标签；具体行情起止和涨幅仍待独立数据核验，不能据此推导未来收益。", en: "This is a positive-example label from the web synthesis; exact market dates and magnitude still require independent data verification and cannot imply future returns." } },
        { id: "jensen-history-undated-negative", category: "HISTORICAL_BACKTEST", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "资料另列一个年份未提供的“壬水与火组合不利”负向样本。", en: "The material separately lists an undated adverse Ren-water/fire-combination sample as a negative example." }, mooxInterpretation: { zh: "不把未提供年份的样本写成壬午年，也不补造最大跌幅；事件和行情幅度均待独立核验。", en: "The undated sample is not relabeled as a Ren-Wu year, and no maximum drawdown is invented; events and market magnitude remain independently unverified." } },
        { id: "jensen-fit", category: "HISTORICAL_BACKTEST", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "老师资料认为公司八字拟合较差，人物周期的解释力相对更好。", en: "The teacher material considers the company-chart fit weak and the founder cycle relatively more explanatory." }, mooxInterpretation: { zh: "仅记录为老师的方法判断，不代表人物周期已通过统计验证。", en: "Recorded only as the teacher's methodological assessment, not as statistical validation of founder cycles." } },
        { id: "jensen-2026-08-10", category: "CYCLE_WINDOW", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "NVDA 在 2026 年 8月至10月可能进入调整。", en: "NVDA may enter a correction from August to October 2026." }, mooxInterpretation: { zh: "仅保存为时间窗口，等待市场数据和历史事件回测。", en: "Stored only as a timing window pending market-data and historical-event validation." } },
        { id: "jensen-2026-11-2027-01", category: "CYCLE_WINDOW", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "2026年11月至2027年1月可能反弹；反弹之后需观察周线顶背离确认。", en: "A rebound may occur from November 2026 to January 2027; a subsequent weekly bearish-divergence confirmation should be observed." }, mooxInterpretation: { zh: "顶背离是后续验证条件，不预设一定出现；该窗口不是交易方向或订单信号。", en: "Weekly divergence is a later confirmation condition, not a presumed outcome; the window is not a trading direction or order signal." } },
        { id: "jensen-2027", category: "CYCLE_WINDOW", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "2027 丁未与换运叠加可能形成转折，约 4 月为观察窗口。", en: "The 2027 Ding-Wei year combined with a luck-cycle transition may form a turning point, with approximately April as an observation window." }, mooxInterpretation: { zh: "干支、换运和月份均为待验证观察分支，不推定具体事件。", en: "The stem-branch year, cycle transition and month are unverified observation branches; no specific event is presumed." } },
        { id: "jensen-2028", category: "CYCLE_WINDOW", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "2028 戊申叠加紫微换大限，资料称财帛宫天机化忌，风险可能增强。", en: "In 2028 Wu-Shen, a Zi Wei major-cycle transition is said to coincide with Tian Ji Hua Ji in the wealth palace, potentially increasing risk." }, mooxInterpretation: { zh: "属于老师待验证主张，不能显示为已发生事实，也不能据此交易。", en: "This is a pending teacher claim, not an established fact or a basis for trading." } },
      ],
    },
    {
      id: "ELON_MUSK",
      name: { zh: "埃隆·马斯克", en: "Elon Musk" },
      assumedBazi: "辛亥 / 甲午 / 甲申 / 丁卯",
      birthInput: null,
      calibrationStatus: { zh: "候选命盘；出生时刻证据待补", en: "Candidate chart; birth-time evidence pending" },
      structureTags: [
        { zh: "羊刃驾杀（老师主张，待验证）", en: "Yang Ren controlling Sha (teacher claim, pending verification)" },
        { zh: "虚神未土需要明确证据", en: "The inferred Wei-earth element requires explicit evidence" },
      ],
      claims: [
        { id: "musk-structure", category: "BAZI_STRUCTURE", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "候选命盘以甲木为日主，甲申坐七杀、丁卯为根，被描述为羊刃驾杀；资料也以母亲对应印星作交叉观察。", en: "The candidate chart uses a Jia-wood day master, Jia-Shen seated on Seven Killings and Ding-Mao as a root, described as Yang Ren controlling Sha; the material also observes the mother through the resource star." }, mooxInterpretation: { zh: "结构标签和母亲印星都需由来源材料及历史事件交叉核对，不能以性格描述代替证据。", en: "Both structural labels and the mother/resource-star link require source and historical-event cross-checks; personality description is not evidence." } },
        { id: "musk-void-earth", category: "ZIWEI_CROSS_CHECK", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "资料使用虚神未土补充结构。", en: "The material uses an inferred Wei-earth element to supplement the structure." }, mooxInterpretation: { zh: "只有来源依据、命局组合依据、历史事件验证三项齐全才采信；缺一项即保持未验证。", en: "It is accepted only when source basis, chart-combination basis and historical-event validation are all present; if any is missing it remains unverified." } },
        { id: "musk-candidate-rejection", category: "ZIWEI_CROSS_CHECK", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "老师资料因性格表现不符而拒绝“机月同梁”候选。", en: "The teacher material rejects a Ji-Yue-Tong-Liang candidate because the described personality does not fit." }, mooxInterpretation: { zh: "这是候选排除理由，不是独立校时结论；需要更多可核实事件支持。", en: "This is a candidate-exclusion rationale, not an independent birth-time calibration; more verifiable events are required." } },
        { id: "musk-you-risk", category: "CYCLE_WINDOW", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "资料以酉为官，并提出酉冲卯可能对应政治风险。", en: "The material treats You as authority and proposes that You clashing with Mao may correspond to political risk." }, mooxInterpretation: { zh: "只保存为风险分支，不映射具体政治事件、不判断当事人行为。", en: "Stored only as a risk branch; no specific political event or personal conduct is inferred." } },
        { id: "musk-history-renchen", category: "HISTORICAL_BACKTEST", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "资料以壬辰的七杀结构对应早期创业阶段进行回验。", en: "The material backtests a Ren-Chen Seven-Killings structure against the early entrepreneurial period." }, mooxInterpretation: { zh: "只评估早期创业维度，需用可核实公司与职业事件校验，不与家庭或后期扩张样本合并。", en: "This is assessed only on the early-entrepreneurship dimension using verifiable company and career events, separate from family or later-expansion samples." } },
        { id: "musk-history-xinmao", category: "HISTORICAL_BACKTEST", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "资料以辛卯的伤官见官与羊刃，回验子女、婚姻、创业压力及接近破产的阶段。", en: "The material uses Xin-Mao's Hurting-Officer-meets-Authority and Yang Ren to backtest children, marriage, entrepreneurial pressure and a near-bankruptcy period." }, mooxInterpretation: { zh: "子女、婚姻、创业压力与财务困境必须各自寻找来源并分别评分，不能压缩成单一成败标签。", en: "Children, marriage, entrepreneurial pressure and financial distress each require sources and separate scoring; they are not compressed into one success/failure label." } },
        { id: "musk-history-gengyin", category: "HISTORICAL_BACKTEST", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "资料以庚寅的七杀回验事业扩张、NASA 或 SpaceX 恢复，同时记录家庭波动。", en: "The material uses Geng-Yin Seven Killings to backtest business expansion and NASA or SpaceX recovery while also recording family volatility." }, mooxInterpretation: { zh: "事业扩张、NASA/SpaceX 关系与家庭波动属于不同验证维度，必须分别评估，不合并为一个成功率。", en: "Business expansion, the NASA/SpaceX relationship and family volatility are distinct validation dimensions and must be scored separately rather than merged into one success rate." } },
        { id: "musk-2028", category: "CYCLE_WINDOW", verificationStatus: "TEACHER_CLAIM_PENDING", teacherClaim: { zh: "资料认为 TSLA 仍可能有转机，同时提出 2028 年可能出现重大风险；“自由落体”仅为老师待验证预测。", en: "The material says TSLA may still have a path to recovery while proposing major risk in 2028; 'free fall' is only an unverified teacher prediction." }, mooxInterpretation: { zh: "转机与风险是并存分支；不得按字面当作公司、股价或个人事件事实，也不能触发交易。", en: "Recovery and risk remain parallel branches; neither is a factual company, price or personal event, nor can it trigger trading." } },
      ],
    },
  ],
  influenceScorePolicy: {
    status: "MOOX_PROVISIONAL",
    displayOnly: true,
    reviewThreshold: 75,
    thresholdSource: { zh: "阈值 75 源自本次网页 AI 整理建议，仅用于展示与复核排序。", en: "The threshold of 75 comes from the current web-AI synthesis suggestion and is used only for display and review ordering." },
    description: { zh: "Founder Influence Score 是 MOOX 暂定的展示框架，用于组织证据完整度和观察优先级，不是预测准确率或交易分数。", en: "Founder Influence Score is a provisional MOOX display framework for evidence completeness and observation priority, not predictive accuracy or a trading score." },
    thresholds: [
      { min: 0, label: { zh: "资料不足", en: "Insufficient evidence" }, displayMeaning: { zh: "只归档，不形成判断。", en: "Archive only; no conclusion." } },
      { min: 40, label: { zh: "观察", en: "Watch" }, displayMeaning: { zh: "允许安排交叉验证。", en: "Eligible for cross-validation." } },
      { min: 75, label: { zh: "重点复核", en: "Priority review" }, displayMeaning: { zh: "增加回测优先级，仍不接交易。", en: "Raises backtest priority but remains disconnected from trading." } },
    ],
  },
};

export function getMemberFounderCyclePack20260814(): MemberFounderCyclePack {
  return structuredClone(pack);
}
