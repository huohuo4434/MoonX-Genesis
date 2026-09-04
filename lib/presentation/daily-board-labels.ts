import { formatDateChina } from "@/lib/utils/datetime";

/** Display the actual sessions in a batch, not the first market's calendar. */
export function dailyBoardDateLabel(rows: readonly { forecastForDate?: string }[]): string {
  const dates = [...new Set(rows.map((row) => row.forecastForDate).filter((date): date is string => Boolean(date)))].sort();
  if (!dates.length) return "日期待核对";
  const label = dates.map(formatDateChina).join(" / ");
  return dates.length > 1 ? `${label} · 各市场交易日不同` : label;
}

export function dailyTechnicalBasisLabel(source: string, quoteSymbol?: string): string {
  if (source === "UNAVAILABLE") return "技术位置暂不可用";
  if (source === "VERIFIED_OHLC") return "依据历史已验证K线推算，不是实时行情";
  if (source === "FORECAST_SNAPSHOT") return "依据原预测行情快照，不是实时行情";
  if (source === "LOCKED_LEVELS") return "原预测记录点位，不是实时行情";
  if (quoteSymbol === "QQQ") return "技术位置采用 QQQ ETF（美元/份），不是纳指100指数点数";
  if (quoteSymbol === "SPY") return "技术位置采用 SPY ETF（美元/份），不是标普500指数点数";
  return quoteSymbol ? `技术参考行情：${quoteSymbol}` : "技术参考行情口径待核对";
}
