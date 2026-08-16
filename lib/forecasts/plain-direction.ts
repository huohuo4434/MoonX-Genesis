export const PLAIN_DIRECTIONS = [
  "上涨",
  "震荡上涨",
  "先跌后涨",
  "震荡",
  "先涨后跌",
  "震荡下跌",
  "下跌",
] as const;

export type PlainDirection = (typeof PLAIN_DIRECTIONS)[number];

const EXACT: Record<string, PlainDirection> = {
  上涨: "上涨",
  看涨: "上涨",
  走强: "上涨",
  明显走强: "上涨",
  单边向上: "上涨",
  震荡上涨: "震荡上涨",
  震荡偏强: "震荡上涨",
  偏强: "震荡上涨",
  修复上行: "震荡上涨",
  温和上行: "震荡上涨",
  偏多震荡: "震荡上涨",
  先跌后涨: "先跌后涨",
  探底回升: "先跌后涨",
  先抑后扬: "先跌后涨",
  低点修复: "先跌后涨",
  回踩后涨: "先跌后涨",
  震荡: "震荡",
  整固: "震荡",
  盘整: "震荡",
  横盘: "震荡",
  区间整理: "震荡",
  区间震荡: "震荡",
  整理: "震荡",
  先涨后跌: "先涨后跌",
  冲高回落: "先涨后跌",
  先扬后抑: "先涨后跌",
  高位回落: "先涨后跌",
  震荡下跌: "震荡下跌",
  震荡偏弱: "震荡下跌",
  偏弱: "震荡下跌",
  回踩观察: "震荡下跌",
  重新下压: "震荡下跌",
  下跌: "下跌",
  看跌: "下跌",
  走弱: "下跌",
  明显转弱: "下跌",
  单边向下: "下跌",
};

const ORDERED: Array<[RegExp, PlainDirection]> = [
  [/先跌后涨|探底回升|先抑后扬|低点修复|回踩后涨/, "先跌后涨"],
  [/先涨后跌|冲高回落|先扬后抑|高位回落/, "先涨后跌"],
  [/震荡上涨|震荡偏强|偏强|修复上行|温和上行|偏多震荡/, "震荡上涨"],
  [/震荡下跌|震荡偏弱|偏弱|回踩观察|重新下压/, "震荡下跌"],
  [/整固|盘整|横盘|区间整理|区间震荡|整理/, "震荡"],
  [/上涨|看涨|走强/, "上涨"],
  [/下跌|看跌|走弱/, "下跌"],
  [/震荡/, "震荡"],
];

export function normalizePlainDirection(value: unknown): PlainDirection | "" {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (Object.prototype.hasOwnProperty.call(EXACT, raw)) return EXACT[raw]!;
  for (const [pattern, direction] of ORDERED) {
    if (pattern.test(raw)) return direction;
  }
  return "";
}

export function isPlainDirection(value: unknown): value is PlainDirection {
  return PLAIN_DIRECTIONS.includes(value as PlainDirection);
}

export function plainDirectionOrFallback(value: unknown, fallback: PlainDirection = "震荡"): PlainDirection {
  return normalizePlainDirection(value) || fallback;
}
