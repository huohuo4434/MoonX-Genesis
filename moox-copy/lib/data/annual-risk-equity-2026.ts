/**
 * 2026 annual crypto risk + US equity path research (private mentor 01).
 * Crypto risk must never override BTC price direction on the homepage.
 */
import { lt } from "@/lib/i18n/config";
import type { ResearchCollection, ResearchRecord } from "@/types/research";

const DISCLAIMER = lt(
  "传统象数研究属于非科学验证框架，仅作为研究记录与后续复盘样本，不构成投资建议。",
  "傳統象數研究屬於非科學驗證框架，僅作為研究記錄與後續復盤樣本，不構成投資建議。",
  "Traditional symbolic research is a non-scientific verification framework and does not constitute investment advice."
);

const MENTOR_WEIGHT_NOTE = lt(
  "私人导师01历史上高点月份及上涨目标判断相对较强，低点月份与下跌目标较弱，因此高点直接信号权重大于低点间接信号。该评价属于用户历史复核后的定性结论，并非正式统计准确率。",
  "私人導師01歷史上高點月份及上漲目標判斷相對較強，低點月份與下跌目標較弱，因此高點直接信號權重大於低點間接信號。該評價屬於用戶歷史複核後的定性結論，並非正式統計準確率。",
  "Private Mentor 01 historically stronger on highs/upside targets than lows/downside — direct high signals outweigh indirect low signals. Qualitative user review, not an official statistical accuracy rate."
);

export const annualRiskEquityCollections: ResearchCollection[] = [
  {
    id: "crypto-market-risk-research-2026",
    title: lt("加密市场年度风险研究", "加密市場年度風險研究", "Crypto Market Annual Risk Research"),
    description: lt(
      "非价格方向的安全与信任风险研究；不得覆盖 BTC 年度涨跌判断。",
      "非價格方向的安全與信任風險研究；不得覆蓋 BTC 年度漲跌判斷。",
      "Non-price safety and trust-risk research — must not override BTC annual price direction."
    ),
    frameworks: ["oracle-six-yao"],
    sourceType: "private-teacher",
    publishedAt: "2026-07-27",
    forecastStart: "2026-01-01",
    forecastEnd: "2026-12-31",
  },
  {
    id: "us-equity-annual-path-2026",
    title: lt("美股2026年度路径研究", "美股2026年度路徑研究", "US Equity 2026 Annual Path Research"),
    description: lt(
      "美股综合市场自然年路径；不删除、不覆盖既有纳指短线与下半年周期研究。",
      "美股綜合市場自然年路徑；不刪除、不覆蓋既有納指短線與下半年週期研究。",
      "Broad US equity calendar-year path — does not delete or override existing NDX short-term or H2 cycle research."
    ),
    frameworks: ["oracle-six-yao"],
    sourceType: "private-teacher",
    publishedAt: "2026-07-27",
    forecastStart: "2026-01-01",
    forecastEnd: "2026-12-31",
  },
];

