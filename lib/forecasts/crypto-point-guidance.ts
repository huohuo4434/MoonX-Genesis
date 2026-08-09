import type { GeneratedDailyForecastRecord } from "@/lib/weekly-source/types";

export type CryptoPointGuidance = {
  id: string;
  symbol: "BTC" | "ETH";
  threshold: number;
  validFrom: string;
  validUntil: string;
  closeInterval: "4H";
  primaryHexagram: string;
  changedHexagram: string;
  specialPattern: string;
  movingSummary: string;
  supportConfidence: number;
  summary: string;
  invalidationRule: string;
  sourceLabel: string;
};

/**
 * Point-specific Liu Yao questions supplied on 2026-08-02.
 * These records do not contain the querent's name, birthday, or other personal data.
 * They are risk gates, not standalone daily hexagrams.
 */
export const CRYPTO_POINT_GUIDANCE_20260802: CryptoPointGuidance[] = [
  {
    id: "POINT-BTC-61000-20260802-V1",
    symbol: "BTC",
    threshold: 61_000,
    validFrom: "2026-08-02T08:15:00+08:00",
    validUntil: "2026-08-06T23:59:59+08:00",
    closeInterval: "4H",
    primaryHexagram: "山火贲（六合）",
    changedHexagram: "离为火（六冲）",
    specialPattern: "六合转六冲",
    movingSummary: "兄弟戌土发动化子孙酉金；财爻子水、亥水受压后仍保留修复来源。",
    supportConfidence: 58,
    summary:
      "61000附近存在粘合和承接条件，但兄弟动克财、变卦六冲，盘中仍可能快速刺破。未出现4小时收盘确认前，不把瞬时跌破等同于支撑失效；接近支撑时禁止追空。",
    invalidationRule:
      "最近一根已收盘4小时K线低于61000后，61000支撑按失效处理，禁止新开多单，等待下一层支撑和新问题确认。",
    sourceLabel: "2026-08-02 BTC 61000点位卦（模型综合解读，非日卦）",
  },
  {
    id: "POINT-ETH-1600-20260802-V1",
    symbol: "ETH",
    threshold: 1_600,
    validFrom: "2026-08-02T08:16:00+08:00",
    validUntil: "2026-08-06T23:59:59+08:00",
    closeInterval: "4H",
    primaryHexagram: "风雷益",
    changedHexagram: "山火贲（六合）",
    specialPattern: "财爻持世发动，变六合",
    movingSummary:
      "妻财辰土持世发动化父母亥水，子孙巳火发动化父母子水；有承接基础，但生财动力反复。",
    supportConfidence: 60,
    summary:
      "1600附近具备承接和六合稳定条件，但财爻化父母、子孙回头受制，支撑并非绝对牢固。允许测试或盘中刺破，接近支撑时禁止追空，必须等待15分钟止跌反弹确认后才考虑做多。",
    invalidationRule:
      "最近一根已收盘4小时K线低于1600后，1600支撑按失效处理，禁止新开多单，等待下一层支撑和新问题确认。",
    sourceLabel: "2026-08-02 ETH 1600点位卦（模型综合解读，非日卦）",
  },
];

function dateKeyFromIso(value: string): string {
  return value.slice(0, 10);
}

export function getCryptoPointGuidance(
  symbol: string,
  at: Date | string = new Date()
): CryptoPointGuidance | null {
  const normalized = symbol.trim().toUpperCase().replace(/USDT$/, "");
  const timestamp = at instanceof Date ? at.getTime() : new Date(at).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return (
    CRYPTO_POINT_GUIDANCE_20260802.find(
      (item) =>
        item.symbol === normalized &&
        timestamp >= new Date(item.validFrom).getTime() &&
        timestamp <= new Date(item.validUntil).getTime()
    ) ?? null
  );
}

