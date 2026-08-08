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
    LEGACY_ONLY: en ? "Legacy verification source" : "当前使用旧验证源",
    DEGRADED: en ? "Status check degraded" : "状态检查异常",
  } as const;
  return map[state];
}

export function VerificationPipelineStatus({ status, en }: { status: PipelineStatus; en: boolean }) {
  const warning = status.state === "SYNC_GAP" || status.state === "DEGRADED";
  const cards = [
    [en ? "Published / locked" : "正式发布/锁定", status.generatedLocked],
    [en ? "In verification" : "已进入验证链", status.verificationRecords],
    [en ? "Pending" : "待验证", status.pending],
    [en ? "Completed" : "已完成", status.completed],
    [en ? "Unverifiable" : "不可验证", status.unverifiable],
    [en ? "Sync gaps" : "同步缺口", status.syncMissing],
  ] as const;

  return (
    <section className={`mx-auto mt-8 w-full max-w-[1280px] rounded-2xl border p-5 ${warning ? "border-amber-500/35 bg-amber-500/[0.06]" : "border-border/70 bg-card/60"}`}>
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
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/60 bg-background/20 px-3 py-3">
            <div className="text-xs text-foreground-tertiary">{label}</div>
            <div className={`mt-1 text-xl font-semibold ${label === (en ? "Sync gaps" : "同步缺口") && value > 0 ? "text-amber-400" : "text-foreground"}`}>{value}</div>
          </div>
        ))}
      </div>

      {status.error ? (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {en ? "Status detail" : "状态详情"}：{status.error}
        </div>
      ) : null}
      {!status.sourceAvailable ? (
        <div className="mt-3 text-xs text-foreground-tertiary">
          {en
            ? "The generated-forecast database is not available in this runtime; legacy locked records remain verifiable."
            : "当前运行环境未连接生成预测数据库；既有锁定记录仍会继续验证，不会删除。"}
        </div>
      ) : null}
    </section>
  );
}
