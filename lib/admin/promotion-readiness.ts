export type PromotionReadinessStatus = "HOLD" | "PILOT" | "READY";
export type PromotionReadinessSeverity = "BLOCKER" | "ACTION" | "NOTICE";

export type PromotionReadinessAction = {
  key: string;
  label: string;
  detail: string;
  href: string;
  severity: PromotionReadinessSeverity;
};

export type PromotionReadinessSummary = {
  status: PromotionReadinessStatus;
  label: string;
  note: string;
  blockerCount: number;
  actionCount: number;
  actions: PromotionReadinessAction[];
};

export type PromotionReadinessInput = {
  todayPublished: number;
  tomorrowPublished: number;
  focusCurrent: number;
  focusTotal: number;
  focusAffectedAssets: string[];
  cycleGapCount: number;
  consultationAvailable: boolean;
  pendingConsultations: number;
  failedConsultations: number;
};

function affectedAssetDetail(input: PromotionReadinessInput): string {
  const missing = Math.max(0, input.focusTotal - input.focusCurrent);
  const names = input.focusAffectedAssets.slice(0, 8).join("、");
  const suffix = input.focusAffectedAssets.length > 8 ? `等${input.focusAffectedAssets.length}项` : names;
  return suffix
    ? `${missing}项不在当前周窗口：${suffix}`
    : `${missing}项重点资产周度研究不在当前窗口`;
}

/**
 * Promotion readiness is intentionally operational, not a marketing score.
 * A red blocker means a visitor or member cannot reliably complete a core flow.
 */
export function buildPromotionReadinessSummary(
  input: PromotionReadinessInput
): PromotionReadinessSummary {
  const actions: PromotionReadinessAction[] = [];

  if (input.todayPublished === 0) {
    actions.push({
      key: "today",
      label: "今日预测为空",
      detail: "会员进入日报后没有当天正式观点。",
      href: "/admin/forecasts",
      severity: "BLOCKER",
    });
  }
  if (input.tomorrowPublished === 0) {
    actions.push({
      key: "tomorrow",
      label: "下一交易日预测为空",
      detail: "日度交付链尚未形成连续覆盖。",
      href: "/admin/forecasts",
      severity: "BLOCKER",
    });
  }
  if (input.cycleGapCount > 0) {
    actions.push({
      key: "cycle",
      label: `未来周期卦缺${input.cycleGapCount}项`,
      detail: "缺少的周卦或月卦会让未来预测只能停在待确认状态。",
      href: "/admin/weekly",
      severity: "BLOCKER",
    });
  }
  if (input.focusCurrent < input.focusTotal) {
    actions.push({
      key: "focus",
      label: `重点资产新鲜度 ${input.focusCurrent}/${input.focusTotal}`,
      detail: affectedAssetDetail(input),
      href: "/admin/stocks",
      severity: "ACTION",
    });
  }
  if (!input.consultationAvailable) {
    actions.push({
      key: "consultation-service",
      label: "会员问卦队列不可读取",
      detail: "后台无法确认是否有会员等待人工解答。",
      href: "/admin/consultations",
      severity: "BLOCKER",
    });
  } else {
    if (input.failedConsultations > 0) {
      actions.push({
        key: "consultation-failed",
        label: `问卦异常${input.failedConsultations}笔`,
        detail: "需要先处理保存、批准或通知失败的记录。",
        href: "/admin/consultations",
        severity: "BLOCKER",
      });
    }
    if (input.pendingConsultations > 0) {
      actions.push({
        key: "consultation-pending",
        label: `会员问卦待处理${input.pendingConsultations}笔`,
        detail: "属于正常服务队列，但推广前应保持及时清零。",
        href: "/admin/consultations",
        severity: "ACTION",
      });
    }
  }
  const blockerCount = actions.filter((item) => item.severity === "BLOCKER").length;
  const actionCount = actions.filter((item) => item.severity === "ACTION").length;
  if (blockerCount > 0) {
    return {
      status: "HOLD",
      label: "暂不全面推广",
      note: "先清掉红色阻断项；可以继续邀请少量熟悉用户试用。",
      blockerCount,
      actionCount,
      actions,
    };
  }
  if (actionCount > 0) {
    return {
      status: "PILOT",
      label: "适合小范围推广",
      note: "核心链路可用，但运营队列与内容新鲜度仍需每天盯住。",
      blockerCount,
      actionCount,
      actions,
    };
  }
  return {
    status: "READY",
    label: "具备全面推广条件",
    note: "当前内容与会员站内交付未发现核心阻断；推广后仍需持续监控内容与服务队列。",
    blockerCount,
    actionCount,
    actions,
  };
}
