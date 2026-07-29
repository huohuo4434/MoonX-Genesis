/** Public methodology module definitions (admin-overridable). */

export type MethodologyModuleId =
  | "ai_quant"
  | "liuyao"
  | "market_structure"
  | "wave"
  | "macro_flows"
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
   * Public weight description — ranges or “动态调整”, never invented fixed %.
   * Leave empty to fall back to “根据历史验证动态调整”.
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
