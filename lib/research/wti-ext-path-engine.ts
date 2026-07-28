/**
 * Engine gates + auto-compare for INT-WTI-20260807-20270204-EXT-001.
 */
import type { ResearchRecord } from "@/types/research";
import {
  WTI_EXT_PATH_RECORD_ID,
  WTI_MOONX_MIDTERM_ID,
  wtiPathExt20260807Records,
} from "@/lib/data/wti-path-ext-20260807";

export type WtiLaterCompareVerdict = "一致" | "部分一致" | "冲突" | "证据不足";

export type WtiLaterCompareResult = {
  externalRecordId: string;
  liuyaoRecordId: string;
  checks: {
    supportsOctoberLow: boolean | null;
    supportsNovDecRally: boolean | null;
    supportsBreakPriorHigh: boolean | null;
    supportsYearEndFade: boolean | null;
    timingAligned: boolean | null;
    technicalConfirmed: boolean | null;
  };
  verdict: WtiLaterCompareVerdict;
  laterWeightPct: number;
  note: string;
};

function blobOf(record: ResearchRecord): string {
  return [
    record.id,
    record.title?.zhCN,
    record.summary?.zhCN,
    record.moonxInterpretation?.zhCN,
    record.shortHorizonSummary?.zhCN,
    record.mediumHorizonSummary?.zhCN,
    ...(record.thesis ?? []).map((t) => t.zhCN),
    ...(record.expectedPath ?? []).map(
      (p) => `${p.start}${p.end}${p.direction.zhCN}${p.title.zhCN}${p.description?.zhCN ?? ""}`
    ),
    ...(record.notes ?? []).map((n) => n.zhCN),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function boolHint(blob: string, positive: RegExp, negative?: RegExp): boolean | null {
  const pos = positive.test(blob);
  const neg = negative ? negative.test(blob) : false;
  if (pos && !neg) return true;
  if (neg && !pos) return false;
  if (pos && neg) return null;
  return null;
}

/** Max engine weight (%) for the external path on a given Beijing calendar date. */
export function getWtiExtPathEngineWeightPct(forecastDate: string): number {
  const record = wtiPathExt20260807Records[0];
  if (!record?.engineUsage) return 0;
  const { earlyStage, laterStage } = record.engineUsage;
  if (forecastDate >= earlyStage.start && forecastDate <= earlyStage.end) {
    return earlyStage.allowedAsBackground ? earlyStage.maxWeightPct : 0;
  }
  if (forecastDate >= laterStage.start && forecastDate <= laterStage.end) {
    return laterStage.adminRiskOnly ? 0 : laterStage.maxWeightPct;
  }
  // Before Aug 2026 early window: still allow light background if overlapping soft bias
  if (forecastDate < earlyStage.start && forecastDate >= "2026-07-28") {
    return Math.min(20, earlyStage.maxWeightPct);
  }
  return 0;
}

export function isWtiExtPathInternalOnly(recordId: string): boolean {
  return recordId === WTI_EXT_PATH_RECORD_ID;
}

/** True when a research id must never feed public/member short-horizon direction. */
export function mustNotDrivePublicWtiDirection(recordId: string, forecastDate: string): boolean {
  if (recordId !== WTI_EXT_PATH_RECORD_ID) return false;
  return getWtiExtPathEngineWeightPct(forecastDate) <= 0;
}

/**
 * Auto-compare a newly ingested WTI six-yao record against the external later path.
 */
export function compareNewWtiLiuyaoToExternalPath(
  liuyao: ResearchRecord
): WtiLaterCompareResult | null {
  const isWti =
    /crude|oil|wti|原油/.test(`${liuyao.assetId} ${liuyao.symbol ?? ""} ${liuyao.id}`.toLowerCase()) &&
    (liuyao.framework === "oracle-six-yao" || /liuyao|六爻|oracle/i.test(liuyao.id));
  if (!isWti) return null;
  if (liuyao.id === WTI_EXT_PATH_RECORD_ID || liuyao.id === WTI_MOONX_MIDTERM_ID) {
    // Existing mid-term already compared manually; still allow re-score for new records only.
    if (liuyao.id === WTI_EXT_PATH_RECORD_ID) return null;
  }

  const blob = blobOf(liuyao);
  const supportsOctoberLow = boolHint(
    blob,
    /10月|october|低点|见底|底部|trough|low/,
    /不支持.*10月|否定.*低点/
  );
  const supportsNovDecRally = boolHint(
    blob,
    /11月|12月|nov|dec|重新上涨|再上涨|反弹|上行|偏多|看涨/,
    /不支持.*上涨|否定.*11|继续下跌|单边下跌/
  );
  const supportsBreakPriorHigh = boolHint(
    blob,
    /突破前高|前高|120|新高|冲高/,
    /不突破|难破|无法突破|禁止.*120/
  );
  const supportsYearEndFade = boolHint(
    blob,
    /年底|年末|2027|2月|回落|下跌|降温|溢价下降/,
    /年底继续涨|年末上行/
  );
  const timingAligned = boolHint(
    blob,
    /10月|11月|12月|2027-02|2月初/,
    /时间不符|错位/
  );
  const technicalConfirmed = boolHint(
    blob,
    /技术|日线|4小时|4h|确认|站稳|破位/,
    /技术未确认|证据不足/
  );

  const votes = [
    supportsOctoberLow,
    supportsNovDecRally,
    supportsBreakPriorHigh,
    supportsYearEndFade,
    timingAligned,
    technicalConfirmed,
  ];
  const yes = votes.filter((v) => v === true).length;
  const no = votes.filter((v) => v === false).length;
  const unk = votes.filter((v) => v == null).length;

  let verdict: WtiLaterCompareVerdict = "证据不足";
  if (yes >= 4 && no === 0) verdict = "一致";
  else if (yes >= 2 && no <= 1) verdict = "部分一致";
  else if (no >= 2) verdict = "冲突";
  else if (unk >= 4) verdict = "证据不足";
  else if (no > yes) verdict = "冲突";
  else if (yes > no) verdict = "部分一致";

  const laterWeightPct =
    verdict === "一致" && technicalConfirmed === true
      ? 15
      : verdict === "冲突" || supportsNovDecRally === false
        ? 0
        : 0;

  const note =
    verdict === "一致" && technicalConfirmed === true
      ? "六爻与技术面同时支持后期路线，可升级为MoonX正式内部判断（仍不对公众开放长期目标）。"
      : supportsNovDecRally === false || verdict === "冲突"
        ? "六爻不支持后期上涨：降低外部研究后期权重，保持待复核／风险情景。"
        : "证据不足或部分一致：后期权重保持0%，仅管理员风险情景提示。";

  return {
    externalRecordId: WTI_EXT_PATH_RECORD_ID,
    liuyaoRecordId: liuyao.id,
    checks: {
      supportsOctoberLow,
      supportsNovDecRally,
      supportsBreakPriorHigh,
      supportsYearEndFade,
      timingAligned,
      technicalConfirmed,
    },
    verdict,
    laterWeightPct,
    note,
  };
}

/** Run compare against all oil six-yao records newer than the external ingest. */
export function listWtiLaterComparisons(records: ResearchRecord[]): WtiLaterCompareResult[] {
  return records
    .map((r) => compareNewWtiLiuyaoToExternalPath(r))
    .filter((x): x is WtiLaterCompareResult => x != null);
}
