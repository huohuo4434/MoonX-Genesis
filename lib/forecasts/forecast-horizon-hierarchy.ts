import { classifyDailyDirection } from "@/lib/forecasts/daily-direction-family";
import { normalizeOfficialDirection, type OfficialDirection } from "@/lib/forecasts/formal-direction";

export const FORECAST_HORIZON_HIERARCHY_VERSION = "2026-08-25.v1" as const;

export type HorizonRelation = "ALIGNED" | "DIVERGENT" | "NEUTRAL" | "MISSING";
export type HierarchyConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ForecastHierarchyResult = {
  officialDirection: OfficialDirection;
  authority: "WEEK" | "MONTH" | "YEAR" | "MISSING";
  annualMonthlyRelation: HorizonRelation;
  monthlyWeeklyRelation: HorizonRelation;
  confidence: HierarchyConfidence;
  confidenceLabel: string;
  note: string;
};

function relation(left?: string | null, right?: string | null): HorizonRelation {
  if (!left || !right) return "MISSING";
  const a = classifyDailyDirection(left);
  const b = classifyDailyDirection(right);
  if (a === "UNKNOWN" || b === "UNKNOWN") return "MISSING";
  if (a === "SIDEWAYS" || b === "SIDEWAYS") return a === b ? "ALIGNED" : "NEUTRAL";
  return a === b ? "ALIGNED" : "DIVERGENT";
}

/**
 * 层级只决定“谁拥有当前周期的正式方向”，不让年卦越级替换周卦。
 * 年月、月周同向提高共识；冲突必须保留并降低信心。
 */
export function resolveForecastHorizonHierarchy(input: {
  annualDirection?: string | null;
  monthlyDirection?: string | null;
  weeklyDirection?: string | null;
}): ForecastHierarchyResult {
  const authority = input.weeklyDirection ? "WEEK" : input.monthlyDirection ? "MONTH" : input.annualDirection ? "YEAR" : "MISSING";
  const officialDirection = normalizeOfficialDirection(input.weeklyDirection ?? input.monthlyDirection ?? input.annualDirection);
  const annualMonthlyRelation = relation(input.annualDirection, input.monthlyDirection);
  const monthlyWeeklyRelation = relation(input.monthlyDirection, input.weeklyDirection);
  const relations = [annualMonthlyRelation, monthlyWeeklyRelation].filter((value) => value !== "MISSING");
  const divergent = relations.filter((value) => value === "DIVERGENT").length;
  const aligned = relations.filter((value) => value === "ALIGNED").length;
  const confidence: HierarchyConfidence = divergent > 0 ? "LOW" : aligned === 2 ? "HIGH" : aligned === 1 ? "MEDIUM" : "LOW";
  const confidenceLabel = confidence === "HIGH" ? "年·月·周同向" : confidence === "MEDIUM" ? "两层同向" : divergent ? "跨周期分歧" : "上级证据不足";
  const note = authority === "WEEK"
    ? divergent
      ? "周卦仍拥有本周正式方向；年/月冲突已保留，信心下降，等待关键日与技术位置确认。"
      : "周卦拥有本周正式方向；上级周期只负责说明所处阶段。"
    : authority === "MONTH"
      ? "当前缺少同周期周卦，只能显示月度方向，不把年卦拆成周预测。"
      : authority === "YEAR"
        ? "当前只有年度候选路线；必须等待独立月卦和周卦后才能形成短中期正式方向。"
        : "年、月、周资料均缺失，不生成方向。";
  return { officialDirection, authority, annualMonthlyRelation, monthlyWeeklyRelation, confidence, confidenceLabel, note };
}
