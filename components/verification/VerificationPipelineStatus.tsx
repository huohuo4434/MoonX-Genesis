import type { VerificationPipelineStatus as PipelineStatus } from "@/lib/accuracy/verification-pipeline-status";

function stamp(value: string | null, en: boolean): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(en ? "en-US" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function stateCopy(state: PipelineStatus["state"], en: boolean) {
  const map = {
    ACTIVE: en ? "Running normally" : "运行正常",
    WAITING: en ? "Waiting for sessions to close" : "等待交易窗口结束",
    SYNC_GAP: en ? "Sync gap detected" : "发现同步缺口",
    BUILDING: en ? "Building first samples" : "首批样本积累中",
    LEGACY_ONLY: en ? "Verification records available; generated source not connected" : "既有验证记录可用，正式预测源未连接",
    SOURCE_DEGRADED: en
      ? "Published-forecast sync is temporarily unavailable; existing verification continues"
      : "正式预测源同步暂时不可用，既有验证记录继续运行",
    DEGRADED: en ? "Verification record store is temporarily unavailable" : "验证记录存储暂时不可用",
  } as const;
  return map[state];
}

function friendlyError(status: PipelineStatus, en: boolean): string | null {
  if (status.error === "generated_source_unavailable") {
    return en
      ? "The published-forecast source is temporarily unavailable. Existing locked records and verification results are preserved, and automatic retries will continue."
      : "正式预测源暂时无法读取；既有锁定记录和验证结果未丢失，系统会在后续自动轮次继续重试。";
  }
  if (status.error === "legacy_store_unavailable") {
    return en
      ? "The verification record store is temporarily unavailable. Please try again later."
      : "验证记录存储暂时无法读取，请稍后重试。";
  }
  return null;
}

export function VerificationPipelineStatus({ status, en }: { status: PipelineStatus; en: boolean }) {
  const warning =
    status.state === "SYNC_GAP" ||
    status.state === "SOURCE_DEGRADED" ||
    status.state === "DEGRADED";
  const generatedCount: number | string = status.generatedSourceHealthy ? status.generatedLocked : "—";
  const syncGapCount: number | string = status.generatedSourceHealthy ? status.syncMissing : "—";
  const cards: Array<[string, number | string, boolean]> = [
    [en ? "Published / locked" : "正式发布/锁定", generatedCount, false],
    [en ? "In verification" : "已进入验证链", status.verificationRecords, false],
    [en ? "Pending" : "待验证", status.pending, false],
    [en ? "Completed" : "已完成", status.completed, false],
    [en ? "Unverifiable" : "不可验证", status.unverifiable, false],
    [en ? "Sync gaps" : "同步缺口", syncGapCount, status.generatedSourceHealthy && status.syncMissing > 0],
  ];
  const detail = friendlyError(status, en);

  return (
    <section
      className={`mx-auto mt-8 w-full max-w-[1280px] rounded-2xl border p-5 ${
        warning ? "border-amber-500/35 bg-amber-500/[0.06]" : "border-border/70 bg-card/60"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {en ? "Verification pipeline" : "验证数据链路"}
          </div>
          <div className={`mt-1 text-sm ${warning ? "text-amber-400" : "text-foreground-secondary"}`}>
            {stateCopy(status.state, en)}
          </div>
        </div>
        <div className="text-right text-xs text-foreground-tertiary">
          <div>{en ? "Latest locked" : "最近锁定"}：{stamp(status.latestLockedAt, en)}</div>
          <div className="mt-1">{en ? "Latest verified" : "最近验证"}：{stamp(status.latestVerifiedAt, en)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, value, alert]) => (
          <div key={label} className="rounded-xl border border-border/60 bg-background/20 px-3 py-3">
            <div className="text-xs text-foreground-tertiary">{label}</div>
            <div className={`mt-1 text-xl font-semibold ${alert ? "text-amber-400" : "text-foreground"}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {detail ? (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {detail}
        </div>
      ) : null}
      {!status.sourceAvailable ? (
        <div className="mt-3 text-xs text-foreground-tertiary">
          {en
            ? "The generated-forecast database is not connected in this runtime; existing locked records remain verifiable and are never deleted."
            : "当前运行环境未连接生成预测数据库；既有锁定记录仍会继续验证，不会删除。"}
        </div>
      ) : null}
    </section>
  );
}