export const annualRiskEquityRecords: ResearchRecord[] = [
  {
    id: "MX-CRYPTO-RISK-2026-ANNUAL-001",
    publishedAt: "2026-07-27",
    forecastStart: "2026-01-01",
    forecastEnd: "2026-12-31",
    assetId: "crypto-market",
    assetName: lt("加密货币市场", "加密貨幣市場", "Crypto Market"),
    symbol: "CRYPTO",
    market: "crypto",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    publicSourceLabel: lt("私人导师01", "私人導師01", "Private Mentor 01"),
    sourceProfileId: "PRIVATE-MENTOR-01",
    sourceReliability: {
      overall: lt("中高", "中高", "Medium-high"),
      strengths: [
        lt("风险事件性质", "風險事件性質", "Risk-event character"),
        lt("系统性风险强弱判断", "系統性風險強弱判斷", "Systemic vs non-systemic risk judgment"),
      ],
      weaknesses: [
        lt("精确低点月份", "精確低點月份", "Exact low months"),
        lt("下跌目标价格", "下跌目標價格", "Downside target prices"),
      ],
      note: MENTOR_WEIGHT_NOTE,
    },
    direction: "neutral",
    editorialConfidence: 72,
    researchScore: 72,
    consensusEligible: false,
    excludeFromHomeViews: true,
    excludeFromLongTermConsensus: true,
    researchKind: "risk",
    watchlistEligible: true,
    layer: "strategic",
    isLongRange: true,
    sourceStatus: "summary_only",
    collectionId: "crypto-market-risk-research-2026",
    ratingDisplay: lt("中性偏风险", "中性偏風險", "Neutral with elevated risk"),
    researchAttribute: lt("六爻风险研究", "六爻風險研究", "Six-yao risk research"),
    horizon: lt("2026全年风险验证", "2026全年風險驗證", "Full-year 2026 risk verification"),
    title: lt(
      "2026年币圈非系统性安全与信任风险研究",
      "2026年幣圈非系統性安全與信任風險研究",
      "2026 crypto non-systemic safety and trust risk study"
    ),
    summary: lt(
      "卦象不支持FTX级全行业崩塌式严重黑天鹅作为基准情景，但黑客攻击、平台资金问题、储备透明度不足、监管退弱和用户信任危机可能频繁出现。风险事件可能造成局部冲击，但存在监管、资金或行业力量托举，系统性传染概率相对较低。",
      "卦象不支持FTX級全行業崩塌式嚴重黑天鵝作為基準情景，但駭客攻擊、平台資金問題、儲備透明度不足、監管退弱和用戶信任危機可能頻繁出現。風險事件可能造成局部衝擊，但存在監管、資金或行業力量托舉，系統性傳染機率相對較低。",
      "Hexagrams do not support an FTX-scale industry collapse as the base case, but hacks, platform funding issues, reserve opacity, weaker regulation, and trust crises may recur. Events can cause local shocks with some official/capital/industry support; systemic contagion odds stay relatively lower."
    ),
    moonxInterpretation: lt(
      "这是风险性质研究，不是BTC价格涨跌预测；不得用本记录直接覆盖现有BTC年度方向；不得显示为全年已经命中。",
      "這是風險性質研究，不是BTC價格漲跌預測；不得用本記錄直接覆蓋現有BTC年度方向；不得顯示為全年已經命中。",
      "Risk-character research, not a BTC price call — must not override BTC annual direction or be marked as a full-year hit early."
    ),
    riskAssessment: {
      systemicRisk: lt("较低", "較低", "Lower"),
      nonSystemicEventRisk: lt("较高", "較高", "Higher"),
      primaryRisks: [
        lt("黑客攻击", "駭客攻擊", "Hacks"),
        lt("平台挪用或错配资金", "平台挪用或錯配資金", "Platform diversion / misallocation"),
        lt("储备及资产透明度不足", "儲備及資產透明度不足", "Reserve / asset opacity"),
        lt("监管约束边际减弱", "監管約束邊際減弱", "Weaker regulatory constraint"),
        lt("项目方利益冲突", "項目方利益衝突", "Issuer conflicts of interest"),
        lt("用户信任危机", "用戶信任危機", "User trust crisis"),
      ],
    },
    thesis: [
      lt("兄弟亥水持世，并在壬子日得旺，代表存量矛盾、资金争夺和老问题反复", "兄弟亥水持世，並在壬子日得旺，代表存量矛盾、資金爭奪和老問題反覆", "Sibling Hai-Water holds self and is strong on Ren-Zi day — legacy conflicts, funding contests, recurring issues"),
      lt("兄弟临勾陈，事件更偏长期存在的老问题，而非完全突然的新问题", "兄弟臨勾陳，事件更偏長期存在的老問題，而非完全突然的新問題", "Sibling with Gouchen — longer-running legacy issues more than brand-new shocks"),
      lt("父母酉金发动化申金，为化退，代表法律监管、规则约束或制度可信度边际减弱", "父母酉金發動化申金，為化退，代表法律監管、規則約束或制度可信度邊際減弱", "Parent You→Shen retreating — regulation / rules / institutional credibility softens at the margin"),
      lt("父母临腾蛇，容易出现信息混乱、规则争议和信任危机", "父母臨騰蛇，容易出現信息混亂、規則爭議和信任危機", "Parent with Tengshe — info noise, rule disputes, trust crises"),
      lt("官鬼丑土发动，说明确实存在风险事件", "官鬼丑土發動，說明確實存在風險事件", "Officer Chou moves — risk events do occur"),
      lt("官鬼临青龙并化子孙寅木，风险出现后可能获得监管、资金或行业力量处置", "官鬼臨青龍並化子孫寅木，風險出現後可能獲得監管、資金或行業力量處置", "Officer with Qinglong transforming to child Yin — after shocks, policy/capital/industry support may contain"),
      lt("子孙寅木对官鬼形成回头克，限制风险进一步演变为系统性灾难", "子孫寅木對官鬼形成回頭克，限制風險進一步演變為系統性災難", "Child Yin turns back on officer — limits escalation into systemic disaster"),
      lt("妻财午火伏藏，代表资金真实状况、损失或平台资产问题不易完全显现", "妻財午火伏藏，代表資金真實狀況、損失或平台資產問題不易完全顯現", "Wealth Wu hidden — true funding/losses/platform assets may stay partially opaque"),
    ],
    invalidation: lt(
      "若2026年出现导致加密市场长期瘫痪、主要交易平台连锁破产或全球流动性持续枯竭的系统性危机，则原判断失效。",
      "若2026年出現導致加密市場長期癱瘓、主要交易平台連鎖破產或全球流動性持續枯竭的系統性危機，則原判斷失效。",
      "Invalidated if 2026 sees a systemic crisis that paralyzes crypto markets long-term, cascades major exchange failures, or sustains global liquidity drought."
    ),
    risks: [
      lt("这是一条风险性质研究，不是BTC价格涨跌预测", "這是一條風險性質研究，不是BTC價格漲跌預測", "Risk research — not a BTC price forecast"),
      lt("不得用本记录直接覆盖现有BTC年度方向", "不得用本記錄直接覆蓋現有BTC年度方向", "Must not override existing BTC annual direction"),
      lt("不得显示为全年已经命中", "不得顯示為全年已經命中", "Must not be shown as a full-year hit"),
      DISCLAIMER,
    ],
    verificationStages: [
      {
        title: lt("非系统性事件频发观察", "非系統性事件頻發觀察", "Non-systemic event frequency watch"),
        status: "待验证",
        verificationStart: "2026-01-01",
        verificationEnd: "2026-12-31",
        note: lt("年度结束前不得标为完全命中。", "年度結束前不得標為完全命中。", "Do not mark as a full hit before year-end."),
      },
      {
        title: lt("系统性崩溃是否出现", "系統性崩潰是否出現", "Did systemic collapse occur?"),
        status: "待验证",
        verificationEnd: "2027-01-05",
        note: lt("基准情景为系统性风险较低；验证日2027-01-05。", "基準情景為系統性風險較低；驗證日2027-01-05。", "Base case: lower systemic risk; verify by 2027-01-05."),
      },
    ],
    verificationChecklist: [
      lt("验证日期：2027-01-05", "驗證日期：2027-01-05", "Verification date: 2027-01-05"),
      lt("状态：验证中 — 不得标为全年已经命中", "狀態：驗證中 — 不得標為全年已經命中", "Status: verifying — do not mark full-year hit"),
      lt("是否出现FTX级全行业崩塌？", "是否出現FTX級全行業崩塌？", "Did an FTX-scale industry collapse occur?"),
      lt("非系统性安全/信任事件是否频繁？", "非系統性安全/信任事件是否頻繁？", "Were non-systemic safety/trust events frequent?"),
    ],
    turningWindows: [
      {
        id: "crypto-risk-2026-verify",
        date: "2027-01-05",
        label: lt("币圈年度风险阶段验证", "幣圈年度風險階段驗證", "Crypto annual risk phase verification"),
      },
    ],
    status: "active",
    tags: ["crypto", "risk", "non-systemic", "private-mentor-01", "exclude-from-home", "not-price"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "MX-US-EQUITY-2026-ANNUAL-001",
    publishedAt: "2026-07-27",
    forecastStart: "2026-01-01",
    forecastEnd: "2026-12-31",
    assetId: "us-equity-broad",
    assetName: lt("美股综合市场", "美股綜合市場", "US Equity Broad Market"),
    symbol: "SPX / NDX",
    market: "us-equity",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    publicSourceLabel: lt("私人导师01", "私人導師01", "Private Mentor 01"),
    sourceProfileId: "PRIVATE-MENTOR-01",
    sourceReliability: {
      overall: lt("中高", "中高", "Medium-high"),
      strengths: [
        lt("年度大方向", "年度大方向", "Annual big-picture direction"),
        lt("重大转折窗口", "重大轉折窗口", "Major turning windows"),
      ],
      weaknesses: [
        lt("极短线逐日点位", "極短線逐日點位", "Ultra-short daily price points"),
        lt("精确低点月份", "精確低點月份", "Exact low months"),
      ],
      note: MENTOR_WEIGHT_NOTE,
    },
    direction: "neutral",
    forwardDirection: lt("立秋后略微看跌", "立秋後略微看跌", "Slightly bearish after Start of Autumn"),
    editorialConfidence: 74,
    researchScore: 74,
    consensusEligible: true,
    excludeFromHomeViews: true,
    researchKind: "price",
    layer: "strategic",
    isLongRange: true,
    sourceStatus: "summary_only",
    collectionId: "us-equity-annual-path-2026",
    ratingDisplay: lt("中性", "中性", "Neutral"),
    researchAttribute: lt("传统象数研究", "傳統象數研究", "Traditional symbolic research"),
    horizon: lt("2026自然年度", "2026自然年度", "Calendar year 2026"),
    title: lt(
      "美股2026年上半年强势、立秋后逐渐转弱",
      "美股2026年上半年強勢、立秋後逐漸轉弱",
      "US equities 2026: H1 strength, gradual softening after Start of Autumn"
    ),
    summary: lt(
      "妻财巳火持世且得日月，支持美股上半年维持较强走势；但多个动爻说明全年事件密集、走势反复。子孙和父母等力量化退，意味着上涨利好和外部支持后劲逐渐下降。立秋及申月前后可能成为转折分界，下半年偏向缓慢走弱，冬季可能处于全年相对低位。六合结构及旺财限制极端暴跌。",
      "妻財巳火持世且得日月，支持美股上半年維持較強走勢；但多個動爻說明全年事件密集、走勢反覆。子孫和父母等力量化退，意味著上漲利好和外部支持後勁逐漸下降。立秋及申月前後可能成為轉折分界，下半年偏向緩慢走弱，冬季可能處於全年相對低位。六合結構及旺財限制極端暴跌。",
      "Wealth Si-Fire holds self with sun/moon support — H1 can stay relatively strong. Multiple moving lines imply dense events and choppy paths. Child/parent forces retreat — upside catalysts and external support fade. Start of Autumn / Shen month may mark a turn; H2 leans gradual softening with winter relatively low. Six-harmony plus strong wealth limits extreme crash calls."
    ),
    moonxInterpretation: lt(
      "本记录为2026自然年度综合市场研究；不删除现有NDX短线研究，也不覆盖现有2026下半年至2027纳指周期研究。首页短线仍由短周期研究决定。",
      "本記錄為2026自然年度綜合市場研究；不刪除現有NDX短線研究，也不覆蓋現有2026下半年至2027納指週期研究。首頁短線仍由短週期研究決定。",
      "Calendar-year broad-market study — does not delete NDX short-term work or override H2-2026→2027 Nasdaq cycle research. Homepage short-term stays on short-cycle research."
    ),
    annualPath: [
      {
        start: "2026-01-01",
        end: "2026-08-06",
        direction: lt("偏强", "偏強", "Relatively strong"),
        title: lt("财旺支持的上半年强势阶段", "財旺支持的上半年強勢階段", "H1 strength supported by strong wealth"),
        description: lt(
          "妻财巳火持世且得日月，上半年仍有上涨空间和较强承接。",
          "妻財巳火持世且得日月，上半年仍有上漲空間和較強承接。",
          "Wealth Si holds self with sun/moon — H1 still has upside room and solid absorption."
        ),
      },
      {
        start: "2026-08-07",
        end: "2026-10-31",
        direction: lt("逐渐转弱", "逐漸轉弱", "Gradually softening"),
        title: lt("立秋后的趋势转折观察期", "立秋後的趨勢轉折觀察期", "Post–Start of Autumn turn watch"),
        description: lt(
          "申月以后外部环境影响增强，子孙化退意味着利好边际作用下降，市场可能进入缓慢走弱和内部结构分化。",
          "申月以後外部環境影響增強，子孫化退意味著利好邊際作用下降，市場可能進入緩慢走弱和內部結構分化。",
          "After Shen month, external influence rises; child retreats so catalyst edges fade — gradual softening and internal divergence."
        ),
      },
      {
        start: "2026-11-01",
        end: "2026-12-31",
        direction: lt("偏弱", "偏弱", "Relatively soft"),
        title: lt("冬季相对低位窗口", "冬季相對低位窗口", "Winter relative low window"),
        description: lt(
          "冬季可能形成全年相对低位，但六合和财爻旺势不支持无依据预测极端崩盘。",
          "冬季可能形成全年相對低位，但六合和財爻旺勢不支持無依據預測極端崩盤。",
          "Winter may mark a relative yearly low; six-harmony and strong wealth do not support baseless crash extremes."
        ),
      },
    ],
    thesis: [
      lt("妻财巳火持世，且得日月，为上半年强势基础", "妻財巳火持世，且得日月，為上半年強勢基礎", "Wealth Si holds self with sun/moon — H1 strength base"),
      lt("财爻临朱雀，市场叙事、消息和情绪活跃", "財爻臨朱雀，市場敘事、消息和情緒活躍", "Wealth with Zhuque — narratives, news, and sentiment stay active"),
      lt("四个动爻说明全年事件多、政策和市场力量纠缠，走势瞬息多变", "四個動爻說明全年事件多、政策和市場力量糾纏，走勢瞬息多變", "Four moving lines — dense events, policy/market entanglement, fast-changing path"),
      lt("子孙卯木发动生财，但化子孙寅木为化退，代表上涨动力和利好后劲逐渐下降", "子孫卯木發動生財，但化子孫寅木為化退，代表上漲動力和利好後勁逐漸下降", "Child Mao generates wealth but transforms to Yin (retreat) — upside drive fades"),
      lt("父母申金临应并化父母酉金，外部政策和宏观环境持续影响市场", "父母申金臨應並化父母酉金，外部政策和宏觀環境持續影響市場", "Parent Shen on response → You — external policy/macro keeps influencing"),
      lt("官鬼戌土临玄武并化官鬼未土，代表高层政治和利益因素持续搅动，但风险力量逐渐衰减", "官鬼戌土臨玄武並化官鬼未土，代表高層政治和利益因素持續攪動，但風險力量逐漸衰減", "Officer Xu with Xuanwu → Wei — political/interest churn continues but risk force fades"),
      lt("兄弟子水化妻财巳火，可能表现为筹码转移、部分参与者割肉后指数维持", "兄弟子水化妻財巳火，可能表現為籌碼轉移、部分參與者割肉後指數維持", "Sibling Zi → wealth Si — chip transfer; some capitulation while index holds"),
      lt("六合结构使多空互相牵制，限制全年极端暴涨或暴跌", "六合結構使多空互相牽制，限制全年極端暴漲或暴跌", "Six-harmony constrains both sides — limits extreme year-long melt-up or crash"),
    ],
    invalidation: lt(
      "若立秋以后美股持续放量突破年度高点、市场宽度同步改善，并在第四季度保持强势，则下半年转弱路径失效。",
      "若立秋以後美股持續放量突破年度高點、市場寬度同步改善，並在第四季度保持強勢，則下半年轉弱路徑失效。",
      "Invalidated if after Start of Autumn US equities sustain volume breaks of the yearly high, breadth improves together, and Q4 stays strong."
    ),
    verificationStages: [
      {
        title: lt("上半年偏强", "上半年偏強", "H1 relatively strong"),
        status: "待回填验证",
        verificationEnd: "2026-06-30",
      },
      {
        title: lt("立秋后逐渐转弱", "立秋後逐漸轉弱", "Gradual softening after Start of Autumn"),
        status: "待验证",
        verificationStart: "2026-08-07",
      },
      {
        title: lt("冬季相对低位", "冬季相對低位", "Winter relative low"),
        status: "待验证",
        verificationStart: "2026-11-01",
        verificationEnd: "2026-12-31",
      },
    ],
    verificationChecklist: [
      lt("验证日期：2027-01-05", "驗證日期：2027-01-05", "Verification date: 2027-01-05"),
      lt("状态：验证中 — 年度结束前不得标为完全命中", "狀態：驗證中 — 年度結束前不得標為完全命中", "Status: verifying — no full-year hit before year-end"),
      lt("上半年是否偏强？", "上半年是否偏強？", "Was H1 relatively strong?"),
      lt("立秋后是否逐渐转弱？", "立秋後是否逐漸轉弱？", "Did gradual softening follow Start of Autumn?"),
      lt("冬季是否形成相对低位？", "冬季是否形成相對低位？", "Did winter form a relative low?"),
    ],
    turningWindows: [
      {
        id: "us-equity-2026-autumn-turn",
        start: "2026-08-07",
        end: "2026-08-31",
        label: lt("立秋后转弱观察窗口", "立秋後轉弱觀察窗口", "Post–Start of Autumn softening watch"),
      },
      {
        id: "us-equity-2026-winter-low",
        start: "2026-11-01",
        end: "2026-12-31",
        label: lt("冬季相对低位窗口", "冬季相對低位窗口", "Winter relative low window"),
        note: lt("与纳指冬季低点窗口合并观察，不重复新增。", "與納指冬季低點窗口合併觀察，不重複新增。", "Merged with Nasdaq winter low window — no duplicate event."),
      },
      {
        id: "us-equity-2026-verify",
        date: "2027-01-05",
        label: lt("美股年度路径阶段验证", "美股年度路徑階段驗證", "US equity annual path phase verification"),
      },
    ],
    risks: [
      lt("不得把六合结构误读为必然暴涨。", "不得把六合結構誤讀為必然暴漲。", "Do not misread six-harmony as a guaranteed melt-up."),
      lt("不得无依据预测极端崩盘。", "不得無依據預測極端崩盤。", "Do not invent unsupported crash extremes."),
      DISCLAIMER,
    ],
    status: "active",
    tags: ["us-equity", "spx", "ndx", "annual", "private-mentor-01", "exclude-from-home-today"],
    disclaimer: DISCLAIMER,
  },
];
