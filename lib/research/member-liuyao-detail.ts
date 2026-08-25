import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import type { AnnualForecastRoadmap } from "@/lib/research/annual-forecast-roadmap-2026";

export type MemberLiuyaoRelation = {
  kind: "FORTUNE" | "SOURCE" | "PRESSURE" | "INFORMATION" | "STRUCTURE" | "CALENDAR";
  label: string;
  evidence: string;
};

export type MemberLiuyaoKeyMoment = {
  label: string;
  note: string | null;
  sourceLabel: string;
  tone: "HIGH" | "LOW" | "TURN" | "RISK" | "CONFIRM";
};

export type MemberLiuyaoDetail = {
  horizon: "YEAR" | "MONTH" | "WEEK";
  periodLabel: string;
  version: number;
  direction: string;
  primaryHexagram: string;
  changingHexagram: string | null;
  interpretation: string;
  path: string;
  structureNote: string;
  relations: MemberLiuyaoRelation[];
  keyMoments: MemberLiuyaoKeyMoment[];
  evidenceLevel: "STRUCTURED" | "SUMMARY_ONLY";
};

type DetailOverride = {
  horizon?: MemberLiuyaoDetail["horizon"];
  periodLabel?: string;
  direction?: string;
  primaryHexagram?: string;
  changingHexagram?: string | null;
  interpretation?: string;
  path?: string;
  structureNote?: string;
};

function memberSafeText(value: string): string {
  return value
    .replace(/按老师(?:们)?(?:的)?方法(?:去)?解读/gu, "按六爻结构解读")
    .replace(/按老师金融六爻法复核/gu, "按金融六爻结构复核")
    .replace(/没有同周期老师原卦/gu, "同周期高优先级来源卦象尚未录入")
    .replace(/不是老师原卦/gu, "来源层级已内部留档")
    .replace(/不得表述为老师结论/gu, "不升级为高优先级来源结论")
    .replace(/来源为用户(?:本人|[^。；]*?本人)?排盘(?:截图)?/gu, "原盘证据已留档")
    .replace(/老师原(?:卦|盘)/gu, "来源卦象")
    .replace(/老师结论/gu, "来源结论")
    .replace(/用户原(?:卦|盘)/gu, "原始卦象")
    .replace(/用户起卦/gu, "原始卦象")
    .replace(/用户/gu, "原始记录")
    .replace(/老师/gu, "来源研究")
    .replace(/AI/giu, "研究系统")
    .trim();
}

function changingHexagram(value: string | null | undefined): string | null {
  const normalized = memberSafeText(value ?? "");
  return /^(?:静|静卦|无变卦|无变卦（静卦）)$/u.test(normalized) ? null : normalized || null;
}

