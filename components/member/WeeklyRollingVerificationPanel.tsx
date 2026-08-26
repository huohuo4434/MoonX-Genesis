"use client";

import { Badge, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { DailyAccuracyDirection } from "@/types/daily-accuracy";
import type { WeeklyRollingConfidence, WeeklyRollingDay, WeeklyRollingVerification } from "@/types/weekly-rolling-verification";

function arrow(direction: DailyAccuracyDirection | null): string {
  if (direction === "UP") return "↑";
  if (direction === "DOWN") return "↓";
  if (direction === "FLAT") return "→";
  return "·";
}

function directionTone(direction: DailyAccuracyDirection | null): string {
  if (direction === "UP") return "text-emerald-300";
  if (direction === "DOWN") return "text-rose-300";
  if (direction === "FLAT") return "text-amber-200";
  return "text-foreground-tertiary";
}

function confidenceLabel(value: WeeklyRollingConfidence, en: boolean): string {
  const zh = { WAITING: "等待验证", EARLY: "样本不足", HIGH: "高匹配", MEDIUM: "部分匹配", REVIEW: "需要复核" } as const;
  const english = { WAITING: "Waiting", EARLY: "Early sample", HIGH: "High match", MEDIUM: "Partial match", REVIEW: "Review needed" } as const;
  return en ? english[value] : zh[value];
}

function confidenceClass(value: WeeklyRollingConfidence): string {
  if (value === "HIGH") return "border-emerald-300/25 bg-emerald-300/[.07] text-emerald-100";
  if (value === "REVIEW") return "border-rose-300/25 bg-rose-300/[.07] text-rose-100";
  if (value === "MEDIUM") return "border-amber-300/25 bg-amber-300/[.07] text-amber-100";
  return "border-border/60 bg-muted/20 text-foreground-secondary";
}

function dayLabel(date: string, en: boolean): string {
  return new Intl.DateTimeFormat(en ? "en-US" : "zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function matchLabel(day: WeeklyRollingDay, en: boolean): string {
  if (day.marketClosed) return en ? "Closed" : "休市";
  if (day.match === "EXACT") return en ? "Exact" : "一致";
  if (day.match === "PARTIAL") return en ? "Partial" : "部分";
  if (day.match === "OPPOSITE") return en ? "Opposite" : "相反";
  return en ? "Pending" : "待验证";
}

function matchTone(day: WeeklyRollingDay): string {
  if (day.match === "EXACT") return "text-emerald-200";
  if (day.match === "PARTIAL") return "text-amber-200";
  if (day.match === "OPPOSITE") return "text-rose-200";
  return "text-foreground-tertiary";
}

function sourceLabel(day: WeeklyRollingDay, en: boolean): string {
  if (day.predictionSource === "LOCKED_DAILY") return en ? "Locked daily" : "日预测已锁定";
  if (day.predictionSource === "WEEKLY_PLAN") return en ? "Weekly path" : "周路径拆分";
  return en ? "No call" : "暂无判断";
}

function VerificationRow({ report }: { report: WeeklyRollingVerification }) {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <article className="rounded-xl border border-border/[.09] bg-card/45 p-4" data-weekly-rolling-asset={report.symbol}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{report.assetName} <span className="font-mono text-caption font-normal text-foreground-tertiary">{report.symbol}</span></p>
          <p className="mt-1 text-caption text-foreground-tertiary">
            {en ? `${report.verifiedDays} verified session(s)` : `已验证 ${report.verifiedDays} 天 · 完全一致 ${report.exactDays} · 部分一致 ${report.partialDays} · 相反 ${report.oppositeDays}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-semibold tabular-nums">{report.matchingPct == null ? "—" : `${report.matchingPct}%`}</span>
          <Badge variant="outline" className={confidenceClass(report.confidence)}>{confidenceLabel(report.confidence, en)}</Badge>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="grid min-w-[690px] grid-cols-7 gap-2" role="table" aria-label={en ? `${report.assetName} daily path comparison` : `${report.assetName}逐日走势对照`}>
          {report.days.map((day) => (
            <div key={`${report.weeklyAnalysisId}-${day.date}`} className="rounded-lg border border-border/[.08] bg-background/25 px-2 py-2 text-center" role="cell">
              <p className="text-[11px] text-foreground-tertiary">{dayLabel(day.date, en)}</p>
              {day.marketClosed ? <p className="mt-3 text-caption text-foreground-tertiary">{en ? "Closed" : "休市"}</p> : <>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <div>
                    <p className="text-[10px] text-foreground-tertiary">{en ? "Plan" : "预测"}</p>
                    <p className={`text-xl font-semibold ${directionTone(day.predictedDirection)}`}>{arrow(day.predictedDirection)}</p>
                    <p className="truncate text-[9px] text-foreground-tertiary" title={sourceLabel(day, en)}>{sourceLabel(day, en)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-foreground-tertiary">{en ? "Actual" : "实际"}</p>
                    <p className={`text-xl font-semibold ${directionTone(day.actualDirection)}`}>{arrow(day.actualDirection)}</p>
                    <p className="truncate text-[9px] text-foreground-tertiary">{day.actualLabel ?? (en ? "Pending" : "待验证")}</p>
                  </div>
                </div>
                <p className={`mt-1 text-[10px] ${matchTone(day)}`}>{matchLabel(day, en)}</p>
              </>}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-body-sm leading-6 text-foreground-secondary">{en ? report.conclusionEn : report.conclusionZh}</p>
    </article>
  );
}

export function WeeklyRollingVerificationPanel({ reports }: { reports: WeeklyRollingVerification[] }) {
  const { locale } = useLocale();
  const en = locale === "en";
  if (!reports.length) return null;
  return (
    <section className="mb-8 space-y-4" aria-labelledby="weekly-rolling-verification" data-weekly-rolling-verification="1">
      <div>
        <Heading as="h2" size="h3" id="weekly-rolling-verification">{en ? "Forecast vs. actual path" : "本周预测与实际走势匹配度"}</Heading>
        <Text variant="body-sm" color="secondary" className="mt-1 block max-w-4xl">
          {en
            ? "Each closed session is compared with the daily forecast locked before that session. Exact=100, range-vs-direction=50, opposite=0. Future dates and closed markets are never scored."
            : "每天收盘后，把开盘前已锁定的预测与实际方向逐日对齐：完全一致100分，震荡与涨跌相邻记50分，涨跌相反记0分。未来日期、休市日和事后补写内容不计分。"}
        </Text>
      </div>
      <div className="grid gap-4">{reports.map((report) => <VerificationRow key={report.weeklyAnalysisId} report={report} />)}</div>
      <p className="text-caption leading-5 text-foreground-tertiary">
        {en
          ? "This is an in-week fit score for the realized sessions, not a promise that the remaining sessions will follow the forecast. A low score triggers review without rewriting the locked original."
          : "匹配度只说明已经发生的交易日是否贴合原预测，不保证后续一定正确。低匹配会触发复核提示，但原始预测永久保留，不按结果倒改。"}
      </p>
    </section>
  );
}
