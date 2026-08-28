import type { WeeklyAccuracyPublicItem, WeeklyAccuracyPublicStats } from "@/lib/accuracy/get-weekly-history";
import type { MemberDailyReviewReport } from "@/lib/member-review/daily-review-report";
import { weeklyDirectionMatches } from "@/lib/verification/weekly-verification-core";
import type { WeeklyForecastSourceRecord } from "@/lib/weekly-source/types";
import type { WeeklyAnalysisRecord } from "@/types/weekly-analysis";
import { buildWeeklySourcePerformance, type WeeklySourcePerformanceRow } from "./weekly-source-performance";

export type WeeklyReviewStatus = "FULL_HIT" | "PARTIAL_HIT" | "MISS" | "UNVERIFIABLE" | "PENDING";

export type WeeklyReviewDayEvidence = {
  date: string;
  forecast: string;
  actual: string | null;
  status: string;
};

export type MemberWeeklyReviewItem = {
  id: string;
  assetId: string;
  assetName: string;
  symbol: string;
  weekStart: string;
  weekEnd: string;
  status: WeeklyReviewStatus;
  statusLabel: string;
  score: number | null;
  predictedPattern: string;
  actualPattern: string | null;
  weeklyPath: string | null;
  hexagram: string | null;
  confirmedProblem: string;
  interpretationFinding: string;
  correctionAction: string;
  nextRule: string;
  dailyEvidence: WeeklyReviewDayEvidence[];
};

export type MemberWeeklyReviewReport = {
  weekStart: string;
  weekEnd: string;
  headline: string;
  problemsFound: number;
  items: MemberWeeklyReviewItem[];
};

export type MemberWeeklyReviewPayload = {
  reports: MemberWeeklyReviewReport[];
  stats: WeeklyAccuracyPublicStats;
  sourcePerformance: WeeklySourcePerformanceRow[];
};

const MARKET_CODES: Readonly<Record<string, string>> = Object.freeze({
  BTC: "BTC", ETH: "ETH", SPX: "SPX", NDX: "NDX", SHCOMP: "SHCOMP", SSEC: "SHCOMP",
  HSTECH: "HSTECH", GOLD: "GOLD", GLD: "GOLD", SILVER: "SILVER", WTI: "WTI", CL: "WTI",
});

const ASSET_NAMES: Readonly<Record<string, string>> = Object.freeze({
  BTC: "比特币", ETH: "以太坊", SPX: "标普500", NDX: "纳斯达克100", SHCOMP: "上证指数",
  SSEC: "上证指数", HSTECH: "恒生科技", GOLD: "黄金", GLD: "黄金", SILVER: "白银", WTI: "WTI原油",
});

function normalizedSymbol(value: string): string {
  const symbol = value.trim().toUpperCase();
  if (["000001.SS", "SSEC"].includes(symbol)) return "SHCOMP";
  if (["CL=F", "CL"].includes(symbol)) return "WTI";
  if (["GC=F", "GLD", "XAU"].includes(symbol)) return "GOLD";
  if (["SI=F", "XAG"].includes(symbol)) return "SILVER";
  if (["^GSPC", "SPY"].includes(symbol)) return "SPX";
  if (["^NDX", "QQQ"].includes(symbol)) return "NDX";
  return symbol;
}

function statusOf(value: string): WeeklyReviewStatus {
  if (["FULL_HIT", "PARTIAL_HIT", "MISS", "UNVERIFIABLE"].includes(value)) return value as WeeklyReviewStatus;
  return "PENDING";
}

function statusLabel(status: WeeklyReviewStatus): string {
  if (status === "FULL_HIT") return "周方向与路径命中";
  if (status === "PARTIAL_HIT") return "周方向或路径部分命中";
  if (status === "MISS") return "周预测未命中";
  if (status === "UNVERIFIABLE") return "本周无法验证";
  return "本周尚未结束";
}

