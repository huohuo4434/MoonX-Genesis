import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";

export type PublicationQualityIssue = {
  code: string;
  message: string;
};

export type PublicationQualityResult = {
  ok: boolean;
  issues: PublicationQualityIssue[];
};

const INTERNAL_ENUM = /\b(?:OVERHEATED|COOLING|PLACEHOLDER|TODO|TBD|UNDEFINED|NULL)\b/i;
const BAD_PUNCTUATION = /(?:。|；；|，，|、、|\.\.|;;|,,)/;

function normalizedSentences(text: string): string[] {
  return text
    .split(/[。！？!?；;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8);
}

function hasRepeatedSentence(text: string): boolean {
  const rows = normalizedSentences(text);
  const seen = new Set<string>();
  for (const row of rows) {
    const key = row.replace(/\s+/g, "");
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function inspectText(
  label: string,
  text: string | null | undefined,
  issues: PublicationQualityIssue[]
) {
  const value = String(text ?? "").trim();
  if (!value) return;
  if (BAD_PUNCTUATION.test(value)) {
    issues.push({ code: "BAD_PUNCTUATION", message: `${label}存在连续标点` });
  }
  if (INTERNAL_ENUM.test(value)) {
    issues.push({ code: "INTERNAL_ENUM", message: `${label}包含内部枚举或占位符` });
  }
  if (hasRepeatedSentence(value)) {
    issues.push({ code: "REPEATED_SENTENCE", message: `${label}存在重复句子` });
  }
  if (/^[\s，。；、,.!?！？：:—-]+$/.test(value)) {
    issues.push({ code: "PUNCTUATION_ONLY", message: `${label}只有标点，没有正文` });
  }
}

/**
 * Gate for formal auto-publication.
 * Direction is owned by metaphysical research. Percentages are scenario weights,
 * so they must sum to 100 but do not have to make the official direction the largest bucket.
 */
export function validateGeneratedDailyPublication(
  record: GeneratedDailyForecastRecord
): PublicationQualityResult {
  const issues: PublicationQualityIssue[] = [];

  if (!record.direction?.trim()) {
    issues.push({ code: "MISSING_DIRECTION", message: "缺少正式方向" });
  }
  if (!record.expectedPath?.trim()) {
    issues.push({ code: "MISSING_PATH", message: "缺少运行路径" });
  }

  const scenarioWeightSum =
    Number(record.upProbability) +
    Number(record.sidewaysProbability) +
    Number(record.downProbability);
  if (!Number.isFinite(scenarioWeightSum) || Math.abs(scenarioWeightSum - 100) > 0.001) {
    issues.push({
      code: "SCENARIO_WEIGHT_SUM",
      message: `上涨/震荡/下跌情景权重合计必须为100%，当前为${scenarioWeightSum}%`,
    });
  }

  const technicalUnavailable = /(?:暂不可用|等待.*技术|等待.*K线|不提供虚构价位|data unavailable)/i.test(
    String(record.technicalEvidence ?? "")
  );
  const hasAnyTechnicalLevel = Boolean(
    record.supportLevels.length ||
      record.resistanceLevels.length ||
      record.confirmationLevel ||
      record.invalidationLevel
  );
  if (!hasAnyTechnicalLevel && !technicalUnavailable) {
    issues.push({
      code: "TECHNICAL_LEVEL_STATE_UNCLEAR",
      message: "技术价位全部缺失时必须明确写明等待真实行情，不得用空值冒充完整交付",
    });
  }

  inspectText("运行路径", record.expectedPath, issues);
  inspectText("六爻依据", record.liuyaoEvidence, issues);
  inspectText("奇门依据", record.qimenEvidence, issues);
  inspectText("技术依据", record.technicalEvidence, issues);
  inspectText("消息依据", record.newsEvidence, issues);
  for (const [index, item] of record.risks.entries()) {
    inspectText(`风险${index + 1}`, item, issues);
  }
  for (const [index, item] of record.catalysts.entries()) {
    inspectText(`催化${index + 1}`, item, issues);
  }

  return { ok: issues.length === 0, issues };
}
