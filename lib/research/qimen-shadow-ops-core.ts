import {
  QIMEN_SHADOW_MIN_ENTERED,
  QIMEN_SHADOW_MIN_OBSERVATIONS,
  QIMEN_SHADOW_MIN_STABLE_DAYS,
  type QimenShadowVariantSummary,
} from "@/lib/research/qimen-shadow-ab-core";

type AutomationStatus = "尚未运行" | "正常待机" | "本轮完成" | "部分失败" | "系统异常";

export type QimenAutomationPresentation = {
  status: AutomationStatus;
  headline: string;
  detail: string;
  created: number;
  failed: number;
  skipped: number;
  nextRunAt: string | null;
};

type ReportItem = { status?: unknown; reason?: unknown };

function rows(value: unknown): ReportItem[] {
  return Array.isArray(value) ? value.filter((item): item is ReportItem => Boolean(item) && typeof item === "object") : [];
}

function reportRows(snapshot: unknown): ReportItem[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const report = snapshot as { locks?: unknown; evaluations?: unknown; pairings?: unknown; lessonIngestion?: unknown };
  return [...rows(report.locks), ...rows(report.evaluations), ...rows(report.pairings), ...rows(report.lessonIngestion)];
}

function nextFiveMinuteRun(finishedAt: Date): string {
  const interval = 5 * 60_000;
  return new Date(Math.ceil((finishedAt.getTime() + 1) / interval) * interval).toISOString();
}

export function presentQimenAutomationRun(run: {
  status: string;
  finishedAt: Date;
  reportSnapshot: unknown;
} | null | undefined): QimenAutomationPresentation {
  if (!run) {
    return {
      status: "尚未运行",
      headline: "等待第一次定时采集",
      detail: "部署和数据库准备完成后，系统会自动开始；当前不生成任何研究样本。",
      created: 0,
      failed: 0,
      skipped: 0,
      nextRunAt: null,
    };
  }
  const all = reportRows(run.reportSnapshot);
  const created = all.filter((item) => item.status === "CREATED").length;
  const failedRows = all.filter((item) => item.status === "FAILED");
  const skipped = all.filter((item) => item.status === "SKIPPED").length;
  const nextRunAt = nextFiveMinuteRun(run.finishedAt);
  if (run.status === "IDLE") {
    return {
      status: "正常待机",
      headline: "本轮没有到期任务，系统运行正常",
      detail: "没有满足事前锁定窗口的完整新样本，也没有到期评估；这不是故障，更不会拿旧材料补数。",
      created,
      failed: failedRows.length,
      skipped,
      nextRunAt,
    };
  }
  if (run.status === "OK") {
    return {
      status: "本轮完成",
      headline: created ? `本轮新增 ${created} 项锁定或评估记录` : "本轮检查完成，没有新增记录",
      detail: "所有处理均为 RESEARCH_ONLY，不改变正式预测、权重或交易权限。",
      created,
      failed: 0,
      skipped,
      nextRunAt,
    };
  }
  if (run.status === "PARTIAL") {
    const firstReason = failedRows.find((item) => typeof item.reason === "string")?.reason;
    const failed = Math.max(1, failedRows.length);
    return {
      status: "部分失败",
      headline: `本轮有 ${failed} 项未完成，系统已失败关闭`,
      detail: typeof firstReason === "string" ? `首个原因：${firstReason.slice(0, 160)}` : "失败项未写入样本，下轮会按原始前瞻时间继续检查。",
      created,
      failed,
      skipped,
      nextRunAt,
    };
  }
  return {
    status: "系统异常",
    headline: `无法识别运行状态：${run.status}`,
    detail: "本轮不计入方法学习，也不授予任何交易权限。",
    created,
    failed: Math.max(1, failedRows.length),
    skipped,
    nextRunAt,
  };
}

export type QimenLearningProgress = QimenShadowVariantSummary & {
  observationPercent: number;
  stableDaysPercent: number;
  enteredPercent: number;
  overallPercent: number;
  nextNeed: string;
};

function percent(value: number, target: number): number {
  return Math.min(100, Math.round((Math.max(0, value) / target) * 100));
}

export function buildQimenLearningProgress(summaries: readonly QimenShadowVariantSummary[]): QimenLearningProgress[] {
  return summaries.map((item) => {
    const observationPercent = percent(item.observations, QIMEN_SHADOW_MIN_OBSERVATIONS);
    const stableDaysPercent = percent(item.stableDays, QIMEN_SHADOW_MIN_STABLE_DAYS);
    const enteredPercent = percent(item.entered, QIMEN_SHADOW_MIN_ENTERED);
    const nextNeed = item.observations < QIMEN_SHADOW_MIN_OBSERVATIONS
      ? `还需 ${QIMEN_SHADOW_MIN_OBSERVATIONS - item.observations} 次前瞻观察`
      : item.stableDays < QIMEN_SHADOW_MIN_STABLE_DAYS
        ? `还需覆盖 ${QIMEN_SHADOW_MIN_STABLE_DAYS - item.stableDays} 天`
        : item.entered < QIMEN_SHADOW_MIN_ENTERED
          ? `还需 ${QIMEN_SHADOW_MIN_ENTERED - item.entered} 次有效模拟入场`
          : item.researchQualified
            ? "已达到研究比较门槛；仍不得直接接入 LIVE"
            : "样本门槛已到，继续检查稳定性与风险指标";
    return {
      ...item,
      observationPercent,
      stableDaysPercent,
      enteredPercent,
      overallPercent: Math.min(observationPercent, stableDaysPercent, enteredPercent),
      nextNeed,
    };
  });
}
