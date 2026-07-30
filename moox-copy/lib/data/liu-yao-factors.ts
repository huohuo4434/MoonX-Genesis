/**
 * Structured Liu Yao factor scores — editorial structure, not historical accuracy.
 */
import { lt } from "@/lib/i18n/config";
import type { LiuYaoFactorAnalysis } from "@/types/research";

function factor(
  id: string,
  label: ReturnType<typeof lt>,
  score: number,
  direction: LiuYaoFactorAnalysis["factors"]["wealth"]["direction"],
  explanation: ReturnType<typeof lt>,
  evidence: ReturnType<typeof lt>[]
): LiuYaoFactorAnalysis["factors"]["wealth"] {
  return { id, label, score, maxScore: 5, direction, explanation, evidence };
}

export const liuYaoFactorAnalyses: LiuYaoFactorAnalysis[] = [
  {
    recordId: "MX-BTC-20260727-0806-LIUYAO-001",
    primaryUseGod: lt("妻财", "妻財", "Wealth (wife/wealth line)"),
    secondaryUseGod: lt("子孙", "子孫", "Offspring (children line)"),
    useGodReason: lt(
      "问价格走势：妻财为主要用神，子孙用于观察动力和生财能力；世爻代表标的自身，应爻代表外部环境。",
      "問價格走勢：妻財為主要用神，子孫用於觀察動力和生財能力；世爻代表標的自身，應爻代表外部環境。",
      "Price question: wealth is primary useful god; offspring tracks momentum and wealth generation; world = asset, response = environment."
    ),
    factors: {
      wealth: factor(
        "wealth-short-btc",
        lt("财爻", "財爻", "Wealth line"),
        3.5,
        "略偏多",
        lt("妻财卯木上卦，兄弟申金发动化财，资金存在由争夺转为回流的可能。", "妻財卯木上卦，兄弟申金發動化財，資金存在由爭奪轉為回流的可能。", "Wealth Mao on chart; sibling Shen moves to wealth — capital may rotate from contention to inflow."),
        [
          lt("妻财卯木直接上卦", "妻財卯木直接上卦", "Wealth Mao directly on hexagram"),
          lt("兄弟申金发动化妻财卯木", "兄弟申金發動化妻財卯木", "Sibling Shen moves to wealth Mao"),
        ]
      ),
      offspring: factor(
        "offspring-short-btc",
        lt("子孙", "子孫", "Offspring line"),
        3,
        "略偏多",
        lt("子孙亥水存在，但没有形成强势主导。", "子孫亥水存在，但沒有形成強勢主導。", "Child Hai present but not dominantly bullish."),
        [lt("子孙亥水在卦中", "子孫亥水在卦中", "Child Hai in hexagram")]
      ),
      siblings: factor(
        "siblings-short-btc",
        lt("兄弟", "兄弟", "Sibling line"),
        3.5,
        "略偏空",
        lt("兄弟申金发动，前段筹码争夺和抛压明显，短期偏空。", "兄弟申金發動，前段籌碼爭奪和拋壓明顯，短期偏空。", "Sibling Shen moving — early chip fights; short-term bearish tilt."),
        [lt("兄弟申金为唯一发动之爻", "兄弟申金為唯一發動之爻", "Sibling Shen is the sole moving line")]
      ),
      officials: factor(
        "officials-short-btc",
        lt("官鬼", "官鬼", "Officer line"),
        3.5,
        "略偏空",
        lt("官鬼午火持世，市场自身风险压力偏强。", "官鬼午火持世，市場自身風險壓力偏強。", "Officer Wu holds world — intrinsic risk pressure remains elevated."),
        [lt("官鬼午火持世", "官鬼午火持世", "Officer Wu on world line")]
      ),
      parents: factor(
        "parents-short-btc",
        lt("父母", "父母", "Parent line"),
        3,
        "中性",
        lt("父母辰土临应，外部政策与宏观影响中等。", "父母辰土臨應，外部政策與宏觀影響中等。", "Parent Chen on response — external policy/macro influence is moderate."),
        [lt("父母辰土临应", "父母辰土臨應", "Parent Chen on response")]
      ),
      worldResponse: factor(
        "world-response-short-btc",
        lt("世应", "世應", "World / response"),
        2.5,
        "略偏空",
        lt("官鬼持世，不属于强财强子孙结构。", "官鬼持世，不屬於強財強子孫結構。", "Officer on world — not a strong wealth/offspring structure."),
        [lt("官鬼持世、父母临应", "官鬼持世、父母臨應", "Officer world, parent response")]
      ),
      movement: factor(
        "movement-short-btc",
        lt("动变", "動變", "Movement / transform"),
        4,
        "略偏多",
        lt("兄弟化财形成主要改善信号。", "兄弟化財形成主要改善信號。", "Sibling→wealth is the main constructive transform."),
        [lt("兄弟申金化妻财卯木", "兄弟申金化妻財卯木", "Sibling Shen → wealth Mao")]
      ),
      timing: factor(
        "timing-short-btc",
        lt("时间", "時間", "Timing"),
        3,
        "略偏多",
        lt("与既有7至8月慢涨研究部分共振。", "與既有7至8月慢漲研究部分共振。", "Partial resonance with existing Jul–Aug slow-rebound annual view."),
        [lt("与 ORACLE-0009 7–8月路径部分一致", "與 ORACLE-0009 7–8月路徑部分一致", "Partial alignment with ORACLE-0009 Jul–Aug path")]
      ),
    },
    volatilityScore: 75,
    trendScore: 60,
    finalDirection: lt("震荡上涨", "震盪上漲", "Oscillating advance"),
    confidence: 60,
    warnings: [
      lt("因子星级表示当前研究结构强弱，不代表历史准确率。", "因子星級表示當前研究結構強弱，不代表歷史準確率。", "Star ratings reflect current structure — not historical accuracy."),
      lt("用户自测卦，不得沿用私人导师01准确率。", "用戶自測卦，不得沿用私人導師01準確率。", "User self-test — do not inherit Mentor 01 hit rate."),
    ],
  },
  {
    recordId: "MX-BTC-20260727-0907-LIUYAO-001",
    primaryUseGod: lt("妻财", "妻財", "Wealth line"),
    secondaryUseGod: lt("子孙", "子孫", "Offspring line"),
    useGodReason: lt(
      "问价格走势：妻财为主要用神；世应皆父母，说明宏观与政策驱动显著。",
      "問價格走勢：妻財為主要用神；世應皆父母，說明宏觀與政策驅動顯著。",
      "Price question: wealth primary; both world/response are parents — macro/policy driven."
    ),
    factors: {
      wealth: factor(
        "wealth-mid-btc",
        lt("财爻", "財爻", "Wealth line"),
        4,
        "利多",
        lt("财爻卯木上卦并发动化财寅木。", "財爻卯木上卦並發動化財寅木。", "Wealth Mao on chart, moving to wealth Yin."),
        [
          lt("妻财卯木上卦并发动", "妻財卯木上卦並發動", "Wealth Mao present and moving"),
          lt("化妻财寅木（财化财）", "化妻財寅木（財化財）", "Transforms to wealth Yin (wealth→wealth)"),
        ]
      ),
      offspring: factor(
        "offspring-mid-btc",
        lt("子孙", "子孫", "Offspring line"),
        3.5,
        "略偏多",
        lt("子孙亥水直接上卦，存在生财和成长动力。", "子孫亥水直接上卦，存在生財和成長動力。", "Child Hai on chart — generative/growth force exists."),
        [lt("子孙亥水直接上卦", "子孫亥水直接上卦", "Child Hai directly on hexagram")]
      ),
      siblings: factor(
        "siblings-mid-btc",
        lt("兄弟", "兄弟", "Sibling line"),
        3,
        "略偏空",
        lt("兄弟酉金发动，存在获利兑现和筹码争夺压力。", "兄弟酉金發動，存在獲利兌現和籌碼爭奪壓力。", "Sibling You moving — profit-taking and chip contention pressure."),
        [lt("兄弟酉金发动化父母未土", "兄弟酉金發動化父母未土", "Sibling You moves to parent Wei")]
      ),
      officials: factor(
        "officials-mid-btc",
        lt("官鬼", "官鬼", "Officer line"),
        3,
        "略偏空",
        lt("父母动化官鬼，宏观风险压力中等。", "父母動化官鬼，宏觀風險壓力中等。", "Parent→officer transform — macro risk pressure is moderate."),
        [lt("父母未土化官鬼巳火", "父母未土化官鬼巳火", "Parent Wei → officer Si")]
      ),
      parents: factor(
        "parents-mid-btc",
        lt("父母", "父母", "Parent line"),
        4.5,
        "利多",
        lt("世应皆父母，宏观政策和消息影响很强。", "世應皆父母，宏觀政策和消息影響很強。", "World/response both parents — macro/policy/news influence is very strong."),
        [lt("父母未土持世、父母丑土临应", "父母未土持世、父母丑土臨應", "Parent Wei world, parent Chou response")]
      ),
      worldResponse: factor(
        "world-response-mid-btc",
        lt("世应", "世應", "World / response"),
        3,
        "中性",
        lt("世应同类，外围环境主导，缺乏纯价格单边结构。", "世應同類，外圍環境主導，缺乏純價格單邊結構。", "Same-class world/response — environment-led, not pure price trend."),
        [lt("世应皆为父母爻", "世應皆為父母爻", "Both lines are parents")]
      ),
      movement: factor(
        "movement-mid-btc",
        lt("动变", "動變", "Movement / transform"),
        3.5,
        "略偏多",
        lt("财化财支持上涨，但卯化寅后劲可能下降。", "財化財支持上漲，但卯化寅後勁可能下降。", "Wealth→wealth supports upside but Mao→Yin momentum may fade."),
        [
          lt("三爻发动，变化复杂", "三爻發動，變化複雜", "Three moving lines — complex transforms"),
          lt("财爻卯木化寅木为退势", "財爻卯木化寅木為退勢", "Wealth Mao→Yin shows retreat tendency"),
        ]
      ),
      timing: factor(
        "timing-mid-btc",
        lt("时间", "時間", "Timing"),
        4,
        "利多",
        lt("与申月修复、9月高点的年度研究形成时间共振。", "與申月修復、9月高點的年度研究形成時間共振。", "Timing resonance with Shen-month repair and Sep high in annual view."),
        [lt("与 ORACLE-0009 9月高点窗口重叠", "與 ORACLE-0009 9月高點窗口重疊", "Overlaps ORACLE-0009 September high window")]
      ),
    },
    volatilityScore: 82,
    trendScore: 64,
    finalDirection: lt("高波动震荡上涨", "高波動震盪上漲", "High-volatility oscillating advance"),
    confidence: 64,
    warnings: [
      lt("六冲代表路径反复，不等于确定下跌。", "六沖代表路徑反覆，不等於確定下跌。", "Six clash = path volatility, not assured decline."),
      lt("因子分数为结构化整理，非科学统计模型。", "因子分數為結構化整理，非科學統計模型。", "Factor scores are structured editorial summaries — not a statistical model."),
    ],
  },
];

export function getLiuYaoFactorAnalysis(recordId: string): LiuYaoFactorAnalysis | undefined {
  return liuYaoFactorAnalyses.find((item) => item.recordId === recordId);
}

export function getLiuYaoFactorAnalysisByLinkId(linkId: string): LiuYaoFactorAnalysis | undefined {
  return liuYaoFactorAnalyses.find(
    (item) => item.recordId === linkId || `FACTOR-${item.recordId}` === linkId
  );
}
