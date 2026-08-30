import type { KeyDateAction, KeyDateLevel, KeyDateRadarItem } from "@/lib/data/key-date-radar-core";

export type ResearchAlignment = "MULTI_METHOD_RESONANCE" | "PARTIAL_ALIGNMENT" | "CONFLICTED" | "SINGLE_SOURCE";
export type ResearchConfidenceDecision = "UP_ONE" | "UNCHANGED" | "DOWN_ONE";

export type ResearchConsensusReview = {
  assetId: string;
  assetName: string;
  symbol: string;
  horizon: string;
  alignment: ResearchAlignment;
  confidenceDecision: ResearchConfidenceDecision;
  conclusion: string;
  agreement: string;
  disagreement: string;
  methodClasses: string[];
};

export const RESEARCH_CONSENSUS_REVIEWS_20260830: readonly ResearchConsensusReview[] = Object.freeze([
  {
    assetId: "sp500", assetName: "标普500", symbol: "SPX", horizon: "8月31日至9月4日",
    alignment: "MULTI_METHOD_RESONANCE", confidenceDecision: "UP_ONE",
    conclusion: "下一周仍以区间震荡为底色；周初受压或试冲后，9月2日至3日存在修复窗口，9月4日重点防事件波动和反弹承压。",
    agreement: "周度六爻的先压后修复，与公开市场结构给出的回踩承接条件同向。",
    disagreement: "能否突破并延续到新高，仍取决于利率、市场宽度与支撑确认。",
    methodClasses: ["六爻周度节奏流派", "公开市场结构流派"],
  },
  {
    assetId: "tsla", assetName: "特斯拉", symbol: "TSLA", horizon: "8月31日至9月4日",
    alignment: "MULTI_METHOD_RESONANCE", confidenceDecision: "UP_ONE",
    conclusion: "8月31日至9月1日先找低点，9月1日至3日修复，9月4日为阶段高点或冲高兑现候选。",
    agreement: "周度时间窗与314—322支撑、364—382压力的公开市场结构互相验证。",
    disagreement: "月度仍是复杂震荡，短线反弹不得升级为月度主升。",
    methodClasses: ["六爻周度节奏流派", "公开市场结构流派"],
  },
  {
    assetId: "silver", assetName: "白银", symbol: "XAG", horizon: "2026年秋季＋8月31日至9月4日",
    alignment: "MULTI_METHOD_RESONANCE", confidenceDecision: "UP_ONE",
    conclusion: "9月由弱转强的中期背景不变；下一周周初先压，9月1日至2日观察低点和修复，9月3日至4日可能出现急反。",
    agreement: "中长期六爻的9月由弱转强，与周度六爻的周初下压后修复重叠。",
    disagreement: "六冲使涨跌都可能放大；短线急反不等于整月单边上涨。",
    methodClasses: ["六爻中长期流派", "六爻周度节奏流派"],
  },
  {
    assetId: "gold", assetName: "黄金", symbol: "XAUT", horizon: "2026年秋季＋下一周",
    alignment: "PARTIAL_ALIGNMENT", confidenceDecision: "UP_ONE",
    conclusion: "中长线仍偏多，但当前过热与利率压力支持短线先调整；下一周若先反弹，更适合在结构转弱后保护利润，再等回踩承接。",
    agreement: "中长期六爻与公开市场结构都认可长期偏多；周度六爻和市场结构都提示短线先消化压力。",
    disagreement: "短线回调幅度和结束日期没有形成同一精确窗口，因此只小幅上调信心。",
    methodClasses: ["六爻中长期流派", "六爻周度节奏流派", "公开市场结构流派"],
  },
  {
    assetId: "nasdaq-100", assetName: "纳斯达克100", symbol: "NDX", horizon: "8月31日至9月4日",
    alignment: "PARTIAL_ALIGNMENT", confidenceDecision: "UNCHANGED",
    conclusion: "周初可试冲，但9月1日至4日存在高位换手和回撤风险；守住707—712.6对应结构才保留向上修复。",
    agreement: "双方都把当前定义为区间行情，并要求支撑和真实K线确认。",
    disagreement: "周度六爻更偏先涨后压，公开市场结构更偏守支撑后继续缓升。",
    methodClasses: ["六爻周度节奏流派", "公开市场结构流派"],
  },
  {
    assetId: "btc", assetName: "比特币", symbol: "BTC", horizon: "8月31日至9月6日",
    alignment: "CONFLICTED", confidenceDecision: "DOWN_ONE",
    conclusion: "双方都不支持当前位置追涨，但周内路径有分歧：一方先看9月2日至3日抬升、9月4日转折，另一方更早等待73,000—76,000回踩。",
    agreement: "短线上涨空间有限、当前位置不宜追涨。",
    disagreement: "先反弹后跌还是先回踩未达成一致，因此不提高方向信心。",
    methodClasses: ["六爻周度节奏流派", "公开市场结构流派"],
  },
  {
    assetId: "eth", assetName: "以太坊", symbol: "ETH", horizon: "8月31日至9月6日",
    alignment: "SINGLE_SOURCE", confidenceDecision: "UNCHANGED",
    conclusion: "周度路径暂定9月2日至4日局部抬升，9月4日至5日转折，9月5日至6日回落，只作为辅助节奏。",
    agreement: "目前没有同资产、同周期的独立来源完成交叉确认。",
    disagreement: "单一来源不做共振加权。",
    methodClasses: ["六爻周度节奏流派"],
  },
]);

