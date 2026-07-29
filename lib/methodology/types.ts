/** Public methodology module definitions (admin-overridable). */

export type MethodologyModuleId =
  | "liuyao"
  | "qimen"
  | "market_structure"
  | "macro_flows"
  | "wave"
  | "ai_quant"
  | "analyst";

export type MethodologyModule = {
  id: MethodologyModuleId;
  /** Module is part of the live research stack. */
  enabled: boolean;
  /** Shown on the public /methodology page. */
  publicDisplay: boolean;
  nameZh: string;
  nameEn: string;
  summaryZh: string;
  summaryEn: string;
  /**
   * Public importance label — 核心 / 高 / 中高 / 辅助.
   */
  weightRangeZh: string;
  weightRangeEn: string;
  updatedAt: string;
};

export type MethodologyConfig = {
  version: 1;
  updatedAt: string;
  modules: MethodologyModule[];
};

export type ForecastModuleEvidence = {
  moduleId: MethodologyModuleId;
  nameZh: string;
  nameEn: string;
  influenceZh: string;
  influenceEn: string;
  conclusionZh: string;
  conclusionEn: string;
};
