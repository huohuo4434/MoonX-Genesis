/**
 * Internal WTI mid/long path research (external video source).
 * Visibility: internal only — never public, never member weekly.
 * Early stage (Aug–Oct 2026) may inform daily/weekly WTI as ≤20% background.
 * Later stage (after Oct 2026) weight 0% until new WTI six-yao confirms.
 */
import { lt } from "@/lib/i18n/config";
import type { ResearchRecord } from "@/types/research";

export const WTI_EXT_PATH_RECORD_ID = "INT-WTI-20260807-20270204-EXT-001";
export const WTI_MOONX_MIDTERM_ID = "MX-OIL-20260602-0903-LIUYAO-001";
export const WTI_CYCLE_H2_ID = "research-oil-cycle-2026-h2";

const DISCLAIMER = lt(
  "外部视频综合判断属于非科学验证框架，仅作内部情景与复盘样本，不构成投资建议，不得自动生成公开长期结论。",
  "外部視頻綜合判斷屬於非科學驗證框架，僅作內部情景與復盤樣本，不構成投資建議，不得自動生成公開長期結論。",
  "External video synthesis is a non-scientific framework — internal scenario / review sample only. Not investment advice; do not auto-publish long-horizon public conclusions."
);

export const wtiPathExt20260807Records: ResearchRecord[] = [
  {
    id: WTI_EXT_PATH_RECORD_ID,
    publishedAt: "2026-07-28",
    ingestedAt: "2026-07-28T21:00:00+08:00",
    forecastStart: "2026-08-07",
    forecastEnd: "2027-02-04",
    verificationDate: "2027-02-06",
    assetId: "crude-oil",
    assetName: lt("WTI原油", "WTI原油", "WTI Crude Oil"),
    symbol: "WTI",
    sourceSymbol: "WTI",
    appliedAssetId: "crude-oil",
    market: "commodity",
    framework: "internal",
    sourceType: "external-symbolic-analysis",
    internalSourceRef: "external-video-qimen-bazi-hexagram-geopolitics-2026-07",
    publicSourceLabel: lt("外部视频研究（内部）", "外部視頻研究（內部）", "External video research (internal)"),
    direction: "slightly-bearish",
    editorialConfidence: 55,
    consensusEligible: false,
    excludeFromLongTermConsensus: true,
    excludeFromHomeViews: true,
    visibility: "internal",
    publishGate: "internal_review",
    humanReviewStatus: "pending-review",
    layer: "strategic",
    sourceStatus: "summary_only",
    isLongRange: true,
    forecastType: lt("中长期路径研究", "中長期路徑研究", "Mid/long path research"),
    category: lt("能源", "能源", "Energy"),
    ratingDisplay: lt("前期震荡下跌／后期待复核", "前期震盪下跌／後期待複核", "Early range-down / later pending review"),
    horizon: lt(
      "2026年8月7日至2027年2月4日",
      "2026年8月7日至2027年2月4日",
      "2026-08-07 to 2027-02-04"
    ),
    title: lt(
      "WTI原油2026年8月至2027年2月路径研究",
      "WTI原油2026年8月至2027年2月路徑研究",
      "WTI Crude Path Research: Aug 2026 – Feb 2027"
    ),
    rawSource: lt(
      "来源方法：奇门、八字、卦象及国际局势综合判断。辅助资产：布伦特原油。第一阶段2026年8–10月震荡下跌，关注65–80；第二阶段11–12月可能重新上涨（极强情景或接近前高甚至突破120，仅极强情景）；第三阶段年底至2027年2月初再次回落。",
      "來源方法：奇門、八字、卦象及國際局勢綜合判斷。輔助資產：布倫特原油。第一階段2026年8–10月震盪下跌，關注65–80；第二階段11–12月可能重新上漲（極強情景或接近前高甚至突破120，僅極強情景）；第三階段年底至2027年2月初再次回落。",
      "Methods: Qimen, BaZi, hexagram, geopolitics. Aux: Brent. Phase1 Aug–Oct 2026 range-down toward 65–80; Phase2 Nov–Dec possible re-rally (extreme: approach prior high / >120 — extreme only); Phase3 year-end to early Feb 2027 fade again."
    ),
    summary: lt(
      "前期（至2026年10月）与MoonX原中期原油研究高度一致：震荡下跌、美伊降温压低溢价、关注65—80美元区域。10月以后上涨与再次回落为新增情景，等待新的WTI六爻研究确认，不得写成已确认或必然。",
      "前期（至2026年10月）與MoonX原中期原油研究高度一致：震盪下跌、美伊降溫壓低溢價、關注65—80美元區域。10月以後上漲與再次回落為新增情景，等待新的WTI六爻研究確認，不得寫成已確認或必然。",
      "Early path (through Oct 2026) aligns highly with MoonX mid-term oil research: range-down, US–Iran de-escalation compressing premium, watch $65–80. Post-Oct rally/fade is a new scenario pending fresh WTI six-yao — not confirmed."
    ),
    moonxInterpretation: lt(
      "前期可以使用（日度／周度背景权重≤20%）；后期暂不用于正式预测。突破120美元仅保存为极强情景，不得作为基准预测。",
      "前期可以使用（日度／週度背景權重≤20%）；後期暫不用於正式預測。突破120美元僅保存為極強情景，不得作為基準預測。",
      "Early stage usable as ≤20% daily/weekly background; later stage not for formal forecasts. >$120 is extreme-only, never the base case."
    ),
    shortHorizonSummary: lt(
      "2026年8月至10月：震荡下跌，10月附近可能形成阶段低点；价格情景65—80美元区域。",
      "2026年8月至10月：震盪下跌，10月附近可能形成階段低點；價格情景65—80美元區域。",
      "Aug–Oct 2026: range-down; staged low near October; price scenario $65–80."
    ),
    mediumHorizonSummary: lt(
      "2026年10月以后路径待六爻复核：11–12月重新上涨情景、极强突破120、年底至2027年2月再次回落均不得作为已确认结论。",
      "2026年10月以後路徑待六爻複核：11–12月重新上漲情景、極強突破120、年底至2027年2月再次回落均不得作為已確認結論。",
      "Post-Oct path pending six-yao review — Nov–Dec rally, extreme >120, and year-end fade are not confirmed conclusions."
    ),
    expectedPath: [
      {
        start: "2026-08-07",
        end: "2026-10-31",
        direction: lt("震荡下跌", "震盪下跌", "Range-down"),
        title: lt("第一阶段：美伊降温与溢价回落", "第一階段：美伊降溫與溢價回落", "Phase 1: de-escalation & premium fade"),
        description: lt(
          "美伊局势先降温，中期选举临近，近期大规模战争概率较低，地缘风险溢价可能下降。可能从高位回落至65—80美元区域；10月附近可能形成阶段低点。",
          "美伊局勢先降溫，中期選舉臨近，近期大規模戰爭概率較低，地緣風險溢價可能下降。可能從高位回落至65—80美元區域；10月附近可能形成階段低點。",
          "US–Iran cools first; midterms near; major war near-term less likely — premium may fade. Possible fade toward $65–80; staged low near October."
        ),
      },
      {
        start: "2026-11-01",
        end: "2026-12-31",
        direction: lt("重新上涨（待复核）", "重新上漲（待複核）", "Re-rally (pending review)"),
        title: lt("第二阶段：局势再升温情景", "第二階段：局勢再升溫情景", "Phase 2: re-escalation scenario"),
        description: lt(
          "美伊局势可能再次升温，地缘风险重新推高油价。极强情景可能接近前高甚至突破120美元——仅极强情景，不得作为基准。",
          "美伊局勢可能再次升溫，地緣風險重新推高油價。極強情景可能接近前高甚至突破120美元——僅極強情景，不得作為基準。",
          "US–Iran may reheat and reprice premium. Extreme case may approach prior highs or >$120 — extreme only, never base case."
        ),
      },
      {
        start: "2026-12-15",
        end: "2027-02-04",
        direction: lt("再次回落（待复核）", "再次回落（待複核）", "Fade again (pending review)"),
        title: lt("第三阶段：初步信任与溢价再降", "第三階段：初步信任與溢價再降", "Phase 3: tentative trust & premium fade"),
        description: lt(
          "双方可能逐步建立初步信任，欧洲态度、通胀压力和伊朗内部意愿共同推动局势再次降温，原油风险溢价下降。",
          "雙方可能逐步建立初步信任，歐洲態度、通脹壓力和伊朗內部意願共同推動局勢再次降溫，原油風險溢價下降。",
          "Tentative trust may rebuild; Europe, inflation pressure, and Iran domestic will may cool tensions again — premium fades."
        ),
      },
    ],
    priceScenarios: [
      {
        name: lt("前期正常化低位区域", "前期正常化低位區域", "Early normalization low band"),
        probability: 55,
        range: lt("65—80美元", "65—80美元", "$65–80"),
        description: lt("与MoonX原中期研究共同关注区域；70美元附近为重点观察。", "與MoonX原中期研究共同關注區域；70美元附近為重點觀察。", "Shared watch with MoonX mid-term; ~$70 is a shared focus."),
      },
      {
        name: lt("11–12月再升温上涨情景（待复核）", "11–12月再升溫上漲情景（待複核）", "Nov–Dec reheat rally (pending)"),
        probability: 25,
        range: lt("重新接近前期高点", "重新接近前期高點", "Re-approach prior highs"),
        description: lt("需新六爻与技术面同时支持后方可升级为正式内部判断。", "需新六爻與技術面同時支持後方可升級為正式內部判斷。", "Upgrade only if fresh six-yao and technicals both support."),
      },
      {
        name: lt("极强突破120美元（非基准）", "極強突破120美元（非基準）", "Extreme break >$120 (not base)"),
        probability: 10,
        range: lt("突破120美元", "突破120美元", "Above $120"),
        description: lt("仅保存为极强情景，不得作为基准预测。", "僅保存為極強情景，不得作為基準預測。", "Extreme-only storage — never the base forecast."),
      },
      {
        name: lt("年底至2027年2月再次回落（待复核）", "年底至2027年2月再次回落（待複核）", "Year-end to Feb 2027 fade (pending)"),
        probability: 10,
        range: lt("风险溢价再降", "風險溢價再降", "Premium fade again"),
        description: lt("后期路线等待六爻复核，不得写成确定年底下跌。", "後期路線等待六爻複核，不得寫成確定年底下跌。", "Later path pending six-yao — do not state year-end drop as certain."),
      },
    ],
    turningWindows: [
      {
        id: "wti-ext-oct-low",
        start: "2026-10-01",
        end: "2026-10-31",
        label: lt("10月附近阶段低点观察", "10月附近階段低點觀察", "October staged-low watch"),
        note: lt("新增情景要素，待六爻复核后才可升级。", "新增情景要素，待六爻複核後才可升級。", "New scenario element — upgrade only after six-yao review."),
      },
      {
        id: "wti-ext-nov-dec-rally",
        start: "2026-11-01",
        end: "2026-12-31",
        label: lt("11–12月再升温上涨情景窗", "11–12月再升溫上漲情景窗", "Nov–Dec reheat rally window"),
      },
      {
        id: "wti-ext-yearend-fade",
        start: "2026-12-15",
        end: "2027-02-04",
        label: lt("年底至2月初再次回落情景窗", "年底至2月初再次回落情景窗", "Year-end to early-Feb fade window"),
      },
    ],
    comparison: {
      comparedRecordIds: [WTI_MOONX_MIDTERM_ID, WTI_CYCLE_H2_ID],
      earlyStageAlignment: "高",
      earlyStageNotes: lt(
        "从当前至2026年9月至10月，两项研究方向高度一致，可作为WTI日度和周度判断的背景依据。一致点：短期／前期偏下跌；美伊降温压低油价；指向65—80低位区域；70美元附近共同关注。",
        "從當前至2026年9月至10月，兩項研究方向高度一致，可作為WTI日度和週度判斷的背景依據。一致點：短期／前期偏下跌；美伊降溫壓低油價；指向65—80低位區域；70美元附近共同關注。",
        "Through Sep–Oct 2026 the two paths align highly and may back WTI daily/weekly calls. Shared: early soft bias; US–Iran cool compresses price; $65–80 low band; ~$70 shared focus."
      ),
      laterStageStatus: "待六爻复核",
      laterStageNotes: lt(
        "2026年10月以后的上涨与再次回落路线属于新增情景，等待新的WTI六爻研究确认。不得写成已经确认、确定上涨、必然突破120美元或确定年底下跌。",
        "2026年10月以後的上漲與再次回落路線屬於新增情景，等待新的WTI六爻研究確認。不得寫成已經確認、確定上漲、必然突破120美元或確定年底下跌。",
        "Post-Oct rally/fade is a new scenario pending fresh WTI six-yao. Do not state confirmed rise, certain >$120, or certain year-end drop."
      ),
      adminNote: lt(
        "前期可以使用；后期暂不用于正式预测。",
        "前期可以使用；後期暫不用於正式預測。",
        "Early stage usable; later stage not for formal forecasts."
      ),
    },
    engineUsage: {
      earlyStage: {
        start: "2026-08-01",
        end: "2026-10-31",
        maxWeightPct: 20,
        allowedAsBackground: true,
      },
      laterStage: {
        start: "2026-11-01",
        end: "2027-02-04",
        maxWeightPct: 0,
        adminRiskOnly: true,
      },
    },
    thesis: [
      lt("前期与MoonX原WTI内部预测高度一致，可作≤20%背景权重。", "前期與MoonX原WTI內部預測高度一致，可作≤20%背景權重。", "Early path aligns highly with MoonX WTI mid-term — ≤20% background weight."),
      lt("后期新增路线必须等待新六爻复核，引擎权重为0%。", "後期新增路線必須等待新六爻複核，引擎權重為0%。", "Later new path waits for fresh six-yao — engine weight 0%."),
      DISCLAIMER,
    ],
    risks: [
      lt("不得把突破120美元写成基准预测。", "不得把突破120美元寫成基準預測。", "Do not treat >$120 as the base case."),
      lt("不得在公开今日／明日／本周泄露65—80长期目标或后期大涨路线。", "不得在公開今日／明日／本週泄露65—80長期目標或後期大漲路線。", "Do not leak $65–80 long targets or later rally path on public short-horizon views."),
    ],
    invalidation: lt(
      "若新六爻与技术面均不支持后期上涨情景，则降低本外部研究后期权重并保持待复核；若霍尔木兹持续实质性受阻且油价连续站稳95美元上方，则前期正常化回落情景需重新评估。",
      "若新六爻與技術面均不支持後期上漲情景，則降低本外部研究後期權重並保持待複核；若霍爾木茲持續實質性受阻且油價連續站穩95美元上方，則前期正常化回落情景需重新評估。",
      "If fresh six-yao and technicals reject the later rally, keep later weight down and pending; if Hormuz stays blocked and oil holds >$95, reassess early normalization."
    ),
    notes: [
      lt("辅助资产：布伦特原油（对照，不用于WTI准确率验证）。", "輔助資產：布倫特原油（對照，不用於WTI準確率驗證）。", "Auxiliary: Brent (context only — not for WTI accuracy verification)."),
      lt("保留MoonX原有三个月原油研究，本记录通过comparison关联，不得覆盖删除。", "保留MoonX原有三個月原油研究，本記錄通過comparison關聯，不得覆蓋刪除。", "Keep MoonX three-month oil research; link via comparison — do not overwrite/delete."),
    ],
    relatedRecordIds: [WTI_MOONX_MIDTERM_ID, WTI_CYCLE_H2_ID, "EXTERNAL-OIL-RHYTHM-2026-07-27"],
    technicalConfirmation: [
      lt("必须结合最新WTI周卦。", "必須結合最新WTI週卦。", "Must combine latest WTI weekly hexagram."),
      lt("必须结合日线与4小时K线。", "必須結合日線與4小時K線。", "Must combine daily and 4H structure."),
      lt("必须结合美伊局势、美元、库存及供需、关键支撑压力。", "必須結合美伊局勢、美元、庫存及供需、關鍵支撐壓力。", "Must combine US–Iran, USD, inventories/supply-demand, and key levels."),
    ],
    status: "pending",
    tags: [
      "crude-oil",
      "wti",
      "internal",
      "internal_review",
      "external-path",
      "mid-long-path",
      "later-pending-liuyao",
      "energy",
    ],
  },
];

/** Admin card payload for /admin/intelligence */
export function getWtiExtPathAdminCard() {
  const r = wtiPathExt20260807Records[0]!;
  return {
    id: r.id,
    title: "WTI原油2026年8月至2027年2月路径研究",
    earlyConclusion: "震荡下跌，关注65—80美元区域",
    earlyAlignment: "与MoonX原预测高度一致",
    laterScenario: "10月附近低点，11月至12月上涨，年底再次回落",
    laterStatus: r.comparison?.laterStageStatus ?? "待六爻复核",
    adminNote: r.comparison?.adminNote?.zhCN ?? "前期可以使用；后期暂不用于正式预测。",
    laterAdminBanner:
      "2026年10月以后的上涨与再次回落路线属于新增情景，等待新的WTI六爻研究确认。",
  };
}
