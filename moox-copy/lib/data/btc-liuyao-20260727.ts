/**
 * BTC short/mid six-yao self-test records (2026-07-27).
 * Does not override ORACLE-0009 annual research. Pending human review — not auto-published.
 */
import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

const ORACLE_DISCLAIMER = lt(
  "传统象数研究属于非科学验证框架，仅作为研究记录与后续复盘样本，不构成投资建议。",
  "傳統象數研究屬於非科學驗證框架，僅作為研究記錄與後續復盤樣本，不構成投資建議。",
  "Traditional symbolic research is a non-scientific verification framework. It is retained as a research record and review sample only, and does not constitute investment advice."
);

const PENDING_REVIEW = {
  humanReviewStatus: "pending-review" as const,
  humanReviewChecklist: {
    screenshotVerified: false,
    sixRelativesVerified: false,
    worldResponseVerified: false,
    movingLinesVerified: false,
    transformedLinesVerified: false,
    monthDayStrengthVerified: false,
    factorScoresVerified: false,
    cycleComparisonVerified: false,
  },
};

export const btcLiuyao20260727Records: ResearchRecord[] = [
  {
    id: "MX-BTC-20260727-0806-LIUYAO-001",
    publishedAt: "2026-07-27",
    forecastStart: "2026-07-27",
    forecastEnd: "2026-08-06",
    verificationDate: "2026-08-07",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "oracle-six-yao",
    sourceType: "external-symbolic-analysis",
    publicSourceLabel: lt("用户自测", "用戶自測", "User self-test"),
    direction: "slightly-bullish",
    editorialConfidence: 60,
    consensusEligible: false,
    excludeFromHomeViews: true,
    layer: "execution",
    parentRecordId: "ORACLE-0009",
    derivedFromRecordIds: ["ORACLE-0009"],
    sourceStatus: "raw_source_saved",
    forecastType: lt("短周期", "短周期", "Short cycle"),
    category: lt("加密资产", "加密資產", "Crypto"),
    ratingDisplay: lt("待人工审核", "待人工審核", "Pending human review"),
    horizon: lt("2026-07-27 至 2026-08-06", "2026-07-27 至 2026-08-06", "2026-07-27 to 2026-08-06"),
    title: lt(
      "比特币短期先弹后跌再修复",
      "比特幣短期先彈後跌再修復",
      "BTC short-term: bounce, pullback, then repair"
    ),
    summary: lt(
      "主卦雷山小过（游魂），变卦雷地豫（六合）。兄弟申金发动化妻财卯木，前段筹码争夺和抛压有转化为资金回流的可能，但官鬼午火持世，说明风险压力仍未完全消失。综合路径偏向先短弹、中段回落、后段修复。",
      "主卦雷山小過（游魂），變卦雷地豫（六合）。兄弟申金發動化妻財卯木，前段籌碼爭奪和拋壓有轉化為資金回流的可能，但官鬼午火持世，說明風險壓力仍未完全消失。綜合路徑偏向先短彈、中段回落、後段修復。",
      "Primary Xiao Guo (wandering soul) → Yu (six harmonies). Sibling Shen moves to wealth Mao — early chip contention may convert to inflow, but officer Wu on world keeps risk pressure. Path bias: short bounce, mid pullback, late repair."
    ),
    moonxInterpretation: lt(
      "逐日路径属于低权重六爻拆解，不代表每个自然日必然收阴或收阳。本研究为用户自测卦，不能沿用私人导师01的历史准确率。",
      "逐日路徑屬於低權重六爻拆解，不代表每個自然日必然收陰或收陽。本研究為用戶自測卦，不能沿用私人導師01的歷史準確率。",
      "Daily path segments are low-weight six-yao decomposition — not guaranteed daily up/down closes. User self-test — no Mentor 01 accuracy inheritance."
    ),
    hexagramDetail: {
      primary: lt("雷山小过（游魂）", "雷山小過（游魂）", "Lei Shan Xiao Guo (wandering soul)"),
      transformed: lt("雷地豫（六合）", "雷地豫（六合）", "Lei Di Yu (six harmonies)"),
      worldLine: lt("官鬼午火持世", "官鬼午火持世", "Officer Wu fire holds world line"),
      responseLine: lt("父母辰土临应", "父母辰土臨應", "Parent Chen earth on response"),
      movingLines: [
        {
          from: lt("兄弟申金", "兄弟申金", "Sibling Shen metal"),
          to: lt("妻财卯木", "妻財卯木", "Wealth Mao wood"),
          sixSpirit: lt("朱雀", "朱雀", "Zhuque"),
          interpretation: lt(
            "兄弟申金发动化妻财卯木：筹码争夺、抛压或资金分流逐渐转化为价格与资金回流；该爻临朱雀，表示过程容易受到消息、舆论和市场叙事放大。",
            "兄弟申金發動化妻財卯木：籌碼爭奪、拋壓或資金分流逐漸轉化為價格與資金回流；該爻臨朱雀，表示過程容易受到消息、輿論和市場敘事放大。",
            "Sibling Shen moves to wealth Mao: chip contention may convert to capital inflow; line carries Zhuque — narratives/news may amplify the process."
          ),
          verificationStatus: "pending-human-review",
        },
      ],
      structureNotes: [
        lt("官鬼午火持世，当前市场自身仍带有压力、风险和高波动属性", "官鬼午火持世，當前市場自身仍帶有壓力、風險和高波動屬性", "Officer Wu on world — pressure, risk, high volatility"),
        lt("父母辰土临应，外部政策、宏观消息和制度环境仍影响走势", "父母辰土臨應，外部政策、宏觀消息和制度環境仍影響走勢", "Parent Chen on response — policy/macro backdrop"),
        lt("妻财卯木直接上卦，资金和价格力量并非完全缺失", "妻財卯木直接上卦，資金和價格力量並非完全缺失", "Wealth Mao present — price/capital force not absent"),
        lt("子孙亥水存在，但未形成强势主导，反弹更偏修复而非无阻力主升", "子孫亥水存在，但未形成強勢主導，反彈更偏修復而非無阻力主升", "Child Hai exists but not dominant — repair not frictionless rally"),
        lt("兄弟申金发动化妻财卯木，是本卦最重要的方向变化", "兄弟申金發動化妻財卯木，是本卦最重要的方向變化", "Sibling→wealth transform is the key directional shift"),
        lt("游魂转六合，可能体现前段不稳定、后段逐渐收敛和稳定", "游魂轉六合，可能體現前段不穩定、後段逐漸收斂和穩定", "Wandering soul → six harmonies — early instability, later convergence"),
      ],
    },
    expectedPath: [
      {
        start: "2026-07-27",
        end: "2026-07-28",
        direction: lt("偏涨", "偏漲", "Mildly bullish"),
        title: lt("晚盘至次日启动窗口", "晚盤至次日啟動窗口", "Evening-to-next-day launch window"),
        description: lt(
          "动爻受冲后行情容易启动，变爻妻财卯木在卯日得到激活，但游魂结构意味着反弹稳定性有限。",
          "動爻受沖後行情容易啟動，變爻妻財卯木在卯日得到激活，但游魂結構意味著反彈穩定性有限。",
          "Moving line under clash may trigger action; wealth Mao activates on Mao day, but wandering-soul structure limits rebound stability."
        ),
      },
      {
        start: "2026-07-29",
        end: "2026-07-29",
        direction: lt("震荡", "震盪", "Range-bound"),
        title: lt("消息与宏观消化", "消息與宏觀消化", "News and macro digestion"),
        description: lt(
          "外部消息和宏观环境主导，消化前一阶段反弹。",
          "外部消息和宏觀環境主導，消化前一階段反彈。",
          "External news and macro backdrop dominate — digesting the prior bounce."
        ),
      },
      {
        start: "2026-07-30",
        end: "2026-08-03",
        direction: lt("偏跌", "偏跌", "Mildly bearish"),
        title: lt("主要回落窗口", "主要回落窗口", "Main pullback window"),
        description: lt(
          "子孙动力受冲，官鬼和兄弟力量依次增强，属于主要回落窗口。",
          "子孫動力受沖，官鬼和兄弟力量依次增強，屬於主要回落窗口。",
          "Offspring momentum under clash; officer and sibling lines strengthen — main pullback window."
        ),
      },
      {
        start: "2026-08-02",
        end: "2026-08-03",
        direction: lt("低点观察", "低點觀察", "Low watch"),
        title: lt("阶段抛压较强窗口", "階段拋壓較強窗口", "Stronger distribution window"),
        description: lt(
          "兄弟申金临日以及酉金冲财卯木，属于阶段抛压较强窗口。",
          "兄弟申金臨日以及酉金沖財卯木，屬於階段拋壓較強窗口。",
          "Sibling Shen on day branch; You metal clashes wealth Mao — heavier sell-pressure window."
        ),
      },
      {
        start: "2026-08-04",
        end: "2026-08-04",
        direction: lt("止跌转折", "止跌轉折", "Stabilizing turn"),
        title: lt("卯戌合财承接", "卯戌合財承接", "Mao–Xu wealth support"),
        description: lt(
          "卯戌合财，有利于价格逐渐形成承接。",
          "卯戌合財，有利於價格逐漸形成承接。",
          "Mao–Xu combination supports wealth — price may gradually find a bid."
        ),
      },
      {
        start: "2026-08-05",
        end: "2026-08-06",
        direction: lt("偏涨", "偏漲", "Mildly bullish"),
        title: lt("子孙生扶财爻", "子孫生扶財爻", "Offspring supports wealth"),
        description: lt(
          "子孙亥水、子水依次增强，形成克制官鬼并生扶财爻的条件。",
          "子孫亥水、子水依次增強，形成克制官鬼並生扶財爻的條件。",
          "Child Hai and Zi water strengthen in sequence — restrains officer and supports wealth."
        ),
      },
    ],
    scenarios: [
      {
        name: lt("先弹后跌再涨", "先彈後跌再漲", "Bounce, dip, then rise"),
        probability: 55,
      },
      {
        name: lt("宽幅震荡", "寬幅震盪", "Wide-range chop"),
        probability: 30,
      },
      {
        name: lt("持续明显下跌", "持續明顯下跌", "Continued decline"),
        probability: 15,
      },
    ],
    technicalConfirmation: [
      lt("4小时趋势停止创新低", "4小時趨勢停止創新低", "4H trend stops making new lows"),
      lt("底分型或底背离成立", "底分型或底背離成立", "Bottom pattern or bullish divergence"),
      lt("反弹成交量改善", "反彈成交量改善", "Rebound volume improves"),
      lt("突破短期压力后回踩不破", "突破短期壓力後回踩不破", "Break short resistance and hold retest"),
    ],
    levelsPendingLabel: lt("具体支撑压力等待技术面录入", "具體支撐壓力等待技術面錄入", "Support/resistance pending technical update"),
    invalidation: lt(
      "若价格放量跌破当前关键支撑，并在4小时级别延续下跌结构，则震荡修复判断失效。",
      "若價格放量跌破當前關鍵支撐，並在4小時級別延續下跌結構，則震盪修復判斷失效。",
      "Heavy break of key support with continuing 4H down-structure invalidates the repair view."
    ),
    notes: [
      lt("逐日路径属于低权重六爻拆解，不代表每个自然日必然收阴或收阳", "逐日路徑屬於低權重六爻拆解，不代表每個自然日必然收陰或收陽", "Daily path is low-weight decomposition — not guaranteed daily closes"),
      lt("本研究为用户自测卦，不能沿用私人导师01的历史准确率", "本研究為用戶自測卦，不能沿用私人導師01的歷史準確率", "User self-test — no Mentor 01 accuracy inheritance"),
      lt("不得写成8月6日前必然上涨", "不得寫成8月6日前必然上漲", "Not a guaranteed rise before Aug 6"),
    ],
    attachments: [
      {
        id: "btc-short-20260727",
        divinationAt: "2026-07-27T19:30:00+08:00",
        question: lt("比特币从今天到8月6日走势", "比特幣從今天到8月6日走勢", "Bitcoin from today to Aug 6"),
        redactedImageUrl: "/research/attachments/btc-20260727-short-redacted.svg",
        adminOriginalStored: true,
      },
    ],
    liuYaoFactorAnalysisId: "FACTOR-MX-BTC-20260727-0806-LIUYAO-001",
    thesis: [ORACLE_DISCLAIMER],
    status: "pending",
    tags: ["bitcoin", "oracle-six-yao", "short-cycle", "pending-human-review", "user-self-test"],
    disclaimer: ORACLE_DISCLAIMER,
    ...PENDING_REVIEW,
  },
  {
    id: "MX-BTC-20260727-0907-LIUYAO-001",
    publishedAt: "2026-07-27",
    forecastStart: "2026-07-27",
    forecastEnd: "2026-09-07",
    verificationDate: "2026-09-09",
    assetId: "bitcoin",
    assetName: lt("比特币", "比特幣", "Bitcoin"),
    symbol: "BTC",
    market: "crypto",
    framework: "oracle-six-yao",
    sourceType: "external-symbolic-analysis",
    publicSourceLabel: lt("用户自测", "用戶自測", "User self-test"),
    direction: "slightly-bullish",
    editorialConfidence: 64,
    consensusEligible: false,
    excludeFromHomeViews: true,
    layer: "tactical",
    parentRecordId: "ORACLE-0009",
    derivedFromRecordIds: ["ORACLE-0009", "MX-BTC-20260727-0806-LIUYAO-001"],
    sourceStatus: "raw_source_saved",
    forecastType: lt("中周期", "中周期", "Mid cycle"),
    category: lt("加密资产", "加密資產", "Crypto"),
    ratingDisplay: lt("待人工审核", "待人工審核", "Pending human review"),
    horizon: lt("2026-07-27 至 2026-09-07", "2026-07-27 至 2026-09-07", "2026-07-27 to 2026-09-07"),
    title: lt(
      "比特币至9月初高波动推进，申月后关注修复强化",
      "比特幣至9月初高波動推進，申月後關注修復強化",
      "BTC: high-volatility advance into early Sep; post-Shen-month repair watch"
    ),
    summary: lt(
      "主卦兑为泽（六冲），变卦火雷噬嗑。六冲表示走势反复、假突破和快速回撤较多；财爻发动且仍化财，说明价格力量存在，但上涨过程需要逐步消化阻力。8月中下旬偏向修复，9月初进入阶段高位和转折观察区。",
      "主卦兌為澤（六沖），變卦火雷噬嗑。六沖表示走勢反覆、假突破和快速回撤較多；財爻發動且仍化財，說明價格力量存在，但上漲過程需要逐步消化阻力。8月中下旬偏向修復，9月初進入階段高位和轉折觀察區。",
      "Dui Ze (six clash) → Shi He. Six clash = whipsaws and false breaks; wealth moving and still transforms to wealth — price force exists but must grind through resistance. Mid-late Aug leans repair; early Sep enters high/turn watch."
    ),
    moonxInterpretation: lt(
      "六冲代表路径反复，不代表确定下跌；噬嗑表示突破阻力需要过程。9月初高位观察与私人导师01年度高点判断形成时间共振，但来源不同，不能合并统计准确率。",
      "六沖代表路徑反覆，不代表確定下跌；噬嗑表示突破阻力需要過程。9月初高位觀察與私人導師01年度高點判斷形成時間共振，但來源不同，不能合併統計準確率。",
      "Six clash = path volatility, not assured decline. Shi He = grinding through resistance. Early-Sep high window resonates with Mentor 01 annual timing — different sources, do not merge accuracy stats."
    ),
    hexagramDetail: {
      primary: lt("兑为泽（六冲）", "兌為澤（六沖）", "Dui Ze (six clash)"),
      transformed: lt("火雷噬嗑", "火雷噬嗑", "Huo Lei Shi He"),
      worldLine: lt("父母未土持世", "父母未土持世", "Parent Wei earth holds world"),
      responseLine: lt("父母丑土临应", "父母丑土臨應", "Parent Chou earth on response"),
      movingLines: [
        {
          from: lt("父母未土", "父母未土", "Parent Wei earth"),
          to: lt("官鬼巳火", "官鬼巳火", "Officer Si fire"),
          sixSpirit: lt("白虎", "白虎", "Baihu"),
          interpretation: lt(
            "父母未土发动化官鬼巳火，临白虎：宏观或政策因素可能转化为风险压力，过程可能出现突发波动。",
            "父母未土發動化官鬼巳火，臨白虎：宏觀或政策因素可能轉化為風險壓力，過程可能出現突發波動。",
            "Parent Wei moves to officer Si, Baihu spirit — macro/policy may flip to risk shocks."
          ),
          verificationStatus: "pending-human-review",
        },
        {
          from: lt("兄弟酉金", "兄弟酉金", "Sibling You metal"),
          to: lt("父母未土", "父母未土", "Parent Wei earth"),
          sixSpirit: lt("腾蛇", "騰蛇", "Tengshe"),
          interpretation: lt(
            "兄弟酉金发动化父母未土，临腾蛇：筹码和资金争夺转化为消息、规则或市场预期扰动，真假信号较多。",
            "兄弟酉金發動化父母未土，臨騰蛇：籌碼和資金爭奪轉化為消息、規則或市場預期擾動，真假信號較多。",
            "Sibling You → parent Wei, Tengshe — chip fights become noisy narrative/rule shocks."
          ),
          verificationStatus: "pending-human-review",
        },
        {
          from: lt("妻财卯木", "妻財卯木", "Wealth Mao wood"),
          to: lt("妻财寅木", "妻財寅木", "Wealth Yin wood"),
          sixSpirit: lt("青龙", "青龍", "Qinglong"),
          interpretation: lt(
            "妻财卯木发动化妻财寅木，临青龙：财爻发动且仍化财，价格推动力量保持，但卯化寅为退势倾向，后续上涨动力可能边际减弱。",
            "妻財卯木發動化妻財寅木，臨青龍：財爻發動且仍化財，價格推動力量保持，但卯化寅為退勢傾向，後續上漲動力可能邊際減弱。",
            "Wealth Mao → wealth Yin, Qinglong — price force persists but Mao→Yin may fade marginal momentum."
          ),
          verificationStatus: "pending-human-review",
        },
      ],
      structureNotes: [
        lt("世应皆为父母爻，说明宏观、监管、政策、ETF资金及市场消息是主要驱动力", "世應皆為父母爻，說明宏觀、監管、政策、ETF資金及市場消息是主要驅動力", "World/response both parents — macro/policy/ETF flows dominate"),
        lt("妻财卯木直接上卦并发动，代表价格上行力量仍然存在", "妻財卯木直接上卦並發動，代表價格上行力量仍然存在", "Wealth Mao on chart and moving — upside force present"),
        lt("财爻卯木化寅木，属于财化财，但需注意化退后的边际动力衰减", "財爻卯木化寅木，屬於財化財，但需注意化退後的邊際動力衰減", "Wealth→wealth but retreat tendency on Yin"),
        lt("子孙亥水直接上卦，市场成长和生财动力存在", "子孫亥水直接上卦，市場成長和生財動力存在", "Child Hai present — growth/generative force exists"),
        lt("兄弟酉金发动，说明上涨过程中仍有筹码争夺和获利兑现", "兄弟酉金發動，說明上漲過程中仍有籌碼爭奪和獲利兌現", "Sibling You moves — profit-taking/chip fights"),
        lt("六冲主高波动和反复，不能直接等同于看跌", "六沖主高波動和反覆，不能直接等同於看跌", "Six clash = volatility, not equal to bearish"),
        lt("噬嗑表示行情需要逐步消化阻力，突破过程不会轻松", "噬嗑表示行情需要逐步消化阻力，突破過程不會輕鬆", "Shi He — resistance must be chewed through"),
      ],
    },
    expectedPath: [
      {
        start: "2026-07-27",
        end: "2026-08-06",
        direction: lt("高波动换手", "高波動換手", "High-volatility rotation"),
        title: lt("六冲下的假突破风险", "六沖下的假突破風險", "False-break risk under six clash"),
        description: lt("六冲结构下容易出现假突破、假跌破和快速反向波动。", "六沖結構下容易出現假突破、假跌破和快速反向波動。", "Six clash — false breaks and whipsaws."),
      },
      {
        start: "2026-08-07",
        end: "2026-08-31",
        direction: lt("震荡修复", "震盪修復", "Oscillating repair"),
        title: lt("8月中下旬修复观察", "8月中下旬修復觀察", "Mid-late Aug repair watch"),
        description: lt(
          "结合既有BTC流年研究，申月以后反弹和资金修复条件可能增强，但仍需技术结构确认。",
          "結合既有BTC流年研究，申月以後反彈和資金修復條件可能增強，但仍需技術結構確認。",
          "Aligns with annual BTC view — post-Shen month may improve repair odds; needs technical confirmation."
        ),
      },
      {
        start: "2026-09-01",
        end: "2026-09-07",
        direction: lt("阶段高位或转折观察", "階段高位或轉折觀察", "Stage high or turn watch"),
        title: lt("9月高点窗口重叠", "9月高點窗口重疊", "September high-window overlap"),
        description: lt(
          "与既有年度研究中的9月高点窗口重叠，应重点防范冲高后动力衰减。",
          "與既有年度研究中的9月高點窗口重疊，應重點防範沖高後動力衰減。",
          "Overlaps ORACLE-0009 Sep high window — watch for momentum fade after spike."
        ),
      },
    ],
    scenarios: [
      {
        name: lt("震荡上行并在9月初进入高位区", "震盪上行並在9月初進入高位區", "Oscillating advance into early-Sep highs"),
        probability: 55,
      },
      {
        name: lt("宽幅区间反复", "寬幅區間反覆", "Wide-range chop"),
        probability: 30,
      },
      {
        name: lt("持续弱势下跌", "持續弱勢下跌", "Persistent weakness"),
        probability: 15,
      },
    ],
    invalidation: lt(
      "若8月进入申月后价格仍持续创新低，且4小时和日线趋势均未出现修复，则中周期震荡上涨判断失效。",
      "若8月進入申月後價格仍持續創新低，且4小時和日線趨勢均未出現修復，則中周期震盪上漲判斷失效。",
      "If post-Shen month keeps making lows with no 4H/D repair, mid-cycle bullish bias fails."
    ),
    notes: [
      lt("六冲代表路径反复，不代表确定下跌", "六沖代表路徑反覆，不代表確定下跌", "Six clash ≠ assured decline"),
      lt("噬嗑表示突破阻力需要过程，不能解释成必然突破", "噬嗑表示突破阻力需要過程，不能解釋成必然突破", "Shi He ≠ guaranteed breakout"),
      lt("9月初高位观察与私人导师01年度高点判断形成共振，但来源不同，不能合并统计准确率", "9月初高位觀察與私人導師01年度高點判斷形成共振，但來源不同，不能合併統計準確率", "Sep timing resonates with Mentor 01 — separate accuracy tracking"),
    ],
    attachments: [
      {
        id: "btc-mid-20260727",
        divinationAt: "2026-07-27T19:33:00+08:00",
        question: lt("比特币从今天到9月7日走势", "比特幣從今天到9月7日走勢", "Bitcoin from today to Sep 7"),
        redactedImageUrl: "/research/attachments/btc-20260727-mid-redacted.svg",
        adminOriginalStored: true,
      },
    ],
    liuYaoFactorAnalysisId: "FACTOR-MX-BTC-20260727-0907-LIUYAO-001",
    thesis: [ORACLE_DISCLAIMER],
    status: "pending",
    tags: ["bitcoin", "oracle-six-yao", "mid-cycle", "pending-human-review", "user-self-test"],
    disclaimer: ORACLE_DISCLAIMER,
    ...PENDING_REVIEW,
  },
];
