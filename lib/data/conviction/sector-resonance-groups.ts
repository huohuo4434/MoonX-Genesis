export type SectorResonanceGroup =
  | "半导体 / AI基础设施"
  | "太空与高波动成长"
  | "大型科技"
  | "加密资产"
  | "美股指数"
  | "贵金属与能源";

// Keep this browser-safe. Client boards only need the display order and must
// not pull the full research registry into their JavaScript bundle.
export const SECTOR_RESONANCE_GROUP_ORDER: readonly SectorResonanceGroup[] = [
  "半导体 / AI基础设施",
  "太空与高波动成长",
  "大型科技",
  "加密资产",
  "美股指数",
  "贵金属与能源",
];
