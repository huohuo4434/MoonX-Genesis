/**
 * Per-forecast methodology evidence — derived from real saved fields only.
 * Modules without usable signals are omitted (never identical hard-coded blocks).
 */
import { normalizeFormalDirection } from "@/lib/forecasts/formal-direction";
import { isTomorrowWaveAllowedSymbol } from "@/lib/forecasts/basis-weights";
import { DEFAULT_METHODOLOGY_MODULES } from "@/lib/methodology/defaults";
import type { ForecastModuleEvidence, MethodologyModule, MethodologyModuleId } from "@/lib/methodology/types";
import type { DailyForecast } from "@/types/daily-forecast";

export type ForecastEvidenceSource = {
  id?: string;
  symbol?: string;
  directionLabel?: string;
  direction?: string;
  summary?: string;
  headline?: string;
  expectedPath?: string[];
  probabilities?: { up: number; flat: number; down: number };
  supportLevels?: string[];
  resistanceLevels?: string[];
  invalidation?: string;
  confirmation?: string;
  catalysts?: string[];
  risks?: string[];
  evidenceRecordIds?: string[];
  confidence?: number;
};

function moduleMeta(id: MethodologyModuleId, modules?: MethodologyModule[]): MethodologyModule {
  const from = modules?.find((m) => m.id === id);
  if (from) return from;
  return DEFAULT_METHODOLOGY_MODULES.find((m) => m.id === id)!;
}

function influenceFromConfidence(
  confidence: number | undefined,
  kind: "primary" | "support" | "aux"
): { zh: string; en: string } {
  if (kind === "aux") return { zh: "较低（辅助）", en: "Low (supporting)" };
  const c = confidence ?? 0;
  if (c >= 60) return { zh: "较高", en: "Higher" };
  if (c >= 50) return { zh: "中等", en: "Moderate" };
  return { zh: "较低", en: "Lower" };
}

