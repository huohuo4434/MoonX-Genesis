/**
 * Precious metals pack — international gold weekly, XAU annual, SLV verified result.
 * BTC annual lives only on ORACLE-0009 (merged there; do not duplicate here).
 * No invented support/resistance from six-yao alone.
 */
import { lt } from "@/lib/i18n/config";
import type { ResearchCollection, ResearchRecord } from "@/types/research";

const DISCLAIMER = lt(
  "传统象数研究属于非科学验证框架，仅作为研究记录与后续复盘样本，不构成投资建议。",
  "傳統象數研究屬於非科學驗證框架，僅作為研究記錄與後續復盤樣本，不構成投資建議。",
  "Traditional symbolic research is a non-scientific verification framework. It is retained as a research record and review sample only, and does not constitute investment advice."
);

const LEVELS_PENDING = lt("等待技术面补充", "等待技術面補充", "Pending technical analysis");

const MENTOR_RELIABILITY = {
  overall: lt("中高", "中高", "Medium-high"),
  strengths: [
    lt("年度大方向", "年度大方向", "Annual big-picture direction"),
    lt("高点月份", "高點月份", "High months"),
    lt("上涨目标区域", "上漲目標區域", "Upside target zones"),
    lt("重大转折窗口", "重大轉折窗口", "Major turning windows"),
    lt("风险事件性质", "風險事件性質", "Risk-event character"),
    lt("系统性风险强弱判断", "系統性風險強弱判斷", "Systemic vs non-systemic risk judgment"),
  ],
  weaknesses: [
    lt("精确低点月份", "精確低點月份", "Exact low months"),
    lt("下跌目标价格", "下跌目標價格", "Downside target prices"),
    lt("极短线逐日点位", "極短線逐日點位", "Ultra-short daily price points"),
  ],
  note: lt(
    "这是用户历史复核后的定性评价，不是正式统计准确率。",
    "這是用戶歷史複核後的定性評價，不是正式統計準確率。",
    "This is a qualitative evaluation after user historical review, not an official statistical accuracy rate."
  ),
};

export const preciousMetalsCryptoCollections: ResearchCollection[] = [
  {
    id: "precious-metals-research-2026-07",
    title: lt("贵金属研究", "貴金屬研究", "Precious Metals Research"),
    description: lt(
      "国际金价周度六爻、国际黄金年度展望，以及白银已完成交易周的验证复盘。",
      "國際金價週度六爻、國際黃金年度展望，以及白銀已完成交易週的驗證復盤。",
      "International gold weekly six-yao, international gold annual outlook, and silver completed-week verification review."
    ),
    frameworks: ["oracle-six-yao"],
    sourceType: "private-teacher",
    publishedAt: "2026-07-27",
    forecastStart: "2026-07-20",
    forecastEnd: "2026-12-31",
  },
  {
    id: "crypto-long-range-research-2026",
    title: lt("加密资产长期研究", "加密資產長期研究", "Crypto Long-Range Research"),
    description: lt(
      "比特币等加密资产的年度六爻研判；与短期战术预测分开展示。主记录为 ORACLE-0009。",
      "比特幣等加密資產的年度六爻研判；與短期戰術預測分開展示。主記錄為 ORACLE-0009。",
      "Annual six-yao outlooks for crypto assets, shown separately from short-term tactics. Canonical record: ORACLE-0009."
    ),
    frameworks: ["oracle-six-yao"],
    sourceType: "private-teacher",
    publishedAt: "2026-07-01",
    forecastStart: "2026-01-01",
    forecastEnd: "2027-01-31",
  },
];

