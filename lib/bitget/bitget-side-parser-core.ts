export function parseBitgetPositionSide(value: unknown): "long" | "short" | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "long") return "long";
  if (normalized === "short") return "short";
  return null;
}

export function requireBitgetPositionSide(value: unknown): "long" | "short" {
  const parsed = parseBitgetPositionSide(value);
  if (!parsed) throw new Error(`Bitget返回未知持仓方向：${String(value ?? "<empty>")}`);
  return parsed;
}
