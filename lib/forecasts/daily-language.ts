const WEEKLY_TO_INTRADAY: Array<[RegExp, string]> = [
  [/周初/g, "开盘后"],
  [/本周初/g, "开盘后"],
  [/前半周/g, "盘中前段"],
  [/周中/g, "盘中"],
  [/后半周/g, "盘中后段"],
  [/周后段/g, "尾盘"],
  [/周末/g, "尾盘"],
  [/本周/g, "当日"],
];

export const DAILY_FORBIDDEN_WEEKLY_TERMS = ["周初", "前半周", "周中", "后半周", "周后段"] as const;

export function normalizeDailyLanguage(value: string | null | undefined): string {
  let next = String(value ?? "").trim();
  for (const [pattern, replacement] of WEEKLY_TO_INTRADAY) next = next.replace(pattern, replacement);
  return next.replace(/\s+/g, " ").trim();
}

export function normalizeDailyPath(values: string[] | null | undefined): string[] {
  return (values ?? []).map(normalizeDailyLanguage).filter(Boolean);
}

export function hasWeeklyLanguage(value: string | null | undefined): boolean {
  return DAILY_FORBIDDEN_WEEKLY_TERMS.some((term) => String(value ?? "").includes(term));
}

export function signalStrengthFromConfidence(confidence: number): "低" | "中" | "高" {
  if (confidence >= 66) return "高";
  if (confidence >= 52) return "中";
  return "低";
}