export function buildForecastModuleEvidence(
  source: ForecastEvidenceSource,
  enabledModules?: MethodologyModule[]
): ForecastModuleEvidence[] {
  const allow = new Set(
    (enabledModules ?? DEFAULT_METHODOLOGY_MODULES.filter((m) => m.enabled && m.publicDisplay)).map(
      (m) => m.id
    )
  );

  const dir = normalizeFormalDirection(source.directionLabel ?? source.direction);
  const catalysts = source.catalysts ?? [];
  const risks = source.risks ?? [];
  const catalystText = catalysts.join("；");
  const riskText = risks.join("；");
  const summary = source.summary ?? "";
  const headline = source.headline ?? "";
  const path = (source.expectedPath ?? []).join(" → ");
  const blob = `${catalystText}\n${riskText}\n${summary}\n${headline}\n${path}`;
  const out: ForecastModuleEvidence[] = [];

  if (allow.has("ai_quant") && source.probabilities) {
    const p = source.probabilities;
    const meta = moduleMeta("ai_quant", enabledModules);
    const inf = influenceFromConfidence(source.confidence, "primary");
    out.push({
      moduleId: "ai_quant",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: inf.zh,
      influenceEn: inf.en,
      conclusionZh: `概率分布支持「${dir}」（上涨 ${p.up}%／震荡 ${p.flat}%／下跌 ${p.down}%）`,
      conclusionEn: `Probability mix favors “${dir}” (up ${p.up}% / sideways ${p.flat}% / down ${p.down}%)`,
    });
  }

  if (
    allow.has("liuyao") &&
    (/六爻|卦|周期|节奏|时间结构|MoonX综合/.test(blob) || (source.evidenceRecordIds?.length ?? 0) > 0)
  ) {
    const meta = moduleMeta("liuyao", enabledModules);
    const inf = influenceFromConfidence(source.confidence, "support");
    out.push({
      moduleId: "liuyao",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: inf.zh,
      influenceEn: inf.en,
      conclusionZh: `时间／节奏维度与主方向「${dir}」一并纳入综合（研究输入，非确定性结论）`,
      conclusionEn: `Timing/path dimension aligned with “${dir}” in the composite (research input, not deterministic)`,
    });
  }

  if (
    allow.has("market_structure") &&
    ((source.supportLevels?.length ?? 0) > 0 ||
      (source.resistanceLevels?.length ?? 0) > 0 ||
      Boolean(source.invalidation) ||
      Boolean(source.confirmation) ||
      Boolean(path))
  ) {
    const meta = moduleMeta("market_structure", enabledModules);
    const inf = influenceFromConfidence(source.confidence, "primary");
    const support = source.supportLevels?.[0];
    const resistance = source.resistanceLevels?.[0];
    let conclusionZh = `结构判断偏向「${dir}」`;
    let conclusionEn = `Structure leans “${dir}”`;
    if (support && resistance) {
      conclusionZh = `支撑 ${support} 与压力 ${resistance} 仍纳入路径约束；方向「${dir}」`;
      conclusionEn = `Support ${support} / resistance ${resistance} constrain the path; direction “${dir}”`;
    } else if (source.invalidation) {
      conclusionZh = `已锁定失效条件；方向「${dir}」`;
      conclusionEn = `Invalidation locked; direction “${dir}”`;
    } else if (path) {
      conclusionZh = `路径：${path}`;
      conclusionEn = `Path: ${path}`;
    }
    out.push({
      moduleId: "market_structure",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: inf.zh,
      influenceEn: inf.en,
      conclusionZh,
      conclusionEn,
    });
  }

  const symbol = source.symbol ?? "";
  if (
    allow.has("wave") &&
    (isTomorrowWaveAllowedSymbol(symbol) || /波浪|浪型|Wave/i.test(blob))
  ) {
    const meta = moduleMeta("wave", enabledModules);
    const near =
      /关键位|接近|确认/.test(blob) ||
      ((source.supportLevels?.length ?? 0) > 0 && (source.resistanceLevels?.length ?? 0) > 0);
    out.push({
      moduleId: "wave",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: near ? "中等（接近关键位）" : "较低（辅助）",
      influenceEn: near ? "Moderate (near key levels)" : "Low (supporting)",
      conclusionZh: near
        ? "价格接近结构／波浪相关区域，波浪证据权重可临时提高"
        : "当前距离波浪关键位较远或未单独确认，影响较低",
      conclusionEn: near
        ? "Price near structure/wave zones — wave evidence weight may rise temporarily"
        : "Far from wave key levels or unconfirmed — low influence",
    });
  }

  if (allow.has("macro_flows") && (catalysts.length > 0 || risks.length > 0 || /宏观|资金|政策|事件|催化|风险/.test(blob))) {
    const meta = moduleMeta("macro_flows", enabledModules);
    const inf = influenceFromConfidence(source.confidence, "support");
    const conclusionZh = riskText
      ? `主要风险：${riskText.slice(0, 80)}${riskText.length > 80 ? "…" : ""}`
      : catalystText
        ? `催化因素：${catalystText.slice(0, 80)}${catalystText.length > 80 ? "…" : ""}`
        : "已纳入事件与风险偏好相关约束";
    const conclusionEn = riskText
      ? `Key risks: ${riskText.slice(0, 100)}${riskText.length > 100 ? "…" : ""}`
      : catalystText
        ? `Catalysts: ${catalystText.slice(0, 100)}${catalystText.length > 100 ? "…" : ""}`
        : "Event and risk-appetite constraints included";
    out.push({
      moduleId: "macro_flows",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: inf.zh,
      influenceEn: inf.en,
      conclusionZh,
      conclusionEn,
    });
  }

  if (allow.has("analyst") && /分析师|情报|Analyst/i.test(blob)) {
    const meta = moduleMeta("analyst", enabledModules);
    out.push({
      moduleId: "analyst",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: "中等",
      influenceEn: "Moderate",
      conclusionZh: "外部研究观点已按历史验证权重纳入（若该模块已启用）",
      conclusionEn: "External research weighted by verified history (when this module is enabled)",
    });
  }

  return out;
}

export function dailyForecastToEvidenceSource(f: DailyForecast): ForecastEvidenceSource {
  return {
    id: f.id,
    symbol: f.symbol,
    directionLabel: f.directionLabel,
    direction: f.direction,
    summary: f.summary,
    headline: f.headline,
    expectedPath: f.expectedPath,
    probabilities: f.probabilities,
    supportLevels: f.supportLevels,
    resistanceLevels: f.resistanceLevels,
    invalidation: f.invalidation,
    confirmation: f.confirmation,
    catalysts: f.catalysts,
    risks: f.risks,
    evidenceRecordIds: f.evidenceRecordIds,
    confidence: f.confidence,
  };
}
