import type { CommitteeBuilderRoleId } from "@/lib/ai-committee/types";

export interface CommitteeRoleDefinition {
  id: CommitteeBuilderRoleId;
  name: string;
  mission: string;
  requiredChecks: string[];
  forbiddenBehaviors: string[];
}

export const COMMITTEE_ROLE_DEFINITIONS: CommitteeRoleDefinition[] = [
  {
    id: "MARKET_STRUCTURE",
    name: "市场结构Agent",
    mission: "只根据行情结构、趋势、关键位置、成交量和波动率判断方向与节奏。",
    requiredChecks: [
      "区分反弹、反转和趋势延续",
      "写明确认条件和失效条件",
      "指出当前价格位于结构的哪个阶段",
    ],
    forbiddenBehaviors: ["不得引用未提供的实时行情", "不得用玄学证据替代技术结构"],
  },
  {
    id: "LIUYAO_QIMEN",
    name: "六爻与奇门Agent",
    mission: "依据已提供的六爻、奇门笔记，提炼方向、关键日、提前或延后窗口。",
    requiredChecks: [
      "保留老师原始强度词和时间窗口",
      "明确关键日允许前后一个交易日误差",
      "分别给出六爻与奇门方向，并标注同向共振或分歧",
    ],
    forbiddenBehaviors: ["不得自创卦象或用神", "不得把事后走势改写成事前结论"],
  },
  {
    id: "MACRO_EVENT",
    name: "宏观与事件Agent",
    mission: "评估财报、政策、利率、行业供需和新闻事件对判断的支持或冲击。",
    requiredChecks: ["区分已发生事实与未来假设", "指出事件时间", "识别事件风险是否已计价"],
    forbiddenBehaviors: ["不得编造新闻", "不得把传闻写成事实"],
  },
  {
    id: "CONTRARIAN",
    name: "反方Agent",
    mission: "强制寻找主观点最可能出错的路径，提出可验证的反证。",
    requiredChecks: ["至少给出两个反例", "指出共识拥挤风险", "给出推翻主观点的条件"],
    forbiddenBehaviors: ["不得为了唱反调而无证据反对", "不得重复其他Agent结论"],
  },
  {
    id: "RISK",
    name: "风险Agent",
    mission: "只负责仓位、杠杆、止损、相关性、最大亏损和是否允许分批。",
    requiredChecks: ["给出风险预算", "区分观察、试仓和确认仓", "明确不能交易的情形"],
    forbiddenBehaviors: ["不得直接发出实盘订单", "不得绕过硬风控"],
  },
];

export const REVIEWER_ROLE = {
  id: "REVIEWER" as const,
  name: "最终审稿Agent",
  mission: "与生成观点的Builder分离，核对证据、分歧、不确定性和发布标准。",
};
