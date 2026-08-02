const INTERNAL_TOKENS = [
  /\[AUTO_PERCENT_PLAN\]\s*/gi,
  /\bARMED\b/gi,
  /\bACTIVE\b/gi,
  /\bPUBLISHED\b/gi,
  /\bLOCKED\b/gi,
  /\bDRAFT\b/gi,
  /\bV\d+\b/g,
  /moox-auto-engine/gi,
  /weekly-to-daily/gi,
];

export function cleanMemberCopy(input: string | null | undefined): string {
  let value = (input ?? "").trim();
  for (const token of INTERNAL_TOKENS) value = value.replace(token, "");
  return value
    .replace(/1D确认/g, "日线收盘确认")
    .replace(/Bitget Demo模拟盘/g, "Bitget 模拟交易")
    .replace(/允许Demo下单/g, "交易执行已开启")
    .replace(/Bitget镜像/g, "交易同步")
    .replace(/服务器心跳/g, "自动运行状态")
    .replace(/CRON_SECRET[^；。\n]*/gi, "")
    .replace(/Yahoo(?:自动)?行情/gi, "自动行情")
    .replace(/DexScreener(?:链上)?行情/gi, "链上行情")
    .replace(/Bitget\s*\/\s*Hyperliquid自动行情/gi, "加密市场自动行情")
    .replace(/\s{2,}/g, " ")
    .replace(/^[；。\s]+|[；\s]+$/g, "")
    .trim();
}

export function directionLabel(value: string): string {
  if (value === "LONG") return "做多";
  if (value === "SHORT") return "做空";
  return value;
}

export function signalStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    DRAFT: "准备中",
    PUBLISHED: "计划已发布",
    ARMED: "等待价格条件",
    TRIGGERED: "条件已触发",
    ACTIVE: "模拟持仓中",
    TAKE_PROFIT: "分批止盈中",
    STOPPED: "已止损",
    CANCELLED: "已取消",
    CLOSED: "已结束",
  };
  return labels[value] ?? value;
}

export function timeframeLabel(value: string): string {
  const labels: Record<string, string> = { "1W": "本周", "1D": "今日", "4H": "4小时", "1H": "1小时" };
  return labels[value] ?? value;
}
