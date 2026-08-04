/**
 * Per-forecast methodology evidence — derived from real saved fields only.
 * Modules without usable signals are omitted (never identical hard-coded blocks).
 * Liu Yao is treated as the core pillar when direction exists.
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

  /**
   * Optional I Ching (六爻研究引擎) evidence binding.
   * Public/member rendering MUST treat these ids as metadata only —
   * never expose raw transcripts / line-by-line data.
   */
  ichingResearchId?: string;
  engineType?: "MASTER_ICHING";
  adoptedSource?: "MASTER" | "INTERNAL" | "NONE";
  weight?: number; // 0..1 or 0..100 depending on caller conventions

  /** Teacher Intelligence citations (rule/case refs only — no lesson raw text). */
  teacherCitations?: Array<{
    type: "RULE" | "CASE" | "GRAPH" | "VOICE";
    ref: string;
    title: string;
    weightStars: number;
  }>;
};

function moduleMeta(id: MethodologyModuleId, modules?: MethodologyModule[]): MethodologyModule {
  const from = modules?.find((m) => m.id === id);
  if (from) return from;
  return DEFAULT_METHODOLOGY_MODULES.find((m) => m.id === id)!;
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
  const conf = source.confidence ?? 0;

  // 六爻 — core whenever we have a formal direction or evidence ids
  if (allow.has("liuyao") && (Boolean(dir) || (source.evidenceRecordIds?.length ?? 0) > 0 || /六爻|卦/.test(blob))) {
    const meta = moduleMeta("liuyao", enabledModules);
    const teacherBits = (source.teacherCitations ?? [])
      .filter((c) => c.type === "RULE" || c.type === "CASE")
      .slice(0, 4)
      .map((c) => `${c.ref} ${c.title}`)
      .join("；");
    out.push({
      moduleId: "liuyao",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: "核心",
      influenceEn: "Core",
      conclusionZh: teacherBits
        ? `老师知识优先：${teacherBits}。六爻主方向「${dir || "综合判断"}」`
        : `六爻：主方向支持「${dir || "综合判断"}」`,
      conclusionEn: teacherBits
        ? `Teacher-first: ${teacherBits}. Liu Yao direction “${dir || "composite"}”`
        : `Liu Yao: primary direction supports “${dir || "composite"}”`,
    });
  }

  // 奇门 — timing when path / rhythm language present, or always light with direction
  if (allow.has("qimen") && (Boolean(dir) || /奇门|节奏|先抑|先扬|窗口|择时/.test(blob) || Boolean(path))) {
    const meta = moduleMeta("qimen", enabledModules);
    const rhythm = /先跌后涨|探底回升/.test(`${dir}${blob}`)
      ? "时间节奏偏先跌后涨"
      : /先涨后跌|冲高回落/.test(`${dir}${blob}`)
        ? "时间节奏偏先涨后跌"
        : "时间节奏纳入综合择时";
    out.push({
      moduleId: "qimen",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: "高",
      influenceEn: "High",
      conclusionZh: `奇门遁甲：${rhythm}`,
      conclusionEn: `Qimen Dunjia: ${rhythm}`,
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
    const support = source.supportLevels?.[0];
    let conclusionZh = `技术分析：结构偏向「${dir}」`;
    if (support) conclusionZh = `技术分析：支撑有效（参考 ${support}）；方向「${dir}」`;
    else if (source.invalidation) conclusionZh = `技术分析：已锁定失效位；方向「${dir}」`;
    out.push({
      moduleId: "market_structure",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: conf >= 55 ? "高" : "中高",
      influenceEn: conf >= 55 ? "High" : "Medium-high",
      conclusionZh,
      conclusionEn: `Technical structure leans “${dir}”`,
    });
  }

  if (allow.has("macro_flows") && (catalysts.length > 0 || risks.length > 0 || /宏观|资金|政策|事件|催化|风险|利空|利多/.test(blob))) {
    const meta = moduleMeta("macro_flows", enabledModules);
    const conclusionZh = riskText
      ? `消息面：主要风险 — ${riskText.slice(0, 60)}${riskText.length > 60 ? "…" : ""}`
      : catalystText
        ? `消息面：催化 — ${catalystText.slice(0, 60)}${catalystText.length > 60 ? "…" : ""}`
        : "消息面：暂无明显额外扰动，已做事件校验";
    out.push({
      moduleId: "macro_flows",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: "中高",
      influenceEn: "Medium-high",
      conclusionZh,
      conclusionEn: "News/catalysts checked",
    });
  }

  const symbol = source.symbol ?? "";
  if (allow.has("wave") && (isTomorrowWaveAllowedSymbol(symbol) || /波浪|浪型|Wave/i.test(blob))) {
    const meta = moduleMeta("wave", enabledModules);
    out.push({
      moduleId: "wave",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: "辅助",
      influenceEn: "Auxiliary",
      conclusionZh: "波浪分析：仅辅助参考",
      conclusionEn: "Wave: supporting only",
    });
  }

  if (allow.has("ai_quant") && source.probabilities) {
    const p = source.probabilities;
    const meta = moduleMeta("ai_quant", enabledModules);
    out.push({
      moduleId: "ai_quant",
      nameZh: meta.nameZh,
      nameEn: meta.nameEn,
      influenceZh: "辅助",
      influenceEn: "Auxiliary",
      conclusionZh: `AI／量化：概率分布（上涨 ${p.up}%／震荡 ${p.flat}%／下跌 ${p.down}%）仅作辅助`,
      conclusionEn: `AI/quant odds (up ${p.up}% / flat ${p.flat}% / down ${p.down}%) — auxiliary`,
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