type KeyDateConsensusOverlay = {
  assetId: string;
  level: KeyDateLevel;
  focusDate: string;
  confidenceDelta: number;
  consensusLevel: ResearchAlignment;
  consensusNote: string;
  sourceIds: string[];
  actionOverride?: KeyDateAction;
};

const KEY_DATE_CONSENSUS_OVERLAYS_20260830: readonly KeyDateConsensusOverlay[] = Object.freeze([
  {
    assetId: "tsla", level: "MONTH", focusDate: "2026-09-01", confidenceDelta: 10,
    consensusLevel: "MULTI_METHOD_RESONANCE",
    consensusNote: "正式路径的周初寻底，与独立周度节奏和公开市场支撑区同向；提升短线低点观察信心，不改变月度复杂震荡背景。",
    sourceIds: ["SRC-20260830-W31-TSLA", "SRC-20260829-MARKET-STRUCTURE-TSLA"],
  },
  {
    assetId: "tsla", level: "MONTH", focusDate: "2026-09-04", confidenceDelta: 10,
    consensusLevel: "MULTI_METHOD_RESONANCE", actionOverride: "TOP_EXIT_WATCH",
    consensusNote: "正式路径已写明修复后再受压；独立周度节奏把9月4日列为阶段高点候选，公开市场结构又给出364—382压力区，因此由只观察升级为条件式减仓观察。",
    sourceIds: ["SRC-20260830-W31-TSLA", "SRC-20260829-MARKET-STRUCTURE-TSLA"],
  },
  {
    assetId: "gold", level: "MONTH", focusDate: "2026-09-07", confidenceDelta: 6,
    consensusLevel: "PARTIAL_ALIGNMENT",
    consensusNote: "新增中长期观点与市场结构支持黄金中长线偏多，周度观点又支持短线先消化压力；与9月7日前试高、随后温和回调相容，但没有共同给出同一精确日期。",
    sourceIds: ["SRC-20260829-LIUYAO-H2-GOLD", "SRC-20260830-W31-GOLD", "SRC-20260829-MARKET-STRUCTURE-GOLD"],
  },
]);

export function applyResearchConsensusOverlays20260830(items: KeyDateRadarItem[]): KeyDateRadarItem[] {
  return items.map((item) => {
    const overlay = KEY_DATE_CONSENSUS_OVERLAYS_20260830.find((candidate) =>
      candidate.assetId === item.assetId
      && candidate.level === item.level
      && candidate.focusDate === item.focusDate
    );
    if (!overlay) return item;
    return {
      ...item,
      action: overlay.actionOverride ?? item.action,
      confidence: Math.max(0, Math.min(100, item.confidence + overlay.confidenceDelta)),
      consensusLevel: overlay.consensusLevel,
      consensusNote: overlay.consensusNote,
      sourceIds: Array.from(new Set([...item.sourceIds, ...overlay.sourceIds])),
    };
  });
}
