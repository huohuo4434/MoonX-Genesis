import type { DailyReviewRecord } from "@/types/automation";
import type { DailyForecastRecord, DailyVerificationResult, DailyVerdict } from "@/types/daily-accuracy";
import { PATTERN_LABELS } from "@/types/daily-accuracy";

export type MemberReviewCategory = "INDEX" | "EQUITY" | "CRYPTO" | "COMMODITY";
export type MemberReviewStatus = "FULL_HIT" | "PARTIAL_HIT" | "MISS" | "WAITING" | "UNVERIFIABLE";
export type SupplementStatus = "UPDATED" | "NEEDED" | "NONE";
export type ReviewIssueType = "NONE" | "DIRECTION" | "PATH_TIMING" | "EVIDENCE_GAP" | "DATA" | "PENDING";

export type MemberReviewFinding = {
  issueType: ReviewIssueType;
  issueLabel: string;
  confirmedProblem: string;
  interpretationFinding: string;
  correctionAction: string;
  correctionRecorded: boolean;
};

export type MemberDailyReviewItem = {
  forecastId: string;
  forecastDate: string;
  assetName: string;
  symbol: string;
  category: MemberReviewCategory;
  status: MemberReviewStatus;
  statusLabel: string;
  forecastVersion: number;
  revisionCount: number;
  supplementStatus: SupplementStatus;
  supplementLabel: string | null;
  supplementRequest: string | null;
  weeklySource: {
    sourceForecastId: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    primaryHexagram: string | null;
    changedHexagram: string | null;
    weeklyDirection: string | null;
    interpretation: string | null;
  };
  forecast: {
    direction: string;
    pattern: string;
    confidence: number | null;
    summary: string;
    expectedPath: string[];
  };
  actual: {
    direction: string | null;
    pattern: string | null;
    returnPct: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    mainHighTime: string | null;
    mainLowTime: string | null;
  };
  diagnosis: string;
  improvement: string;
  futureCaution: string;
  finding: MemberReviewFinding;
  verifiedAt: string | null;
};

export type MemberDailyReviewReport = {
  date: string;
  generatedAt: string;
  summary: {
    completed: number;
    waiting: number;
    full: number;
    partial: number;
    miss: number;
    weightedMatchPct: number | null;
    supplementsNeeded: number;
    updates: number;
    problemsFound: number;
    correctionsRecorded: number;
  };
  headline: string;
  problemHeadline: string;
  items: MemberDailyReviewItem[];
};

const INDEX_SYMBOLS = new Set(["SPX", "NDX", "SSEC", "HSTECH", "QQQ", "SPY"]);
const COMMODITY_SYMBOLS = new Set(["GOLD", "GLD", "SILVER", "WTI", "XAU", "XAG"]);
const TERMINAL = new Set<DailyVerdict>(["HIT", "FULL_HIT", "PARTIAL_HIT", "MISS", "UNVERIFIABLE"]);

function categoryOf(forecast: DailyForecastRecord): MemberReviewCategory {
  const symbol = forecast.symbol.trim().toUpperCase();
  if (INDEX_SYMBOLS.has(symbol)) return "INDEX";
  if (forecast.market === "CRYPTO") return "CRYPTO";
  if (forecast.market === "US_FUTURES" || COMMODITY_SYMBOLS.has(symbol)) return "COMMODITY";
  return "EQUITY";
}

function statusOf(result: DailyVerificationResult | null): MemberReviewStatus {
  if (!result || !TERMINAL.has(result.verdict)) return "WAITING";
  if (result.verdict === "MISS") return "MISS";
  if (result.verdict === "PARTIAL_HIT") return "PARTIAL_HIT";
  if (result.verdict === "UNVERIFIABLE") return "UNVERIFIABLE";
  return "FULL_HIT";
}

function statusLabel(status: MemberReviewStatus): string {
  if (status === "FULL_HIT") return "完全命中";
  if (status === "PARTIAL_HIT") return "部分命中";
  if (status === "MISS") return "未命中";
  if (status === "UNVERIFIABLE") return "无法验证";
  return "等待收盘验证";
}

function canonicalKey(forecast: DailyForecastRecord): string {
  return `${forecast.market}:${forecast.symbol.trim().toUpperCase()}:${forecast.forecastDate}`;
}

function later(a: DailyForecastRecord, b: DailyForecastRecord): number {
  return a.originalVersion - b.originalVersion || a.publishedAt.localeCompare(b.publishedAt) || a.id.localeCompare(b.id);
}

