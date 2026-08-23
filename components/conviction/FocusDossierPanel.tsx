import { Badge, Card } from "@/components/ui";
import { FocusQimenParallelPanel } from "@/components/conviction/FocusQimenParallelPanel";
import { FocusIntradayTechnicalCards } from "@/components/conviction/FocusIntradayTechnicalCards";
import { projectPublicAttribution } from "@/lib/presentation/public-attribution";
import type { FocusDossierView } from "@/types/focus-dossier";

export function FocusDossierPanel({ dossier: rawDossier }: { dossier: FocusDossierView }) {
  const dossier = projectPublicAttribution(rawDossier);
  const nextReady = dossier.displayScope === "NEXT_PERIOD_READY" && Boolean(dossier.nextWeek?.dailyEvidenceReady);
  const primaryConclusion = nextReady ? dossier.nextWeek!.conclusion : dossier.conclusion;
  const primaryStart = nextReady ? dossier.nextWeek!.periodStart : dossier.periodStart;
  const primaryEnd = nextReady ? dossier.nextWeek!.periodEnd : dossier.periodEnd;
  const authorityLabel = nextReady
    ? "WEEK · 下一期"
    : dossier.dailyAuthority
      ? dossier.dailyAuthority.forecastType
      : "待更新";
  const sourcePeriod = !nextReady && dossier.dailyAuthority
    ? { start: dossier.dailyAuthority.sourcePeriodStart, end: dossier.dailyAuthority.sourcePeriodEnd }
    : null;
  const derivedWindowDiffers = Boolean(sourcePeriod && (sourcePeriod.start !== primaryStart || sourcePeriod.end !== primaryEnd));

  return (
    <section className="space-y-4 rounded-2xl border border-cyan-300/20 bg-[linear-gradient(145deg,rgba(14,22,30,.98),rgba(8,10,14,.98))] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-4xl">
          <p className="font-mono text-caption uppercase tracking-[0.16em] text-cyan-200/60">MOOX 重点关注</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{nextReady ? "下一期研究" : "当前研究"}</h2>
          <p className="mt-2 text-body-sm leading-7 text-white/75">{primaryConclusion ?? "研究正在更新。"}</p>
        </div>
        <Badge variant="outline" className="border-cyan-300/25 text-cyan-100">{dossier.statusLabel}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="sm" className="border-white/[0.08] bg-black/20">
          <p className="text-caption text-white/40">{derivedWindowDiffers ? "来源周期" : "周期"}</p>
          <p className="mt-1 text-body-sm text-white/75">{sourcePeriod ? `${sourcePeriod.start} 至 ${sourcePeriod.end}` : primaryStart && primaryEnd ? `${primaryStart} 至 ${primaryEnd}` : "—"}</p>
          {derivedWindowDiffers ? <p className="mt-1 text-[11px] text-cyan-100/55">当前派生窗口：{primaryStart} 至 {primaryEnd}</p> : null}
          <p className="mt-1 text-[11px] text-white/35">{derivedWindowDiffers ? "周期卦派生 · 不是日卦" : authorityLabel}</p>
        </Card>
        <FocusIntradayTechnicalCards
          assetId={dossier.assetId}
          direction={dossier.dailyPath.find((day) => day.date === dossier.asOfDate)?.rhythmDirection ?? dossier.dailyPath.find((day) => day.date === dossier.asOfDate)?.direction ?? dossier.dailyAuthority?.direction}
        />
      </div>
      <FocusQimenParallelPanel view={dossier.qimenParallel} />

      {dossier.nextWeek && !nextReady ? (
        <details className="rounded-xl border border-cyan-300/12 bg-cyan-300/[0.02] p-3">
          <summary className="cursor-pointer text-body-sm text-cyan-100/75">下一期</summary>
          <div className="mt-3 space-y-2 text-caption leading-6 text-white/55">
            <p>{dossier.nextWeek.periodStart} 至 {dossier.nextWeek.periodEnd}</p>
            <p>{dossier.nextWeek.conclusion}</p>
            <p>日分析：{dossier.nextWeek.dailyEvidenceReady ? "已生成" : "生成中"}</p>
          </div>
        </details>
      ) : null}

      {dossier.backgroundHorizons.length || dossier.monthlyEvidence || dossier.longTermBackground ? (
        <details className="rounded-xl border border-white/[0.08] bg-black/15 p-3">
          <summary className="cursor-pointer text-body-sm text-white/70">多周期背景</summary>
          <div className="mt-3 space-y-3 text-caption leading-6 text-white/55">
            {dossier.monthlyEvidence ? (
              <div className="rounded-lg border border-violet-300/12 bg-violet-300/[0.025] p-3">
                <p className="text-violet-100/75">月度 · {dossier.monthlyEvidence.periodStart} 至 {dossier.monthlyEvidence.periodEnd}</p>
                <p className="mt-1">{dossier.monthlyEvidence.conclusion}</p>
              </div>
            ) : null}
            {dossier.backgroundHorizons.map((item) => (
              <div key={`${item.forecastType}-${item.periodStart}-${item.version}`} className="rounded-lg border border-white/[0.06] p-3">
                <p className="text-white/70">{item.forecastType} · {item.periodStart} 至 {item.periodEnd}</p>
                <p className="mt-1">{item.conclusion}</p>
              </div>
            ))}
            {dossier.longTermBackground ? <p>{dossier.longTermBackground}</p> : null}
          </div>
        </details>
      ) : null}

      {dossier.dailyAuditRows.length ? (
        <details className="rounded-xl border border-white/[0.08] bg-black/15 p-3">
          <summary className="cursor-pointer text-body-sm text-white/70">日分析版本与验证</summary>
          <ul className="mt-3 space-y-2 text-caption text-white/55">
            {dossier.dailyAuditRows.map((row) => (
              <li key={`${row.forecastDate}-${row.version}-${row.publishedAt ?? "unpublished"}`} className="rounded-lg border border-white/[0.06] p-3">
                <p className="text-white/75">{row.forecastDate} · {row.direction} · {row.validationStatus ?? "待验证"}</p>
                <p className="mt-1">{row.path}</p>
                {row.revisionReason ? <p className="mt-1 text-cyan-100/50">更新：{row.revisionReason}</p> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {dossier.supplementalEvidence.length ? (
        <details className="rounded-xl border border-amber-300/12 bg-amber-300/[0.02] p-3">
          <summary className="cursor-pointer text-body-sm text-amber-100/75">补充研究</summary>
          <div className="mt-3 space-y-2 text-caption leading-6 text-white/55">
            {dossier.supplementalEvidence.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/[0.06] p-3">
                <p className="text-white/70">{item.periodStart} 至 {item.periodEnd}</p>
                <p className="mt-1">{item.summary ?? item.gapNote ?? "内容待更新。"}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