function sentences(values: Array<string | null | undefined>): string[] {
  return values
    .filter((item): item is string => Boolean(item?.trim()))
    .flatMap((item) => memberSafeText(item).split(/[。；;\n]+/u))
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Only surfaces relationships explicitly present in the stored notes. */
export function extractMemberLiuyaoRelations(values: Array<string | null | undefined>): MemberLiuyaoRelation[] {
  const source = sentences(values);
  const rules: Array<{ kind: MemberLiuyaoRelation["kind"]; label: string; pattern: RegExp }> = [
    { kind: "FORTUNE", label: "财爻｜价格与资金", pattern: /妻财|财爻/u },
    { kind: "SOURCE", label: "子孙｜生财条件", pattern: /子孙/u },
    { kind: "PRESSURE", label: "兄弟｜竞争与克财压力", pattern: /兄弟/u },
    { kind: "PRESSURE", label: "官鬼｜风险与约束", pattern: /官鬼/u },
    { kind: "INFORMATION", label: "父母｜消息与规则", pattern: /父母/u },
    { kind: "STRUCTURE", label: "世应｜主客力量", pattern: /世爻|应爻|持世|世应/u },
    { kind: "STRUCTURE", label: "动变｜生克转化", pattern: /动爻|发动|动化|化(?:妻财|财|子孙|兄弟|官鬼|父母)|变爻/u },
    { kind: "STRUCTURE", label: "冲合｜结构稳定度", pattern: /六冲|六合|相冲|冲克|相合/u },
    { kind: "CALENDAR", label: "旺衰｜月令与日辰", pattern: /月令|月建|日辰|旬空|空亡|月破|日破|入墓|得令|失令|旺相|休囚/u },
  ];
  const output: MemberLiuyaoRelation[] = [];
  for (const item of rules) {
    const evidence = source.find((sentence) => item.pattern.test(sentence));
    if (evidence) output.push({ kind: item.kind, label: item.label, evidence });
  }
  return output.slice(0, 8);
}

function sourceLabel(source: NonNullable<ConvictionPeriodForecast["keyDates"]>[number]["source"]): string {
  if (source === "LIUYAO") return "卦象明确";
  if (source === "QIMEN") return "奇门校准";
  if (source === "BAZI") return "干支窗口";
  if (source === "TECHNICAL") return "技术确认";
  return "正式记录";
}

function momentTone(type: NonNullable<ConvictionPeriodForecast["keyDates"]>[number]["type"]): MemberLiuyaoKeyMoment["tone"] {
  if (type === "阶段高点") return "HIGH";
  if (type === "阶段低点") return "LOW";
  if (type === "转折") return "TURN";
  if (type === "突破确认") return "CONFIRM";
  return "RISK";
}

function forecastKeyMoments(forecast: ConvictionPeriodForecast): MemberLiuyaoKeyMoment[] {
  return (forecast.keyDates ?? []).map((item) => ({
    label: `${item.date ?? item.ganzhi ?? "周期内"} · ${memberSafeText(item.label)}`,
    note: item.note ? memberSafeText(item.note) : null,
    sourceLabel: sourceLabel(item.source),
    tone: momentTone(item.type),
  }));
}

export function buildForecastLiuyaoDetail(
  forecast: ConvictionPeriodForecast,
  override: DetailOverride = {},
): MemberLiuyaoDetail {
  const note = memberSafeText(override.structureNote ?? forecast.ichingEvidence.notes);
  const methodEvidence = forecast.methodViews?.map((item) => item.summary) ?? [];
  const relations = extractMemberLiuyaoRelations([note, ...methodEvidence]);
  return {
    horizon: override.horizon ?? (forecast.forecastType === "MONTH_1" ? "MONTH" : "WEEK"),
    periodLabel: override.periodLabel ?? `${forecast.periodStart}—${forecast.periodEnd}`,
    version: forecast.version,
    direction: memberSafeText(override.direction ?? forecast.direction),
    primaryHexagram: memberSafeText(override.primaryHexagram ?? forecast.ichingEvidence.primaryHexagram),
    changingHexagram: changingHexagram(override.changingHexagram ?? forecast.ichingEvidence.changingHexagram),
    interpretation: memberSafeText(override.interpretation ?? forecast.summary),
    path: memberSafeText(override.path ?? forecast.expectedPath),
    structureNote: note,
    relations,
    keyMoments: forecastKeyMoments(forecast),
    evidenceLevel: relations.length >= 2 ? "STRUCTURED" : "SUMMARY_ONLY",
  };
}

export function buildAnnualLiuyaoDetail(annual: AnnualForecastRoadmap): MemberLiuyaoDetail {
  const [primary, changed] = annual.sourceHexagram.split("→", 2).map((item) => item.trim());
  const keyMoments: MemberLiuyaoKeyMoment[] = [
    ...annual.highMonthCandidates.map((month) => ({ label: `${Number(month.slice(5))}月 · 高点候选月`, note: null, sourceLabel: "年卦关键月", tone: "HIGH" as const })),
    ...annual.lowMonthCandidates.map((month) => ({ label: `${Number(month.slice(5))}月 · 低点候选月`, note: null, sourceLabel: "年卦关键月", tone: "LOW" as const })),
    ...annual.months.filter((item) => /先涨后跌|先跌后涨/u.test(item.direction)).map((item) => ({
      label: `${Number(item.month.slice(5))}月 · ${item.direction}`,
      note: memberSafeText(item.note),
      sourceLabel: "年度转折月",
      tone: "TURN" as const,
    })),
  ];
  const relations = extractMemberLiuyaoRelations([annual.annualSummary, annual.remainingYearPath]);
  return {
    horizon: "YEAR",
    periodLabel: "2026年｜8月25日以后按月验证",
    version: annual.version,
    direction: annual.annualDirection,
    primaryHexagram: primary || annual.sourceHexagram,
    changingHexagram: changed || null,
    interpretation: memberSafeText(annual.annualSummary),
    path: memberSafeText(annual.remainingYearPath),
    structureNote: relations.length
      ? "年卦只定义年度环境与关键月份；六亲旺衰以原盘已录入结构为准。"
      : "当前年度记录已保存卦名、动变与周期结论；完整六亲排盘尚未结构化，不从卦名补造生克。",
    relations,
    keyMoments,
    evidenceLevel: relations.length >= 2 ? "STRUCTURED" : "SUMMARY_ONLY",
  };
}

export function selectCurrentMonthlyForecast(forecasts: ConvictionPeriodForecast[]): ConvictionPeriodForecast | null {
  return forecasts
    .filter((item) => item.status === "published")
    .filter((item) => {
      const days = Math.round((Date.parse(`${item.periodEnd}T12:00:00Z`) - Date.parse(`${item.periodStart}T12:00:00Z`)) / 86_400_000) + 1;
      return (item.forecastType === "MONTH_1" || (days >= 20 && days <= 45))
        && item.periodEnd >= "2026-08-25"
        && item.periodStart <= "2026-09-30";
    })
    .sort((a, b) => {
      const septemberA = a.periodStart <= "2026-09-15" && a.periodEnd >= "2026-09-15" ? 1 : 0;
      const septemberB = b.periodStart <= "2026-09-15" && b.periodEnd >= "2026-09-15" ? 1 : 0;
      return septemberB - septemberA
        || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")
        || (b.version ?? 0) - (a.version ?? 0);
    })[0] ?? null;
}