function newestMatchingAnalysis(item: WeeklyAccuracyPublicItem, analyses: WeeklyAnalysisRecord[]): WeeklyAnalysisRecord | null {
  return analyses
    .filter((analysis) => analysis.assetId === item.assetId && analysis.weekStart === item.weekStart && analysis.weekEnd === item.weekEnd)
    .sort((a, b) => b.version - a.version || b.publishedAt.localeCompare(a.publishedAt))[0] ?? null;
}

function matchingSource(item: WeeklyAccuracyPublicItem, sources: WeeklyForecastSourceRecord[]): WeeklyForecastSourceRecord | null {
  const code = MARKET_CODES[normalizedSymbol(item.symbol)] ?? MARKET_CODES[item.assetId.toUpperCase()];
  if (!code) return null;
  return sources
    .filter((source) => source.marketCode.toUpperCase() === code && source.periodStart <= item.weekStart && source.periodEnd >= item.weekEnd)
    .sort((a, b) => b.version - a.version)[0] ?? null;
}

function dayEvidenceFor(item: WeeklyAccuracyPublicItem, reports: MemberDailyReviewReport[]): WeeklyReviewDayEvidence[] {
  const symbol = normalizedSymbol(item.symbol);
  return reports
    .filter((report) => report.date >= item.weekStart && report.date <= item.weekEnd)
    .flatMap((report) => report.items
      .filter((daily) => normalizedSymbol(daily.symbol) === symbol)
      .map((daily) => ({ date: daily.forecastDate, forecast: daily.forecast.pattern, actual: daily.actual.pattern, status: daily.statusLabel })))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function finding(input: {
  item: WeeklyAccuracyPublicItem;
  source: WeeklyForecastSourceRecord | null;
  status: WeeklyReviewStatus;
}): Pick<MemberWeeklyReviewItem, "confirmedProblem" | "interpretationFinding" | "correctionAction" | "nextRule"> {
  const { item, source, status } = input;
  const actual = item.actualPattern ?? "数据不足";
  const hexagram = source?.primaryHexagram ? `${source.primaryHexagram}${source.changedHexagram ? `变${source.changedHexagram}` : ""}` : null;
  if (status === "PENDING") return {
    confirmedProblem: "本周尚未结束，当前逐日匹配只用于预警，不能提前给周卦判定对错。",
    interpretationFinding: "周卦维持发布时锁定版本，等待完整周线和周内高低顺序。",
    correctionAction: "周末取得完整行情后，再形成正式问题定位。",
    nextRule: "未结束的周不进入正式命中率，也不根据中途走势改写原预测。",
  };
  if (status === "UNVERIFIABLE") return {
    confirmedProblem: "缺少同标的完整周行情，本周不能确认预测是否兑现。",
    interpretationFinding: "这属于验证数据缺口，不归因为卦象或解读错误。",
    correctionAction: "补齐可靠周K线后再验证，不拿相似品种代替。",
    nextRule: "无法验证的周保留原记录，但不计入准确率。",
  };
  if (status === "FULL_HIT") return {
    confirmedProblem: `预测${item.predictedPattern}，实际${actual}；周方向和周内路径均已兑现。`,
    interpretationFinding: hexagram ? `${hexagram}的本周方向与阶段解读得到实际走势支持。` : "锁定周结论得到支持；原记录未携带完整卦爻结构，不追加事后卦理解说。",
    correctionAction: "保留本次周方向和路径框架，继续单独验证关键日、关键位是否同样有效。",
    nextRule: "日度结果只用来解释周内路径，不单独记作新的卦象命中。",
  };
  const directionMatched = Boolean(item.actualPattern && weeklyDirectionMatches(item.predictedPattern, item.actualPattern));
  if (status === "PARTIAL_HIT") return {
    confirmedProblem: directionMatched
      ? `预测${item.predictedPattern}，实际${actual}；周线最终方向正确，但周内先后顺序或反转力度判断错误。`
      : `预测${item.predictedPattern}，实际${actual}；只命中了震荡或反转特征，最终方向没有完整兑现。`,
    interpretationFinding: hexagram
      ? `${hexagram}不能直接判为“卦错”；问题优先定位在周内阶段、动变落点或强弱程度的解读。`
      : "当前只能确认周路径解读不完整；缺少完整卦爻结构，不能事后指定某一爻为错误原因。",
    correctionAction: directionMatched
      ? "保留周方向权重，降低逐日拆分置信度；关键转折必须再由时点与技术结构确认。"
      : "降低该类周卦结构的方向信心，重新复核世应、旺衰、动变与周内阶段对应。",
    nextRule: "下一周先锁定周方向，再拆周内路径；日线和技术面只能校准时点、降权或阻断，不能另造方向。",
  };
  return {
    confirmedProblem: `预测${item.predictedPattern}，实际${actual}；最终方向和周内路径均未达到部分命中条件。`,
    interpretationFinding: hexagram
      ? `${hexagram}导出的正式周结论本次没有兑现。只能确认解读结果错误，不能仅凭一次未中断言卦象本身错误；需复核世应、月日旺衰、动变及阶段划分。`
      : "正式周结论已经确认错误，但原记录缺少完整卦爻结构，暂时无法准确定位到世应、旺衰或某条动爻。",
    correctionAction: "同类结构下一次降低信心，重新核对最高优先级同周期依据；如果证据仍冲突，明确列出分歧而不强行给高信心方向。",
    nextRule: "周预测未通过完整周验证时，不继续机械拆成日预测；原错误版本永久保留。",
  };
}

export function buildMemberWeeklyReviewPayload(input: {
  history: { items: WeeklyAccuracyPublicItem[]; stats: WeeklyAccuracyPublicStats };
  analyses: WeeklyAnalysisRecord[];
  sources: WeeklyForecastSourceRecord[];
  dailyReports: MemberDailyReviewReport[];
  maxWeeks?: number;
}): MemberWeeklyReviewPayload {
  const maxWeeks = Math.max(1, Math.min(12, input.maxWeeks ?? 6));
  const weeks = [...new Set(input.history.items.map((item) => `${item.weekStart}:${item.weekEnd}`))]
    .sort((a, b) => b.localeCompare(a)).slice(0, maxWeeks);
  const reports = weeks.map((weekKey): MemberWeeklyReviewReport => {
    const [weekStart, weekEnd] = weekKey.split(":") as [string, string];
    const items = input.history.items.filter((item) => item.weekStart === weekStart && item.weekEnd === weekEnd)
      .map((item): MemberWeeklyReviewItem => {
        const status = statusOf(item.result);
        const analysis = newestMatchingAnalysis(item, input.analyses);
        const source = matchingSource(item, input.sources);
        const hexagram = source?.primaryHexagram ? `${source.primaryHexagram}${source.changedHexagram ? ` → ${source.changedHexagram}` : ""}` : null;
        return {
          id: item.id, assetId: item.assetId,
          assetName: analysis?.assetName ?? ASSET_NAMES[normalizedSymbol(item.symbol)] ?? item.assetId,
          symbol: item.symbol, weekStart, weekEnd, status, statusLabel: statusLabel(status), score: item.totalScore,
          predictedPattern: item.predictedPattern, actualPattern: item.actualPattern, weeklyPath: analysis?.weeklyPath ?? null,
          hexagram, ...finding({ item, source, status }), dailyEvidence: dayEvidenceFor(item, input.dailyReports),
        };
      }).sort((a, b) => a.assetName.localeCompare(b.assetName, "zh-CN"));
    const problemsFound = items.filter((item) => item.status === "PARTIAL_HIT" || item.status === "MISS").length;
    const completed = items.filter((item) => ["FULL_HIT", "PARTIAL_HIT", "MISS"].includes(item.status)).length;
    return {
      weekStart, weekEnd, problemsFound,
      headline: completed ? `完成 ${completed} 项周验证，发现 ${problemsFound} 项需要修正的方向或路径问题。` : "本周尚未形成完整周线，当前只展示过程预警。",
      items,
    };
  });
  return {
    reports,
    stats: input.history.stats,
    sourcePerformance: buildWeeklySourcePerformance({ history: input.history.items, analyses: input.analyses }),
  };
}
