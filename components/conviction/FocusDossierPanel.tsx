import { Badge, Card } from "@/components/ui";
import type { FocusDossierView } from "@/types/focus-dossier";

const DAY_STATE = {
  OCCURRED: "已发生",
  TODAY: "今日",
  PENDING: "待验证",
  MISSING: "待更新",
} as const;

const EVIDENCE_LABEL = {
  READY: "完整",
  INCOMPLETE: "待补齐",
  MISSING: "缺失",
} as const;

export function FocusDossierPanel({ dossier }: { dossier: FocusDossierView }) {
  const ready = dossier.evidenceStatus === "READY";
  const nextReady = dossier.displayScope === "NEXT_PERIOD_READY" && dossier.nextWeek?.dailyEvidenceReady;
  const primaryPath = nextReady ? dossier.nextWeek!.dailyPath : dossier.dailyPath;
  const primaryConclusion = nextReady ? dossier.nextWeek!.conclusion : dossier.conclusion;
  const primaryStart = nextReady ? dossier.nextWeek!.periodStart : dossier.periodStart;
  const primaryEnd = nextReady ? dossier.nextWeek!.periodEnd : dossier.periodEnd;
  const primaryConfirmation = nextReady ? dossier.nextWeek!.confirmation : dossier.confirmation;
  const primaryInvalidation = nextReady ? dossier.nextWeek!.invalidation : dossier.invalidation;
  const primaryVersion = nextReady ? dossier.nextWeek!.version : dossier.version;
  const primarySource = nextReady ? dossier.nextWeek!.source : dossier.source;
  const primaryLockedAt = nextReady ? dossier.nextWeek!.lockedAt : dossier.lockedAt;

  return (
    <section className="space-y-4 rounded-2xl border border-cyan-300/20 bg-[linear-gradient(145deg,rgba(14,22,30,.98),rgba(8,10,14,.98))] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-caption uppercase tracking-[0.16em] text-cyan-200/60">MOOX 重点关注统一档案</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {nextReady ? "下周已准备（未来期）" : "本期唯一结论"}
          </h2>
          {nextReady ? (
            <p className="mt-1 text-caption text-amber-100/70">{dossier.weeklyEvidenceStatus === "READY" ? "本期资料仍按原周期保留" : "本期资料缺失或已结束"}；以下内容属于下一期，不提前冒充本期结论。</p>
          ) : null}
          <p className="mt-2 max-w-4xl text-body-sm leading-7 text-white/75">
            {primaryConclusion ?? "本期正式锁定周证据尚未发布；不使用过期周预测填充当前结论。"}
          </p>
        </div>
        <Badge variant="outline" className={ready ? "border-emerald-300/25 text-emerald-100" : "border-amber-300/25 text-amber-100"}>
          {dossier.statusLabel}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="sm" className="border-white/[0.08] bg-black/20">
          <p className="text-caption text-white/40">{nextReady ? "下周期（未来）" : "本期周期"}</p>
          <p className="mt-1 text-body-sm text-white/75">{primaryStart && primaryEnd ? `${primaryStart} 至 ${primaryEnd}` : "待更新"}</p>
        </Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20">
          <p className="text-caption text-white/40">证据覆盖</p>
          <p className="mt-1 text-body-sm text-white/75">周：{dossier.weeklyEvidenceStatus === "READY" ? "完整" : "缺失"} · 日：{EVIDENCE_LABEL[dossier.dailyEvidenceStatus]} · 月：{dossier.monthlyEvidence ? "可用" : "缺失"}</p>
        </Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20">
          <p className="text-caption text-white/40">确认 / 失效</p>
          <p className="mt-1 text-body-sm text-white/75">{primaryConfirmation ?? "未提供正式确认位"}</p>
          <p className="mt-1 text-caption text-white/45">{primaryInvalidation ?? "未提供正式失效位"}</p>
        </Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20">
          <p className="text-caption text-white/40">发布 / 版本 / 来源</p>
          <p className="mt-1 text-body-sm text-white/75">{nextReady || dossier.publicationStatus === "PUBLISHED" ? "已发布" : "待发布"} · {primaryVersion ? `V${primaryVersion}` : "未提供版本号"} · {primarySource ?? "来源待提供"}</p>
          <p className="mt-1 text-caption text-white/40">{primaryLockedAt ? `已锁定 ${primaryLockedAt}` : dossier.lockStatus === "LOCK_NOT_PROVIDED" ? "未提供锁定时间，不声明已锁定" : "锁定状态待提供"}</p>
        </Card>
      </div>

      {dossier.monthlyEvidence ? (
        <Card padding="sm" className="border-violet-300/15 bg-violet-300/[0.035]">
          <p className="text-caption font-medium text-violet-100">月度正式结论</p>
          <p className="mt-1 text-caption text-white/45">{dossier.monthlyEvidence.periodStart} 至 {dossier.monthlyEvidence.periodEnd} · {dossier.monthlyEvidence.version ? `V${dossier.monthlyEvidence.version}` : "未提供版本号"}</p>
          <p className="mt-2 text-body-sm leading-7 text-white/70">{dossier.monthlyEvidence.conclusion}</p>
          {dossier.weeklyEvidenceStatus === "MISSING" ? <p className="mt-2 text-caption text-amber-100/70">周证据缺失 · 日证据缺失；月结论不能机械拆成逐日预测。</p> : null}
        </Card>
      ) : null}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-body font-semibold text-white">{nextReady ? "下一期逐日路径（未来期）" : "本期逐日路径"}</h3>
          <p className="text-caption text-white/40">覆盖天数以正式周期为准；缺一天就明确标记待更新，不补造走势。</p>
        </div>
        {primaryPath.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {primaryPath.map((day) => (
              <article key={day.date} className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-body-sm font-medium text-white">{day.date}</p><Badge variant="outline">{DAY_STATE[day.state]}</Badge></div>
                <p className="mt-2 text-caption text-cyan-100/70">{day.direction ?? "无正式方向"}</p>
                <p className="mt-2 text-caption leading-6 text-white/55">{day.summary}</p>
              </article>
            ))}
          </div>
        ) : <p className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.03] p-3 text-body-sm text-amber-100/70">本期正式逐日资料待更新。</p>}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card padding="sm" className="border-white/[0.08] bg-black/20"><p className="text-caption font-medium text-emerald-100">已发生</p><ul className="mt-2 space-y-1 text-caption text-white/55">{dossier.occurred.length ? dossier.occurred.map((item) => <li key={item}>· {item}</li>) : <li>· 暂无已验证日级结果</li>}</ul></Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20"><p className="text-caption font-medium text-amber-100">待验证</p><ul className="mt-2 space-y-1 text-caption text-white/55">{dossier.pendingVerification.length ? dossier.pendingVerification.slice(0, 4).map((item) => <li key={item}>· {item}</li>) : <li>· 暂无待验证条目</li>}</ul></Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20">
          <p className="text-caption font-medium text-cyan-100">下周预告</p>
          {dossier.nextWeek ? <><p className="mt-2 text-caption text-white/70">{dossier.nextWeek.periodStart} 至 {dossier.nextWeek.periodEnd}</p><p className="mt-2 text-caption leading-6 text-white/55">{dossier.nextWeek.conclusion}</p><p className="mt-2 text-caption text-amber-100/60">{dossier.nextWeek.dailyEvidenceReady ? "逐日证据已齐；到期前仍标记为未来期" : "逐日证据待补齐；不生成每日占位结论"}</p></> : <p className="mt-2 text-caption text-white/50">下周正式证据待发布。</p>}
        </Card>
      </div>

      {dossier.supplementalEvidence.length ? (
        <details className="rounded-lg border border-amber-300/15 bg-amber-300/[0.025] p-3">
          <summary className="cursor-pointer text-body-sm text-amber-100/80">晚录入与来源缺口（不计历史命中）</summary>
          <div className="mt-3 space-y-3">
            {dossier.supplementalEvidence.map((item) => (
              <article key={item.id} className="rounded-lg border border-white/[0.07] bg-black/15 p-3 text-caption leading-6 text-white/55">
                <p className="text-white/75">{item.periodStart} 至 {item.periodEnd} · {item.status} · RESEARCH_ONLY</p>
                <p>来源：{item.sourceArtifact} · sourcePublishedAt 未提供 · lockedAt 未提供</p>
                <p>{item.summary ?? item.gapNote ?? "内容待可靠结构化。"}</p>
                <p className="text-rose-100/60">不回填正式预测，不计入历史命中。</p>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <details className="rounded-lg border border-white/[0.08] bg-black/15 p-3">
        <summary className="cursor-pointer text-body-sm text-white/70">长期背景（不替代本期结论）</summary>
        <p className="mt-2 text-caption leading-6 text-white/50">{dossier.longTermBackground ?? "长期正式资料待更新。"}</p>
      </details>
      <p className="text-caption text-white/35">研究权限：RESEARCH_ONLY · 不具备交易执行资格</p>
    </section>
  );
}