function actualPattern(result: DailyVerificationResult | null): string | null {
  if (!result) return null;
  if (result.actualPatternLabel) return result.actualPatternLabel;
  if (result.actualPattern) return PATTERN_LABELS[result.actualPattern];
  if (result.actualDirection === "UP") return "上涨";
  if (result.actualDirection === "DOWN") return "下跌";
  return "震荡";
}

function supplementFor(input: {
  forecast: DailyForecastRecord;
  result: DailyVerificationResult | null;
  review: DailyReviewRecord | null;
  revisionCount: number;
}): Pick<MemberDailyReviewItem, "supplementStatus" | "supplementLabel" | "supplementRequest"> {
  if (input.revisionCount > 1 || input.forecast.originalVersion > 1) {
    return {
      supplementStatus: "UPDATED",
      supplementLabel: `已补充至 V${input.forecast.originalVersion}，旧版和原验证结果继续保留`,
      supplementRequest: null,
    };
  }
  const status = statusOf(input.result);
  if (status === "MISS" || status === "PARTIAL_HIT") {
    const missingStructure = !input.forecast.sourcePrimaryHexagram;
    return {
      supplementStatus: "NEEDED",
      supplementLabel: missingStructure ? "需要补充卦象结构" : "需要提高下一周期精度",
      supplementRequest: missingStructure
        ? "建议补充下一周期完整周卦：起卦时间、本卦、变卦、动爻、世应和月建日辰；只用于未来预测，不回写本日结果。"
        : "建议在下一周期补同周期周卦或老师明确日路径，并用同期奇门校准时点；不为本日事后补造日卦。",
    };
  }
  if (input.review?.pathVerdict === "INSUFFICIENT_DATA") {
    return {
      supplementStatus: "NEEDED",
      supplementLabel: "日内路径数据不足",
      supplementRequest: "需要更完整的盘中K线或下一周期明确路径，当前不强判关键时点。",
    };
  }
  return { supplementStatus: "NONE", supplementLabel: null, supplementRequest: null };
}

function diagnosisFor(status: MemberReviewStatus, result: DailyVerificationResult | null, review: DailyReviewRecord | null): string {
  if (status === "WAITING") return "该市场尚未完成当日交易或验证，系统不会提前填写命中结果。";
  if (status === "UNVERIFIABLE") return result?.errorMessage ?? "可靠行情数据不足，本条不进入命中率。";
  if (review) return review.whatWasWrong;
  if (status === "FULL_HIT") return "方向与主要路径相符；仍需继续核对关键位和时点是否同时成立。";
  if (status === "PARTIAL_HIT") return "方向族接近，但转折顺序、强弱或收盘位置存在偏差。";
  return `实际走势为${actualPattern(result) ?? "未知"}，与锁定预测没有形成有效匹配。`;
}

function improvementFor(status: MemberReviewStatus, review: DailyReviewRecord | null): string {
  if (review) return review.lessonSummary;
  if (status === "WAITING") return "等待真实走势完成后再归因，不提前修正。";
  if (status === "MISS") return "优先复核世应、旺衰、动变与周内阶段拆分，不机械把原方向反过来。";
  if (status === "PARTIAL_HIT") return "保留方向框架，收紧转折窗和冲高回落、探底回升的定义。";
  return "保留有效框架，并继续检查关键位、失效条件和不同市场交易日历。";
}

function directionMismatch(forecast: DailyForecastRecord, result: DailyVerificationResult | null): boolean {
  if (!result) return false;
  if (forecast.direction === "UP") return result.actualDirection === "DOWN";
  if (forecast.direction === "DOWN") return result.actualDirection === "UP";
  if (forecast.direction === "FLAT") return result.actualDirection !== "FLAT";
  return false;
}