export function getCryptoPointGuidanceForDate(
  symbol: string,
  forecastDate: string
): CryptoPointGuidance | null {
  const normalized = symbol.trim().toUpperCase().replace(/USDT$/, "");
  return (
    CRYPTO_POINT_GUIDANCE_20260802.find(
      (item) =>
        item.symbol === normalized &&
        dateKeyFromIso(item.validFrom) <= forecastDate &&
        dateKeyFromIso(item.validUntil) >= forecastDate
    ) ?? null
  );
}

function guidanceDayStage(forecastDate: string): "PRESSURE" | "TURN" | "REBOUND" {
  if (forecastDate <= "2026-08-04") return "PRESSURE";
  if (forecastDate === "2026-08-05") return "TURN";
  return "REBOUND";
}

/**
 * Convert a point-specific Liu Yao support question into an execution overlay.
 * It may add levels, timing notes and scenario weights, but it never replaces the
 * official direction inherited from the weekly/metaphysical research.
 */
export function applyCryptoPointGuidanceToDaily(
  record: GeneratedDailyForecastRecord
): GeneratedDailyForecastRecord {
  const gate = getCryptoPointGuidanceForDate(record.marketCode, record.forecastDate);
  if (!gate) return record;

  const stage = guidanceDayStage(record.forecastDate);
  const threshold = gate.threshold.toLocaleString("en-US");
  const commonEvidence = `${gate.sourceLabel}。主卦${gate.primaryHexagram}，变卦${gate.changedHexagram}；${gate.movingSummary}`;

  if (stage === "PRESSURE") {
    return {
      ...record,
      upProbability: gate.symbol === "BTC" ? 23 : 25,
      sidewaysProbability: 31,
      downProbability: gate.symbol === "BTC" ? 46 : 44,
      expectedPath: `先延续弱势整理或下探，重点测试${threshold}附近承接；接近支撑禁止追空，未出现15分钟止跌反弹前不抢多。`,
      supportLevels: [threshold, ...record.supportLevels.filter((item) => item !== threshold)],
      confirmationLevel: `4小时收盘守在${threshold}上方，并出现15分钟低点抬高和反弹确认`,
      invalidationLevel: `4小时收盘低于${threshold}`,
      liuyaoEvidence: [record.liuyaoEvidence, commonEvidence].filter(Boolean).join("。"),
      technicalEvidence: `${record.technicalEvidence ?? ""} 点位卦只负责支撑有效性，实时入场仍由Bitget 15分钟K线确认。`.trim(),
      risks: [...record.risks, gate.invalidationRule],
      riskLevel: "高",
    };
  }

  if (stage === "TURN") {
    return {
      ...record,
      upProbability: 37,
      sidewaysProbability: 32,
      downProbability: 31,
      expectedPath: `仍可能先测试${threshold}；4小时与15分钟结构只用于判断执行节奏。有效跌破时暂停当前做多执行计划，但不反向修改MOOX正式方向。`,
      supportLevels: [threshold, ...record.supportLevels.filter((item) => item !== threshold)],
      confirmationLevel: `4小时收盘守住${threshold}且15分钟止跌反弹`,
      invalidationLevel: `4小时收盘低于${threshold}`,
      liuyaoEvidence: [record.liuyaoEvidence, commonEvidence].filter(Boolean).join("。"),
      risks: [...record.risks, gate.invalidationRule],
      riskLevel: "高",
    };
  }

  return {
    ...record,
    upProbability: 42,
    sidewaysProbability: 33,
    downProbability: 25,
    expectedPath: `关键窗口内观察${threshold}附近的执行位置；15分钟回升结构用于择时，未确认前等待更好的入场位置，不改变MOOX正式方向。`,
    supportLevels: [threshold, ...record.supportLevels.filter((item) => item !== threshold)],
    confirmationLevel: `4小时收盘守住${threshold}且15分钟回升确认`,
    invalidationLevel: `4小时收盘低于${threshold}`,
    liuyaoEvidence: [record.liuyaoEvidence, commonEvidence].filter(Boolean).join("。"),
    risks: [...record.risks, gate.invalidationRule],
    riskLevel: "高",
  };
}
