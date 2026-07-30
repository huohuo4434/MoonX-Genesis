/**
 * Anonymous public source profiles — never expose real names or handles.
 */
import { lt } from "@/lib/i18n/config";
import type { SourceProfile } from "@/types/research";

export const MENTOR_01_METHODS = [
  lt("卦名和卦辞只作辅助，权重原则上不超过20%。", "卦名和卦辭只作輔助，權重原則上不超過20%。", "Hexagram name/text is auxiliary — weight generally ≤20%."),
  lt(
    "用神依问题而定：问价格以妻财为主、子孙观动力；问风险看官鬼；问政策看父母；兄弟观耗财与抛压。",
    "用神依問題而定：問價格以妻財為主、子孫觀動力；問風險看官鬼；問政策看父母；兄弟觀耗財與拋壓。",
    "Useful gods depend on the question: price→wealth/offspring; risk→officer; policy→parents; siblings→distribution pressure."
  ),
  lt("黑天鹅重点看官鬼。", "黑天鵝重點看官鬼。", "Black-swan risk focuses on the officer line."),
  lt("政策、监管、平台规则重点看父母。", "政策、監管、平台規則重點看父母。", "Policy, regulation, and platform rules focus on parents."),
  lt("世爻代表标的自身，应爻代表外部环境。", "世爻代表標的自身，應爻代表外部環境。", "Self = the asset itself; response = external environment."),
  lt("财爻临值、出空、出伏属于直接高权重信号。", "財爻臨值、出空、出伏屬於直接高權重信號。", "Wealth on value / exiting emptiness / exiting hiding = direct high-weight signals."),
  lt("通过兄弟旺、父母生兄弟推导的低点属于间接信号。", "通過兄弟旺、父母生兄弟推導的低點屬於間接信號。", "Lows derived via strong siblings or parents generating siblings are indirect."),
  lt("长期卦重趋势，具体节气窗口允许提前或推迟约10天。", "長期卦重趨勢，具體節氣窗口允許提前或推遲約10天。", "Long-range hexagrams emphasize trend; solar-term windows may shift ±~10 days."),
  lt(
    "六神只描述事件性质，不能称为动爻；应写“某爻发动，临朱雀”。",
    "六神只描述事件性質，不能稱為動爻；應寫「某爻發動，臨朱雀」。",
    "Six spirits describe event character — not moving lines; write “line X moves, carries Zhuque”."
  ),
];

export const sourceProfiles: SourceProfile[] = [
  {
    id: "PRIVATE-MENTOR-01",
    label: lt("私人导师01", "私人導師01", "Private Mentor 01"),
    sourceType: lt("私人导师研究", "私人導師研究", "Private mentor research"),
    anonymity: true,
    sourceReliability: {
      overall: lt("中高", "中高", "Medium-high"),
      strengths: [
        lt("年度大方向", "年度大方向", "Annual big-picture direction"),
        lt("高点月份", "高點月份", "High months"),
        lt("上涨目标区域", "上漲目標區域", "Upside target zones"),
        lt("重大转折窗口", "重大轉折窗口", "Major turning windows"),
        lt("风险事件性质", "風險事件性質", "Risk-event character"),
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
      methods: MENTOR_01_METHODS,
    },
  },
];

export function getSourceProfile(id: string): SourceProfile | undefined {
  return sourceProfiles.find((profile) => profile.id === id);
}