function findingFor(input: {
  forecast: DailyForecastRecord;
  result: DailyVerificationResult | null;
  review: DailyReviewRecord | null;
  status: MemberReviewStatus;
}): MemberReviewFinding {
  const { forecast, result, review, status } = input;
  const improvement = improvementFor(status, review);
  if (status === "WAITING") {
    return {
      issueType: "PENDING",
      issueLabel: "尚未到复盘时点",
      confirmedProblem: "当日行情尚未完成，当前不能判断预测是否有问题。",
      interpretationFinding: "卦象和解读暂不做事后调整，等待可靠收盘数据。",
      correctionAction: "收盘验证后再形成问题定位和改进记录。",
      correctionRecorded: false,
    };
  }
  if (status === "UNVERIFIABLE") {
    return {
      issueType: "DATA",
      issueLabel: "验证数据不足",
      confirmedProblem: result?.errorMessage ?? "缺少可靠行情数据，本次不能判断预测对错。",
      interpretationFinding: "这不是卦象或解读错误，样本不进入命中率。",
      correctionAction: "先修复同标的行情源，再重新验证；不使用相似品种代替。",
      correctionRecorded: false,
    };
  }
  if (status === "FULL_HIT") {
    return {
      issueType: "NONE",
      issueLabel: "本次未发现方向性问题",
      confirmedProblem: "锁定方向和主要路径与实际走势相符。",
      interpretationFinding: "当前卦象解读可以保留，但关键位和时点仍继续单独核对。",
      correctionAction: improvement,
      correctionRecorded: Boolean(review),
    };
  }

  const hasHexagram = Boolean(forecast.sourcePrimaryHexagram);
  const opposite = directionMismatch(forecast, result);
  const biasEvidence = review?.interpretationBiases
    .filter((bias) => bias.evidence.trim())
    .slice(0, 2)
    .map((bias) => bias.evidence.trim()) ?? [];
  const actual = actualPattern(result) ?? "未知";

  if (status === "PARTIAL_HIT") {
    return {
      issueType: "PATH_TIMING",
      issueLabel: "周内路径或转折时点解读有偏差",
      confirmedProblem: `原预测为${forecast.predictedPatternLabel ?? forecast.directionLabel}，实际为${actual}；主方向接近，但先后顺序、强弱或收盘位置没有完全兑现。`,
      interpretationFinding: biasEvidence[0] ?? "周卦主方向暂不推翻，优先复核日度拆分是否过细，以及动变、旺衰所对应的转折窗口是否放错。",
      correctionAction: improvement,
      correctionRecorded: Boolean(review),
    };
  }

  if (!hasHexagram) {
    return {
      issueType: "EVIDENCE_GAP",
      issueLabel: "预测未命中，且原卦象证据不完整",
      confirmedProblem: `原预测为${forecast.predictedPatternLabel ?? forecast.directionLabel}，实际为${actual}，两者没有形成有效匹配。`,
      interpretationFinding: "原锁定记录没有携带完整本卦、变卦和动爻结构，因此只能确认预测结论错误，暂时不能准确归因到哪一条六爻关系。",
      correctionAction: improvement,
      correctionRecorded: Boolean(review),
    };
  }

  return {
    issueType: opposite ? "DIRECTION" : "PATH_TIMING",
    issueLabel: opposite ? "正式方向判断错误" : "运行路径判断错误",
    confirmedProblem: opposite
      ? `锁定方向为${forecast.directionLabel}，实际为${actual}；本次方向结论已经确认没有兑现。`
      : `锁定路径为${forecast.predictedPatternLabel ?? forecast.directionLabel}，实际为${actual}；方向未必完全相反，但运行结构没有兑现。`,
    interpretationFinding: biasEvidence.length
      ? biasEvidence.join("；")
      : "目前能确认的是由该周卦派生出的预测结论有误，不能据此直接断言卦象本身错误；下一步复核世应、旺衰、动变及周内阶段对应。",
    correctionAction: improvement,
    correctionRecorded: Boolean(review),
  };
}

