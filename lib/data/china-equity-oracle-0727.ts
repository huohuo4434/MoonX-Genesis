/**
 * China equity six-yao records dated 2026-07-27.
 * Scope: Shanghai Composite + Hang Seng TECH Index only (not broad HK market / HSI).
 */
import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

const ORACLE_DISCLAIMER = lt(
  "传统象数研究属于非科学验证框架，仅作为研究记录与后续复盘样本，不构成投资建议。",
  "傳統象數研究屬於非科學驗證框架，僅作為研究記錄與後續復盤樣本，不構成投資建議。",
  "Traditional symbolic research is a non-scientific verification framework. It is retained as a research record and review sample only, and does not constitute investment advice."
);

export const chinaEquityOracle0727Records: ResearchRecord[] = [
  {
    id: "A-SH-2026-0727-ORACLE-001",
    publishedAt: "2026-07-27",
    forecastStart: "2026-07-27",
    forecastEnd: "2026-09-07",
    assetId: "shanghai-composite",
    assetName: lt("上证指数", "上證指數", "Shanghai Composite"),
    symbol: "SSE",
    market: "china-equity",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    publicSourceLabel: lt("六爻研判", "六爻研判", "Six-Yao Oracle"),
    direction: "bullish",
    editorialConfidence: 76,
    researchScore: 76,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "raw_source_saved",
    ratingDisplay: lt("看涨", "看漲", "Bullish"),
    researchAttribute: lt("传统象数研究", "傳統象數研究", "Traditional symbolic research"),
    trendConsistency: {
      score: 4,
      max: 5,
      note: lt(
        "短期与中期方向一致，但节奏偏慢。",
        "短期與中期方向一致，但節奏偏慢。",
        "Short- and medium-term direction align, but the pace remains relatively slow."
      ),
    },
    hexagramPrimary: lt("水天需", "水天需", "Water over Heaven — Waiting (Xu)"),
    hexagramChanged: lt("水风井", "水風井", "Water over Wind — The Well (Jing)"),
    movingLinesNote: lt(
      "短期：水天需 → 水风井。中期主卦：地泽临。",
      "短期：水天需 → 水風井。中期主卦：地澤臨。",
      "Short-term: Xu → Jing. Medium-term primary hexagram: Approach (Lin)."
    ),
    horizon: lt(
      "短期 2026-07-27至07-31；中期至2026-09-07",
      "短期 2026-07-27至07-31；中期至2026-09-07",
      "Short-term 2026-07-27–07-31; medium-term through 2026-09-07"
    ),
    title: lt(
      "上证指数六爻研判：蓄势后震荡上行",
      "上證指數六爻研判：蓄勢後震盪上行",
      "SSE Six-Yao: Digestion Then Oscillating Advance"
    ),
    rawSource: lt(
      "短期卦象水天需→水风井；中期卦象地泽临。短期与中期均偏多。",
      "短期卦象水天需→水風井；中期卦象地澤臨。短期與中期均偏多。",
      "Short-term hexagrams Xu→Jing; medium-term Lin. Both horizons lean bullish."
    ),
    summary: lt(
      "短期蓄势，中期震荡上行，8月中下旬是重要验证窗口。",
      "短期蓄勢，中期震盪上行，8月中下旬是重要驗證窗口。",
      "Near-term digestion, medium-term oscillating advance; mid-to-late August is a key verification window."
    ),
    moonxInterpretation: lt(
      "A股当前更偏向蓄势后的震荡上行，而不是快速拉升。短期可能先整理、等待资金确认，中期则逐步改善。整体更接近机构慢牛和板块轮动行情，中途仍可能出现回踩和洗盘。",
      "A股當前更偏向蓄勢後的震盪上行，而不是快速拉升。短期可能先整理、等待資金確認，中期則逐步改善。整體更接近機構慢牛和板塊輪動行情，中途仍可能出現回踩和洗盤。",
      "A-shares currently favor digestion followed by an oscillating advance rather than a sharp rally. The near term may consolidate while capital confirms; the medium term may improve gradually. The path resembles a slow institutional bull with sector rotation, and pullbacks remain possible."
    ),
    shortHorizonSummary: lt(
      "本周更可能先震荡蓄势，随后逐步转强。周初不宜追高，若出现回踩，更符合当前研究框架中的左侧布局节奏。",
      "本週更可能先震盪蓄勢，隨後逐步轉強。週初不宜追高，若出現回踩，更符合當前研究框架中的左側佈局節奏。",
      "This week more likely digests first, then gradually strengthens. Early-week chase-highs are less favored; a pullback better fits left-side positioning within this framework."
    ),
    mediumHorizonSummary: lt(
      "2026年7月底至9月初，趋势倾向震荡上行。8月中下旬是重要观察窗口，需要验证成交量、政策催化和科技板块强度能否进一步确认趋势。",
      "2026年7月底至9月初，趨勢傾向震盪上行。8月中下旬是重要觀察窗口，需要驗證成交量、政策催化和科技板塊強度能否進一步確認趨勢。",
      "From late July through early September 2026, the bias favors an oscillating advance. Mid-to-late August is a key watch window to verify whether volume, policy catalysts, and tech-sector strength further confirm the trend."
    ),
    thesis: [
      lt(
        "短期卦象（水天需→水风井）倾向先整理、再转强。",
        "短期卦象（水天需→水風井）傾向先整理、再轉強。",
        "Short-term hexagrams (Xu→Jing) favor digestion first, then gradual strength."
      ),
      lt(
        "中期卦象（地泽临）倾向逐步改善而非急速拉升。",
        "中期卦象（地澤臨）傾向逐步改善而非急速拉升。",
        "Medium-term Lin favors gradual improvement rather than a vertical rally."
      ),
      lt(
        "行情更接近机构慢牛与板块轮动，而非全面单边暴涨。",
        "行情更接近機構慢牛與板塊輪動，而非全面單邊暴漲。",
        "The path more closely resembles a slow institutional bull with rotation than a broad one-way spike."
      ),
    ],
    risks: [
      lt("周初可能冲高回落。", "週初可能衝高回落。", "Early-week spike-and-fade risk."),
      lt("上涨过程中板块轮动明显。", "上漲過程中板塊輪動明顯。", "Sector rotation may remain pronounced during advances."),
      lt(
        "若成交量无法持续放大，趋势可能继续以震荡方式推进。",
        "若成交量無法持續放大，趨勢可能繼續以震盪方式推進。",
        "If volume fails to expand sustainably, the trend may keep advancing in an oscillatory fashion."
      ),
      ORACLE_DISCLAIMER,
    ],
    turningWindows: [
      {
        id: "ash-0727-short",
        start: "2026-07-27",
        end: "2026-07-31",
        label: lt("蓄势与资金确认", "蓄勢與資金確認", "Digestion and capital confirmation"),
      },
      {
        id: "ash-0727-improve",
        start: "2026-08-01",
        end: "2026-08-15",
        label: lt("趋势逐步改善", "趨勢逐步改善", "Trend gradually improves"),
      },
      {
        id: "ash-0727-aug22",
        date: "2026-08-22",
        label: lt("关注是否进入更强阶段", "關注是否進入更強階段", "Watch for a stronger phase"),
      },
      {
        id: "ash-0727-verify",
        date: "2026-09-07",
        label: lt("阶段验证", "階段驗證", "Phase verification"),
      },
    ],
    verificationChecklist: [
      lt("验证日期：2026-09-07", "驗證日期：2026-09-07", "Verification date: 2026-09-07"),
      lt("状态：待验证", "狀態：待驗證", "Status: pending verification"),
    ],
    status: "pending",
    tags: ["a-shares", "shanghai-composite", "oracle-six-yao", "sse", "china-equity", "pending-verification"],
    disclaimer: ORACLE_DISCLAIMER,
  },
  {
    id: "HSTECH-2026-0727-ORACLE-001",
    aliases: ["research-hong-kong-2026-h2-hstech-focus"],
    publishedAt: "2026-07-27",
    forecastStart: "2026-07-27",
    forecastEnd: "2026-09-07",
    assetId: "hang-seng",
    assetName: lt("恒生科技指数", "恆生科技指數", "Hang Seng TECH Index"),
    symbol: "HSTECH",
    market: "hong-kong-equity",
    framework: "oracle-six-yao",
    sourceType: "private-teacher",
    publicSourceLabel: lt("六爻研判", "六爻研判", "Six-Yao Oracle"),
    direction: "strong-bullish",
    editorialConfidence: 82,
    researchScore: 82,
    consensusEligible: true,
    layer: "strategic",
    sourceStatus: "raw_source_saved",
    ratingDisplay: lt("强势看涨", "強勢看漲", "Strong bullish"),
    researchAttribute: lt("传统象数研究", "傳統象數研究", "Traditional symbolic research"),
    trendConsistency: {
      score: 5,
      max: 5,
      note: lt(
        "短期与中期方向高度一致，当前属于较强共振信号。",
        "短期與中期方向高度一致，當前屬於較強共振信號。",
        "Short- and medium-term direction are highly aligned — a relatively strong resonance signal."
      ),
    },
    hexagramPrimary: lt("地泽临", "地澤臨", "Earth over Lake — Approach (Lin)"),
    hexagramChanged: lt("兑为泽", "兌為澤", "Lake — Joy / Exchange (Dui)"),
    movingLinesNote: lt(
      "短期：地泽临 → 兑为泽。中期：雷地豫 → 火地晋。",
      "短期：地澤臨 → 兌為澤。中期：雷地豫 → 火地晉。",
      "Short-term: Lin → Dui. Medium-term: Yu → Jin."
    ),
    horizon: lt(
      "短期 2026-07-27至07-31；中期至2026-09-07",
      "短期 2026-07-27至07-31；中期至2026-09-07",
      "Short-term 2026-07-27–07-31; medium-term through 2026-09-07"
    ),
    title: lt(
      "恒生科技指数六爻研判：情绪修复与偏强共振",
      "恆生科技指數六爻研判：情緒修復與偏強共振",
      "HSTECH Six-Yao: Sentiment Repair and Stronger Resonance"
    ),
    rawSource: lt(
      "短期卦象地泽临→兑为泽；中期卦象雷地豫→火地晋。短期偏多，中期强势偏多。",
      "短期卦象地澤臨→兌為澤；中期卦象雷地豫→火地晉。短期偏多，中期強勢偏多。",
      "Short-term Lin→Dui; medium-term Yu→Jin. Near-term bullish; medium-term strongly bullish."
    ),
    summary: lt(
      "短期与中期方向高度一致，情绪修复和科技成长动能强于A股。",
      "短期與中期方向高度一致，情緒修復和科技成長動能強於A股。",
      "Short- and medium-term direction highly aligned; sentiment repair and tech-growth momentum appear stronger than A-shares."
    ),
    moonxInterpretation: lt(
      "恒生科技指数的短期和中期研究方向一致，整体偏向震荡上行。中期卦象由豫转晋，研究含义偏向市场情绪修复、资金回流和科技成长方向重新获得关注。相较A股，恒生科技指数的上行动能和情绪修复预期更强，但波动也可能更大。",
      "恆生科技指數的短期和中期研究方向一致，整體偏向震盪上行。中期卦象由豫轉晉，研究含義偏向市場情緒修復、資金回流和科技成長方向重新獲得關注。相較A股，恆生科技指數的上行動能和情緒修復預期更強，但波動也可能更大。",
      "HSTECH short- and medium-term research directions align and favor an oscillating advance. Medium-term Yu→Jin leans toward sentiment repair, capital return, and renewed tech-growth attention. Versus A-shares, upside momentum and sentiment-repair expectations look stronger, but volatility may also be larger."
    ),
    shortHorizonSummary: lt(
      "本周倾向稳步走强，资金承接和市场情绪有望继续改善。过程中可能出现快速回撤或洗盘，但当前未出现明确的中期转空信号。",
      "本週傾向穩步走強，資金承接和市場情緒有望繼續改善。過程中可能出現快速回撤或洗盤，但當前未出現明確的中期轉空信號。",
      "This week tends toward steady strength, with capital absorption and sentiment possibly continuing to improve. Fast pullbacks or washouts remain possible, but no clear medium-term bearish flip signal is present yet."
    ),
    mediumHorizonSummary: lt(
      "2026年7月底至9月初，恒生科技指数倾向维持偏强表现。8月可能是主要上涨阶段，9月初进入阶段性验证。整体强度预期高于上证指数。",
      "2026年7月底至9月初，恆生科技指數傾向維持偏強表現。8月可能是主要上漲階段，9月初進入階段性驗證。整體強度預期高於上證指數。",
      "From late July through early September 2026, HSTECH tends to stay relatively strong. August may be the main strengthening phase, with early-September phase verification. Overall strength expectation is higher than the Shanghai Composite."
    ),
    thesis: [
      lt(
        "短期与中期方向高度一致，属于较强共振信号。",
        "短期與中期方向高度一致，屬於較強共振信號。",
        "High short/medium alignment is a relatively strong resonance signal."
      ),
      lt(
        "中期豫转晋，倾向情绪修复与资金回流。",
        "中期豫轉晉，傾向情緒修復與資金回流。",
        "Medium-term Yu→Jin favors sentiment repair and capital return."
      ),
      lt(
        "相对上证指数，上行动能与情绪修复预期可能更强，波动也可能更大。",
        "相對上證指數，上行動能與情緒修復預期可能更強，波動也可能更大。",
        "Versus SSE, upside momentum and sentiment repair may be stronger, with possibly larger swings."
      ),
    ],
    risks: [
      lt("中途可能出现快速下跌和高波动洗盘。", "中途可能出現快速下跌和高波動洗盤。", "Fast declines and high-volatility washouts may occur mid-path."),
      lt("科技股与美股科技板块存在联动风险。", "科技股與美股科技板塊存在聯動風險。", "Tech names carry linkage risk with US technology."),
      lt(
        "若资金回流不持续，强势评级需要下调。",
        "若資金回流不持續，強勢評級需要下調。",
        "If capital return is not sustained, the strong-bullish rating should be downgraded."
      ),
      ORACLE_DISCLAIMER,
    ],
    turningWindows: [
      {
        id: "hstech-0727-short",
        start: "2026-07-27",
        end: "2026-07-31",
        label: lt("短期资金承接", "短期資金承接", "Near-term capital absorption"),
      },
      {
        id: "hstech-0727-sentiment",
        start: "2026-08-01",
        end: "2026-08-15",
        label: lt("情绪与趋势强化", "情緒與趨勢強化", "Sentiment and trend strengthening"),
      },
      {
        id: "hstech-0727-aug22",
        date: "2026-08-22",
        label: lt("观察上涨是否加速", "觀察上漲是否加速", "Watch whether the advance accelerates"),
      },
      {
        id: "hstech-0727-verify",
        date: "2026-09-07",
        label: lt("阶段验证", "階段驗證", "Phase verification"),
      },
    ],
    verificationChecklist: [
      lt("验证日期：2026-09-07", "驗證日期：2026-09-07", "Verification date: 2026-09-07"),
      lt("状态：待验证", "狀態：待驗證", "Status: pending verification"),
    ],
    status: "pending",
    tags: ["hang-seng-tech", "hstech", "oracle-six-yao", "hong-kong-equity", "pending-verification"],
    disclaimer: ORACLE_DISCLAIMER,
  },
];