export const preciousMetalsCryptoOracleRecords: ResearchRecord[] = [
  {
    id: "MX-GLD-20260727-WEEKLY-001",
    aliases: ["XAU-2026-0727-ORACLE-WEEKLY-001"],
    publishedAt: "2026-07-27",
    forecastStart: "2026-07-27",
    forecastEnd: "2026-07-31",
    assetId: "gold",
    assetName: lt("国际金价", "國際金價", "International Gold"),
    symbol: "GOLD",
    sourceSymbol: "GC=F",
    appliedAssetId: "gold",
    market: "commodity",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    publicSourceLabel: lt("私人导师01", "私人導師01", "Private Mentor 01"),
    sourceProfileId: "PRIVATE-MENTOR-01",
    sourceReliability: MENTOR_RELIABILITY,
    direction: "slightly-bearish",
    editorialConfidence: 63,
    researchScore: 63,
    consensusEligible: true,
    layer: "tactical",
    sourceStatus: "raw_source_saved",
    collectionId: "precious-metals-research-2026-07",
    ratingDisplay: lt("略微看跌", "略微看跌", "Slightly bearish"),
    researchAttribute: lt("传统象数研究", "傳統象數研究", "Traditional symbolic research"),
    levelsPendingLabel: LEVELS_PENDING,
    hexagramPrimary: lt("泽天夬", "澤天夬", "Lake over Heaven — Breakthrough (Guai)"),
    hexagramChanged: lt("乾为天", "乾為天", "Heaven — The Creative (Qian)"),
    hexagramDetail: {
      primary: lt("泽天夬", "澤天夬", "Guai"),
      mutual: lt("乾为天", "乾為天", "Qian"),
      transformed: lt("乾为天", "乾為天", "Qian"),
      movingLine: 6,
      worldLine: lt(
        "本卦五爻子孙酉金持世；变卦上爻兄弟戌土持世",
        "本卦五爻子孫酉金持世；變卦上爻兄弟戌土持世",
        "Primary: fifth-line child You-Metal holds self; changed: upper sibling Xu-Earth holds self"
      ),
      structureNotes: [
        lt("上六兄弟未土发动，化兄弟戌土，为化进神", "上六兄弟未土發動，化兄弟戌土，為化進神", "Upper sibling Wei-Earth moves and transforms to Xu-Earth (advancing spirit)"),
        lt("越到本周后段，兄弟爻代表的争夺、兑现和压价力量越强", "越到本週後段，兄弟爻代表的爭奪、兌現和壓價力量越強", "Later in the week, sibling-line contest / take-profit / pressure strengthens"),
        lt("妻财亥水化父母午火，财气受到消息和宏观因素牵制", "妻財亥水化父母午火，財氣受到消息和宏觀因素牽制", "Wealth Hai-Water transforms to parent Wu-Fire — wealth constrained by news/macro"),
        lt("初爻妻财子水受午月冲，为月破，承接力量不足", "初爻妻財子水受午月沖，為月破，承接力量不足", "Initial wealth Zi-Water is month-broken by Wu month — absorption is weak"),
        lt("官鬼寅木旬空", "官鬼寅木旬空", "Officer Yin-Wood is empty in the decade"),
        lt("乾为天不能单独解释为持续上涨，必须结合兄弟持世和财爻衰弱判断", "乾為天不能單獨解釋為持續上漲，必須結合兄弟持世和財爻衰弱判斷", "Qian alone is not sustained upside — combine with sibling holding self and weak wealth"),
      ],
    },
    horizon: lt("周度 · 2026-07-27至07-31", "週度 · 2026-07-27至07-31", "Weekly · 2026-07-27 to 07-31"),
    title: lt(
      "黄金本周先涨后跌，后半周回落风险上升",
      "黃金本週先漲後跌，後半週回落風險上升",
      "Gold this week: rise then fall; late-week pullback risk rises"
    ),
    summary: lt(
      "本周前段可能延续高位试探或冲高；随着上六兄弟爻发动并化进，后半周获利兑现和回落风险逐渐增大，整体更偏向先涨后跌或周线收弱。",
      "本週前段可能延續高位試探或衝高；隨著上六兄弟爻發動並化進，後半週獲利兌現和回落風險逐漸增大，整體更偏向先漲後跌或週線收弱。",
      "Early week may extend a high-range probe or push higher; as upper sibling moves and advances, late-week take-profit and pullback risk rise — bias favors rise-then-fall or a soft weekly close."
    ),
    moonxInterpretation: lt(
      "路径口径为先涨后跌。旧分析图底部“本周先跌后涨”与卦爻及逐日结构矛盾，已禁止录入。",
      "路徑口徑為先漲後跌。舊分析圖底部「本週先跌後漲」與卦爻及逐日結構矛盾，已禁止錄入。",
      "Path label is rise-then-fall. The old image footer “dip then rise” contradicts the hexagram and day path and is not entered."
    ),
    shortHorizonSummary: lt(
      "7月27日至28日高位震荡或试高；7月29日至30日转折和冲高回落风险上升；7月31日偏向低位震荡、探低企稳或弱势收尾。",
      "7月27日至28日高位震盪或試高；7月29日至30日轉折和衝高回落風險上升；7月31日偏向低位震盪、探低企穩或弱勢收尾。",
      "Jul 27–28: high-range chop or probe highs; Jul 29–30: turn / probe-fade risk rises; Jul 31: low-range chop, dip-stabilize, or soft close."
    ),
    thesis: [
      lt("路径标签：先涨后跌（禁止使用“先跌后涨”）。", "路徑標籤：先漲後跌（禁止使用「先跌後漲」）。", "Path tag: rise then fall (do not use “dip then rise”)."),
      lt("日级节奏属于低权重时间假设，不得写成某日必然见顶或必然见底。", "日級節奏屬於低權重時間假設，不得寫成某日必然見頂或必然見底。", "Daily rhythm is a low-weight timing hypothesis — not a certain top/bottom day."),
    ],
    scenarios: [
      {
        name: lt("先涨后跌并周线收跌", "先漲後跌並週線收跌", "Rise then fall with a down week"),
        probability: 55,
        description: lt("周初高位震荡或冲高，周中后卖压增强，周线收弱。", "週初高位震盪或衝高，週中後賣壓增強，週線收弱。", "Early high-range or probe; later sell pressure; soft week."),
      },
      {
        name: lt("宽幅震荡并接近平收", "寬幅震盪並接近平收", "Wide range, near flat week"),
        probability: 25,
        description: lt("盘中波动较大，但周线涨跌幅有限。", "盤中波動較大，但週線漲跌幅有限。", "Large intraday swings but limited weekly change."),
      },
      {
        name: lt("突破前高并延续上涨", "突破前高並延續上漲", "Break prior high and extend"),
        probability: 20,
        description: lt("需要真实价格放量突破并站稳前高确认。", "需要真實價格放量突破並站穩前高確認。", "Requires a real volume break and hold above the prior high."),
      },
    ],
    invalidation: lt(
      "若价格放量突破本周前高并连续站稳，且周中没有出现明显冲高回落，则先涨后跌情景失效。",
      "若價格放量突破本週前高並連續站穩，且週中沒有出現明顯衝高回落，則先漲後跌情景失效。",
      "If price volume-breaks and holds the week’s prior high without a clear midweek probe-fade, the rise-then-fall scenario is invalidated."
    ),
    risks: [
      lt("日级节奏属于低权重时间假设，不得写成某日必然见顶或必然见底。", "日級節奏屬於低權重時間假設，不得寫成某日必然見頂或必然見底。", "Daily rhythm is low-weight timing — not a certain top/bottom day."),
      lt("本记录只提供研究情景，不构成交易建议。", "本記錄只提供研究情景，不構成交易建議。", "Research scenario only — not trading advice."),
      DISCLAIMER,
    ],
    turningWindows: [
      { id: "gld-0727-probe", start: "2026-07-27", end: "2026-07-28", label: lt("高位试探与冲高窗口", "高位試探與衝高窗口", "High-range probe / push window") },
      { id: "gld-0727-fade", start: "2026-07-29", end: "2026-07-30", label: lt("冲高回落风险窗口", "衝高回落風險窗口", "Probe-fade risk window") },
      { id: "gld-0727-soft", date: "2026-07-31", label: lt("周线弱势收尾观察", "週線弱勢收尾觀察", "Soft weekly-close watch") },
    ],
    verificationChecklist: [
      lt("验证日期：2026-08-01", "驗證日期：2026-08-01", "Verification date: 2026-08-01"),
      lt("状态：进行中 / 待验证", "狀態：進行中 / 待驗證", "Status: active / pending verification"),
    ],
    status: "active",
    tags: ["gold", "gld", "weekly", "oracle-six-yao", "high-then-soft", "private-mentor-01", "pending-verification"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "MX-XAU-2026-ANNUAL-001",
    aliases: ["XAU-2026-ANNUAL-ORACLE-001", "oracle-gold-2026-annual"],
    publishedAt: "2026-07-27",
    forecastStart: "2026-01-01",
    forecastEnd: "2026-12-31",
    assetId: "gold",
    assetName: lt("国际黄金", "國際黃金", "International Gold"),
    symbol: "XAU",
    market: "commodity",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    publicSourceLabel: lt("私人导师01", "私人導師01", "Private Mentor 01"),
    sourceProfileId: "PRIVATE-MENTOR-01",
    sourceReliability: MENTOR_RELIABILITY,
    direction: "slightly-bearish",
    editorialConfidence: 70,
    researchScore: 70,
    consensusEligible: true,
    layer: "strategic",
    isLongRange: true,
    sourceStatus: "summary_only",
    collectionId: "precious-metals-research-2026-07",
    ratingDisplay: lt("中性偏空", "中性偏空", "Neutral soft-bearish"),
    researchAttribute: lt("传统象数研究", "傳統象數研究", "Traditional symbolic research"),
    levelsPendingLabel: LEVELS_PENDING,
    horizon: lt("2026全年", "2026全年", "Full year 2026"),
    title: lt(
      "黄金2026年高位转弱与下半年高波动情景",
      "黃金2026年高位轉弱與下半年高波動情景",
      "Gold 2026: high-zone softening and H2 high-volatility scenario"
    ),
    summary: lt(
      "研究认为黄金2026年难以延续单边上涨，上半年可能形成全年主要高位；7月以后逐渐进入高波动和偏弱阶段，高位追涨的风险收益比下降。",
      "研究認為黃金2026年難以延續單邊上漲，上半年可能形成全年主要高位；7月以後逐漸進入高波動和偏弱階段，高位追漲的風險收益比下降。",
      "Research sees gold unlikely to extend a one-way 2026 advance; H1 may form the year’s main high zone; after July, high volatility and a softer bias rise — chase-high risk/reward worsens."
    ),
    moonxInterpretation: lt(
      "正确口径是高位转弱、高波动和追高风险增加，不是黄金2026年必然暴跌。",
      "正確口徑是高位轉弱、高波動和追高風險增加，不是黃金2026年必然暴跌。",
      "Correct framing is high-zone softening, high volatility, and worse chase-high risk — not a guaranteed 2026 collapse."
    ),
    thesis: [
      lt("兄弟亥水持世", "兄弟亥水持世", "Sibling Hai-Water holds self"),
      lt("妻财午火伏于兄弟亥水之下", "妻財午火伏於兄弟亥水之下", "Wealth Wu-Fire hides under sibling Hai-Water"),
      lt("飞神兄弟亥水克伏神妻财午火", "飛神兄弟亥水克伏神妻財午火", "Flying sibling Hai-Water overcomes hidden wealth Wu-Fire"),
      lt("财爻伏藏且在起卦时节不旺，年度上涨难以持续顺畅", "財爻伏藏且在起卦時節不旺，年度上漲難以持續順暢", "Wealth is hidden and not strong at cast time — sustained annual upside is hard"),
      lt("巳午月财火旺，为上半年主要高点窗口", "巳午月財火旺，為上半年主要高點窗口", "Si–Wu months strengthen wealth-fire — main H1 high window"),
      lt("未月冲墓后，父母申金生兄弟亥水，构成宏观因素增强压价力量的生克链", "未月沖墓後，父母申金生兄弟亥水，構成宏觀因素增強壓價力量的生克鏈", "After Wei-month tomb clash, parent Shen-Metal generates sibling Hai-Water — a macro chain that strengthens selling pressure"),
      lt("该来源将2026年定义为黄金本轮行情的强弩之末阶段", "該來源將2026年定義為黃金本輪行情的強弩之末階段", "Source frames 2026 as late-stage exhaustion of the gold cycle"),
    ],
    monthlyActivation: [
      {
        period: "2026年5月至6月",
        earthlyBranch: "巳月、午月",
        mechanism: "妻财午火逐渐得令；巳月冲动压制财爻的兄弟亥水，午月财爻临值。",
        expectedEffect: "上半年高位或全年主要顶部窗口。",
        signalDirectness: "直接",
        reliability: "高",
      },
      {
        period: "2026年7月以后",
        earthlyBranch: "未月及以后",
        mechanism: "未月冲丑墓，父母申金被激活；申金生兄弟亥水，兄弟转旺后继续压制伏藏的妻财午火。",
        expectedEffect: "黄金逐渐由高位转弱，国际局势、资本和宏观因素可能成为下跌催化。",
        signalDirectness: "半直接",
        reliability: "中高",
      },
    ],
    scenarios: [
      { name: lt("上半年形成主要高点，下半年震荡下行", "上半年形成主要高點，下半年震盪下行", "H1 main high, H2 oscillating decline"), probability: 65 },
      { name: lt("下半年维持高位宽幅震荡", "下半年維持高位寬幅震盪", "H2 stays high-range wide chop"), probability: 25 },
      { name: lt("突破上半年高点并开启持续主升", "突破上半年高點並開啟持續主升", "Break H1 high into sustained advance"), probability: 10 },
    ],
    invalidation: lt(
      "价格持续突破上半年高点，并在月线级别确认站稳。",
      "價格持續突破上半年高點，並在月線級別確認站穩。",
      "Price sustainably breaks the H1 high and confirms on the monthly timeframe."
    ),
    risks: [
      lt("不能把此结论写成黄金2026年必然暴跌。", "不能把此結論寫成黃金2026年必然暴跌。", "Do not frame as a guaranteed 2026 collapse."),
      lt("正确口径是高位转弱、高波动和追高风险增加。", "正確口徑是高位轉弱、高波動和追高風險增加。", "Correct framing: high-zone softening, high volatility, chase-high risk."),
      DISCLAIMER,
    ],
    turningWindows: [
      {
        id: "xau-2026-h2-soften",
        start: "2026-07-01",
        end: "2026-12-31",
        label: lt("下半年高位转弱观察窗口", "下半年高位轉弱觀察窗口", "H2 high-zone softening watch"),
        note: lt("重点验证是否出现逐渐下滑及高位震荡转弱。", "重點驗證是否出現逐漸下滑及高位震盪轉弱。", "Verify gradual softening and high-range fade."),
      },
      {
        id: "xau-2026-verify",
        date: "2027-01-05",
        label: lt("年度预测阶段验证", "年度預測階段驗證", "Annual forecast phase verification"),
      },
    ],
    verificationChecklist: [
      lt("验证日期：2027-01-05", "驗證日期：2027-01-05", "Verification date: 2027-01-05"),
      lt("状态：进行中 / 待验证", "狀態：進行中 / 待驗證", "Status: active / pending verification"),
    ],
    status: "active",
    tags: ["gold", "xau", "annual", "oracle-six-yao", "private-mentor-01", "pending-verification"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "MX-SLV-20260720-WEEKLY-VERIFIED-001",
    aliases: ["SLV-2026-0720-WEEKLY-RESULT-001"],
    publishedAt: "2026-07-25",
    forecastStart: "2026-07-20",
    forecastEnd: "2026-07-24",
    assetId: "silver",
    assetName: lt("白银ETF", "白銀ETF", "Silver ETF"),
    symbol: "SLV",
    market: "commodity",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    publicSourceLabel: lt("私人导师01", "私人導師01", "Private Mentor 01"),
    sourceProfileId: "PRIVATE-MENTOR-01",
    sourceReliability: MENTOR_RELIABILITY,
    direction: "insufficient-evidence",
    editorialConfidence: 0,
    researchScore: 0,
    consensusEligible: false,
    layer: "tactical",
    sourceStatus: "raw_source_saved",
    collectionId: "precious-metals-research-2026-07",
    excludeFromHomeViews: true,
    ratingDisplay: lt("已验证 · 形态吻合", "已驗證 · 形態吻合", "Verified · structure match"),
    researchAttribute: lt("六爻验证复盘", "六爻驗證復盤", "Six-yao verification review"),
    levelsPendingLabel: LEVELS_PENDING,
    hexagramPrimary: lt("天风姤", "天風姤", "Heaven over Wind — Coming to Meet (Gou)"),
    hexagramChanged: lt("泽风大过", "澤風大過", "Lake over Wind — Great Exceeding (Daguo)"),
    hexagramDetail: {
      primary: lt("天风姤", "天風姤", "Gou"),
      transformed: lt("泽风大过（游魂）", "澤風大過（遊魂）", "Daguo (wandering soul)"),
      movingLine: 6,
      structureNotes: [
        lt("姤卦对应行情突然启动或快速相遇", "姤卦對應行情突然啟動或快速相遇", "Gou corresponds to sudden launch / rapid encounter"),
        lt("大过对应力量过度、波动放大和冲高后的压力", "大過對應力量過度、波動放大和衝高後的壓力", "Daguo corresponds to excess force, amplified volatility, post-spike pressure"),
        lt("实际走势呈现快速上涨后剧烈回撤", "實際走勢呈現快速上漲後劇烈回撤", "Actual path showed a fast rise then sharp pullback"),
      ],
    },
    horizon: lt("周度复盘 · 2026-07-20至07-24", "週度復盤 · 2026-07-20至07-24", "Weekly review · 2026-07-20 to 07-24"),
    title: lt("白银天风姤变泽风大过周度验证", "白銀天風姤變澤風大過週度驗證", "Silver Gou→Daguo weekly verification"),
    summary: lt(
      "白银当周上涨3.56%，表现为周初温和上涨、周中快速拉升、周四剧烈回撤、周五修复。实际路径与天风姤的突然启动及泽风大过的过度波动特征较为吻合。",
      "白銀當週上漲3.56%，表現為週初溫和上漲、週中快速拉升、週四劇烈回撤、週五修復。實際路徑與天風姤的突然啟動及澤風大過的過度波動特徵較為吻合。",
      "Silver rose 3.56% that week: mild early rise, midweek surge, Thursday sharp pullback, Friday repair. Path matches Gou’s sudden launch and Daguo’s excess-volatility character relatively well."
    ),
    thesis: [
      lt("记录类型：历史验证复盘，不是当前预测。", "記錄類型：歷史驗證復盤，不是當前預測。", "Record type: historical verification review — not a live forecast."),
      lt("验证结论：形态吻合，方向暂不计分。", "驗證結論：形態吻合，方向暫不計分。", "Conclusion: structure match; direction not scored yet."),
    ],
    verificationResult: {
      actualDirection: lt("上涨", "上漲", "Up"),
      actualChangePct: 3.56,
      actualClose: 52.59,
      dailyResults: [
        { date: "2026-07-20", changePct: 0.39, close: 50.98 },
        { date: "2026-07-21", changePct: 4.12, close: 53.08 },
        { date: "2026-07-22", changePct: 1.5, close: 53.92 },
        { date: "2026-07-23", changePct: -3.45, close: 52.06 },
        { date: "2026-07-24", changePct: 1.02, close: 52.59 },
      ],
      conclusion: lt(
        "突然拉升、过度扩张和冲高回撤的形态与卦象较为吻合。",
        "突然拉升、過度擴張和衝高回撤的形態與卦象較為吻合。",
        "Sudden surge, excess expansion, and probe-fade structure match the hexagram relatively well."
      ),
      scoreEligible: false,
      scoreNote: lt(
        "缺少事前完整预测文字，不能据此统计方向准确率，只记录形态验证。",
        "缺少事前完整預測文字，不能據此統計方向準確率，只記錄形態驗證。",
        "Without the full ex-ante forecast text, direction accuracy is not scored — structure verification only."
      ),
    },
    verificationChecklist: [
      lt("验证日期：2026-07-25", "驗證日期：2026-07-25", "Verification date: 2026-07-25"),
      lt("状态：已验证", "狀態：已驗證", "Status: verified"),
      lt("实际涨幅：+3.56%", "實際漲幅：+3.56%", "Actual return: +3.56%"),
      lt("验证结论：形态吻合，方向暂不计分", "驗證結論：形態吻合，方向暫不計分", "Conclusion: structure match; direction not scored"),
    ],
    status: "verified",
    tags: ["silver", "slv", "weekly-review", "verified", "structure-match", "no-direction-score", "exclude-from-home"],
    disclaimer: DISCLAIMER,
  },
];