export function buildMemberDailyReviewReports(input: {
  forecasts: DailyForecastRecord[];
  results: DailyVerificationResult[];
  reviews: DailyReviewRecord[];
  now?: Date;
  maxDays?: number;
}): MemberDailyReviewReport[] {
  const now = input.now ?? new Date();
  const maxDays = Math.max(1, Math.min(31, input.maxDays ?? 14));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
  const resultById = new Map(input.results.map((result) => [result.forecastId, result]));
  const reviewById = new Map(input.reviews.map((review) => [review.forecastId, review]));
  const groups = new Map<string, DailyForecastRecord[]>();

  for (const forecast of input.forecasts) {
    if (forecast.isSystemTest || forecast.status === "draft" || forecast.forecastDate > today) continue;
    const key = canonicalKey(forecast);
    groups.set(key, [...(groups.get(key) ?? []), forecast]);
  }

  const selected = [...groups.values()].flatMap((versions) => {
    const ordered = [...versions].sort((a, b) => later(b, a));
    const terminal = ordered.find((forecast) => {
      const result = resultById.get(forecast.id);
      return Boolean(result && TERMINAL.has(result.verdict));
    });
    return [terminal ?? ordered[0]!];
  });

  const dates = [...new Set(selected.map((forecast) => forecast.forecastDate))]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, maxDays);

  return dates.map((date) => {
    const items = selected
      .filter((forecast) => forecast.forecastDate === date)
      .map((forecast): MemberDailyReviewItem => {
        const result = resultById.get(forecast.id) ?? null;
        const review = reviewById.get(forecast.id) ?? null;
        const status = statusOf(result);
        const versions = groups.get(canonicalKey(forecast)) ?? [forecast];
        const supplement = supplementFor({ forecast, result, review, revisionCount: versions.length });
        const finding = findingFor({ forecast, result, review, status });
        return {
          forecastId: forecast.id,
          forecastDate: forecast.forecastDate,
          assetName: forecast.assetName,
          symbol: forecast.symbol,
          category: categoryOf(forecast),
          status,
          statusLabel: statusLabel(status),
          forecastVersion: forecast.originalVersion,
          revisionCount: versions.length,
          ...supplement,
          weeklySource: {
            sourceForecastId: forecast.sourceForecastId ?? review?.originalForecast.sourceForecastId ?? null,
            periodStart: forecast.sourcePeriodStart ?? review?.originalForecast.sourcePeriodStart ?? null,
            periodEnd: forecast.sourcePeriodEnd ?? review?.originalForecast.sourcePeriodEnd ?? null,
            primaryHexagram: forecast.sourcePrimaryHexagram ?? review?.originalForecast.primaryHexagram ?? null,
            changedHexagram: forecast.sourceChangedHexagram ?? review?.originalForecast.changedHexagram ?? null,
            weeklyDirection: forecast.sourceWeeklyDirection ?? review?.originalForecast.weeklyDirection ?? null,
            interpretation: forecast.sourceInterpretation ?? review?.originalForecast.sourceInterpretation ?? null,
          },
          forecast: {
            direction: forecast.directionLabel,
            pattern: forecast.predictedPatternLabel ?? forecast.directionLabel,
            confidence: forecast.probability ?? null,
            summary: forecast.summary ?? "",
            expectedPath: forecast.expectedPath ?? [],
          },
          actual: {
            direction: result ? (result.actualDirection === "UP" ? "上涨" : result.actualDirection === "DOWN" ? "下跌" : "震荡") : null,
            pattern: actualPattern(result),
            returnPct: result?.actualReturnPct ?? null,
            open: result?.actualOpen ?? null,
            high: result?.actualHigh ?? null,
            low: result?.actualLow ?? null,
            close: result?.actualClose ?? null,
            mainHighTime: result?.mainHighTime ?? null,
            mainLowTime: result?.mainLowTime ?? null,
          },
          diagnosis: diagnosisFor(status, result, review),
          improvement: improvementFor(status, review),
          futureCaution: review?.futureCaution ?? "下一次先确认同周期正式方向，再用奇门校准时点、缠论确认位置。",
          finding,
          verifiedAt: result?.verifiedAt ?? null,
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.symbol.localeCompare(b.symbol));

    const full = items.filter((item) => item.status === "FULL_HIT").length;
    const partial = items.filter((item) => item.status === "PARTIAL_HIT").length;
    const miss = items.filter((item) => item.status === "MISS").length;
    const completed = full + partial + miss;
    const weightedMatchPct = completed ? ((full + partial * 0.5) / completed) * 100 : null;
    const waiting = items.filter((item) => item.status === "WAITING").length;
    const supplementsNeeded = items.filter((item) => item.supplementStatus === "NEEDED").length;
    const updates = items.filter((item) => item.supplementStatus === "UPDATED").length;
    const problemsFound = items.filter((item) => ["DIRECTION", "PATH_TIMING", "EVIDENCE_GAP"].includes(item.finding.issueType)).length;
    const correctionsRecorded = items.filter((item) => item.finding.correctionRecorded && item.finding.issueType !== "NONE").length;
    const headline = completed
      ? `完成 ${completed} 项：完全命中 ${full}、部分命中 ${partial}、未命中 ${miss}，加权匹配度 ${weightedMatchPct!.toFixed(0)}%。`
      : `已有 ${items.length} 项进入复盘，等待各市场收盘后自动验证。`;
    const problemHeadline = problemsFound
      ? `已识别 ${problemsFound} 项预测问题，其中 ${correctionsRecorded} 项已写入改进记录。`
      : completed
        ? "本日已完成样本暂未发现需要推翻的方向性问题。"
        : "尚未形成收盘样本，暂不事后修改预测。";
    return {
      date,
      generatedAt: now.toISOString(),
      summary: { completed, waiting, full, partial, miss, weightedMatchPct, supplementsNeeded, updates, problemsFound, correctionsRecorded },
      headline,
      problemHeadline,
      items,
    };
  });
}
