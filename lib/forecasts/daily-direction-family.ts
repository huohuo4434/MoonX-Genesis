export const MOOX_DAILY_DIRECTION_FAMILY_VERSION = "DAILY_DIRECTION_FAMILY_V72080";

export type DailyDirectionFamily = "UP" | "DOWN" | "SIDEWAYS" | "UNKNOWN";

const UP_PATTERNS = [
  /上涨/u,
  /震荡上涨/u,
  /震荡偏强/u,
  /偏强/u,
  /反弹/u,
  /修复/u,
  /回升/u,
  /探底回升/u,
  /先跌后涨/u,
  /企稳回升/u,
  /走强/u,
  /上行/u,
  /冲高/u,
];

const DOWN_PATTERNS = [
  /下跌/u,
  /震荡下跌/u,
  /震荡偏弱/u,
  /偏弱/u,
  /回落/u,
  /回撤/u,
  /探底/u,
  /冲高回落/u,
  /先涨后跌/u,
  /走弱/u,
  /下行/u,
];

const SIDEWAYS_PATTERNS = [
  /震荡/u,
  /整固/u,
  /企稳/u,
  /观察/u,
  /休市/u,
  /横盘/u,
  /盘整/u,
  /回踩/u,
  /反抽/u,
];

export function classifyDailyDirection(value: string | null | undefined): DailyDirectionFamily {
  const text = String(value ?? "").trim();
  if (!text) return "UNKNOWN";

  // Explicit composite paths come first so embedded words do not misclassify them.
  if (/先涨后跌|冲高回落/u.test(text)) return "DOWN";
  if (/先跌后涨|探底回升/u.test(text)) return "UP";
  if (/震荡下跌|震荡偏弱/u.test(text)) return "DOWN";
  if (/震荡上涨|震荡偏强/u.test(text)) return "UP";

  if (DOWN_PATTERNS.some((pattern) => pattern.test(text))) return "DOWN";
  if (UP_PATTERNS.some((pattern) => pattern.test(text))) return "UP";
  if (SIDEWAYS_PATTERNS.some((pattern) => pattern.test(text))) return "SIDEWAYS";
  return "UNKNOWN";
}

export function compactDirectionLabel(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  return text || "震荡";
}
