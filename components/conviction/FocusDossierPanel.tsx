import { Badge, Card } from "@/components/ui";
import type { FocusDossierView } from "@/types/focus-dossier";

const DAY_STATE = {
  OCCURRED: "已发生",
  TODAY: "今日",
  PENDING: "待验证",
  MISSING: "待更新",
} as const;

export function FocusDossierPanel({ dossier }: { dossier: FocusDossierView }) {
  const ready = dossier.evidenceStatus === "READY";
  return (
    <section className="space-y-4 rounded-2xl border border-cyan-300/20 bg-[linear-gradient(145deg,rgba(14,22,30,.98),rgba(8,10,14,.98))] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-caption uppercase tracking-[0.16em] text-cyan-200/60">MOOX 重点关注统一档案</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">本周唯一结论</h2>
          <p className="mt-2 max-w-4xl text-body-sm leading-7 text-white/75">
            {dossier.conclusion ?? "本周正式锁定证据尚未发布；不使用过期周预测填充当前结论。"}
          </p>
        </div>
        <Badge variant="outline" className={ready ? "border-emerald-300/25 text-emerald-100" : "border-amber-300/25 text-amber-100"}>
          {dossier.statusLabel}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="sm" className="border-white/[0.08] bg-black/20"><p className="text-caption text-white/40">本周周期</p><p className="mt-1 text-body-sm text-white/75">{dossier.periodStart && dossier.periodEnd ? `${dossier.periodStart} 至 ${dossier.periodEnd}` : "待更新"}</p></Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20"><p className="text-caption text-white/40">确认</p><p className="mt-1 text-body-sm text-white/75">{dossier.confirmation ?? "未提供正式确认位"}</p></Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20"><p className="text-caption text-white/40">失效 / 风险</p><p className="mt-1 text-body-sm text-white/75">{dossier.invalidation ?? "未提供正式失效位"}</p></Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20"><p className="text-caption text-white/40">发布 / 版本 / 来源</p><p className="mt-1 text-body-sm text-white/75">{dossier.publicationStatus === "PUBLISHED" ? "已发布" : "待发布"} · {dossier.version ? `V${dossier.version}` : "未提供版本号"} · {dossier.source ?? "来源待提供"}</p><p className="mt-1 text-caption text-white/40">{dossier.lockStatus === "LOCKED" && dossier.lockedAt ? `已锁定 ${dossier.lockedAt}` : dossier.lockStatus === "LOCK_NOT_PROVIDED" ? "未提供锁定时间，不声明已锁定" : "锁定状态待提供"}</p></Card>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-body font-semibold text-white">7日路径</h3>
          <p className="text-caption text-white/40">缺一天就明确标记待更新，不补造走势</p>
        </div>
        {dossier.dailyPath.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {dossier.dailyPath.map((day) => (
              <article key={day.date} className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-body-sm font-medium text-white">{day.date}</p><Badge variant="outline">{DAY_STATE[day.state]}</Badge></div>
                <p className="mt-2 text-caption text-cyan-100/70">{day.direction ?? "无正式方向"}</p>
                <p className="mt-2 text-caption leading-6 text-white/55">{day.summary}</p>
              </article>
            ))}
          </div>
        ) : <p className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.03] p-3 text-body-sm text-amber-100/70">本周正式逐日资料待更新。</p>}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card padding="sm" className="border-white/[0.08] bg-black/20"><p className="text-caption font-medium text-emerald-100">已发生</p><ul className="mt-2 space-y-1 text-caption text-white/55">{dossier.occurred.length ? dossier.occurred.map((item) => <li key={item}>· {item}</li>) : <li>· 暂无已验证日级结果</li>}</ul></Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20"><p className="text-caption font-medium text-amber-100">待验证</p><ul className="mt-2 space-y-1 text-caption text-white/55">{dossier.pendingVerification.length ? dossier.pendingVerification.slice(0, 4).map((item) => <li key={item}>· {item}</li>) : <li>· 暂无待验证条目</li>}</ul></Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20"><p className="text-caption font-medium text-cyan-100">下周预告</p>{dossier.nextWeek ? <><p className="mt-2 text-caption text-white/70">{dossier.nextWeek.periodStart} 至 {dossier.nextWeek.periodEnd}</p><p className="mt-2 text-caption leading-6 text-white/55">{dossier.nextWeek.conclusion}</p><p className="mt-2 text-caption text-amber-100/60">{dossier.nextWeek.dailyEvidenceReady ? "逐日证据已齐" : "逐日证据待补齐；不生成每日占位结论"}</p></> : <p className="mt-2 text-caption text-white/50">下周正式证据待发布。</p>}</Card>
      </div>

      <details className="rounded-lg border border-white/[0.08] bg-black/15 p-3">
        <summary className="cursor-pointer text-body-sm text-white/70">长期背景（不替代本周结论）</summary>
        <p className="mt-2 text-caption leading-6 text-white/50">{dossier.longTermBackground ?? "长期正式资料待更新。"}</p>
      </details>
      <p className="text-caption text-white/35">研究权限：RESEARCH_ONLY · 不具备交易执行资格</p>
    </section>
  );
}
