/**
 * Oil mid-term and SSE annual six-yao records (2026-07-27 batch).
 * Does not override existing Qimen bullish or mid-term oracle bullish A-share records.
 */
import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

const ORACLE_DISCLAIMER = lt(
  "传统象数研究属于非科学验证框架，仅作为研究记录与后续复盘样本，不构成投资建议。",
  "傳統象數研究屬於非科學驗證框架，僅作為研究記錄與後續復盤樣本，不構成投資建議。",
  "Traditional symbolic research is a non-scientific verification framework. It is retained as a research record and review sample only, and does not constitute investment advice."
);

export const oilSseLiuyao2026Records: ResearchRecord[] = [
  {
    id: "MX-OIL-20260602-0903-LIUYAO-001",
    publishedAt: "2026-07-27",
    forecastStart: "2026-06-02",
    forecastEnd: "2026-09-03",
    verificationDate: "2026-09-05",
    assetId: "crude-oil",
    assetName: lt("国际原油", "國際原油", "International Crude Oil"),
    symbol: "WTI / Brent",
    market: "commodity",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    publicSourceLabel: lt("私人导师01", "私人導師01", "Private Mentor 01"),
    direction: "bearish",
    editorialConfidence: 72,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "raw_source_saved",
    forecastType: lt("中期", "中期", "Medium term"),
    category: lt("能源", "能源", "Energy"),
    ratingDisplay: lt("看跌", "看跌", "Bearish"),
    horizon: lt("2026-06-02 至 2026-09-03", "2026-06-02 至 2026-09-03", "2026-06-02 to 2026-09-03"),
    title: lt(
      "国际油价前期震荡、立秋后向正常区间回落",
      "國際油價前期震盪、立秋後向正常區間回落",
      "Oil: Early Churn, Normalization Fade After Start of Autumn"
    ),
    summary: lt(
      "研究认为6月至7月油价仍可能受到地缘冲突和霍尔木兹海峡通航问题影响，呈现反复震荡及有限反弹；立秋和申月前后，风险化解与供应恢复力量增强，战争溢价逐渐消退，油价更可能加速向70美元附近正常区间回落。",
      "研究認為6月至7月油價仍可能受到地緣衝突和霍爾木茲海峽通航問題影響，呈現反覆震盪及有限反彈；立秋和申月前後，風險化解與供應恢復力量增強，戰爭溢價逐漸消退，油價更可能加速向70美元附近正常區間回落。",
      "June–July may stay choppy on geopolitics and Hormuz shipping; after Start of Autumn / Shen month, de-escalation and supply recovery may fade war premium and pull oil toward a ~$70 normalization band."
    ),
    moonxInterpretation: lt(
      "本记录为中期六爻路径，与现有原油周度节奏及2026-07-26至10-10周期研究属于不同时间尺度，不得相互覆盖。",
      "本記錄為中期六爻路徑，與現有原油週度節奏及2026-07-26至10-10週期研究屬於不同時間尺度，不得相互覆蓋。",
      "This mid-term six-yao path is a different horizon from the weekly rhythm and Jul 26–Oct 10 cycle research — do not merge or override."
    ),
    expectedPath: [
      {
        start: "2026-06-02",
        end: "2026-06-06",
        direction: lt("偏弱", "偏弱", "Soft"),
        title: lt("巳亥冲下的初步回落", "巳亥沖下的初步回落", "Initial fade under Si-Hai clash"),
        description: lt("子孙亥水在巳月月破，油价前段偏向走低。", "子孫亥水在巳月月破，油價前段偏向走低。", "Child Hai water broken in Si month — early segment leans lower."),
      },
      {
        start: "2026-06-07",
        end: "2026-07-06",
        direction: lt("震荡", "震盪", "Choppy"),
        title: lt("地缘风险带来的有限反弹", "地緣風險帶來的有限反彈", "Limited rebound on geopolitical risk"),
        description: lt(
          "官鬼午火代表冲突风险，可能带来阶段性反弹，但财爻空亡入墓，持续上涨空间有限。",
          "官鬼午火代表衝突風險，可能帶來階段性反彈，但財爻空亡入墓，持續上漲空間有限。",
          "Officer Wu fire flags conflict risk and staged rebounds; empty wealth in tomb limits sustained upside."
        ),
      },
      {
        start: "2026-07-07",
        end: "2026-08-06",
        direction: lt("宽幅震荡", "寬幅震盪", "Wide-range chop"),
        title: lt("边谈边打与战争溢价反复", "邊談邊打與戰爭溢價反覆", "Talk-fight cycles and war premium"),
        description: lt(
          "霍尔木兹海峡尚未完全恢复，油价可能在回升与下跌之间反复。85至95美元仅作为冲突溢价情景，不是保证目标。",
          "霍爾木茲海峽尚未完全恢復，油價可能在回升與下跌之間反覆。85至95美元僅作為衝突溢價情景，不是保證目標。",
          "Hormuz not fully restored — oil may chop. $85–95 is a conflict-premium scenario, not a guaranteed target."
        ),
      },
      {
        start: "2026-08-07",
        end: "2026-09-03",
        direction: lt("看跌", "看跌", "Bearish"),
        title: lt("申月后的正常化回落", "申月後的正常化回落", "Post-Shen-month normalization fade"),
        description: lt(
          "申金生子孙亥水并克财寅木，通航和供应恢复力量增强，油价更可能向70至75美元附近正常区间回归。",
          "申金生子孫亥水並剋財寅木，通航和供應恢復力量增強，油價更可能向70至75美元附近正常區間回歸。",
          "Shen metal feeds child Hai and restrains wealth Yin — shipping/supply recovery favors a $70–75 normalization band."
        ),
      },
    ],
    turningWindows: [
      {
        id: "oil-hormuz-weakening",
        start: "2026-07-28",
        end: "2026-08-17",
        label: lt("霍尔木兹海峡恢复与油价转弱窗口", "霍爾木茲海峽恢復與油價轉弱窗口", "Hormuz recovery & oil softening window"),
        note: lt(
          "长期六爻月令允许提前或推迟约10天，不断言8月7日当天必然发生转折。",
          "長期六爻月令允許提前或推遲約10天，不斷言8月7日當天必然發生轉折。",
          "Six-yao month timing may shift ±~10 days — no exact calendar guarantee on Aug 7."
        ),
      },
    ],
    priceScenarios: [
      {
        name: lt("正常化回落情景", "正常化回落情景", "Normalization fade scenario"),
        probability: 60,
        range: lt("70至75美元", "70至75美元", "$70–75"),
        description: lt("海峡恢复通航、地缘溢价消退。", "海峽恢復通航、地緣溢價消退。", "Strait reopening and premium fade."),
      },
      {
        name: lt("战争溢价震荡情景", "戰爭溢價震盪情景", "War-premium chop scenario"),
        probability: 25,
        range: lt("85至95美元", "85至95美元", "$85–95"),
        description: lt("海峡恢复较慢，冲突和谈判反复。", "海峽恢復較慢，衝突和談判反覆。", "Slow Hormuz recovery with talk-fight cycles."),
      },
      {
        name: lt("冲突扩大情景", "衝突擴大情景", "Escalation scenario"),
        probability: 15,
        range: lt("95美元以上", "95美元以上", "Above $95"),
        description: lt("仅在冲突升级或供应持续受阻时成立。", "僅在衝突升級或供應持續受阻時成立。", "Only if conflict escalates or supply stays blocked."),
      },
    ],
    hexagramDetail: {
      structureNotes: [
        lt("子孙亥水持世，可生财并克制官鬼风险", "子孫亥水持世，可生財並剋制官鬼風險", "Child Hai holds world line — generates wealth, restrains officer risk"),
        lt("官鬼午火临应，代表中东冲突、封锁及战争溢价", "官鬼午火臨應，代表中東衝突、封鎖及戰爭溢價", "Officer Wu on response — Mideast conflict, blockade, war premium"),
        lt("世爻克应爻，代表缓和与谈判力量最终有望限制冲突", "世爻剋應爻，代表緩和與談判力量最終有望限制衝突", "World restrains response — de-escalation may eventually cap conflict"),
        lt("财爻寅木发动变出，但空亡并入墓，价格持续走高基础不足", "財爻寅木發動變出，但空亡並入墓，價格持續走高基礎不足", "Wealth Yin moves but empty/tomb — weak basis for sustained rally"),
        lt("子孙亥水在巳月月破，并受未日克制，前期风险化解力量不足", "子孫亥水在巳月月破，並受未日剋制，前期風險化解力量不足", "Child Hai broken in Si month — early de-risking force weak"),
        lt("申月申金生亥水，同时克财寅木，供应恢复和价格回落力量增强", "申月申金生亥水，同時剋財寅木，供應恢復和價格回落力量增強", "Shen month feeds Hai, restrains Yin — supply recovery / fade strengthens"),
      ],
    },
    invalidation: lt(
      "若霍尔木兹海峡在2026年8月中旬后仍持续实质性受阻，冲突明显扩大，且油价连续站稳95美元上方，则正常化回落情景失效。",
      "若霍爾木茲海峽在2026年8月中旬後仍持續實質性受阻，衝突明顯擴大，且油價連續站穩95美元上方，則正常化回落情景失效。",
      "If Hormuz stays materially blocked after mid-Aug 2026, conflict escalates, and oil holds above $95, the normalization scenario is invalidated."
    ),
    notes: [
      lt("70至75美元为老师的核心正常化情景，不是保证到达的精确目标", "70至75美元為老師的核心正常化情景，不是保證到達的精確目標", "$70–75 is core normalization scenario — not a guaranteed precise target"),
      lt("85至95美元属于地缘风险尚未消退时的阶段震荡情景", "85至95美元屬於地緣風險尚未消退時的階段震盪情景", "$85–95 is a staged chop scenario while geopolitical risk persists"),
      lt("本记录与现有原油周度反弹研究属于不同周期，不得相互覆盖", "本記錄與現有原油週度反彈研究屬於不同週期，不得相互覆蓋", "Distinct horizon from existing weekly oil research — do not override"),
    ],
    relatedRecordIds: ["EXTERNAL-OIL-RHYTHM-2026-07-27", "research-oil-cycle-2026-h2"],
    thesis: [
      lt("前期震荡后，立秋及申月前后更偏向正常化回落。", "前期震盪後，立秋及申月前後更偏向正常化回落。", "After early churn, post–Start of Autumn / Shen month favors normalization fade."),
      ORACLE_DISCLAIMER,
    ],
    risks: [
      lt("冲突扩大可能延迟正常化路径。", "衝突擴大可能延遲正常化路徑。", "Escalation may delay normalization."),
      lt("85–95美元为冲突溢价情景，非基准保证。", "85–95美元為衝突溢價情景，非基準保證。", "$85–95 is premium scenario, not base guarantee."),
    ],
    status: "pending",
    tags: ["crude-oil", "oracle-six-yao", "oil-liuyao-midterm", "energy"],
  },
  {
    id: "MX-SSE-2026-ANNUAL-LIUYAO-001",
    publishedAt: "2026-07-27",
    forecastStart: "2026-01-01",
    forecastEnd: "2026-12-31",
    verificationDate: "2027-01-05",
    assetId: "shanghai-composite",
    assetName: lt("上证指数", "上證指數", "Shanghai Composite"),
    symbol: "SSE",
    market: "china-equity",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    publicSourceLabel: lt("私人导师01", "私人導師01", "Private Mentor 01"),
    direction: "slightly-bearish",
    forwardDirection: lt("下半年偏弱", "下半年偏弱", "H2 soft bias"),
    editorialConfidence: 70,
    consensusEligible: false,
    excludeFromLongTermConsensus: true,
    layer: "strategic",
    sourceStatus: "raw_source_saved",
    isLongRange: true,
    forecastType: lt("年度", "年度", "Annual"),
    category: lt("中国权益", "中國權益", "China equity"),
    ratingDisplay: lt("中性偏空", "中性偏空", "Neutral soft-bearish"),
    horizon: lt("2026-01-01 至 2026-12-31", "2026-01-01 至 2026-12-31", "2026-01-01 to 2026-12-31"),
    title: lt(
      "A股2026年春季偏强、下半年受政策结构压制",
      "A股2026年春季偏強、下半年受政策結構壓制",
      "A-Shares 2026: Spring Strength, H2 Policy Constraint"
    ),
    summary: lt(
      "研究认为A股2026年并非完全缺乏上涨力量，春季尤其3月可能形成全年最强阶段；但世应皆为父母爻，财爻虽旺却入墓，市场潜力受到规则、政策和制度力量压制，下半年反弹持续性不足，整体偏弱。",
      "研究認為A股2026年並非完全缺乏上漲力量，春季尤其3月可能形成全年最強階段；但世應皆為父母爻，財爻雖旺卻入墓，市場潛力受到規則、政策和制度力量壓制，下半年反彈持續性不足，整體偏弱。",
      "2026 is not devoid of upside — spring (especially March) may be the strongest phase; yet both lines are Parents, wealth is strong but tombed — policy/rules constrain release; H2 rebounds may lack follow-through."
    ),
    moonxInterpretation: lt(
      "本记录是年度六爻研究，不得覆盖现有奇门和中期六爻看涨记录。父母爻主导不等于必然下跌，更准确的含义是政策和规则对市场释放形成约束。",
      "本記錄是年度六爻研究，不得覆蓋現有奇門和中期六爻看漲記錄。父母爻主導不等於必然下跌，更準確的含義是政策和規則對市場釋放形成約束。",
      "Annual six-yao record — does not override Qimen or mid-term bullish oracle records. Parent dominance means policy constraint, not guaranteed decline."
    ),
    annualPath: [
      {
        start: "2026-01-01",
        end: "2026-03-31",
        direction: lt("偏强", "偏強", "Stronger"),
        title: lt("春季力量释放阶段", "春季力量釋放階段", "Spring release phase"),
        description: lt("妻财卯木得月令，上半年尤其春季仍有上涨力量，3月为全年高点候选。", "妻財卯木得月令，上半年尤其春季仍有上漲力量，3月為全年高點候選。", "Wealth Mao favored in month — spring strength; March is annual high candidate."),
      },
      {
        start: "2026-04-01",
        end: "2026-06-30",
        direction: lt("由强转弱", "由強轉弱", "Fading strength"),
        title: lt("财旺但受控阶段", "財旺但受控階段", "Wealth strong but constrained"),
        description: lt("财爻虽有力量，但入墓后难充分释放，市场逐渐转为政策和规则主导。", "財爻雖有力量，但入墓後難充分釋放，市場逐漸轉為政策和規則主導。", "Wealth has force but tombed — policy/rules gradually dominate."),
      },
      {
        start: "2026-07-01",
        end: "2026-12-31",
        direction: lt("偏弱", "偏弱", "Soft"),
        title: lt("下半年政策压制与后劲不足", "下半年政策壓制與後勁不足", "H2 policy pressure & weak follow-through"),
        description: lt(
          "世应父母爻和官鬼化父母的结构增强，子孙生财力量不足，下半年整体不利于持续全面上涨。",
          "世應父母爻和官鬼化父母的結構增強，子孫生財力量不足，下半年整體不利於持續全面上漲。",
          "Parent structure strengthens; child wealth generation weak — H2 unfavorable for broad sustained rally."
        ),
      },
    ],
    turningWindows: [
      {
        id: "sse-annual-march-high",
        start: "2026-03-01",
        end: "2026-03-31",
        label: lt("全年主要高点候选", "全年主要高點候選", "Annual high candidate"),
        note: lt("属于年度时间判断，需要结合实际指数结构复盘。", "屬於年度時間判斷，需要結合實際指數結構復盤。", "Annual timing judgment — requires index structure review."),
      },
      {
        id: "sse-h2-resolution",
        start: "2026-08-12",
        end: "2026-09-10",
        label: lt("下半年方向裁决窗口", "下半年方向裁決窗口", "H2 direction resolution window"),
        note: lt(
          "用于验证年度偏弱判断与现有中期看涨研究之间的分歧。",
          "用於驗證年度偏弱判斷與現有中期看漲研究之間的分歧。",
          "Resolves tension between annual soft bias and existing mid-term bullish research."
        ),
      },
    ],
    hexagramDetail: {
      structureNotes: [
        lt("应爻父母戌土，世爻父母丑土，世应皆为父母爻", "應爻父母戌土，世爻父母丑土，世應皆為父母爻", "Response Parent Xu, world Parent Chou — both Parents"),
        lt("父母爻代表政策、规则、制度和大环境，全年市场受政策力量主导", "父母爻代表政策、規則、制度和環境，全年市場受政策力量主導", "Parents = policy/rules/institutions dominate the year"),
        lt("妻财卯木虽得月令，但在未日入墓，代表有潜力却被锁住", "妻財卯木雖得月令，但在未日入墓，代表有潛力卻被鎖住", "Wealth Mao favored but tombed on Wei day — potential locked"),
        lt("财爻旺而入墓，说明市场并非没有力量，但上涨能量难充分兑现", "財爻旺而入墓，說明市場並非沒有力量，但上漲能量難充分兌現", "Wealth strong/tomed — energy hard to fully realize"),
        lt("子孙亥水可以生财，但日月不旺且受合，后劲不足", "子孫亥水可以生財，但日月不旺且受合，後勁不足", "Child Hai can feed wealth but lacks month/day strength"),
        lt("官鬼午火发动化父母丑土，风险和压力进一步转为政策与制度约束", "官鬼午火發動化父母丑土，風險和壓力進一步轉為政策與制度約束", "Officer Wu → Parent Chou — risk becomes policy constraint"),
        lt("兄弟爻月破，散户和普通参与者获利难度较大", "兄弟爻月破，散戶和普通參與者獲利難度較大", "Sibling line broken — retail profit-taking harder"),
      ],
    },
    invalidation: lt(
      "若2026年下半年上证指数放量突破年度高点，成交量、市场宽度和行业扩散同步改善，并持续站稳，则下半年偏弱判断失效。",
      "若2026年下半年上證指數放量突破年度高點，成交量、市場寬度和行業擴散同步改善，並持續站穩，則下半年偏弱判斷失效。",
      "If SSE breaks annual highs in H2 with volume, breadth, and sector diffusion improving and holding, the H2 soft bias is invalidated."
    ),
    notes: [
      lt("本记录是年度六爻研究，不得覆盖现有奇门和中期六爻看涨记录", "本記錄是年度六爻研究，不得覆蓋現有奇門和中期六爻看漲記錄", "Annual record — do not override Qimen / mid-term bullish records"),
      lt("3月高点为时间窗口，不代表精确到某个交易日", "3月高點為時間窗口，不代表精確到某個交易日", "March high is a window, not an exact day"),
      lt("父母爻主导不等于必然下跌，更准确的含义是政策和规则对市场释放形成约束", "父母爻主導不等於必然下跌，更準確的含義是政策和規則對市場釋放形成約束", "Parent dominance = policy constraint, not guaranteed decline"),
    ],
    thesis: [
      lt("春季尤其3月可能是全年相对最强阶段。", "春季尤其3月可能是全年相對最強階段。", "Spring, especially March, may be the relative peak."),
      lt("下半年更偏向政策压制与后劲不足。", "下半年更偏向政策壓制與後勁不足。", "H2 favors policy constraint and weak follow-through."),
      ORACLE_DISCLAIMER,
    ],
    status: "pending",
    tags: ["a-shares", "shanghai-composite", "oracle-six-yao", "annual", "sse-annual-liuyao"],
  },
];
